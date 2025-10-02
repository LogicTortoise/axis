from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import asyncio
import threading
import os

from app.database import get_db
from app.models import Task, Workspace
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskDispatchRequest,
    TaskDispatchResponse
)
from app.schemas.common import ResponseModel
from app.config import settings

router = APIRouter(tags=["tasks"])

async def execute_claude_agent_task_async(task_id: str, workspace_path: str, task_description: str):
    """
    使用 Claude Agent SDK 异步执行任务，支持 hooks 回调
    """
    from app.database import SessionLocal
    from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage, SystemMessage
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

        # 收集输出和状态
        output_lines = []
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

            # 检测任务真正开始（SystemMessage with init）
            if isinstance(message, SystemMessage) and hasattr(message, 'subtype') and message.subtype == 'init':
                is_task_started = True
                logger.info(f"任务 {task_id} 已开始执行")

            # 检测任务完成（ResultMessage）
            if isinstance(message, ResultMessage):
                logger.info(f"收到 ResultMessage: is_error={message.is_error}")

                # 判断任务状态
                if message.is_error:
                    task_status = "failed"
                    error_message = getattr(message, 'result', '执行失败')
                    logger.error(f"任务 {task_id} 执行失败: {error_message}")
                else:
                    task_status = "completed"
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
