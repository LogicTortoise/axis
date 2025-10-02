from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import asyncio
import threading
import os
import json

from app.database import get_db
from app.models import Task, Workspace, TaskExecutionLog
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskDispatchRequest,
    TaskDispatchResponse
)
from app.schemas.task_execution_log import (
    TaskExecutionLogCreate,
    TaskExecutionLog as TaskExecutionLogSchema
)
from app.schemas.common import ResponseModel
from app.config import settings

router = APIRouter(tags=["tasks"])

async def execute_claude_agent_task_async(task_id: str, workspace_path: str, task_description: str):
    """
    使用 Claude Agent SDK 异步执行任务，支持 hooks 回调和实时消息流
    """
    from app.database import SessionLocal
    from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage, SystemMessage, AssistantMessage, UserMessage
    from app.utils.message_stream import message_stream_manager
    import logging
    import httpx

    logger = logging.getLogger(__name__)
    db = SessionLocal()

    try:
        # 检查 API Key
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY 未配置，请在 .env 文件中设置")

        # 设置环境变量
        os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

        # 获取任务信息（包括 hooks）
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.error(f"任务 {task_id} 不存在")
            return

        start_hook_url = task.start_hook_curl
        stop_hook_url = task.stop_hook_curl

        # 执行开始 hook
        if start_hook_url:
            try:
                logger.info(f"执行开始 hook: {start_hook_url}")
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        start_hook_url,
                        json={
                            "task_id": task_id,
                            "execution_id": task.execution_id,
                            "status": "started",
                            "workspace_path": workspace_path
                        }
                    )
                    logger.info(f"开始 hook 响应: {response.status_code}")
            except Exception as e:
                logger.warning(f"开始 hook 执行失败: {str(e)}")

        # 配置 Agent 选项
        options = ClaudeAgentOptions(
            allowed_tools=["Read", "Write", "Edit", "Bash"],
            permission_mode='acceptEdits',  # 自动接受编辑
            cwd=workspace_path  # 设置工作目录
        )

        logger.info(f"开始执行任务 {task_id}: {task_description}")
        logger.info(f"工作目录: {workspace_path}")

        # 推送初始消息
        await message_stream_manager.add_message(task_id, {
            "type": "init",
            "message": f"任务开始执行: {task_description}",
            "workspace": workspace_path
        })

        # 收集输出和状态
        output_lines = []
        all_messages = []  # 收集所有消息用于保存到执行日志
        task_status = "completed"
        error_message = None
        is_task_started = False

        # 使用 Claude Agent SDK 执行任务
        async for message in query(
            prompt=task_description,
            options=options
        ):
            # 记录消息
            output_lines.append(str(message))
            logger.info(f"Agent 消息类型: {type(message).__name__}")

            # 构建推送消息
            stream_message = {
                "type": type(message).__name__,
                "raw": str(message)[:500]  # 限制长度
            }

            # 根据消息类型添加额外信息
            if isinstance(message, SystemMessage):
                if hasattr(message, 'subtype'):
                    stream_message["subtype"] = message.subtype
                    if message.subtype == 'init':
                        is_task_started = True
                        stream_message["message"] = "Claude Agent 已初始化"

            elif isinstance(message, AssistantMessage):
                # 提取文本内容
                texts = []
                for block in message.content:
                    if hasattr(block, 'text'):
                        texts.append(block.text)
                if texts:
                    stream_message["text"] = "\n".join(texts)

            elif isinstance(message, ResultMessage):
                stream_message["is_error"] = message.is_error
                stream_message["duration_ms"] = getattr(message, 'duration_ms', 0)
                stream_message["cost_usd"] = getattr(message, 'total_cost_usd', 0)

                # 判断任务状态
                if message.is_error:
                    task_status = "failed"
                    error_message = getattr(message, 'result', '执行失败')
                    stream_message["message"] = f"任务执行失败: {error_message}"
                    logger.error(f"任务 {task_id} 执行失败: {error_message}")
                else:
                    task_status = "completed"
                    stream_message["message"] = "任务执行成功"
                    logger.info(f"任务 {task_id} 执行成功")

                # 执行结束 hook
                if stop_hook_url:
                    try:
                        logger.info(f"执行结束 hook: {stop_hook_url}")
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            response = await client.post(
                                stop_hook_url,
                                json={
                                    "task_id": task_id,
                                    "execution_id": task.execution_id,
                                    "status": task_status,
                                    "is_error": message.is_error,
                                    "duration_ms": getattr(message, 'duration_ms', 0),
                                    "total_cost_usd": getattr(message, 'total_cost_usd', 0),
                                    "error_message": error_message
                                }
                            )
                            logger.info(f"结束 hook 响应: {response.status_code}")
                    except Exception as e:
                        logger.warning(f"结束 hook 执行失败: {str(e)}")

            # 推送消息到流
            await message_stream_manager.add_message(task_id, stream_message)
            # 收集消息用于保存到执行日志
            all_messages.append(stream_message)

        # 合并输出
        full_output = "\n".join(output_lines)

        # 更新任务状态
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = task_status
            task.execution_output = full_output[:5000] if full_output else None
            task.error_message = error_message
            db.commit()
            logger.info(f"任务 {task_id} 最终状态: {task_status}")

    except ValueError as e:
        # API Key 未配置
        logger.error(f"任务 {task_id} 配置错误: {str(e)}")
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = str(e)
            db.commit()

        # 执行结束 hook（失败）
        if task and task.stop_hook_curl:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        task.stop_hook_curl,
                        json={
                            "task_id": task_id,
                            "execution_id": task.execution_id,
                            "status": "failed",
                            "is_error": True,
                            "error_message": str(e)
                        }
                    )
            except Exception as hook_error:
                logger.warning(f"结束 hook 执行失败: {str(hook_error)}")

    except Exception as e:
        # 其他错误
        logger.error(f"任务 {task_id} 执行异常: {str(e)}", exc_info=True)
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = f"执行异常: {str(e)}"
            db.commit()

        # 执行结束 hook（失败）
        if task and task.stop_hook_curl:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        task.stop_hook_curl,
                        json={
                            "task_id": task_id,
                            "execution_id": task.execution_id,
                            "status": "failed",
                            "is_error": True,
                            "error_message": str(e)
                        }
                    )
            except Exception as hook_error:
                logger.warning(f"结束 hook 执行失败: {str(hook_error)}")

    finally:
        # 保存执行日志到数据库
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task and len(all_messages) > 0:
                # 获取该任务的最大执行次数
                max_execution = db.query(TaskExecutionLog).filter(
                    TaskExecutionLog.task_id == task_id
                ).order_by(TaskExecutionLog.execution_number.desc()).first()

                execution_number = (max_execution.execution_number + 1) if max_execution else 1

                # 序列化所有消息
                messages_json = json.dumps(all_messages, ensure_ascii=False)

                # 创建执行日志记录
                execution_log = TaskExecutionLog(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    execution_number=execution_number,
                    response_type=task_status,  # 使用任务最终状态作为response_type
                    response_content=messages_json,
                    status='completed'
                )

                db.add(execution_log)
                db.commit()
                logger.info(f"任务 {task_id} 执行日志已保存 (第 {execution_number} 次执行)")
        except Exception as log_error:
            logger.error(f"保存执行日志失败: {str(log_error)}")
        finally:
            db.close()
            logger.info(f"任务 {task_id} 执行流程结束")


def execute_claude_code_task(task_id: str, workspace_path: str, task_description: str):
    """
    在后台线程中执行 Claude Agent 任务（同步包装器）
    """
    # 创建新的事件循环来运行异步函数
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(execute_claude_agent_task_async(task_id, workspace_path, task_description))
    finally:
        loop.close()

@router.get("/workspaces/{workspace_id}/tasks", response_model=ResponseModel[TaskListResponse])
def get_tasks(
    workspace_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = Query(None, regex="^(pending|progress|completed|failed)$"),
    priority: Optional[str] = Query(None, regex="^(high|medium|low)$"),
    source: Optional[str] = Query(None, regex="^(api|manual)$"),
    sort_by: Optional[str] = Query("created_at", regex="^(title|priority|status|created_at)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """获取任务列表"""
    # 验证工作区是否存在
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    query = db.query(Task).filter(Task.workspace_id == workspace_id)

    # 搜索
    if search:
        query = query.filter(Task.title.contains(search))

    # 筛选
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if source:
        query = query.filter(Task.source == source)

    # 排序
    if sort_order == "asc":
        query = query.order_by(getattr(Task, sort_by).asc())
    else:
        query = query.order_by(getattr(Task, sort_by).desc())

    total = query.count()
    tasks = query.offset((page - 1) * page_size).limit(page_size).all()

    task_responses = []
    for task in tasks:
        task_dict = {
            "id": task.id,
            "workspace_id": task.workspace_id,
            "title": task.title,
            "description": task.description,
            "priority": task.priority,
            "status": task.status,
            "queue_status": task.queue_status,
            "manual_check": bool(task.manual_check),
            "source": task.source,
            "api_task_id": task.api_task_id,
            "execution_id": task.execution_id,
            "dispatch_time": task.dispatch_time,
            "error_message": task.error_message,
            "execution_output": task.execution_output,
            "start_hook": task.start_hook_curl,
            "stop_hook": task.stop_hook_curl,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        task_responses.append(task_dict)

    return ResponseModel(
        code=200,
        message="获取成功",
        data=TaskListResponse(
            total=total,
            page=page,
            page_size=page_size,
            tasks=task_responses
        )
    )

@router.get("/tasks/{task_id}", response_model=ResponseModel[TaskResponse])
def get_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task_dict = {
        "id": task.id,
        "workspace_id": task.workspace_id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "queue_status": task.queue_status,
        "manual_check": bool(task.manual_check),
        "source": task.source,
        "api_task_id": task.api_task_id,
        "execution_id": task.execution_id,
        "dispatch_time": task.dispatch_time,
        "error_message": task.error_message,
        "execution_output": task.execution_output,
        "start_hook": task.start_hook_curl,
        "stop_hook": task.stop_hook_curl,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }

    return ResponseModel(
        code=200,
        message="获取成功",
        data=task_dict
    )

@router.post("/workspaces/{workspace_id}/tasks", response_model=ResponseModel[TaskResponse])
def create_task(
    workspace_id: str,
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    """创建任务"""
    # 验证工作区是否存在
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    db_task = Task(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status="pending",
        source="manual",
        manual_check=0,
        queue_status="none"
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    task_dict = {
        "id": db_task.id,
        "workspace_id": db_task.workspace_id,
        "title": db_task.title,
        "description": db_task.description,
        "priority": db_task.priority,
        "status": db_task.status,
        "queue_status": db_task.queue_status,
        "manual_check": bool(db_task.manual_check),
        "source": db_task.source,
        "api_task_id": db_task.api_task_id,
        "execution_id": db_task.execution_id,
        "dispatch_time": db_task.dispatch_time,
        "error_message": db_task.error_message,
        "execution_output": db_task.execution_output,
        "start_hook": db_task.start_hook_curl,
        "stop_hook": db_task.stop_hook_curl,
        "created_at": db_task.created_at,
        "updated_at": db_task.updated_at
    }

    return ResponseModel(
        code=200,
        message="创建成功",
        data=task_dict
    )

@router.put("/tasks/{task_id}", response_model=ResponseModel[TaskResponse])
def update_task(
    task_id: str,
    task: TaskUpdate,
    db: Session = Depends(get_db)
):
    """更新任务"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = task.dict(exclude_unset=True)

    # 处理 manual_check 字段
    if 'manual_check' in update_data:
        update_data['manual_check'] = 1 if update_data['manual_check'] else 0

    # 处理 hook 字段名映射
    if 'start_hook' in update_data:
        update_data['start_hook_curl'] = update_data.pop('start_hook')
    if 'stop_hook' in update_data:
        update_data['stop_hook_curl'] = update_data.pop('stop_hook')

    for key, value in update_data.items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)

    task_dict = {
        "id": db_task.id,
        "workspace_id": db_task.workspace_id,
        "title": db_task.title,
        "description": db_task.description,
        "priority": db_task.priority,
        "status": db_task.status,
        "queue_status": db_task.queue_status,
        "manual_check": bool(db_task.manual_check),
        "source": db_task.source,
        "api_task_id": db_task.api_task_id,
        "execution_id": db_task.execution_id,
        "dispatch_time": db_task.dispatch_time,
        "error_message": db_task.error_message,
        "execution_output": db_task.execution_output,
        "start_hook": db_task.start_hook_curl,
        "stop_hook": db_task.stop_hook_curl,
        "created_at": db_task.created_at,
        "updated_at": db_task.updated_at
    }

    return ResponseModel(
        code=200,
        message="更新成功",
        data=task_dict
    )

@router.delete("/tasks/{task_id}", response_model=ResponseModel[dict])
def delete_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """删除任务"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    db.delete(db_task)
    db.commit()

    return ResponseModel(
        code=200,
        message="删除成功",
        data={}
    )

@router.post("/tasks/{task_id}/dispatch", response_model=ResponseModel[TaskDispatchResponse])
def dispatch_task(
    task_id: str,
    request: TaskDispatchRequest,
    db: Session = Depends(get_db)
):
    """下发任务"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取工作空间信息
    workspace = db.query(Workspace).filter(Workspace.id == db_task.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    # 检查工作空间是否配置了路径
    if not workspace.path:
        raise HTTPException(status_code=400, detail="工作区未配置路径")

    # 检查路径是否存在
    if not os.path.exists(workspace.path):
        raise HTTPException(status_code=400, detail=f"工作区路径不存在: {workspace.path}")

    # 生成执行ID
    execution_id = f"exec-sys-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"

    # 更新任务状态为 progress (running)
    db_task.status = "progress"
    db_task.execution_id = execution_id
    db_task.dispatch_time = datetime.now()

    db.commit()
    db.refresh(db_task)

    # 在后台线程中执行 Claude Code 任务
    thread = threading.Thread(
        target=execute_claude_code_task,
        args=(task_id, workspace.path, db_task.description),
        daemon=True
    )
    thread.start()

    return ResponseModel(
        code=200,
        message="下发成功",
        data=TaskDispatchResponse(
            execution_id=execution_id,
            dispatch_time=db_task.dispatch_time,
            status=db_task.status
        )
    )

@router.post("/tasks/{task_id}/retry", response_model=ResponseModel[TaskDispatchResponse])
def retry_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """重试任务"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if db_task.status != "failed":
        raise HTTPException(status_code=400, detail="只能重试失败的任务")

    # 生成新的执行ID
    execution_id = f"exec-sys-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"

    # 更新任务状态
    db_task.status = "progress"
    db_task.execution_id = execution_id
    db_task.dispatch_time = datetime.now()

    db.commit()
    db.refresh(db_task)

    # TODO: 实现实际的任务重试逻辑

    return ResponseModel(
        code=200,
        message="重试成功",
        data=TaskDispatchResponse(
            execution_id=execution_id,
            dispatch_time=db_task.dispatch_time,
            status=db_task.status
        )
    )

@router.get("/tasks/{task_id}/status", response_model=ResponseModel[dict])
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db)
):
    """查询任务执行状态"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # TODO: 实现实际的状态轮询逻辑
    # 这里应该调用外部系统的 API 查询任务状态

    return ResponseModel(
        code=200,
        message="获取成功",
        data={
            "task_id": db_task.id,
            "execution_id": db_task.execution_id,
            "status": db_task.status,
            "progress": 100 if db_task.status == "completed" else 50,
            "result": {},
            "error_message": None,
            "updated_at": db_task.updated_at
        }
    )

@router.get("/tasks/{task_id}/stream")
async def task_message_stream(task_id: str, db: Session = Depends(get_db)):
    """SSE endpoint: 实时推送任务执行消息流"""
    from app.utils.message_stream import message_stream_manager

    # 验证任务是否存在
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    async def event_generator():
        """生成SSE事件流"""
        queue = await message_stream_manager.subscribe(task_id)

        try:
            while True:
                # 检查任务状态
                task = db.query(Task).filter(Task.id == task_id).first()
                if task and task.status in ["completed", "failed"]:
                    # 任务已结束，发送最后的消息后断开
                    try:
                        # 非阻塞获取剩余消息
                        while not queue.empty():
                            message = await asyncio.wait_for(queue.get(), timeout=0.1)
                            yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
                    except asyncio.TimeoutError:
                        pass

                    # 发送结束信号
                    yield f"data: {json.dumps({'type': 'end', 'status': task.status}, ensure_ascii=False)}\n\n"
                    break

                # 等待新消息 (最多30秒)
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    # 发送心跳保持连接
                    yield f": heartbeat\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            message_stream_manager.unsubscribe(task_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # 禁用nginx缓冲
        }
    )


@router.get("/tasks/{task_id}/execution-logs", response_model=ResponseModel[list[TaskExecutionLogSchema]])
def get_task_execution_logs(
    task_id: str,
    db: Session = Depends(get_db)
):
    """获取任务的所有执行日志"""
    # 验证任务是否存在
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 查询该任务的所有执行日志，按执行次数倒序排列
    logs = db.query(TaskExecutionLog).filter(
        TaskExecutionLog.task_id == task_id
    ).order_by(TaskExecutionLog.execution_number.desc()).all()

    return ResponseModel(
        success=True,
        message="获取执行日志成功",
        data=logs
    )


@router.get("/tasks/{task_id}/execution-logs/{execution_number}", response_model=ResponseModel[TaskExecutionLogSchema])
def get_task_execution_log_by_number(
    task_id: str,
    execution_number: int,
    db: Session = Depends(get_db)
):
    """获取任务的特定执行日志"""
    # 验证任务是否存在
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 查询特定的执行日志
    log = db.query(TaskExecutionLog).filter(
        TaskExecutionLog.task_id == task_id,
        TaskExecutionLog.execution_number == execution_number
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail=f"第 {execution_number} 次执行日志不存在")

    return ResponseModel(
        success=True,
        message="获取执行日志成功",
        data=log
    )


@router.get("/workspaces/{workspace_id}/files")
def get_workspace_files(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """获取工作区的文件列表"""
    import subprocess

    # 获取workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    if not workspace.path or not os.path.exists(workspace.path):
        return ResponseModel(
            code=200,
            message="工作区路径不存在",
            data=[]
        )

    try:
        # 使用find命令列出所有文件（排除.git等隐藏目录）
        result = subprocess.run(
            ['find', workspace.path, '-type', 'f', '-not', '-path', '*/.*'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            # 获取相对路径
            files = []
            for file_path in result.stdout.strip().split('\n'):
                if file_path:
                    rel_path = os.path.relpath(file_path, workspace.path)
                    files.append(rel_path)

            return ResponseModel(
                code=200,
                message="获取文件列表成功",
                data=sorted(files)
            )
        else:
            raise Exception(result.stderr)

    except Exception as e:
        return ResponseModel(
            code=500,
            message=f"获取文件列表失败: {str(e)}",
            data=[]
        )


@router.get("/tasks/{task_id}/diff")
def get_task_diff(
    task_id: str,
    db: Session = Depends(get_db)
):
    """获取任务执行过程中的git diff"""
    import subprocess

    # 获取任务和workspace
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    workspace = db.query(Workspace).filter(Workspace.id == task.workspace_id).first()
    if not workspace or not workspace.path:
        return ResponseModel(
            code=200,
            message="工作区路径不存在",
            data=""
        )

    try:
        # 检查是否是git仓库
        git_check = subprocess.run(
            ['git', '-C', workspace.path, 'rev-parse', '--git-dir'],
            capture_output=True,
            text=True
        )

        if git_check.returncode != 0:
            return ResponseModel(
                code=200,
                message="不是git仓库",
                data=""
            )

        # 获取git diff (包括staged和unstaged的修改)
        diff_result = subprocess.run(
            ['git', '-C', workspace.path, 'diff', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )

        return ResponseModel(
            code=200,
            message="获取diff成功",
            data=diff_result.stdout
        )

    except Exception as e:
        return ResponseModel(
            code=500,
            message=f"获取diff失败: {str(e)}",
            data=""
        )
