"""Router de costos de servicios externos."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security import require_role
from app.services import cost_service

router = APIRouter(prefix="/api/costs", tags=["costs"])


@router.get("/summary")
async def cost_summary(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Resumen de costos por servicio (ultimos N dias)."""
    services = await cost_service.get_cost_summary(db, days=days)
    daily = await cost_service.get_daily_costs(db, days=days)

    total = sum(s["cost_usd"] for s in services.values())

    return {
        "period_days": days,
        "total_cost_usd": round(total, 2),
        "by_service": services,
        "daily": daily,
    }
