"""Tarea Celery: generar partes diarios de bienestar."""

import asyncio
import logging
from datetime import date, datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.celery_app import celery
from app.config import settings
from app.models.contact import Contact
from app.models.message import Message
from app.models.wellbeing import WellbeingSnapshot

logger = logging.getLogger(__name__)


def _get_session_factory():
    engine = create_async_engine(settings.database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


@celery.task(name="app.tasks.wellbeing_report.generate_daily_reports")
def generate_daily_reports() -> None:
    """Genera partes diarios para cada cliente y los envía por WhatsApp a la familia."""
    asyncio.run(_generate_daily_reports())


async def _generate_daily_reports() -> None:
    Session = _get_session_factory()
    today = date.today()

    async with Session() as db:
        # Snapshots de hoy con reporte para familia pendiente de envío
        result = await db.execute(
            select(WellbeingSnapshot).where(
                and_(
                    WellbeingSnapshot.date == today,
                    WellbeingSnapshot.family_report.isnot(None),
                    WellbeingSnapshot.family_report_sent == False,  # noqa: E712
                )
            )
        )
        snapshots = result.scalars().all()

        created = 0
        for snap in snapshots:
            # Obtener contacto primario del cliente (order=1)
            contact_result = await db.execute(
                select(Contact).where(
                    and_(Contact.client_id == snap.client_id, Contact.order == 1)
                )
            )
            primary_contact = contact_result.scalar_one_or_none()

            contact_info = f" (para {primary_contact.name})" if primary_contact else ""
            message = Message(
                client_id=snap.client_id,
                template_key="wellbeing_report",
                body=(
                    f"Parte diario de bienestar{contact_info} — {today.strftime('%d/%m/%Y')}:\n\n"
                    f"{snap.family_report}"
                ),
                channel="whatsapp",
                status="queued",
            )
            db.add(message)
            snap.family_report_sent = True
            created += 1
            logger.info(
                "Parte bienestar encolado: client_id=%d snapshot_id=%d%s",
                snap.client_id,
                snap.id,
                contact_info,
            )

        if created:
            await db.commit()

    logger.info("generate_daily_reports finalizado: %d partes encolados para %s", created, today)
