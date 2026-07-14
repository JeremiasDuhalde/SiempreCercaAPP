"""Tests del router /api/clients."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CLIENT_PAYLOAD = {
    "name": "Juan Pérez",
    "age": 80,
    "address": "Calle Falsa 123",
    "barrio": "Palermo",
    "phone": "1145678901",
}


# ---------------------------------------------------------------------------
# Listado
# ---------------------------------------------------------------------------


async def test_list_clients_empty(client: AsyncClient, admin_token: str):
    """Sin clientes en la DB → 200 con items vacíos."""
    resp = await client.get(
        "/api/clients/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


# ---------------------------------------------------------------------------
# Creación
# ---------------------------------------------------------------------------


async def test_create_client(client: AsyncClient, admin_token: str):
    """Admin puede crear un cliente → 201 con datos del cliente."""
    resp = await client.post(
        "/api/clients/",
        json=CLIENT_PAYLOAD,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == CLIENT_PAYLOAD["name"]
    assert data["barrio"] == CLIENT_PAYLOAD["barrio"]
    assert "id" in data


async def test_create_client_as_operator_forbidden(client: AsyncClient, operator_token: str):
    """Operador no puede crear clientes → 403."""
    resp = await client.post(
        "/api/clients/",
        json=CLIENT_PAYLOAD,
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Obtener por ID
# ---------------------------------------------------------------------------


async def test_get_client(client: AsyncClient, admin_token: str, sample_client: Client):
    """GET /api/clients/{id} de cliente existente → 200."""
    resp = await client.get(
        f"/api/clients/{sample_client.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == sample_client.id
    assert data["name"] == sample_client.name


async def test_get_client_not_found(client: AsyncClient, admin_token: str):
    """GET /api/clients/99999 (inexistente) → 404."""
    resp = await client.get(
        "/api/clients/99999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Actualización
# ---------------------------------------------------------------------------


async def test_update_client(client: AsyncClient, admin_token: str, sample_client: Client):
    """PATCH /api/clients/{id} → 200 con campo actualizado."""
    resp = await client.patch(
        f"/api/clients/{sample_client.id}",
        json={"notes": "Notas de prueba actualizadas"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["notes"] == "Notas de prueba actualizadas"


# ---------------------------------------------------------------------------
# Eliminación (soft delete)
# ---------------------------------------------------------------------------


async def test_delete_client(client: AsyncClient, admin_token: str, sample_client: Client):
    """DELETE /api/clients/{id} → 204 (soft delete: is_active=False)."""
    resp = await client.delete(
        f"/api/clients/{sample_client.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204

    # Verificar que el cliente figura como inactivo al consultarlo
    resp2 = await client.get(
        f"/api/clients/{sample_client.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["is_active"] is False
