"""Tarea Celery: detectar batería baja."""

import asyncio
import logging

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


@celery.task(name="app.tasks.battery_check.check_batteries")
def check_batteries() -> None:
    """Chequea devices con battery_pct < 20 y genera alertas si no hay una abierta."""
    asyncio.run(_check_batteries())


async def _check_batteries() -> None:
    Session = _get_session_factory()
    async with Session() as db:
        # Dispositivos online con batería baja
        result = await db.execute(
            select(Device).where(
                and_(Device.battery_pct < 20, Device.is_online == True)  # noqa: E712
            )
        )
        devices = result.scalars().all()

        created = 0
        for device in devices:
            # Verificar si ya existe alerta abierta de batería para este cliente
            existing = await db.execute(
                select(Alert).where(
                    and_(
                        Alert.client_id == device.client_id,
                        Alert.type == "bateria",
                        Alert.status.in_(["nueva", "atendiendo"]),
                    )
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            alert = Alert(
                client_id=device.client_id,
                device_id=device.id,
                type="bateria",
                priority=1,
                status="nueva",
            )
            db.add(alert)
            created += 1
            logger.info(
                "Alerta batería creada: client_id=%s device_id=%d battery_pct=%d%%",
                device.client_id,
                device.id,
                device.battery_pct,
            )

        if created:
            await db.commit()

    logger.info("check_batteries finalizado: %d alertas nuevas sobre %d dispositivos", created, len(devices))
