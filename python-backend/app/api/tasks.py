from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

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

router = APIRouter(tags=["tasks"])

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

    # 生成执行ID
    execution_id = f"exec-sys-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"

    # 更新任务状态
    db_task.status = "progress"
    db_task.execution_id = execution_id
    db_task.dispatch_time = datetime.now()

    db.commit()
    db.refresh(db_task)

    # 这里应该调用外部执行系统的 API，暂时模拟
    # TODO: 实现实际的任务下发逻辑

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
