"""Modelos de bienestar predictivo."""

from datetime import date, datetime, timezone

from sqlalchemy import ARRAY, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WellbeingSnapshot(Base):
    __tablename__ = "wellbeing_snapshots"
    __table_args__ = (
        # Un snapshot por cliente por día
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mood: Mapped[str | None] = mapped_column(String(20), nullable=True)  # bueno|normal|bajo|sin dato
    voice_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-100
    ai_flags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    ai_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_report_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    client = relationship("Client")
