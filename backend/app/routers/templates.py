import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.models.user import User
from app.security import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["templates"])

WABA_ID = "1020957603912482"
META_BASE = "https://graph.facebook.com/v24.0"


# ─── Schemas ────────────────────────────────────────────────────────────────

class TemplateComponent(BaseModel):
    type: str
    text: str
    example: dict | None = None


class CreateTemplateRequest(BaseModel):
    name: str
    language: str = "es_AR"
    category: str = "UTILITY"
    components: list[TemplateComponent]


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/status")
async def get_templates_status(_: User = Depends(require_role("admin"))):
    """Fetch all WhatsApp template statuses from Meta API."""
    token = settings.whatsapp_token
    if not token:
        raise HTTPException(status_code=503, detail="WhatsApp token no configurado")

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{META_BASE}/{WABA_ID}/message_templates",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "name,status,category,language,components"},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("Meta API error: %s — %s", e.response.status_code, e.response.text)
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Error de Meta API: {e.response.text}",
            )
        except httpx.RequestError as e:
            logger.error("Meta API request error: %s", e)
            raise HTTPException(status_code=502, detail="No se pudo conectar con Meta API")


@router.post("/create")
async def create_template(body: CreateTemplateRequest, _: User = Depends(require_role("admin"))):
    """Create a new WhatsApp message template via Meta API."""
    token = settings.whatsapp_token
    if not token:
        raise HTTPException(status_code=503, detail="WhatsApp token no configurado")

    payload = {
        "name": body.name,
        "language": body.language,
        "category": body.category,
        "components": [c.model_dump(exclude_none=True) for c in body.components],
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                f"{META_BASE}/{WABA_ID}/message_templates",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("Meta API create template error: %s — %s", e.response.status_code, e.response.text)
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Error de Meta API: {e.response.text}",
            )
        except httpx.RequestError as e:
            logger.error("Meta API request error: %s", e)
            raise HTTPException(status_code=502, detail="No se pudo conectar con Meta API")
