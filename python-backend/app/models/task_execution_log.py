from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TaskExecutionLog(Base):
    """任务执行日志表 - 记录每次任务执行的详细过程"""
    __tablename__ = "task_execution_logs"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    execution_number = Column(Integer, nullable=False, index=True)  # 第几次执行
    response_type = Column(String)  # response的类型
    response_content = Column(Text)  # response的完整内容，可能非常大
    status = Column(String, default='running')  # running, completed, failed
    thread_id = Column(String, index=True)  # 对话线程ID
    thread_number = Column(Integer)  # 第几次对话
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="execution_logs")

    # 创建复合索引，方便查询某个任务的所有执行记录
    __table_args__ = (
        Index('idx_task_execution', 'task_id', 'execution_number'),
    )
