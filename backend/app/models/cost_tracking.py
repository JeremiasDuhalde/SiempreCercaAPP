"""Modelo para tracking de costos de servicios externos."""

from datetime import date, datetime, timezone
from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CostRecord(Base):
    __tablename__ = "cost_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    service: Mapped[str] = mapped_column(String(50), index=True)  # "whatsapp_meta", "whatsapp_baileys", "gcp", "llm"
    category: Mapped[str] = mapped_column(String(50))  # "conversation_utility", "conversation_service", "compute", "api_call"
    quantity: Mapped[int] = mapped_column(Integer, default=0)  # number of units (conversations, api calls, etc)
    unit_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)  # cost per unit in USD
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)  # total = quantity * unit_cost
    detail: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
