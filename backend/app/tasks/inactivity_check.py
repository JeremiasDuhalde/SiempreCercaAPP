"""Tarea Celery: detectar dispositivos inactivos."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.celery_app import celery
from app.config import settings
from app.models.alert import Alert
from app.models.device import Device

logger = logging.getLogger(__name__)


def _get_session_factory():
    engine = create_async_engine(settings.database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


@celery.task(name="app.tasks.inactivity_check.check_inactivity")
def check_inactivity() -> None:
    """Chequea devices con last_seen_at > 2h y genera alertas de inactividad.

    La app Siempre Cerca Monitor envia health ping cada 1 hora.
    Si faltan 2 pings consecutivos (2h), se genera alerta.
    """
    asyncio.run(_check_inactivity())


async def _check_inactivity() -> None:
    Session = _get_session_factory()
    now = datetime.now(timezone.utc)
    threshold_4h = now - timedelta(hours=2)
    threshold_6h = now - timedelta(hours=4)

    async with Session() as db:
        # Dispositivos online que no se han visto en más de 2 horas
        result = await db.execute(
            select(Device).where(
                and_(
                    Device.last_seen_at < threshold_4h,
                    Device.is_online == True,  # noqa: E712
                )
            )
        )
        devices = result.scalars().all()

        created = 0
        marked_offline = 0
        for device in devices:
            # Crear alerta de inactividad si no hay una abierta
            existing = await db.execute(
                select(Alert).where(
                    and_(
                        Alert.client_id == device.client_id,
                        Alert.type == "inactiv",
                        Alert.status.in_(["nueva", "atendiendo"]),
                    )
                )
            )
            if existing.scalar_one_or_none() is None:
                alert = Alert(
                    client_id=device.client_id,
                    device_id=device.id,
                    type="inactiv",
                    priority=2,
                    status="nueva",
                )
                db.add(alert)
                created += 1
                logger.info(
                    "Alerta inactividad creada: client_id=%s device_id=%d last_seen=%s",
                    device.client_id,
                    device.id,
                    device.last_seen_at,
                )

            # Si lleva más de 6 horas sin señal, marcar como offline
            if device.last_seen_at is not None and device.last_seen_at < threshold_6h:
                device.is_online = False
                marked_offline += 1
                logger.info(
                    "Dispositivo marcado offline: device_id=%d client_id=%s",
                    device.id,
                    device.client_id,
                )

        if created or marked_offline:
            await db.commit()

    logger.info(
        "check_inactivity finalizado: %d alertas nuevas, %d dispositivos offline sobre %d revisados",
        created,
        marked_offline,
        len(devices),
    )
