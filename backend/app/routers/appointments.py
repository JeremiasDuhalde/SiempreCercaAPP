"""Router de agenda (turnos)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentUpdate,
)
from app.security import get_current_user
from app.services import appointment_service

router = APIRouter(prefix="/api/agenda", tags=["agenda"])


@router.get("/", response_model=list[AppointmentOut])
async def list_appointments(
    date_from: date | None = None,
    date_to: date | None = None,
    client_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items = await appointment_service.list_appointments(
        db,
        date_from=date_from,
        date_to=date_to,
        client_id=client_id,
    )
    enriched = []
    for appt in items:
        d = AppointmentOut.model_validate(appt)
        if appt.client:
            d.client_name = appt.client.name
        enriched.append(d)
    return enriched


@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await appointment_service.create_appointment(db, body)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: int,
    body: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await appointment_service.update_appointment(db, appointment_id, body)


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: int,
    body: AppointmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    valid = {"cumplido", "no_cumplido", "cancelado", "pendiente"}
    if body.status not in valid:
        raise HTTPException(400, f"Estado invalido. Validos: {', '.join(valid)}")
    return await appointment_service.update_appointment_status(db, appointment_id, body.status)


@router.get("/client/{client_id}", response_model=list[AppointmentOut])
async def list_client_appointments(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items = await appointment_service.list_appointments(db, client_id=client_id)
    enriched = []
    for appt in items:
        d = AppointmentOut.model_validate(appt)
        if appt.client:
            d.client_name = appt.client.name
        enriched.append(d)
    return enriched


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await appointment_service.delete_appointment(db, appointment_id)
