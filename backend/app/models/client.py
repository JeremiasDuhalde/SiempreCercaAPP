"""Modelo de cliente (adulto mayor monitoreado)."""

from datetime import date, datetime, timezone

from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    age: Mapped[int] = mapped_column(Integer)
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str] = mapped_column(String(300))
    address_entre: Mapped[str | None] = mapped_column(String(200), nullable=True)
    barrio: Mapped[str] = mapped_column(String(100), index=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    conditions: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    medications: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    alta_completa: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    contacts = relationship("Contact", back_populates="client", order_by="Contact.order")
    device = relationship("Device", back_populates="client", uselist=False)
    geofence = relationship("Geofence", back_populates="client", uselist=False)
    alerts = relationship("Alert", back_populates="client")
