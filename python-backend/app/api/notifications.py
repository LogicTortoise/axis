from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.database import get_db
from app.models import Notification, Task
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    BatchReadRequest,
    UnreadCountResponse
)
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=ResponseModel[NotificationListResponse])
def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    type: Optional[str] = Query(None, regex="^(task-completion|task-failure|system-alert)$"),
    is_read: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取通知列表"""
    query = db.query(Notification)

    # 筛选
    if type:
        query = query.filter(Notification.type == type)
    if is_read is not None:
        query = query.filter(Notification.is_read == (1 if is_read else 0))
    if search:
        query = query.filter(Notification.title.contains(search))

    # 按创建时间倒序
    query = query.order_by(Notification.created_at.desc())

    total = query.count()
    notifications = query.offset((page - 1) * page_size).limit(page_size).all()

    # 计算未读数量
    unread_count = db.query(Notification).filter(Notification.is_read == 0).count()

    notification_responses = []
    for notification in notifications:
        task_name = None
        if notification.related_task_id:
            task = db.query(Task).filter(Task.id == notification.related_task_id).first()
            if task:
                task_name = task.title

        notif_dict = {
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "content": notification.content,
            "related_task_id": notification.related_task_id,
            "is_read": bool(notification.is_read),
            "task_name": task_name,
            "action_data": notification.action_data,
            "created_at": notification.created_at
        }
        notification_responses.append(notif_dict)

    return ResponseModel(
        code=200,
        message="获取成功",
        data=NotificationListResponse(
            total=total,
            unread_count=unread_count,
            page=page,
            page_size=page_size,
            notifications=notification_responses
        )
    )

@router.put("/{notification_id}/read", response_model=ResponseModel[dict])
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db)
):
    """标记通知为已读"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="通知不存在")

    notification.is_read = 1
    db.commit()

    return ResponseModel(
        code=200,
        message="标记成功",
        data={}
    )

@router.post("/batch-read", response_model=ResponseModel[dict])
def batch_mark_read(
    request: BatchReadRequest,
    db: Session = Depends(get_db)
):
    """批量标记通知为已读"""
    notifications = db.query(Notification).filter(
        Notification.id.in_(request.notification_ids)
    ).all()

    for notification in notifications:
        notification.is_read = 1

    db.commit()

    return ResponseModel(
        code=200,
        message="标记成功",
        data={"marked_count": len(notifications)}
    )

@router.post("/read-all", response_model=ResponseModel[dict])
def mark_all_read(
    db: Session = Depends(get_db)
):
    """全部标记为已读"""
    unread_notifications = db.query(Notification).filter(Notification.is_read == 0).all()

    for notification in unread_notifications:
        notification.is_read = 1

    db.commit()

    return ResponseModel(
        code=200,
        message="标记成功",
        data={"marked_count": len(unread_notifications)}
    )

@router.get("/unread-count", response_model=ResponseModel[UnreadCountResponse])
def get_unread_count(
    db: Session = Depends(get_db)
):
    """获取未读通知数量"""
    unread_count = db.query(Notification).filter(Notification.is_read == 0).count()

    return ResponseModel(
        code=200,
        message="获取成功",
        data=UnreadCountResponse(unread_count=unread_count)
    )
