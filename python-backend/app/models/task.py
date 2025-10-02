from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text)
    priority = Column(String, default='medium', nullable=False)
    status = Column(String, default='pending', nullable=False, index=True)
    source = Column(String, nullable=False, index=True)
    api_task_id = Column(Text)
    manual_check = Column(Integer, default=0)
    queue_status = Column(String, default='none', nullable=False)
    api_data = Column(Text)
    execution_id = Column(Text)
    dispatch_time = Column(TIMESTAMP)
    error_message = Column(Text)  # 存储错误信息
    execution_output = Column(Text)  # 存储执行输出
    start_hook_curl = Column(Text)
    stop_hook_curl = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="tasks")
    hooks = relationship("HookConfig", back_populates="task", cascade="all, delete-orphan")
    queue_tasks = relationship("QueueTask", back_populates="task", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="task")
