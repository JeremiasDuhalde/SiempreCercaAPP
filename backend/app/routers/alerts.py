"""Router de alertas."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.alert import AlertOut, AlertStats, AlertStatusUpdate, AlertWithLogs
from app.schemas.common import PaginatedResponse
from app.security import get_current_user
from app.services import alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/stats", response_model=AlertStats)
async def get_alert_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await alert_service.get_alert_stats(db)
    return AlertStats(**data)


@router.get("/", response_model=PaginatedResponse[AlertOut])
async def list_alerts(
    status: str | None = None,
    client_id: int | None = None,
    alert_type: str | None = None,
    page: int = 1,
    per_page: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = await alert_service.list_alerts(
        db,
        status=status,
        client_id=client_id,
        alert_type=alert_type,
        page=page,
        per_page=per_page,
    )
    # Enrich with client_name from the loaded relationship
    alert_dicts = []
    for alert in items:
        d = AlertOut.model_validate(alert)
        if alert.client:
            d.client_name = alert.client.name
        alert_dicts.append(d)

    return PaginatedResponse(
        items=alert_dicts,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{alert_id}", response_model=AlertWithLogs)
async def get_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    alert = await alert_service.get_alert_with_logs(db, alert_id)
    result = AlertWithLogs.model_validate(alert)
    if alert.client:
        result.client_name = alert.client.name
    for log, log_out in zip(alert.logs, result.logs):
        if log.user:
            log_out.user_name = log.user.name
    return result


@router.patch("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: int,
    body: AlertStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = await alert_service.update_alert_status(
        db,
        alert_id=alert_id,
        status=body.status,
        user_id=current_user.id,
        detail=body.detail,
    )
    result = AlertOut.model_validate(alert)
    if alert.client:
        result.client_name = alert.client.name
    return result
