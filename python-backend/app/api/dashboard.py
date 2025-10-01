from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Workspace, Task, Notification
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/overview", response_model=ResponseModel[dict])
def get_dashboard_overview(
    db: Session = Depends(get_db)
):
    """获取仪表盘概览数据"""
    # 获取所有工作区
    workspaces = db.query(Workspace).all()

    workspace_summary = []
    for workspace in workspaces:
        pending_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status == "pending"
        ).count()

        progress_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status == "progress"
        ).count()

        completed_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status == "completed"
        ).count()

        failed_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status == "failed"
        ).count()

        workspace_summary.append({
            "id": workspace.id,
            "name": workspace.name,
            "icon": workspace.icon,
            "icon_color": workspace.icon_color,
            "project_goal": workspace.project_goal,
            "pending_tasks": pending_tasks,
            "progress_tasks": progress_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks
        })

    # 获取最近活动（最近的通知）
    recent_activities = db.query(Notification).order_by(
        Notification.created_at.desc()
    ).limit(10).all()

    activities = []
    for activity in recent_activities:
        workspace_name = None
        if activity.related_task_id:
            task = db.query(Task).filter(Task.id == activity.related_task_id).first()
            if task:
                workspace = db.query(Workspace).filter(Workspace.id == task.workspace_id).first()
                if workspace:
                    workspace_name = workspace.name

        activities.append({
            "id": activity.id,
            "type": activity.type,
            "title": activity.title,
            "workspace_name": workspace_name,
            "status": "completed" if activity.type == "task-completion" else "failed",
            "created_at": activity.created_at
        })

    return ResponseModel(
        code=200,
        message="获取成功",
        data={
            "workspace_summary": workspace_summary,
            "recent_activities": activities
        }
    )
