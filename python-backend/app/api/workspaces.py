from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import uuid

from app.database import get_db
from app.models import Workspace, Task
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspaceListResponse
)
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.get("", response_model=ResponseModel[WorkspaceListResponse])
def get_workspaces(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = Query("created_at", regex="^(name|created_at)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """获取工作区列表"""
    query = db.query(Workspace)

    if search:
        query = query.filter(Workspace.name.contains(search))

    # 排序
    if sort_order == "asc":
        query = query.order_by(getattr(Workspace, sort_by).asc())
    else:
        query = query.order_by(getattr(Workspace, sort_by).desc())

    total = query.count()
    workspaces = query.offset((page - 1) * page_size).limit(page_size).all()

    # 计算每个工作区的任务统计
    workspace_responses = []
    for workspace in workspaces:
        active_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status.in_(["pending", "progress"])
        ).count()

        completed_tasks = db.query(Task).filter(
            Task.workspace_id == workspace.id,
            Task.status == "completed"
        ).count()

        workspace_dict = {
            "id": workspace.id,
            "name": workspace.name,
            "description": workspace.description,
            "project_goal": workspace.project_goal,
            "path": workspace.path,
            "icon": workspace.icon,
            "icon_color": workspace.icon_color,
            "created_at": workspace.created_at,
            "updated_at": workspace.updated_at,
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks
        }
        workspace_responses.append(workspace_dict)

    return ResponseModel(
        code=200,
        message="获取成功",
        data=WorkspaceListResponse(
            total=total,
            page=page,
            page_size=page_size,
            workspaces=workspace_responses
        )
    )

@router.get("/{workspace_id}", response_model=ResponseModel[WorkspaceResponse])
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """获取工作区详情"""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    active_tasks = db.query(Task).filter(
        Task.workspace_id == workspace.id,
        Task.status.in_(["pending", "progress"])
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.workspace_id == workspace.id,
        Task.status == "completed"
    ).count()

    workspace_dict = {
        "id": workspace.id,
        "name": workspace.name,
        "description": workspace.description,
        "project_goal": workspace.project_goal,
        "path": workspace.path,
        "icon": workspace.icon,
        "icon_color": workspace.icon_color,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks
    }

    return ResponseModel(
        code=200,
        message="获取成功",
        data=workspace_dict
    )

@router.post("", response_model=ResponseModel[WorkspaceResponse])
def create_workspace(
    workspace: WorkspaceCreate,
    db: Session = Depends(get_db)
):
    """创建工作区"""
    db_workspace = Workspace(
        id=str(uuid.uuid4()),
        name=workspace.name,
        description=workspace.description,
        project_goal=workspace.project_goal,
        path=workspace.path,
        icon=workspace.icon or "fas fa-folder",
        icon_color=workspace.icon_color or "bg-primary"
    )

    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)

    workspace_dict = {
        "id": db_workspace.id,
        "name": db_workspace.name,
        "description": db_workspace.description,
        "project_goal": db_workspace.project_goal,
        "path": db_workspace.path,
        "icon": db_workspace.icon,
        "icon_color": db_workspace.icon_color,
        "created_at": db_workspace.created_at,
        "updated_at": db_workspace.updated_at,
        "active_tasks": 0,
        "completed_tasks": 0
    }

    return ResponseModel(
        code=200,
        message="创建成功",
        data=workspace_dict
    )

@router.put("/{workspace_id}", response_model=ResponseModel[WorkspaceResponse])
def update_workspace(
    workspace_id: str,
    workspace: WorkspaceUpdate,
    db: Session = Depends(get_db)
):
    """更新工作区"""
    db_workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    update_data = workspace.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_workspace, key, value)

    db.commit()
    db.refresh(db_workspace)

    active_tasks = db.query(Task).filter(
        Task.workspace_id == db_workspace.id,
        Task.status.in_(["pending", "progress"])
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.workspace_id == db_workspace.id,
        Task.status == "completed"
    ).count()

    workspace_dict = {
        "id": db_workspace.id,
        "name": db_workspace.name,
        "description": db_workspace.description,
        "project_goal": db_workspace.project_goal,
        "path": db_workspace.path,
        "icon": db_workspace.icon,
        "icon_color": db_workspace.icon_color,
        "created_at": db_workspace.created_at,
        "updated_at": db_workspace.updated_at,
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks
    }

    return ResponseModel(
        code=200,
        message="更新成功",
        data=workspace_dict
    )

@router.delete("/{workspace_id}", response_model=ResponseModel[dict])
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """删除工作区"""
    db_workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="工作区不存在")

    db.delete(db_workspace)
    db.commit()

    return ResponseModel(
        code=200,
        message="删除成功",
        data={}
    )
