"""Servicio de agenda (turnos, remises, medicación, noche)."""

from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment


async def list_appointments(
    db: AsyncSession,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    client_id: int | None = None,
) -> list[Appointment]:
    query = select(Appointment).options(selectinload(Appointment.client))

    if client_id is not None:
        query = query.where(Appointment.client_id == client_id)
    if date_from is not None:
        dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        query = query.where(Appointment.scheduled_at >= dt_from)
    if date_to is not None:
        dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)
        query = query.where(Appointment.scheduled_at <= dt_to)

    query = query.order_by(Appointment.scheduled_at)
    result = await db.execute(query)
    return list(result.scalars().all())


async def _get_appointment(db: AsyncSession, appt_id: int) -> Appointment:
    result = await db.execute(select(Appointment).where(Appointment.id == appt_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return appt


async def create_appointment(db: AsyncSession, data) -> Appointment:
    appt = Appointment(**data.model_dump(exclude_unset=False))
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


async def update_appointment(db: AsyncSession, appt_id: int, data) -> Appointment:
    appt = await _get_appointment(db, appt_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    await db.commit()
    await db.refresh(appt)
    return appt


async def update_appointment_status(db: AsyncSession, appt_id: int, status: str) -> Appointment:
    appt = await _get_appointment(db, appt_id)
    appt.status = status
    await db.commit()
    await db.refresh(appt)
    return appt


async def delete_appointment(db: AsyncSession, appt_id: int) -> None:
    appt = await _get_appointment(db, appt_id)
    await db.delete(appt)
    await db.commit()
