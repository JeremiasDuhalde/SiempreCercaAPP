from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery(
    "siemprecerca",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Argentina/Buenos_Aires",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery.conf.beat_schedule = {
    "check-medication-reminders": {
        "task": "app.tasks.medication_reminders.check_medications",
        "schedule": 300.0,  # cada 5 min
    },
    "check-inactivity": {
        "task": "app.tasks.inactivity_check.check_inactivity",
        "schedule": 1800.0,  # cada 30 min
    },
    "check-battery": {
        "task": "app.tasks.battery_check.check_batteries",
        "schedule": 3600.0,  # cada 1 hora
    },
    "daily-wellbeing-reports": {
        "task": "app.tasks.wellbeing_report.generate_daily_reports",
        "schedule": crontab(hour=20, minute=0),
    },
    "procesar-autorizaciones-ia": {
        "task": "app.tasks.procesar_autorizaciones.procesar_pendientes",
        "schedule": 30.0,  # cada 30 segundos
    },
}

celery.autodiscover_tasks(["app.tasks"])

# Import explicito para que el worker registre los tasks
import app.tasks.procesar_autorizaciones  # noqa: F401, E402
