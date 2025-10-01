from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    project_goal: str = Field(..., min_length=1)
    icon: Optional[str] = "fas fa-folder"
    icon_color: Optional[str] = "bg-primary"

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    project_goal: Optional[str] = Field(None, min_length=1)
    icon: Optional[str] = None
    icon_color: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: str
    created_at: datetime
    updated_at: datetime
    active_tasks: Optional[int] = 0
    completed_tasks: Optional[int] = 0

    class Config:
        from_attributes = True

class WorkspaceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    workspaces: list[WorkspaceResponse]
