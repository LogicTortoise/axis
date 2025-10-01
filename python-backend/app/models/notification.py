from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    related_task_id = Column(String, ForeignKey("tasks.id", ondelete="SET NULL"))
    is_read = Column(Integer, default=0, index=True)
    action_data = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    # Relationships
    task = relationship("Task", back_populates="notifications")
