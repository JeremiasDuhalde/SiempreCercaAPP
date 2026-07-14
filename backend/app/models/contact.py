"""Modelo de contacto (familiar / vecino / emergencia)."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    order: Mapped[int] = mapped_column(SmallInteger)  # 1, 2, 3 — prioridad de llamada
    name: Mapped[str] = mapped_column(String(200))
    relationship_label: Mapped[str] = mapped_column(String(100))  # "Hija (vive a 3 cuadras)"
    phone: Mapped[str] = mapped_column(String(50))
    has_key: Mapped[bool] = mapped_column(Boolean, default=False)  # tiene acceso/llave
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    client = relationship("Client", back_populates="contacts")
