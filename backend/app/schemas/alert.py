"""Schemas de alertas y logs de alerta."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None
    device_id: int | None
    type: str
    priority: int
    status: str
    triage_score: float
    raw_payload: dict | None
    resolved_by: int | None
    resolved_at: datetime | None
    created_at: datetime

    client_name: str | None = None


class AlertLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    detail: str | None
    created_at: datetime

    user_name: str | None = None


class AlertWithLogs(AlertOut):
    logs: list[AlertLogOut]


class AlertStatusUpdate(BaseModel):
    status: Literal["atendiendo", "pendiente", "falsa_alarma", "resuelta"]
    detail: str | None = None


class AlertStats(BaseModel):
    total_active: int
    by_type: dict[str, int]
    by_status: dict[str, int]
