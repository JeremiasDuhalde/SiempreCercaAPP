"""Router de bienestar predictivo."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.wellbeing import WellbeingSnapshot
from app.schemas.wellbeing import WellbeingSnapshotOut
from app.security import get_current_user

router = APIRouter(prefix="/api/wellbeing", tags=["wellbeing"])


@router.get("/", response_model=list[WellbeingSnapshotOut])
async def list_snapshots(
    snapshot_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_date = snapshot_date or date.today()
    query = (
        select(WellbeingSnapshot)
        .options(selectinload(WellbeingSnapshot.client))
        .where(WellbeingSnapshot.date == target_date)
        .order_by(WellbeingSnapshot.client_id)
    )
    result = await db.execute(query)
    snapshots = list(result.scalars().all())

    enriched = []
    for s in snapshots:
        d = WellbeingSnapshotOut.model_validate(s)
        d.client_name = s.client.name if s.client else ""
        enriched.append(d)
    return enriched


@router.get("/{client_id}", response_model=list[WellbeingSnapshotOut])
async def get_client_wellbeing(
    client_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cutoff = date.today() - timedelta(days=days)
    query = (
        select(WellbeingSnapshot)
        .options(selectinload(WellbeingSnapshot.client))
        .where(WellbeingSnapshot.client_id == client_id)
        .where(WellbeingSnapshot.date >= cutoff)
        .order_by(WellbeingSnapshot.date.desc())
    )
    result = await db.execute(query)
    snapshots = list(result.scalars().all())

    enriched = []
    for s in snapshots:
        d = WellbeingSnapshotOut.model_validate(s)
        d.client_name = s.client.name if s.client else ""
        enriched.append(d)
    return enriched
