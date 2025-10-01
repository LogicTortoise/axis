from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class QueueStatusEnum(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"

class TaskStatusEnum(str, Enum):
    pending = "pending"
    progress = "progress"
    completed = "completed"
    failed = "failed"

class TaskQueueBase(BaseModel):
    name: str = Field(..., min_length=1)

class TaskQueueCreate(TaskQueueBase):
    task_ids: list[str] = Field(..., min_items=1)

class TaskQueueResponse(TaskQueueBase):
    id: str
    status: QueueStatusEnum
    progress: int = 0
    total_tasks: int
    completed_tasks: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QueueTaskResponse(BaseModel):
    id: str
    task_id: str
    order_index: int
    name: str
    status: TaskStatusEnum
    error_reason: Optional[str] = None

    class Config:
        from_attributes = True

class TaskQueueDetailResponse(TaskQueueResponse):
    tasks: list[QueueTaskResponse]

class TaskQueueListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    queues: list[TaskQueueResponse]

class AddTasksToQueueRequest(BaseModel):
    task_ids: list[str] = Field(..., min_items=1)

class ReorderTasksRequest(BaseModel):
    task_orders: list[dict[str, int]] = Field(..., min_items=1)
