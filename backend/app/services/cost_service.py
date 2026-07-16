"""Servicio de tracking de costos de servicios externos."""

from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cost_tracking import CostRecord


async def record_cost(
    db: AsyncSession,
    *,
    service: str,
    category: str,
    quantity: int = 1,
    unit_cost_usd: float = 0.0,
    detail: str | None = None,
) -> None:
    """Registra un costo. Acumula si ya existe registro para ese servicio/categoria/dia."""
    today = date.today()
    result = await db.execute(
        select(CostRecord).where(
            CostRecord.date == today,
            CostRecord.service == service,
            CostRecord.category == category,
        )
    )
    record = result.scalar_one_or_none()

    if record:
        record.quantity += quantity
        record.total_cost_usd = record.quantity * unit_cost_usd
    else:
        record = CostRecord(
            date=today,
            service=service,
            category=category,
            quantity=quantity,
            unit_cost_usd=unit_cost_usd,
            total_cost_usd=quantity * unit_cost_usd,
            detail=detail,
        )
        db.add(record)

    await db.commit()


async def get_cost_summary(db: AsyncSession, days: int = 30) -> dict:
    """Resumen de costos agrupado por servicio."""
    since = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            CostRecord.service,
            func.sum(CostRecord.quantity).label("total_quantity"),
            func.sum(CostRecord.total_cost_usd).label("total_cost"),
        )
        .where(CostRecord.date >= since)
        .group_by(CostRecord.service)
    )

    services = {}
    for row in result.all():
        services[row.service] = {
            "quantity": int(row.total_quantity or 0),
            "cost_usd": round(float(row.total_cost or 0), 2),
        }

    return services


async def get_daily_costs(db: AsyncSession, days: int = 30) -> list[dict]:
    """Costos diarios para grafico."""
    since = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            CostRecord.date,
            CostRecord.service,
            func.sum(CostRecord.total_cost_usd).label("cost"),
            func.sum(CostRecord.quantity).label("qty"),
        )
        .where(CostRecord.date >= since)
        .group_by(CostRecord.date, CostRecord.service)
        .order_by(CostRecord.date)
    )

    return [
        {
            "date": str(row.date),
            "service": row.service,
            "cost_usd": round(float(row.cost or 0), 2),
            "quantity": int(row.qty or 0),
        }
        for row in result.all()
    ]
