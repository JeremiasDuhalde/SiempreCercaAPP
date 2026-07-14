"""Tests del router /api/auth."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.security import hash_password


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    """Credenciales válidas → 200 con access_token."""
    user = User(
        email="login_ok@test.app",
        hashed_password=hash_password("secret123"),
        name="Test User",
        role="operador",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/login",
        json={"email": "login_ok@test.app", "password": "secret123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    """Contraseña incorrecta → 401."""
    user = User(
        email="wrong_pass@test.app",
        hashed_password=hash_password("correct_pass"),
        name="Test User",
        role="operador",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/login",
        json={"email": "wrong_pass@test.app", "password": "wrong_pass"},
    )
    assert resp.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    """Usuario que no existe → 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "noexiste@test.app", "password": "cualquiera"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------


async def test_me_with_valid_token(client: AsyncClient, admin_token: str):
    """Token válido → 200 con datos del usuario."""
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin_test@siemprecerca.app"
    assert data["role"] == "admin"
    assert "id" in data
    assert "name" in data


async def test_me_without_token(client: AsyncClient):
    """Sin token → 401."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


async def test_me_with_invalid_token(client: AsyncClient):
    """Token falso → 401."""
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer token.invalido.xxx"},
    )
    assert resp.status_code == 401
