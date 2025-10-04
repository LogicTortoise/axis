from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import json
from datetime import datetime

from app.database import get_db
from app.models import TaskQueue, QueueTask, Task
from app.schemas.queue import (
    TaskQueueCreate,
    TaskQueueResponse,
    TaskQueueDetailResponse,
    TaskQueueListResponse,
    QueueTaskResponse,
    AddTasksToQueueRequest,
    QueueStatusEnum,
    TaskStatusEnum
)
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/queues", tags=["queues"])

# 创建队列
@router.post("/workspaces/{workspace_id}", response_model=ResponseModel[TaskQueueResponse])
def create_queue(
    workspace_id: str,
    queue_data: TaskQueueCreate,
    db: Session = Depends(get_db)
):
    """创建任务队列"""
    # 验证所有任务是否存在且属于该workspace
    tasks = db.query(Task).filter(
        Task.id.in_(queue_data.task_ids),
        Task.workspace_id == workspace_id
    ).all()

    if len(tasks) != len(queue_data.task_ids):
        raise HTTPException(status_code=400, detail="部分任务不存在或不属于该工作区")

    # 创建队列
    queue_id = str(uuid.uuid4())
    new_queue = TaskQueue(
        id=queue_id,
        workspace_id=workspace_id,
        name=queue_data.name,
        status=QueueStatusEnum.pending.value
    )
    db.add(new_queue)

    # 创建队列任务关联
    for index, task_id in enumerate(queue_data.task_ids):
        queue_task = QueueTask(
            id=str(uuid.uuid4()),
            queue_id=queue_id,
            task_id=task_id,
            order_index=index,
            status=TaskStatusEnum.pending.value
        )
        db.add(queue_task)

    db.commit()
    db.refresh(new_queue)

    # 计算统计数据
    total_tasks = len(queue_data.task_ids)
    completed_tasks = 0

    return ResponseModel(
        code=200,
        message="队列创建成功",
        data=TaskQueueResponse(
            id=new_queue.id,
            name=new_queue.name,
            status=new_queue.status,
            progress=0,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            created_at=new_queue.created_at,
            updated_at=new_queue.updated_at
        )
    )

# 获取工作区的队列列表
@router.get("/workspaces/{workspace_id}", response_model=ResponseModel[TaskQueueListResponse])
def get_queues(
    workspace_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取工作区的队列列表"""
    query = db.query(TaskQueue).filter(TaskQueue.workspace_id == workspace_id)

    if status:
        query = query.filter(TaskQueue.status == status)

    query = query.order_by(TaskQueue.created_at.desc())

    total = query.count()
    queues = query.offset((page - 1) * page_size).limit(page_size).all()

    # 构建响应数据，计算每个队列的统计信息
    queue_responses = []
    for queue in queues:
        queue_tasks = db.query(QueueTask).filter(QueueTask.queue_id == queue.id).all()
        total_tasks = len(queue_tasks)
        completed_tasks = sum(1 for qt in queue_tasks if qt.status == TaskStatusEnum.completed.value)
        progress = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        queue_responses.append(TaskQueueResponse(
            id=queue.id,
            name=queue.name,
            status=queue.status,
            progress=progress,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            created_at=queue.created_at,
            updated_at=queue.updated_at
        ))

    return ResponseModel(
        code=200,
        message="获取成功",
        data=TaskQueueListResponse(
            total=total,
            page=page,
            page_size=page_size,
            queues=queue_responses
        )
    )

# 获取队列详情（包含任务列表）
@router.get("/{queue_id}", response_model=ResponseModel[TaskQueueDetailResponse])
def get_queue_detail(
    queue_id: str,
    db: Session = Depends(get_db)
):
    """获取队列详情，包含任务列表"""
    queue = db.query(TaskQueue).filter(TaskQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列不存在")

    # 获取队列中的任务
    queue_tasks = db.query(QueueTask).filter(
        QueueTask.queue_id == queue_id
    ).order_by(QueueTask.order_index).all()

    # 构建任务列表响应
    tasks_response = []
    for qt in queue_tasks:
        task = db.query(Task).filter(Task.id == qt.task_id).first()
        if task:
            tasks_response.append(QueueTaskResponse(
                id=qt.id,
                task_id=qt.task_id,
                order_index=qt.order_index,
                name=task.title,
                status=qt.status,
                error_reason=qt.error_reason
            ))

    # 计算统计数据
    total_tasks = len(queue_tasks)
    completed_tasks = sum(1 for qt in queue_tasks if qt.status == TaskStatusEnum.completed.value)
    progress = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    return ResponseModel(
        code=200,
        message="获取成功",
        data=TaskQueueDetailResponse(
            id=queue.id,
            name=queue.name,
            status=queue.status,
            progress=progress,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            created_at=queue.created_at,
            updated_at=queue.updated_at,
            tasks=tasks_response
        )
    )

# 执行队列（依次执行队列中的任务）
@router.post("/{queue_id}/execute", response_model=ResponseModel[dict])
async def execute_queue(
    queue_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """执行队列中的任务（依次调用dispatch接口）"""
    queue = db.query(TaskQueue).filter(TaskQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列不存在")

    if queue.status == QueueStatusEnum.running.value:
        raise HTTPException(status_code=400, detail="队列正在执行中")

    # 更新队列状态为运行中
    queue.status = QueueStatusEnum.running.value
    db.commit()

    # 获取队列中的所有任务，按顺序排列
    queue_tasks = db.query(QueueTask).filter(
        QueueTask.queue_id == queue_id
    ).order_by(QueueTask.order_index).all()

    # 添加后台任务执行队列（不传递db session）
    background_tasks.add_task(execute_queue_tasks, queue_id)

    return ResponseModel(
        code=200,
        message="队列开始执行",
        data={
            "queue_id": queue_id,
            "total_tasks": len(queue_tasks),
            "status": "running"
        }
    )

# 后台执行队列任务的函数
def execute_queue_tasks(queue_id: str):
    """后台执行队列中的任务"""
    from app.database import SessionLocal
    import httpx
    import time

    # 创建新的数据库会话
    db = SessionLocal()

    try:
        success_count = 0
        failed_count = 0

        # 获取队列中的所有任务
        queue_tasks = db.query(QueueTask).filter(
            QueueTask.queue_id == queue_id
        ).order_by(QueueTask.order_index).all()

        for queue_task in queue_tasks:
            # 更新任务状态为运行中
            queue_task.status = TaskStatusEnum.progress.value
            db.commit()

            try:
                # 获取任务信息
                task = db.query(Task).filter(Task.id == queue_task.task_id).first()
                if task:
                    # 调用dispatch接口执行任务
                    with httpx.Client(timeout=30.0) as client:
                        response = client.post(
                            f"http://localhost:10101/api/tasks/{task.id}/dispatch",
                            json={"execution_params": {}}
                        )

                        if response.status_code == 200:
                            # Dispatch成功，等待任务完成
                            # 轮询任务状态直到完成或失败
                            max_wait_time = 600  # 最多等待10分钟
                            start_time = time.time()

                            while time.time() - start_time < max_wait_time:
                                # 刷新任务状态
                                db.refresh(task)

                                if task.status == "completed":
                                    queue_task.status = TaskStatusEnum.completed.value
                                    success_count += 1
                                    break
                                elif task.status == "failed":
                                    queue_task.status = TaskStatusEnum.failed.value
                                    queue_task.error_reason = task.error_message or "任务执行失败"
                                    failed_count += 1
                                    break
                                elif task.status == "progress":
                                    # 仍在执行中，等待3秒后再检查
                                    time.sleep(3)
                                else:
                                    # 未知状态
                                    time.sleep(3)
                            else:
                                # 超时
                                queue_task.status = TaskStatusEnum.failed.value
                                queue_task.error_reason = "任务执行超时"
                                failed_count += 1
                        else:
                            queue_task.status = TaskStatusEnum.failed.value
                            queue_task.error_reason = f"Dispatch失败: {response.text}"
                            failed_count += 1
                else:
                    queue_task.status = TaskStatusEnum.failed.value
                    queue_task.error_reason = "任务不存在"
                    failed_count += 1
            except Exception as e:
                queue_task.status = TaskStatusEnum.failed.value
                queue_task.error_reason = str(e)
                failed_count += 1

            db.commit()

        # 更新队列状态
        queue = db.query(TaskQueue).filter(TaskQueue.id == queue_id).first()
        if queue:
            if failed_count == 0:
                queue.status = QueueStatusEnum.completed.value
            elif success_count == 0:
                queue.status = QueueStatusEnum.failed.value
            else:
                queue.status = QueueStatusEnum.completed.value  # 部分成功也标记为完成
            db.commit()
    finally:
        # 关闭数据库会话
        db.close()

# 向队列添加任务
@router.post("/{queue_id}/tasks", response_model=ResponseModel[dict])
def add_tasks_to_queue(
    queue_id: str,
    request: AddTasksToQueueRequest,
    db: Session = Depends(get_db)
):
    """向队列添加任务"""
    queue = db.query(TaskQueue).filter(TaskQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列不存在")

    # 获取当前队列中的最大order_index
    max_order = db.query(QueueTask).filter(
        QueueTask.queue_id == queue_id
    ).count()

    # 验证任务是否存在
    tasks = db.query(Task).filter(
        Task.id.in_(request.task_ids),
        Task.workspace_id == queue.workspace_id
    ).all()

    if len(tasks) != len(request.task_ids):
        raise HTTPException(status_code=400, detail="部分任务不存在或不属于该工作区")

    # 添加任务到队列
    for index, task_id in enumerate(request.task_ids):
        queue_task = QueueTask(
            id=str(uuid.uuid4()),
            queue_id=queue_id,
            task_id=task_id,
            order_index=max_order + index,
            status=TaskStatusEnum.pending.value
        )
        db.add(queue_task)

    db.commit()

    return ResponseModel(
        code=200,
        message="任务添加成功",
        data={
            "added_count": len(request.task_ids)
        }
    )

# 删除队列
@router.delete("/{queue_id}", response_model=ResponseModel[dict])
def delete_queue(
    queue_id: str,
    db: Session = Depends(get_db)
):
    """删除队列"""
    queue = db.query(TaskQueue).filter(TaskQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列不存在")

    if queue.status == QueueStatusEnum.running.value:
        raise HTTPException(status_code=400, detail="无法删除正在执行的队列")

    db.delete(queue)
    db.commit()

    return ResponseModel(
        code=200,
        message="队列删除成功",
        data={"queue_id": queue_id}
    )
