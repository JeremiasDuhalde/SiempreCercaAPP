"""Tests del router /api/alerts."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.client import Client


# ---------------------------------------------------------------------------
# Listado
# ---------------------------------------------------------------------------


async def test_list_alerts_empty(client: AsyncClient, admin_token: str):
    """Sin alertas en la DB → 200 con items vacíos."""
    resp = await client.get(
        "/api/alerts/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


# ---------------------------------------------------------------------------
# Estadísticas
# ---------------------------------------------------------------------------


async def test_alert_stats(client: AsyncClient, admin_token: str):
    """GET /api/alerts/stats → 200 con estructura correcta."""
    resp = await client.get(
        "/api/alerts/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_active" in data
    assert "by_type" in data
    assert "by_status" in data
    assert isinstance(data["total_active"], int)
    assert isinstance(data["by_type"], dict)
    assert isinstance(data["by_status"], dict)


# ---------------------------------------------------------------------------
# Actualización de estado
# ---------------------------------------------------------------------------


async def test_update_alert_status(
    client: AsyncClient,
    admin_token: str,
    db_session: AsyncSession,
    sample_client: Client,
):
    """Crear alerta y hacer PATCH a 'atendiendo' → 200 con status actualizado."""
    # Crear alerta directamente en la DB
    alert = Alert(
        client_id=sample_client.id,
        type="sos",
        priority=3,
        status="nueva",
    )
    db_session.add(alert)
    await db_session.commit()
    await db_session.refresh(alert)

    resp = await client.patch(
        f"/api/alerts/{alert.id}/status",
        json={"status": "atendiendo", "detail": "Contactando al cliente"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "atendiendo"
    assert data["id"] == alert.id
