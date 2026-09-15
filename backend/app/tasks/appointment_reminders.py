"""Tarea Celery: chequear recordatorios de agenda (turnos, remis, llamadas, etc.)."""

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

TEMPLATE_LABELS = {
    "turno": "turno medico",
    "remis": "remis",
    "llamada": "llamada programada",
    "noche": "control nocturno",
    "otro": "recordatorio",
}


def _get_session_factory():
    engine = create_async_engine(settings.database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


@celery.task(name="app.tasks.appointment_reminders.check_appointments")
def check_appointments() -> None:
    """Busca citas/recordatorios en la ventana actual y encola mensajes WhatsApp."""
    asyncio.run(_check_appointments())


async def _check_appointments() -> None:
    Session = _get_session_factory()
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=5)
    window_end = now + timedelta(minutes=5)

    async with Session() as db:
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.type != "med",
                    Appointment.whatsapp_reminder == True,  # noqa: E712
                    Appointment.scheduled_at >= window_start,
                    Appointment.scheduled_at <= window_end,
                    Appointment.reminder_sent == False,  # noqa: E712
                )
            )
        )
        appointments = result.scalars().all()

        created = 0
        for apt in appointments:
            label = TEMPLATE_LABELS.get(apt.type, "recordatorio")
            body = f"Recordatorio: tiene un {label} programado"
            if apt.detail:
                body += f" — {apt.detail}"
            body += f". Hora: {apt.scheduled_at.strftime('%H:%M')}."

            message = Message(
                client_id=apt.client_id,
                template_key=apt.type,
                body=body,
                channel="whatsapp",
                status="queued",
            )
            db.add(message)
            apt.reminder_sent = True
            created += 1
            logger.info(
                "Recordatorio %s encolado: client_id=%s appointment_id=%d",
                apt.type, apt.client_id, apt.id,
            )

        if created:
            await db.commit()

    logger.info("check_appointments finalizado: %d recordatorios encolados", created)
