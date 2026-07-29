"""Modelo de dispositivo GEO (reloj o colgante)."""

from datetime import datetime, timezone

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), unique=True
    )
    model: Mapped[str] = mapped_column(String(50))  # "Reloj GEO-W3" | "Colgante GEO-P1"
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_device_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )
    battery_pct: Mapped[int] = mapped_column(SmallInteger, default=100)
    phone_battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flic_battery_voltage: Mapped[float | None] = mapped_column(Float, nullable=True)
    signal_strength: Mapped[int] = mapped_column(SmallInteger, default=4)  # 0-4
    last_location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", back_populates="device")
