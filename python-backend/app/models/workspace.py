from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    project_goal = Column(Text, nullable=False)
    path = Column(Text)  # 工作空间的文件系统路径
    icon = Column(String, default='fas fa-folder')
    icon_color = Column(String, default='bg-primary')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    tasks = relationship("Task", back_populates="workspace", cascade="all, delete-orphan")
    hooks = relationship("HookConfig", back_populates="workspace", cascade="all, delete-orphan")
    queues = relationship("TaskQueue", back_populates="workspace", cascade="all, delete-orphan")
