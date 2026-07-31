"""Templates locales editables (no requieren aprobacion de Meta)."""
import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.system_config import SystemConfig
from app.models.user import User
from app.security import get_current_user, require_role

router = APIRouter(prefix="/api/local-templates", tags=["local-templates"])

TEMPLATES_KEY = "local_whatsapp_templates"


# ─── Schemas ────────────────────────────────────────────────────────────────


class TemplateCreateRequest(BaseModel):
    key: str
    name: str
    category: str
    body: str
    variables: list[str]
    active: bool = True


class AIGenerateRequest(BaseModel):
    description: str  # descripcion en lenguaje natural


# ─── Endpoints ──────────────────────────────────────────────────────────────


@router.get("/")
async def list_local_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == TEMPLATES_KEY))
    config = result.scalar_one_or_none()
    if not config:
        return {"templates": get_default_templates()}
    return {"templates": json.loads(config.value)}


@router.put("/{template_key}")
async def update_local_template(
    template_key: str,
    body: TemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Actualiza o crea un template local."""
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == TEMPLATES_KEY))
    config = result.scalar_one_or_none()
    templates = json.loads(config.value) if config else get_default_templates()

    found = False
    for i, t in enumerate(templates):
        if t["key"] == template_key:
            templates[i] = body.model_dump()
            found = True
            break
    if not found:
        templates.append(body.model_dump())

    if config:
        config.value = json.dumps(templates, ensure_ascii=False)
    else:
        db.add(SystemConfig(key=TEMPLATES_KEY, value=json.dumps(templates, ensure_ascii=False)))
    await db.commit()
    return {"ok": True}


@router.delete("/{template_key}")
async def delete_local_template(
    template_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == TEMPLATES_KEY))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, "No hay templates guardados")
    templates = json.loads(config.value)
    templates = [t for t in templates if t["key"] != template_key]
    config.value = json.dumps(templates, ensure_ascii=False)
    await db.commit()
    return {"ok": True}


@router.post("/generate")
async def ai_generate_template(
    body: AIGenerateRequest,
    _: User = Depends(require_role("admin")),
):
    """Genera un template a partir de una descripcion en lenguaje natural.

    Detecta variables entre [corchetes] y las convierte a {N}.
    Infiere la categoria por palabras clave.
    """
    desc = body.description.strip()

    # Extraer variables en [corchetes] y convertir a {N}
    variables: list[str] = []
    formatted = desc
    for match in re.finditer(r"\[([^\]]+)\]", desc):
        variables.append(match.group(1))
    for i, var in enumerate(variables):
        formatted = formatted.replace(f"[{var}]", f"{{{i}}}", 1)

    # Agregar firma si no esta
    if "Siempre Cerca" not in formatted:
        formatted += "\n\n— Equipo Siempre Cerca"

    # Generar key desde las primeras palabras
    words = re.sub(r"[^a-z0-9\s]", "", desc.lower().split("\n")[0]).split()[:4]
    key = "_".join(words) if words else "custom_template"

    # Detectar categoria por palabras clave
    lower = desc.lower()
    if any(w in lower for w in ["alerta", "emergencia", "sos", "caida", "caída"]):
        category = "emergencia"
    elif any(w in lower for w in ["recordatorio", "medicacion", "medicación", "turno", "visita"]):
        category = "recordatorio"
    elif any(w in lower for w in ["familia", "parte", "diario", "familiar"]):
        category = "familia"
    elif any(w in lower for w in ["bienvenida", "bienvenido", "bienvenida"]):
        category = "bienvenida"
    else:
        category = "general"

    return {
        "key": key,
        "name": desc.split("\n")[0][:60],
        "category": category,
        "body": formatted,
        "variables": variables,
        "active": True,
    }


# ─── Defaults ───────────────────────────────────────────────────────────────


def get_default_templates() -> list[dict]:
    """14 templates por defecto que replican los aprobados en Meta."""
    return [
        {
            "key": "alerta_emergencia",
            "name": "Alerta de emergencia SOS",
            "category": "emergencia",
            "active": True,
            "body": (
                "ALERTA DE EMERGENCIA\n\n"
                "El dispositivo de {0} ha activado una alerta de emergencia.\n\n"
                "Ubicacion aproximada: {1}\n\n"
                "Estamos controlando la emergencia. Le informaremos apenas tengamos novedades.\n\n"
                "Central de monitoreo: {2}\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "ubicacion", "telefono_central"],
        },
        {
            "key": "alerta_caida",
            "name": "Caida detectada",
            "category": "emergencia",
            "active": True,
            "body": (
                "ALERTA — Posible caida detectada\n\n"
                "El dispositivo de {0} detecto una posible caida.\n\n"
                "Estamos comunicandonos con el paciente para confirmar su estado. "
                "Le informaremos apenas tengamos novedades.\n\n"
                "Central de monitoreo: {1}\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "telefono_central"],
        },
        {
            "key": "alerta_resuelta_error",
            "name": "Resuelta — Boton por error",
            "category": "emergencia",
            "active": True,
            "body": (
                "Hola {0}, le informamos que la alerta de {1} fue atendida y resuelta.\n\n"
                "Nos comunicamos con el paciente y se encuentra bien. Presiono el boton por error.\n\n"
                "Cualquier consulta estamos a disposicion.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "nombre_paciente"],
        },
        {
            "key": "alerta_resuelta_estable",
            "name": "Resuelta — Paciente estable",
            "category": "emergencia",
            "active": True,
            "body": (
                "Hola {0}, le informamos que la alerta de {1} fue atendida y resuelta.\n\n"
                "Nos comunicamos con el paciente y se encuentra estable. La emergencia fue controlada.\n\n"
                "Cualquier consulta estamos a disposicion.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "nombre_paciente"],
        },
        {
            "key": "alerta_resuelta_verde",
            "name": "Resuelta — Emergencia verde",
            "category": "emergencia",
            "active": True,
            "body": (
                "Hola {0}, le informamos que la alerta de {1} fue atendida.\n\n"
                "La emergencia es de tipo verde. Le recordamos que nuestro servicio de emergencia "
                "cubre situaciones rojo y amarillo. Las emergencias verdes se abonan por separado.\n\n"
                "Cualquier consulta estamos a disposicion.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "nombre_paciente"],
        },
        {
            "key": "recordatorio_medicacion",
            "name": "Recordatorio de medicacion",
            "category": "recordatorio",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que es hora de tomar su medicacion: {1}.\n\n"
                "Si necesita ayuda, presione el boton de su dispositivo 2 veces.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "medicamento"],
        },
        {
            "key": "recordatorio_turno",
            "name": "Recordatorio turno medico",
            "category": "recordatorio",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que hoy tiene turno con {1}.\n\n"
                "Si necesita ayuda para trasladarse, presione el boton de su dispositivo 2 veces.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "especialista"],
        },
        {
            "key": "recordatorio_visita",
            "name": "Recordatorio visita enfermera",
            "category": "recordatorio",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que hoy lo/la visitara {1}.\n\n"
                "Si necesita algo antes de la visita, presione el boton de su dispositivo 2 veces.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "enfermera"],
        },
        {
            "key": "recordatorio_monitoreo",
            "name": "Recordatorio monitoreo 24hs",
            "category": "recordatorio",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que estamos monitoreandolo las 24 horas del dia. "
                "Ante cualquier emergencia presione el boton de su dispositivo 2 veces.\n\n"
                "Central de monitoreo: {1}\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente", "telefono_central"],
        },
        {
            "key": "aviso_simulacro",
            "name": "Aviso de simulacro",
            "category": "recordatorio",
            "active": True,
            "body": (
                "Hola {0}, le informamos que hoy estaremos realizando un simulacro "
                "para verificar que su equipo funcione perfecto.\n\n"
                "No se preocupe, es solo una prueba de rutina. No es necesario que haga nada.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_paciente"],
        },
        {
            "key": "parte_familiar_diario",
            "name": "Parte diario familiar",
            "category": "familia",
            "active": True,
            "body": (
                "Buen dia {0}, le compartimos el parte diario de {1}.\n\n"
                "{2}\n\n"
                "Calificacion general del dia: {3}/100.\n\n"
                "Cualquier consulta estamos a disposicion en el {4}.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "nombre_paciente", "estado", "score", "telefono"],
        },
        {
            "key": "info_numero_emergencia",
            "name": "Info numero de emergencia",
            "category": "familia",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que nuestro numero de emergencia es {1}.\n\n"
                "Puede comunicarse las 24 horas ante cualquier consulta o emergencia "
                "relacionada con {2}.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "telefono", "nombre_paciente"],
        },
        {
            "key": "info_cobertura",
            "name": "Info cobertura del servicio",
            "category": "familia",
            "active": True,
            "body": (
                "Hola {0}, le recordamos que nuestro servicio de emergencia cubre situaciones "
                "de prioridad roja y amarilla sin costo adicional.\n\n"
                "Las emergencias de tipo verde (no urgentes) se abonan por separado.\n\n"
                "Ante cualquier duda comuniquese al {1}.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "telefono"],
        },
        {
            "key": "bienvenida_servicio",
            "name": "Bienvenida al servicio",
            "category": "bienvenida",
            "active": True,
            "body": (
                "Hola {0}, bienvenido/a al servicio de Siempre Cerca.\n\n"
                "Agradecemos nos haya elegido para cuidar a {1} las 24 horas. "
                "Ya se encuentra activo/a dentro de nuestro sistema de monitoreo.\n\n"
                "A partir de ahora recibira notificaciones por este medio ante cualquier novedad. "
                "Tambien le enviaremos un parte diario con el estado general del paciente.\n\n"
                "Por cualquier consulta le dejamos nuestros telefonos de contacto:\n"
                "Central de monitoreo: {2}\n\n"
                "Estamos a plena disposicion.\n\n"
                "— Equipo Siempre Cerca"
            ),
            "variables": ["nombre_familiar", "nombre_paciente", "telefono"],
        },
    ]
