"""Tarea Celery: chequear recordatorios de medicación pendientes."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.celery_app import celery
from app.config import settings
from app.models.appointment import Appointment
from app.models.message import Message

logger = logging.getLogger(__name__)


def _get_session_factory():
    engine = create_async_engine(settings.database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


@celery.task(name="app.tasks.medication_reminders.check_medications")
def check_medications() -> None:
    """Busca medicaciones en la ventana actual y envía recordatorios por WhatsApp."""
    asyncio.run(_check_medications())


async def _check_medications() -> None:
    Session = _get_session_factory()
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=5)
    window_end = now + timedelta(minutes=5)

    async with Session() as db:
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.type == "med",
                    Appointment.scheduled_at >= window_start,
                    Appointment.scheduled_at <= window_end,
                    Appointment.reminder_sent == False,  # noqa: E712
                )
            )
        )
        appointments = result.scalars().all()

        created = 0
        for apt in appointments:
            message = Message(
                client_id=apt.client_id,
                template_key="med",
                body=(
                    f"Recordatorio de medicacion: es hora de tomar tu medicacion"
                    f"{' — ' + apt.detail if apt.detail else ''}. "
                    f"Hora programada: {apt.scheduled_at.strftime('%H:%M')}."
                ),
                channel="whatsapp",
                status="queued",
            )
            db.add(message)
            apt.reminder_sent = True
            created += 1
            logger.info(
                "Recordatorio medicacion encolado: client_id=%s appointment_id=%d",
                apt.client_id,
                apt.id,
            )

        if created:
            await db.commit()

    logger.info("check_medications finalizado: %d recordatorios encolados", created)
