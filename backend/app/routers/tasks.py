"""Router de tareas para operadores."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Task
from app.models.user import User
from app.security import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    category: str = "manual"
    priority: int = 2
    client_id: int | None = None
    assigned_to: int | None = None
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: int | None = None
    assigned_to: int | None = None
    due_date: datetime | None = None


@router.get("/stats")
async def task_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    active = await db.execute(
        select(func.count(Task.id)).where(Task.status != "completada")
    )
    pending = await db.execute(
        select(func.count(Task.id)).where(Task.status == "pendiente")
    )
    high = await db.execute(
        select(func.count(Task.id)).where(Task.status != "completada", Task.priority == 3)
    )
    return {
        "active": active.scalar() or 0,
        "pending": pending.scalar() or 0,
        "high_priority": high.scalar() or 0,
    }


@router.get("/")
async def list_tasks(
    status: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Task).order_by(Task.priority.desc(), Task.created_at.desc())
    if status:
        query = query.where(Task.status == status)
    if category:
        query = query.where(Task.category == category)
    result = await db.execute(query.limit(100))
    tasks = result.scalars().all()

    items = []
    for t in tasks:
        items.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "client_id": t.client_id,
            "assigned_to": t.assigned_to,
            "created_by": t.created_by,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return items


@router.post("/", status_code=201)
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = Task(**body.model_dump(), created_by=user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "title": task.title, "status": task.status}


@router.patch("/{task_id}")
async def update_task(
    task_id: int,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "status" and value == "completada":
            task.completed_at = datetime.now(timezone.utc)
        setattr(task, field, value)
    await db.commit()
    return {"id": task.id, "status": task.status}


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    await db.delete(task)
    await db.commit()
