"""Schemas de agenda / turnos."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None
    type: str
    scheduled_at: datetime
    detail: str | None
    reminder_sent: bool
    created_at: datetime

    client_name: str | None = None


class AppointmentCreate(BaseModel):
    client_id: int | None = None
    type: str
    scheduled_at: datetime
    detail: str


class AppointmentUpdate(BaseModel):
    client_id: int | None = None
    type: str | None = None
    scheduled_at: datetime | None = None
    detail: str | None = None
