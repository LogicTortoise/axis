from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar('T')

class ResponseModel(BaseModel, Generic[T]):
    code: int = 200
    message: str = "成功"
    data: Optional[T] = None

class ErrorResponse(BaseModel):
    code: int
    message: str
    detail: Optional[str] = None
