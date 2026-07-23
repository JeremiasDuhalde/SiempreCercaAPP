"""Schemas de agenda / turnos."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None
    type: str
    scheduled_at: datetime
    detail: str | None
    reminder_sent: bool
    status: str
    recurrence: str | None = None
    recurrence_end: date | None = None
    whatsapp_reminder: bool
    notes: str | None = None
    created_at: datetime

    client_name: str | None = None


class AppointmentCreate(BaseModel):
    client_id: int | None = None
    type: str
    scheduled_at: datetime
    detail: str
    status: str = "pendiente"
    recurrence: str | None = None
    recurrence_end: date | None = None
    whatsapp_reminder: bool = False
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    client_id: int | None = None
    type: str | None = None
    scheduled_at: datetime | None = None
    detail: str | None = None
    status: str | None = None
    recurrence: str | None = None
    recurrence_end: date | None = None
    whatsapp_reminder: bool | None = None
    notes: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str  # cumplido / no_cumplido / cancelado
