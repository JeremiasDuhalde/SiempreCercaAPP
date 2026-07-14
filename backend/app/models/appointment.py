"""Modelo de agenda (turnos, remises, medicación, noche)."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id"), nullable=True, index=True
    )  # nullable para eventos "all" (ej. saludo nocturno a todos)
    type: Mapped[str] = mapped_column(String(20))  # turno|remis|med|noche
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    client = relationship("Client")
