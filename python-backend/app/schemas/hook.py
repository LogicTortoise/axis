from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class HookTypeEnum(str, Enum):
    start = "start"
    stop = "stop"

class TriggerConditionEnum(str, Enum):
    always = "always"
    success = "success"
    failure = "failure"

class HookConfigBase(BaseModel):
    name: str = Field(..., min_length=1)
    type: HookTypeEnum
    curl_command: str = Field(..., min_length=1)
    trigger_condition: TriggerConditionEnum = TriggerConditionEnum.always
    enabled: bool = True

class HookConfigCreate(HookConfigBase):
    task_id: Optional[str] = None

class HookConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    type: Optional[HookTypeEnum] = None
    curl_command: Optional[str] = Field(None, min_length=1)
    trigger_condition: Optional[TriggerConditionEnum] = None
    enabled: Optional[bool] = None

class HookConfigResponse(HookConfigBase):
    id: str
    workspace_id: Optional[str] = None
    task_id: Optional[str] = None
    last_execution: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HookConfigListResponse(BaseModel):
    hooks: list[HookConfigResponse]
