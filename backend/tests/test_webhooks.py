"""Tests del router /api/webhooks."""

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.alert import Alert
from app.models.webhook_raw import WebhookRawLog

# El webhook_secret por defecto está en config.py
VALID_SECRET = settings.webhook_secret  # "change-me-webhook-secret"

TEST_DB = "postgresql+asyncpg://siemprecerca:siemprecerca_dev@localhost:5435/siemprecerca_test"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _flic_headers(secret: str = VALID_SECRET, serial: str = "BTN-TEST-001") -> dict:
    """Arma los headers típicos de un request FLIC."""
    return {
        "X-Webhook-Secret": secret,
        "button-serial-number": serial,
        "button-name": "Boton Rosa",
        "flic-latitude": "-34.6037",
        "flic-longitude": "-58.3816",
        "flic-accuracy": "10",
    }


# ---------------------------------------------------------------------------
# Validación del secret
# ---------------------------------------------------------------------------


async def test_flic_alert_no_secret(client: AsyncClient):
    """Sin header X-Webhook-Secret → 403."""
    resp = await client.post(
        "/api/webhooks/flic/alert",
        json={"event": "sos"},
    )
    assert resp.status_code == 403


async def test_flic_alert_wrong_secret(client: AsyncClient):
    """Secret incorrecto → 403."""
    resp = await client.post(
        "/api/webhooks/flic/alert",
        json={"event": "sos"},
        headers={"X-Webhook-Secret": "secreto-incorrecto"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Webhook válido
# ---------------------------------------------------------------------------


async def test_flic_alert_valid(client: AsyncClient, db_session: AsyncSession):
    """
    Webhook FLIC con secret correcto → 200 y alerta creada en la DB.

    El router /api/webhooks/flic/alert usa SessionLocal directamente (no get_db),
    por lo que parcheamos app.routers.webhooks.SessionLocal para que use la DB
    de test en lugar de la de producción.
    """
    # Crear una sesión factory que apunte a la DB de test
    test_engine = create_async_engine(TEST_DB, echo=False, future=True)
    TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    with patch("app.routers.webhooks.SessionLocal", TestSession):
        resp = await client.post(
            "/api/webhooks/flic/alert",
            json={"event": "sos"},
            headers=_flic_headers(),
        )

    await test_engine.dispose()

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "alert_id" in data
    assert data["type"] == "sos"

    # Verificar que la alerta existe en la DB de test
    alert_id = data["alert_id"]
    result = await db_session.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    assert alert is not None
    assert alert.type == "sos"
    assert alert.status == "nueva"
    assert alert.priority == 3

    # Verificar que se guardó el raw log
    raw_result = await db_session.execute(
        select(WebhookRawLog).where(WebhookRawLog.source == "flic")
    )
    raw_log = raw_result.scalar_one_or_none()
    assert raw_log is not None
    assert raw_log.processed is True
