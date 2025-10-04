from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import uuid
import asyncio
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
        message_count = 0
        progress = 0

        # 使用 Claude Agent SDK 执行任务
        async for message in query(
            prompt=task_description,
            options=options
        ):
            # 记录消息
            output_lines.append(str(message))
            logger.info(f"Agent 消息类型: {type(message).__name__}")
            message_count += 1

            # 构建推送消息
            stream_message = {
                "type": type(message).__name__,
                "raw": str(message)[:500]  # 限制长度
            }

            # 根据消息类型添加额外信息并计算进度
            if isinstance(message, SystemMessage):
                if hasattr(message, 'subtype'):
                    stream_message["subtype"] = message.subtype
                    if message.subtype == 'init':
                        is_task_started = True
                        stream_message["message"] = "Claude Agent 已初始化"
                        progress = 10
                        stream_message["progress"] = progress

            elif isinstance(message, AssistantMessage):
                # 提取文本内容
                texts = []
                for block in message.content:
                    if hasattr(block, 'text'):
                        texts.append(block.text)
                if texts:
                    stream_message["text"] = "\n".join(texts)
                # 根据消息数量动态增加进度（10% - 90%之间）
                progress = min(10 + (message_count * 8), 90)
                stream_message["progress"] = progress

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
                    progress = 100
                    stream_message["progress"] = progress
                else:
                    task_status = "completed"
                    stream_message["message"] = "任务执行成功"
                    logger.info(f"任务 {task_id} 执行成功")
                    progress = 100
                    stream_message["progress"] = progress

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


# execute_claude_code_task 已废弃，现在直接使用 asyncio.create_task 调用 execute_claude_agent_task_async

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
    if sort_by == "priority":
        # 优先级排序：使用CASE将字符串映射为数字
        from sqlalchemy import case
        priority_order = case(
            (Task.priority == 'high', 1),
            (Task.priority == 'medium', 2),
            (Task.priority == 'low', 3),
            else_=4
        )
        if sort_order == "asc":
            query = query.order_by(priority_order.asc())
        else:
            query = query.order_by(priority_order.desc())
    else:
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
async def dispatch_task(
    task_id: str,
    request: TaskDispatchRequest,
    db: Session = Depends(get_db)
):
    """下发任务（异步立即返回）"""
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

    # 使用 asyncio.create_task 在后台执行任务（非阻塞）
    asyncio.create_task(
        execute_claude_agent_task_async(task_id, workspace.path, db_task.description)
    )

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
async def retry_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """重试任务（异步立即返回）"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if db_task.status != "failed":
        raise HTTPException(status_code=400, detail="只能重试失败的任务")

    # 获取工作空间信息
    workspace = db.query(Workspace).filter(Workspace.id == db_task.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    # 生成新的执行ID
    execution_id = f"exec-sys-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"

    # 更新任务状态
    db_task.status = "progress"
    db_task.execution_id = execution_id
    db_task.dispatch_time = datetime.now()

    db.commit()
    db.refresh(db_task)

    # 使用 asyncio.create_task 在后台执行任务（非阻塞）
    asyncio.create_task(
        execute_claude_agent_task_async(task_id, workspace.path, db_task.description)
    )

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

    # 验证任务是否存在（验证后立即释放连接，避免SSE长连接占用数据库连接）
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 立即关闭数据库连接
    db.close()

    async def event_generator():
        """生成SSE事件流"""
        queue = await message_stream_manager.subscribe(task_id)

        try:
            while True:
                # 等待新消息 (最多30秒)
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"

                    # 如果收到ResultMessage，说明任务已结束
                    if message.get('type') == 'ResultMessage':
                        # 发送剩余消息
                        try:
                            while not queue.empty():
                                msg = await asyncio.wait_for(queue.get(), timeout=0.1)
                                yield f"data: {json.dumps(msg, ensure_ascii=False)}\n\n"
                        except asyncio.TimeoutError:
                            pass
                        break

                except asyncio.TimeoutError:
                    # 发送心跳保持连接
                    yield f": heartbeat\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            await message_stream_manager.unsubscribe(task_id, queue)

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


@router.post("/workspaces/{workspace_id}/generate-tasks", response_model=ResponseModel[list[dict]])
async def generate_tasks(
    workspace_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """使用Claude生成任务列表"""
    from anthropic import Anthropic

    # 验证工作区是否存在
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    # 检查 API Key
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 未配置")

    # 获取任务描述
    task_description = request.get("description", "")
    if not task_description:
        raise HTTPException(status_code=400, detail="请提供任务描述")

    try:
        client = Anthropic(api_key=settings.anthropic_api_key)

        # 构建system prompt - 任务生成专用
        system_prompt = f"""你是一个专业的项目任务规划助手。根据用户提供的需求描述，生成详细的任务分解列表。

工作区信息：
- 名称：{workspace.name}
- 项目目标：{workspace.project_goal}
- 描述：{workspace.description or '无'}

要求：
1. 将需求分解为具体的、可执行的任务
2. 每个任务应该是独立的、明确的
3. 任务应该有合理的优先级（high/medium/low）
4. 返回JSON格式的任务列表

返回格式示例：
[
  {{"title": "任务标题", "description": "详细描述", "priority": "high"}},
  {{"title": "任务标题", "description": "详细描述", "priority": "medium"}}
]

只返回JSON数组，不要添加其他说明文字。"""

        # 调用Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": task_description}
            ]
        )

        # 解析响应
        content = response.content[0].text

        # 尝试提取JSON数组
        import re
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            tasks_data = json.loads(json_match.group())
        else:
            tasks_data = json.loads(content)

        # 验证数据格式
        if not isinstance(tasks_data, list):
            raise ValueError("返回的数据格式不正确")

        # 确保每个任务都有必需的字段
        validated_tasks = []
        for task in tasks_data:
            if isinstance(task, dict) and "title" in task and "description" in task:
                validated_tasks.append({
                    "title": task["title"],
                    "description": task["description"],
                    "priority": task.get("priority", "medium")
                })

        return ResponseModel(
            code=200,
            message=f"成功生成 {len(validated_tasks)} 个任务",
            data=validated_tasks
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"解析Claude响应失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成任务失败: {str(e)}")


@router.post("/tasks/{task_id}/chat/stream")
async def stream_task_chat(
    task_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """流式对话接口，使用Claude Agent SDK，支持工具调用"""
    from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage, TextBlock

    # 验证task是否存在
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取workspace信息
    workspace = db.query(Workspace).filter(Workspace.id == task.workspace_id).first()
    workspace_path = workspace.path if workspace else None

    # 获取用户消息（只取最后一条用户消息作为prompt）
    messages = request.get("messages", [])
    user_messages = [m for m in messages if m.get('role') == 'user']
    prompt = user_messages[-1]['content'] if user_messages else "你好"

    # 获取thread信息
    thread_id = request.get("thread_id")
    thread_number = request.get("thread_number")

    # 构建system prompt
    system_prompt = f"""你是一个AI助手，正在帮助用户处理任务。

工作区信息：
- 名称：{workspace.name if workspace else 'Unknown'}
- 项目目标：{workspace.project_goal if workspace else 'Unknown'}
- 工作目录：{workspace_path or '未设置'}

当前任务：
- 标题：{task.title}
- 描述：{task.description or '无'}
- 优先级：{task.priority}
- 状态：{task.status}

你可以使用Read、Write、Edit、Bash等工具来帮助用户完成任务。"""

    # 配置Claude Agent选项
    options = ClaudeAgentOptions(
        cwd=workspace_path,
        system_prompt=system_prompt,
        allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        permission_mode='acceptEdits'
    )

    async def generate():
        all_messages = []
        accumulated_text = ""

        try:
            async with ClaudeSDKClient(options=options) as client:
                # 发送查询
                await client.query(prompt)

                # 接收流式响应
                async for msg in client.receive_response():
                    all_messages.append(msg)

                    if isinstance(msg, AssistantMessage):
                        # 提取文本内容
                        for block in msg.content:
                            if isinstance(block, TextBlock):
                                accumulated_text += block.text
                                yield f"data: {json.dumps({'text': block.text})}\n\n"
                    elif hasattr(msg, 'text'):
                        # 其他消息类型
                        accumulated_text += msg.text
                        yield f"data: {json.dumps({'text': msg.text})}\n\n"

            # 保存执行日志
            try:
                # 获取当前任务的最大execution_number
                max_execution = db.query(func.max(TaskExecutionLog.execution_number)).filter(
                    TaskExecutionLog.task_id == task_id
                ).scalar() or 0

                # 构建完整的对话历史（用户消息+AI回复）
                chat_history = [
                    {
                        "type": "UserMessage",
                        "role": "user",
                        "content": prompt,
                        "text": prompt
                    },
                    {
                        "type": "AssistantMessage",
                        "role": "assistant",
                        "content": accumulated_text,
                        "text": accumulated_text
                    }
                ]

                # 创建执行日志
                execution_log = TaskExecutionLog(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    execution_number=max_execution + 1,
                    response_type='chat',
                    response_content=json.dumps(chat_history, ensure_ascii=False),
                    status='completed',
                    thread_id=thread_id,
                    thread_number=thread_number
                )
                db.add(execution_log)
                db.commit()
            except Exception as log_error:
                print(f"Failed to save execution log: {log_error}")

            # 发送完成信号
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            import traceback
            error_detail = f"{str(e)}\n{traceback.format_exc()}"

            # 保存错误日志
            try:
                max_execution = db.query(func.max(TaskExecutionLog.execution_number)).filter(
                    TaskExecutionLog.task_id == task_id
                ).scalar() or 0

                execution_log = TaskExecutionLog(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    execution_number=max_execution + 1,
                    response_type='chat_error',
                    response_content=error_detail,
                    status='failed',
                    thread_id=thread_id,
                    thread_number=thread_number
                )
                db.add(execution_log)
                db.commit()
            except Exception as log_error:
                print(f"Failed to save error log: {log_error}")

            yield f"data: {json.dumps({'error': error_detail})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
