from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskExecutionLogBase(BaseModel):
    task_id: str
    execution_number: int
    response_type: Optional[str] = None
    response_content: Optional[str] = None
    status: str = 'running'

class TaskExecutionLogCreate(TaskExecutionLogBase):
    pass

class TaskExecutionLogUpdate(BaseModel):
    response_type: Optional[str] = None
    response_content: Optional[str] = None
    status: Optional[str] = None

class TaskExecutionLog(TaskExecutionLogBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
