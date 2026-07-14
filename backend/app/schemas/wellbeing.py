"""Schemas de bienestar predictivo."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class WellbeingSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    date: date
    sleep_hours: float | None
    activity_steps: int | None
    mood: str | None
    voice_analysis: dict | None
    ai_score: float | None
    ai_flags: list[str] | None
    ai_recommendation: str | None
    family_report: str | None
    family_report_sent: bool
    created_at: datetime

    client_name: str


class WellbeingSnapshotCreate(BaseModel):
    client_id: int
    date: date
    sleep_hours: float | None = None
    activity_steps: int | None = None
    mood: str | None = None
    ai_score: float | None = None
    ai_flags: list[str] | None = None
    ai_recommendation: str | None = None
    family_report: str | None = None
