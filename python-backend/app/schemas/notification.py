from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class NotificationTypeEnum(str, Enum):
    task_completion = "task-completion"
    task_failure = "task-failure"
    system_alert = "system-alert"

class NotificationBase(BaseModel):
    type: NotificationTypeEnum
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    related_task_id: Optional[str] = None
    action_data: Optional[dict] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    is_read: bool
    task_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    page: int
    page_size: int
    notifications: list[NotificationResponse]

class BatchReadRequest(BaseModel):
    notification_ids: list[str] = Field(..., min_items=1)

class UnreadCountResponse(BaseModel):
    unread_count: int
