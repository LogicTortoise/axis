from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class StatusEnum(str, Enum):
    pending = "pending"
    progress = "progress"
    completed = "completed"
    failed = "failed"

class SourceEnum(str, Enum):
    api = "api"
    manual = "manual"

class QueueStatusEnum(str, Enum):
    none = "none"
    queue = "queue"
    running = "running"

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.medium

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[StatusEnum] = None
    manual_check: Optional[bool] = None
    start_hook: Optional[str] = None
    stop_hook: Optional[str] = None

class TaskResponse(TaskBase):
    id: str
    workspace_id: str
    status: StatusEnum
    queue_status: QueueStatusEnum
    manual_check: bool
    source: SourceEnum
    api_task_id: Optional[str] = None
    execution_id: Optional[str] = None
    dispatch_time: Optional[datetime] = None
    start_hook: Optional[str] = None
    stop_hook: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    tasks: list[TaskResponse]

class TaskDispatchRequest(BaseModel):
    execution_params: Optional[dict] = None

class TaskDispatchResponse(BaseModel):
    execution_id: str
    dispatch_time: datetime
    status: StatusEnum
