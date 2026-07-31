"""Servicio de WhatsApp via Meta Cloud API.

Todo el envio pasa por Meta API oficial. En desarrollo se usa provider "mock".
"""

import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Templates hardcoded como fallback cuando la DB no tiene datos.
# Las llaves {0}, {1}, etc. corresponden al orden de `params`.
_TEMPLATES_FALLBACK: dict[str, str] = {
    "alerta_emergencia": (
        "ALERTA DE EMERGENCIA — {0}\n\n"
        "Se activo una alerta de emergencia del dispositivo de {0}.\n\n"
        "Ubicacion aproximada: {1}\n\n"
        "La central de monitoreo de Siempre Cerca ya fue notificada y esta atendiendo la situacion.\n\n"
        "Ante cualquier consulta comuniquese al {2}.\n\n"
        "— Equipo Siempre Cerca"
    ),
    "alerta_caida": (
        "ALERTA — Posible caida detectada\n\n"
        "El dispositivo de {0} detecto una posible caida.\n\n"
        "La central de Siempre Cerca esta intentando comunicarse para confirmar el estado del paciente.\n\n"
        "Le informaremos apenas tengamos novedades.\n\n"
        "Central: {1}\n\n"
        "— Equipo Siempre Cerca"
    ),
    "recordatorio_medicacion": (
        "Hola {0}, este es un recordatorio de Siempre Cerca.\n\n"
        "Es hora de tomar su medicacion: {1}.\n\n"
        "Si necesita ayuda, presione el boton de su dispositivo o comuniquese con nosotros al {2}.\n\n"
        "— Equipo Siempre Cerca"
    ),
    "parte_familiar_diario": (
        "Buen dia {0}, le compartimos el parte diario de {1}.\n\n"
        "{2}\n\n"
        "Calificacion general del dia: {3}/100.\n\n"
        "Cualquier consulta estamos a disposicion en el {4}.\n\n"
        "— Equipo Siempre Cerca"
    ),
    "bienvenida_servicio": (
        "Hola {0}, bienvenido/a al servicio de Siempre Cerca.\n\n"
        "Le confirmamos que {1} ya se encuentra dado/a de alta en nuestro sistema de monitoreo.\n\n"
        "A partir de ahora recibira notificaciones por este medio en caso de cualquier novedad.\n\n"
        "Ante cualquier consulta puede escribirnos a este numero o llamarnos al {2}.\n\n"
        "— Equipo Siempre Cerca"
    ),
    "alerta_resuelta": (
        "Hola {0}, le informamos que la alerta de {1} fue atendida y resuelta.\n\n"
        "{2}\n\n"
        "El paciente se encuentra bien. Cualquier consulta estamos a disposicion.\n\n"
        "— Equipo Siempre Cerca"
    ),
}

# Clave en system_config donde se guardan los templates locales editables.
_LOCAL_TEMPLATES_DB_KEY = "local_whatsapp_templates"

META_API_URL = "https://graph.facebook.com/v24.0"


def _normalize_phone(phone: str) -> str:
    """Normaliza un numero de telefono eliminando +, espacios y guiones."""
    return phone.replace("+", "").replace(" ", "").replace("-", "")


def _render_template(
    template_name: str,
    params: list[str],
    db_templates: dict[str, str] | None = None,
) -> str:
    """Renderiza un template como texto plano.

    Busca primero en `db_templates` (cargados desde system_config),
    luego en el dict hardcoded de fallback.
    """
    if db_templates:
        tpl = db_templates.get(template_name)
    else:
        tpl = None

    if tpl is None:
        tpl = _TEMPLATES_FALLBACK.get(template_name)

    if tpl is None:
        logger.warning("Template '%s' no encontrado en DB ni en fallback", template_name)
        return params[0] if params else ""
    try:
        return tpl.format(*params)
    except (IndexError, KeyError) as exc:
        logger.warning("Error al renderizar template '%s': %s", template_name, exc)
        return tpl


class WhatsAppService:
    """Servicio de WhatsApp via Meta Cloud API.

    - Si `settings.whatsapp_provider == "meta"` envia via Meta API.
    - Si `settings.whatsapp_provider == "mock"` simula el envio en logs (dev).
    - `provider_override` permite que el router/celery especifique el proveedor
      leido desde la DB sin requerir que el servicio acceda a ella directamente.
    """

    async def send_template(
        self,
        to: str,
        template_name: str,
        params: list[str],
        *,
        urgent: bool = False,
        provider_override: str | None = None,
        db=None,
    ) -> dict:
        """Envia un template de WhatsApp via Meta API."""
        provider = provider_override or settings.whatsapp_provider

        if provider == "mock":
            return self._mock_response("send_template", to, template_name)

        return await self._send_via_meta_template(to, template_name, params)

    async def send_text(
        self,
        to: str,
        body: str,
        *,
        urgent: bool = False,
        provider_override: str | None = None,
    ) -> dict:
        """Envia texto libre via Meta Cloud API (requiere ventana de 24 h activa)."""
        provider = provider_override or settings.whatsapp_provider

        if provider == "mock":
            return self._mock_response("send_text", to, body)

        return await self._send_via_meta_text(to, body)

    # ------------------------------------------------------------------ #
    # Carga de templates desde DB                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def _load_db_templates(db) -> dict[str, str] | None:
        """Carga los templates editables desde system_config."""
        try:
            from sqlalchemy import select
            from app.models.system_config import SystemConfig

            result = await db.execute(
                select(SystemConfig).where(SystemConfig.key == _LOCAL_TEMPLATES_DB_KEY)
            )
            config = result.scalar_one_or_none()
            if not config:
                return None
            templates_list: list[dict] = json.loads(config.value)
            return {
                t["key"]: t["body"]
                for t in templates_list
                if t.get("active", True)
            }
        except Exception as exc:
            logger.warning("No se pudieron cargar templates desde DB: %s", exc)
            return None

    # ------------------------------------------------------------------ #
    # Meta API                                                             #
    # ------------------------------------------------------------------ #

    async def _send_via_meta_template(
        self, to: str, template_name: str, params: list[str]
    ) -> dict:
        """Envia un template via Meta Cloud API."""
        components: list[dict] = []
        if params:
            components.append(
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in params],
                }
            )

        payload = {
            "messaging_product": "whatsapp",
            "to": _normalize_phone(to),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "es_AR"},
                "components": components,
            },
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{META_API_URL}/{settings.whatsapp_phone_id}/messages",
                    headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
                    json=payload,
                    timeout=15.0,
                )
            except httpx.RequestError as exc:
                logger.error("Meta API error de red: %s", exc)
                return {"ok": False, "provider": "meta", "error": str(exc)}

        data = resp.json()
        if resp.status_code == 200 and "messages" in data:
            wa_id = data["messages"][0].get("id", "")
            logger.info(
                "WhatsApp META enviado a %s: wa_id=%s (template=%s)", to, wa_id, template_name
            )
            return {"ok": True, "provider": "meta", "wa_message_id": wa_id}

        logger.error("Meta API error %d: %s", resp.status_code, data)
        return {"ok": False, "provider": "meta", "error": data}

    async def _send_via_meta_text(self, to: str, body: str) -> dict:
        """Envia texto libre via Meta Cloud API (requiere ventana de 24 h activa)."""
        payload = {
            "messaging_product": "whatsapp",
            "to": _normalize_phone(to),
            "type": "text",
            "text": {"body": body},
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{META_API_URL}/{settings.whatsapp_phone_id}/messages",
                    headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
                    json=payload,
                    timeout=15.0,
                )
            except httpx.RequestError as exc:
                logger.error("Meta API error de red (text): %s", exc)
                return {"ok": False, "provider": "meta", "error": str(exc)}

        data = resp.json()
        if resp.status_code == 200:
            wa_id = (data.get("messages") or [{}])[0].get("id", "")
            logger.info("WhatsApp META (text) enviado a %s: wa_id=%s", to, wa_id)
            return {"ok": True, "provider": "meta", "wa_message_id": wa_id}

        logger.error("Meta API error %d (text): %s", resp.status_code, data)
        return {"ok": False, "provider": "meta", "error": data}

    # ------------------------------------------------------------------ #
    # Mock (dev / test)                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _mock_response(method: str, to: str, detail: str) -> dict:
        logger.info("[MOCK] WhatsApp %s -> %s | %s", method, to, detail[:60])
        return {"ok": True, "provider": "mock", "wa_message_id": "mock-0000"}


# Singleton
whatsapp_service = WhatsAppService()
