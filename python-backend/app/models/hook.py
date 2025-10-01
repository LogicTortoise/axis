from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class HookConfig(Base):
    __tablename__ = "hook_configs"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True)
    curl_command = Column(Text, nullable=False)
    trigger_condition = Column(String, default='always')
    enabled = Column(Integer, default=1, index=True)
    last_execution = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="hooks")
    task = relationship("Task", back_populates="hooks")
