"""Modelo de alerta."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id"), nullable=True, index=True
    )
    device_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("devices.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(20))  # sos|caida|geo|bateria|inactiv|compania
    priority: Mapped[int] = mapped_column(SmallInteger)  # 1, 2, 3
    status: Mapped[str] = mapped_column(
        String(20), default="nueva", index=True
    )  # nueva|atendiendo|resuelta
    triage_score: Mapped[float] = mapped_column(Float, default=0.0)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    client = relationship("Client", back_populates="alerts")
    device = relationship("Device")
    resolver = relationship("User")
    logs = relationship("AlertLog", back_populates="alert", order_by="AlertLog.created_at")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(50))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    alert = relationship("Alert", back_populates="logs")
    user = relationship("User")
