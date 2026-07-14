"""Endpoints de ingesta: reciben webhooks de FLIC y otros dispositivos."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models.alert import Alert
from app.models.client import Client
from app.models.device import Device
from app.models.webhook_raw import WebhookRawLog
from app.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def verify_webhook_secret(x_webhook_secret: str = Header(default="")) -> None:
    """Valida que el header X-Webhook-Secret coincida con la configuración."""
    if not x_webhook_secret or x_webhook_secret != settings.webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Webhook secret inválido o ausente",
        )

# Mapeo de evento FLIC -> tipo de alerta del sistema
FLIC_EVENT_MAP = {
    "sos": "sos",
    "fall": "caida",
    "geo": "geo",
    "battery": "bateria",
    "panic": "sos",
}

PRIORITY_MAP = {
    "sos": 3,
    "caida": 3,
    "geo": 2,
    "bateria": 1,
    "inactiv": 2,
    "compania": 1,
}


@router.post("/flic/alert", dependencies=[Depends(verify_webhook_secret)])
async def flic_alert(
    request: Request,
    button_serial_number: str = Header(default="unknown"),
    button_name: str = Header(default=""),
    flic_latitude: str = Header(default=""),
    flic_longitude: str = Header(default=""),
    flic_accuracy: str = Header(default=""),
):
    """Recibe alerta de un botón FLIC.

    FLIC envía los datos del dispositivo en headers HTTP:
    - button-serial-number: serial único del botón
    - button-name: nombre asignado en la app
    - flic-latitude / flic-longitude: ubicación GPS
    - flic-accuracy: precisión en metros
    """
    # Leer body
    try:
        body = await request.json()
    except Exception:
        body = {}

    # Armar payload completo para guardar crudo
    raw_payload = {
        "button_serial_number": button_serial_number,
        "button_name": button_name,
        "latitude": flic_latitude,
        "longitude": flic_longitude,
        "accuracy": flic_accuracy,
        "body": body,
        "headers": {
            k: v for k, v in request.headers.items()
            if k.startswith(("button-", "flic-"))
        },
    }

    # Determinar tipo de alerta
    event = body.get("event", "sos")
    alert_type = FLIC_EVENT_MAP.get(event, "sos")
    priority = PRIORITY_MAP.get(alert_type, 2)

    async with SessionLocal() as db:
        # 1. Guardar webhook crudo (nunca perder data)
        raw_log = WebhookRawLog(
            source="flic",
            payload=raw_payload,
            processed=False,
        )
        db.add(raw_log)
        await db.flush()

        # 2. Buscar dispositivo por serial
        device = None
        client = None
        client_name = f"Dispositivo {button_serial_number}"
        client_data = {}

        if button_serial_number != "unknown":
            result = await db.execute(
                select(Device).where(
                    Device.external_device_id == button_serial_number
                )
            )
            device = result.scalar_one_or_none()

        if device:
            # Actualizar batería y ubicación del dispositivo
            device.is_online = True
            device.last_seen_at = datetime.now(timezone.utc)

            # Cargar cliente asociado
            result = await db.execute(
                select(Client).where(Client.id == device.client_id)
            )
            client = result.scalar_one_or_none()

        if client:
            client_name = client.name
            client_data = {
                "id": str(client.id),
                "name": client.name,
                "age": client.age,
                "barrio": client.barrio,
                "dir": client.address,
                "entre": client.address_entre or "",
            }

        # 3. Crear alerta
        alert = Alert(
            client_id=client.id if client else None,
            device_id=device.id if device else None,
            type=alert_type,
            priority=priority,
            status="nueva",
            raw_payload=raw_payload,
        )
        db.add(alert)
        await db.flush()

        # Marcar raw log como procesado
        raw_log.processed = True

        await db.commit()

        alert_id = alert.id

    # 4. Broadcast por WebSocket a todas las operadoras conectadas
    ws_data = {
        "id": f"flic-{alert_id}",
        "type": alert_type,
        "priority": priority,
        "status": "nueva",
        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
        "source": "flic",
        "button_serial": button_serial_number,
        "latitude": flic_latitude,
        "longitude": flic_longitude,
        "accuracy": flic_accuracy,
        "client": client_data,
        "client_name": client_name,
    }

    await ws_manager.broadcast("alert_new", ws_data)

    logger.info(
        "Alerta FLIC procesada: serial=%s tipo=%s cliente=%s alert_id=%d",
        button_serial_number, alert_type, client_name, alert_id,
    )

    return {
        "ok": True,
        "alert_id": alert_id,
        "type": alert_type,
        "client": client_name,
        "message": f"Alerta {alert_type} recibida de {button_serial_number}",
    }
