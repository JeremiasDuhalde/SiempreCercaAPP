"""Endpoints de despacho de emergencias."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.system_config import SystemConfig
from app.models.user import User
from app.security import get_current_user
from app.services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dispatch", tags=["dispatch"])


class EmpDispatchRequest(BaseModel):
    client_id: int | None = None
    client_name: str
    client_age: int = 0
    client_phone: str = ""
    family_phone: str = ""
    location: str = ""
    alert_type: str = ""


@router.post("/emp")
async def dispatch_emp(
    body: EmpDispatchRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Despacha emergencia: envía WhatsApp al EMP y registra."""
    # Cargar configuracion
    result = await db.execute(select(SystemConfig))
    configs = {c.key: c.value for c in result.scalars().all()}

    # Productivo EMP: "+5492245406323" / "+5492246529000"
    # Marcelo pruebas: "+5492252413144"
    emp_whatsapp = configs.get("emp_whatsapp_number", "+5492234973299")
    emp_call = configs.get("emp_call_number", "+5492234973299")
    template = configs.get(
        "emp_message_template",
        "DESPACHO DE EMERGENCIA\n\nPaciente: {client_name}",
    )

    # Formatear mensaje
    message = template.format(
        client_name=body.client_name,
        client_age=body.client_age,
        location=body.location,
        alert_type=body.alert_type,
        timestamp=datetime.now().strftime("%d/%m/%Y %H:%M"),
        client_phone=body.client_phone,
        family_phone=body.family_phone,
    )

    # Enviar WhatsApp (urgent=True → Meta API)
    wsp_result = await whatsapp_service.send_text(to=emp_whatsapp, body=message, urgent=True)

    logger.info(
        "EMP dispatch: WhatsApp a %s, llamada a %s, por usuario %s",
        emp_whatsapp,
        emp_call,
        user.email,
    )

    return {
        "ok": True,
        "whatsapp_sent": wsp_result.get("ok", False),
        "emp_whatsapp": emp_whatsapp,
        "emp_call": emp_call,
        "message_preview": message,
        "note": f"Llamada automatica a {emp_call} — requiere integracion telefonica (pendiente)",
    }
