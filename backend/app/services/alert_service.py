"""Servicio de alertas."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alert import Alert, AlertLog


async def list_alerts(
    db: AsyncSession,
    *,
    status: str | None = None,
    client_id: int | None = None,
    alert_type: str | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[Alert], int]:
    query = select(Alert).options(
        selectinload(Alert.client),
        selectinload(Alert.device),
    )

    if status:
        query = query.where(Alert.status == status)
    if client_id is not None:
        query = query.where(Alert.client_id == client_id)
    if alert_type:
        query = query.where(Alert.type == alert_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Alert.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_alert_with_logs(db: AsyncSession, alert_id: int) -> Alert:
    query = (
        select(Alert)
        .options(
            selectinload(Alert.client),
            selectinload(Alert.device),
            selectinload(Alert.logs).selectinload(AlertLog.user),
        )
        .where(Alert.id == alert_id)
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return alert


async def update_alert_status(
    db: AsyncSession,
    alert_id: int,
    status: str,
    user_id: int,
    detail: str | None = None,
) -> Alert:
    alert = await get_alert_with_logs(db, alert_id)

    alert.status = status
    if status == "resuelta":
        alert.resolved_by = user_id
        alert.resolved_at = datetime.now(timezone.utc)

    log = AlertLog(
        alert_id=alert_id,
        user_id=user_id,
        action=status,
        detail=detail,
    )
    db.add(log)

    await db.commit()
    await db.refresh(alert)
    return alert


async def get_alert_stats(db: AsyncSession) -> dict:
    # Total de alertas activas (no resueltas)
    active_query = select(func.count()).where(Alert.status != "resuelta")
    total_active = (await db.execute(active_query)).scalar_one()

    # Por tipo (no resueltas)
    by_type_query = (
        select(Alert.type, func.count())
        .where(Alert.status != "resuelta")
        .group_by(Alert.type)
    )
    by_type_rows = (await db.execute(by_type_query)).all()
    by_type = {row[0]: row[1] for row in by_type_rows}

    # Por status (todos)
    by_status_query = select(Alert.status, func.count()).group_by(Alert.status)
    by_status_rows = (await db.execute(by_status_query)).all()
    by_status = {row[0]: row[1] for row in by_status_rows}

    return {
        "total_active": total_active,
        "by_type": by_type,
        "by_status": by_status,
    }
