"""Endpoints de configuracion del sistema (clave-valor)."""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.system_config import SystemConfig
from app.models.user import User
from app.security import get_current_user, require_role

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    key: str = ""
    value: str = ""


@router.get("/")
async def get_all_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(select(SystemConfig))
    configs = result.scalars().all()
    return {c.key: c.value for c in configs}


@router.put("/")
async def update_config(
    body: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == body.key))
    config = result.scalar_one_or_none()
    if config:
        config.value = body.value
    else:
        db.add(SystemConfig(key=body.key, value=body.value))
    await db.commit()
    return {"ok": True}


@router.post("/seed-defaults")
async def seed_defaults(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Seed default config values if not exist."""
    defaults = {
        "emp_whatsapp_number": "+5492245406323",
        "emp_call_number": "+5492246529000",
        "central_phone": "+5492257653843",
        "central_name": "Siempre Cerca SRL",
        "emp_message_template": (
            "DESPACHO DE EMERGENCIA\n\n"
            "Paciente: {client_name}\n"
            "Edad: {client_age} años\n"
            "Ubicacion: {location}\n"
            "Tipo de alerta: {alert_type}\n"
            "Hora: {timestamp}\n\n"
            "Contacto del paciente: {client_phone}\n"
            "Contacto familiar: {family_phone}\n\n"
            "Atencion requerida urgente.\n\n"
            "— Central Siempre Cerca"
        ),
    }
    for key, value in defaults.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        if not result.scalar_one_or_none():
            db.add(SystemConfig(key=key, value=value))
    await db.commit()
    return {"ok": True, "seeded": len(defaults)}


@router.post("/whatsapp-provider")
async def switch_whatsapp_provider(
    body: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Cambia el proveedor de WhatsApp activo ('meta', 'baileys', 'mock')."""
    if body.value not in ("meta", "baileys", "mock"):
        raise HTTPException(400, "El proveedor debe ser 'meta', 'baileys' o 'mock'")
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == "whatsapp_provider"))
    config = result.scalar_one_or_none()
    if config:
        config.value = body.value
    else:
        db.add(SystemConfig(key="whatsapp_provider", value=body.value))
    await db.commit()
    return {"ok": True, "provider": body.value}


@router.get("/whatsapp-status")
async def whatsapp_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Verifica el estado de conexion del canal WhatsApp activo."""
    status_resp: dict = {"provider": "unknown", "connected": False, "banned": False}

    result = await db.execute(select(SystemConfig).where(SystemConfig.key == "whatsapp_provider"))
    config = result.scalar_one_or_none()
    provider = config.value if config else settings.whatsapp_provider
    status_resp["provider"] = provider

    if provider == "baileys":
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{settings.baileys_url}/status", timeout=5.0)
                data = resp.json()
                status_resp["connected"] = data.get("connected", False)
                status_resp["banned"] = data.get("banned", False)
        except Exception:
            status_resp["connected"] = False
    elif provider == "meta":
        # Meta se considera conectado si el token esta configurado
        status_resp["connected"] = bool(settings.whatsapp_token)
    elif provider == "mock":
        status_resp["connected"] = True

    return status_resp
