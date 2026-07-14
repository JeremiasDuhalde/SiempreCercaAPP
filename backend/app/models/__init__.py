"""Importa todos los modelos para que Alembic los detecte."""

from app.models.alert import Alert, AlertLog
from app.models.appointment import Appointment
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.contact import Contact
from app.models.device import Device
from app.models.geofence import Geofence
from app.models.message import Message, MessageTemplate
from app.models.user import User
from app.models.webhook_raw import WebhookRawLog
from app.models.wellbeing import WellbeingSnapshot

__all__ = [
    "Alert",
    "AlertLog",
    "Appointment",
    "AuditLog",
    "Client",
    "Contact",
    "Device",
    "Geofence",
    "Message",
    "MessageTemplate",
    "User",
    "WebhookRawLog",
    "WellbeingSnapshot",
]
