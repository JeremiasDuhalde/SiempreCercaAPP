"""Servicio hibrido de WhatsApp.

Estrategia de enrutamiento:
- urgent=True  → Meta API oficial (SOS, caidas, emergencias)
- urgent=False → Baileys primero (rutina: reportes, recordatorios), fallback a Meta
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Templates en texto plano para renderizar en Baileys (sin formato de template Meta).
# Las llaves {0}, {1}, etc. corresponden al orden de `params`.
_TEMPLATES: dict[str, str] = {
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

META_API_URL = "https://graph.facebook.com/v24.0"


def _normalize_phone(phone: str) -> str:
    """Normaliza un numero de telefono eliminando +, espacios y guiones."""
    return phone.replace("+", "").replace(" ", "").replace("-", "")


def _render_template(template_name: str, params: list[str]) -> str:
    """Renderiza un template como texto plano para Baileys.

    Si el template no existe devuelve el primer param (o cadena vacia).
    Si los params son insuficientes devuelve el template sin reemplazar.
    """
    tpl = _TEMPLATES.get(template_name)
    if tpl is None:
        logger.warning("Template '%s' no encontrado, usando fallback", template_name)
        return params[0] if params else ""
    try:
        return tpl.format(*params)
    except (IndexError, KeyError) as exc:
        logger.warning("Error al renderizar template '%s': %s", template_name, exc)
        return tpl


class WhatsAppService:
    """Servicio hibrido de WhatsApp.

    - Mensajes urgentes (SOS, caidas) → Meta API oficial.
    - Mensajes de rutina → Baileys primero, fallback automatico a Meta.
    - Si `settings.whatsapp_provider == "meta"` fuerza Meta para todo.
    - Si `settings.whatsapp_provider == "mock"` simula el envio en logs (dev).
    - `provider_override` permite que el router/celery especifique el proveedor
      leido desde la DB sin requerir que el servicio acceda a ella directamente.
    """

    # ------------------------------------------------------------------ #
    # Metodos publicos                                                     #
    # ------------------------------------------------------------------ #

    async def send_template(
        self,
        to: str,
        template_name: str,
        params: list[str],
        *,
        urgent: bool = False,
        provider_override: str | None = None,
    ) -> dict:
        """Envia un template de WhatsApp.

        Args:
            to:               Numero de destino (cualquier formato, ej. "+5492257653843").
            template_name:    Clave del template (debe existir en Meta y en _TEMPLATES).
            params:           Lista de parametros posicionales para el template.
            urgent:           True = Meta directo (SOS, caidas). False = Baileys + fallback.
            provider_override: Proveedor a usar ("meta" | "baileys" | "mock"). Si se omite
                               se usa `settings.whatsapp_provider`.

        Returns:
            dict con ``ok``, ``provider`` y ``wa_message_id`` (cuando corresponda).
        """
        provider = provider_override or settings.whatsapp_provider

        if provider == "mock":
            return self._mock_response("send_template", to, template_name)

        if urgent or provider == "meta":
            return await self._send_via_meta_template(to, template_name, params)

        # Rutina: Baileys primero, fallback a Meta
        result = await self._send_via_baileys(to, _render_template(template_name, params))
        if not result.get("ok"):
            banned = result.get("banned", False)
            if banned:
                logger.error("Baileys: canal bloqueado (banned). No se hace fallback.")
                return result
            logger.info(
                "Baileys fallo para template '%s' -> fallback a Meta", template_name
            )
            return await self._send_via_meta_template(to, template_name, params)
        return result

    async def send_text(
        self,
        to: str,
        body: str,
        *,
        urgent: bool = False,
        provider_override: str | None = None,
    ) -> dict:
        """Envia texto libre.

        Via Meta solo funciona dentro de la ventana de 24 h de conversacion activa.
        Via Baileys funciona siempre (el numero debe estar en la cuenta conectada).

        Args:
            to:               Numero de destino.
            body:             Cuerpo del mensaje.
            urgent:           True = Meta directo. False = Baileys + fallback.
            provider_override: Proveedor a usar. Si se omite se usa `settings.whatsapp_provider`.
        """
        provider = provider_override or settings.whatsapp_provider

        if provider == "mock":
            return self._mock_response("send_text", to, body)

        if urgent or provider == "meta":
            return await self._send_via_meta_text(to, body)

        result = await self._send_via_baileys(to, body)
        if not result.get("ok"):
            banned = result.get("banned", False)
            if banned:
                logger.error("Baileys: canal bloqueado (banned). No se hace fallback.")
                return result
            logger.info("Baileys fallo para send_text -> fallback a Meta")
            return await self._send_via_meta_text(to, body)
        return result

    # ------------------------------------------------------------------ #
    # Implementaciones internas                                            #
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

    async def _send_via_baileys(self, to: str, body: str) -> dict:
        """Envia via el microservicio Baileys interno.

        Detecta senales de bloqueo/ban en la respuesta:
        - status 403 con mensaje de banned/blocked
        - campo ``banned`` en true dentro del JSON de error
        """
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.baileys_url}/send",
                    json={"to": to, "body": body},
                    timeout=10.0,
                )
            data = resp.json()

            # Deteccion de ban: status 403 o campo banned/blocked en respuesta
            is_banned = (
                resp.status_code == 403
                or data.get("banned", False)
                or "banned" in str(data.get("error", "")).lower()
                or "blocked" in str(data.get("error", "")).lower()
            )
            if is_banned:
                logger.error(
                    "Baileys: senal de bloqueo detectada (status=%d, data=%s)",
                    resp.status_code,
                    data,
                )
                return {"ok": False, "provider": "baileys", "banned": True, "error": data}

            if resp.status_code == 200 and data.get("ok"):
                logger.info("WhatsApp Baileys enviado a %s", to)
            else:
                logger.warning("Baileys respondio con error: %s", data)
            return data
        except httpx.RequestError as exc:
            logger.warning("Baileys no disponible: %s", exc)
            return {"ok": False, "provider": "baileys", "error": str(exc)}

    # ------------------------------------------------------------------ #
    # Mock (dev / test)                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _mock_response(method: str, to: str, detail: str) -> dict:
        logger.info("[MOCK] WhatsApp %s -> %s | %s", method, to, detail[:60])
        return {"ok": True, "provider": "mock", "wa_message_id": "mock-0000"}


# Singleton — importar como `from app.services.whatsapp_service import whatsapp_service`
whatsapp_service = WhatsAppService()
