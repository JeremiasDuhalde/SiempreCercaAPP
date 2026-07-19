"""Endpoints de configuracion del sistema (clave-valor)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.system_config import SystemConfig
from app.models.user import User
from app.security import require_role

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    key: str
    value: str


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
