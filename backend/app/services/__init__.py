"""Capa de servicios de SiempreCerca."""

from app.services.alert_service import (
    get_alert_stats,
    get_alert_with_logs,
    list_alerts,
    update_alert_status,
)
from app.services.appointment_service import (
    create_appointment,
    delete_appointment,
    list_appointments,
    update_appointment,
    update_appointment_status,
)
from app.services.audit_service import log_action
from app.services.client_service import (
    create_client,
    delete_client,
    get_client,
    list_clients,
    update_client,
)
from app.services.message_service import list_messages, list_templates, send_message

__all__ = [
    # clients
    "list_clients",
    "get_client",
    "create_client",
    "update_client",
    "delete_client",
    # alerts
    "list_alerts",
    "get_alert_with_logs",
    "update_alert_status",
    "get_alert_stats",
    # messages
    "list_templates",
    "list_messages",
    "send_message",
    # appointments
    "list_appointments",
    "create_appointment",
    "update_appointment",
    "update_appointment_status",
    "delete_appointment",
    # audit
    "log_action",
]
