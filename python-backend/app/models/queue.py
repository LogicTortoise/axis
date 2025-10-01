from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TaskQueue(Base):
    __tablename__ = "task_queues"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default='pending', nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="queues")
    queue_tasks = relationship("QueueTask", back_populates="queue", cascade="all, delete-orphan")


class QueueTask(Base):
    __tablename__ = "queue_tasks"

    id = Column(String, primary_key=True, index=True)
    queue_id = Column(String, ForeignKey("task_queues.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, index=True)
    status = Column(String, default='pending', nullable=False)
    execution_log = Column(Text)
    error_reason = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    queue = relationship("TaskQueue", back_populates="queue_tasks")
    task = relationship("Task", back_populates="queue_tasks")
