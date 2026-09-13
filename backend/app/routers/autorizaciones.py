"""Router para gestion de autorizaciones medicas.

Permite subir PDFs de autorizaciones, extraer datos con Claude AI,
y crear/actualizar pacientes en Odoo.
"""

import base64
import json
import logging
import xmlrpc.client
from typing import Any

import pymupdf
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.config import settings
from app.models.user import User
from app.security import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/autorizaciones", tags=["autorizaciones"])

# ---------------------------------------------------------------------------
# Odoo helpers (misma mecanica que prestadores.py)
# ---------------------------------------------------------------------------

ODOO_URL = getattr(settings, "odoo_url", "https://siempre-cerca-srl.odoo.com")
ODOO_DB = getattr(settings, "odoo_db", "siempre-cerca-srl")
ODOO_USER = getattr(settings, "odoo_user", "administracion@siemprecercasrl.com")
ODOO_PASSWORD = getattr(settings, "odoo_password", "")


def _odoo_models():
    return xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")


def _odoo_uid():
    common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
    if not uid:
        raise HTTPException(status_code=500, detail="Error de conexion con Odoo")
    return uid


def _odoo_search_read(model: str, domain: list, fields: list, limit: int = 0) -> list[dict]:
    uid = _odoo_uid()
    m = _odoo_models()
    opts: dict[str, Any] = {"fields": fields}
    if limit:
        opts["limit"] = limit
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "search_read", [domain], opts)


def _odoo_create(model: str, values: dict) -> int:
    uid = _odoo_uid()
    m = _odoo_models()
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "create", [values])


def _odoo_write(model: str, ids: list[int], values: dict) -> bool:
    uid = _odoo_uid()
    m = _odoo_models()
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "write", [ids, values])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AutorizacionDatosExtraidos(BaseModel):
    beneficiario_nombre: str | None = None
    beneficiario_apellido: str | None = None
    nro_afiliado: str | None = None
    plan: str | None = None
    credencial: str | None = None
    nro_causa: str | None = None
    practica: str | None = None
    medico_solicitante: str | None = None
    fecha_prescripcion: str | None = None
    fecha_autorizacion: str | None = None
    periodo: str | None = None
    extra_capita: bool | None = None
    obra_social: str | None = None


class AutorizacionUploadResponse(BaseModel):
    status: str  # "creado" | "duplicado" | "incompleto"
    datos_extraidos: AutorizacionDatosExtraidos
    paciente_id: int | None = None
    autorizacion_id: int | None = None
    paciente_existente: dict | None = None
    mensaje: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extraer_texto_pdf(pdf_bytes: bytes) -> str:
    """Extrae texto de un PDF usando pymupdf."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    texto = ""
    for page in doc:
        texto += page.get_text()
    doc.close()
    return texto


def _extraer_datos_con_claude(texto_pdf: str) -> AutorizacionDatosExtraidos:
    """Envia el texto del PDF a Claude AI para extraer datos estructurados."""
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="API key de Anthropic no configurada. Configura ANTHROPIC_API_KEY en las variables de entorno.",
        )

    import anthropic

    prompt = f"""Analiza esta autorizacion medica y extrae los siguientes datos en formato JSON:
{{
  "beneficiario_nombre": "nombre completo del paciente/beneficiario",
  "beneficiario_apellido": "apellido (si se puede separar)",
  "nro_afiliado": "numero de afiliado",
  "plan": "plan de la obra social",
  "credencial": "numero de credencial",
  "nro_causa": "numero de causa judicial si existe",
  "practica": "descripcion de la practica autorizada",
  "medico_solicitante": "nombre del medico solicitante",
  "fecha_prescripcion": "YYYY-MM-DD o null",
  "fecha_autorizacion": "YYYY-MM-DD HH:MM:SS o null",
  "periodo": "periodo autorizado ej: Agosto 2025",
  "extra_capita": true/false,
  "obra_social": "nombre de la obra social"
}}

Responde UNICAMENTE con el JSON, sin texto adicional, sin bloques de codigo markdown.
Si no encuentras un dato, usa null.

Texto del documento:
{texto_pdf}
"""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    respuesta_texto = message.content[0].text.strip()

    # Limpiar posibles bloques markdown
    if respuesta_texto.startswith("```"):
        lines = respuesta_texto.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        respuesta_texto = "\n".join(lines)

    try:
        datos = json.loads(respuesta_texto)
    except json.JSONDecodeError:
        logger.error("Claude retorno JSON invalido: %s", respuesta_texto)
        raise HTTPException(
            status_code=422,
            detail="No se pudo parsear la respuesta de Claude AI. Intenta con otro PDF.",
        )

    return AutorizacionDatosExtraidos(**datos)


def _buscar_paciente_duplicado(nombre: str | None, apellido: str | None, nro_afiliado: str | None) -> dict | None:
    """Busca en Odoo si ya existe un paciente con mismo nro_afiliado O nombre+apellido."""
    fields = ["id", "x_name", "x_studio_apellido", "x_studio_nro_afiliado",
              "x_studio_obra_social_id", "x_studio_dni"]

    # Primero buscar por nro_afiliado (mas preciso)
    if nro_afiliado:
        existentes = _odoo_search_read(
            "x_pacientes_dev",
            [["x_studio_nro_afiliado", "=", nro_afiliado]],
            fields, limit=1,
        )
        if existentes:
            return existentes[0]

    # Si no hay afiliado, buscar por nombre + apellido
    if nombre and apellido:
        existentes = _odoo_search_read(
            "x_pacientes_dev",
            [["x_name", "ilike", nombre], ["x_studio_apellido", "ilike", apellido]],
            fields, limit=1,
        )
        if existentes:
            return existentes[0]

    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=AutorizacionUploadResponse)
async def upload_autorizacion(
    file: UploadFile = File(...),
    user: User = Depends(require_role("admin", "operador")),
):
    """Sube un PDF de autorizacion, extrae datos con IA y crea paciente en Odoo."""
    # Validar tipo de archivo
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo esta vacio")

    # 1. Extraer texto del PDF
    try:
        texto = _extraer_texto_pdf(pdf_bytes)
    except Exception as e:
        logger.error("Error al leer PDF: %s", e)
        raise HTTPException(status_code=422, detail=f"No se pudo leer el PDF: {e}")

    if not texto.strip():
        raise HTTPException(
            status_code=422,
            detail="El PDF no contiene texto extraible. Puede ser una imagen escaneada.",
        )

    # 2. Extraer datos con Claude AI
    datos = _extraer_datos_con_claude(texto)

    # 3. Verificar datos minimos
    nombre_completo = datos.beneficiario_nombre
    if datos.beneficiario_apellido and datos.beneficiario_nombre:
        nombre_completo = f"{datos.beneficiario_nombre} {datos.beneficiario_apellido}"

    if not nombre_completo and not datos.nro_afiliado:
        return AutorizacionUploadResponse(
            status="incompleto",
            datos_extraidos=datos,
            mensaje="No se pudo extraer nombre ni numero de afiliado del documento.",
        )

    # 4. Buscar duplicados
    paciente_existente = _buscar_paciente_duplicado(datos.beneficiario_nombre, datos.beneficiario_apellido, datos.nro_afiliado)
    if paciente_existente:
        return AutorizacionUploadResponse(
            status="duplicado",
            datos_extraidos=datos,
            paciente_existente=paciente_existente,
            mensaje=f"Ya existe un paciente con nombre '{nombre_completo}' y afiliado '{datos.nro_afiliado}'.",
        )

    # 5. Crear paciente en borrador en Odoo
    paciente_values: dict[str, Any] = {
        "x_name": datos.beneficiario_nombre or "",
        "x_studio_apellido": datos.beneficiario_apellido or "",
        "x_studio_nro_afiliado": datos.nro_afiliado or "",
        "x_studio_plan_os_categoria": datos.plan or "",
        "x_studio_estado": "borrador",
        "x_studio_observaciones": "Creado automaticamente por IA desde autorizacion. Completar datos faltantes.",
    }

    try:
        paciente_id = _odoo_create("x_pacientes_dev", paciente_values)
    except Exception as e:
        logger.error("Error al crear paciente en Odoo: %s", e)
        raise HTTPException(status_code=500, detail=f"Error al crear paciente en Odoo: {e}")

    # 6. Crear autorizacion vinculada al paciente
    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    autorizacion_values: dict[str, Any] = {
        "x_name": f"AUT-{datos.nro_afiliado or 'SIN'}-{datos.periodo or 'SIN'}",
        "x_studio_paciente_id": paciente_id,
        "x_studio_nro_afiliado": datos.nro_afiliado or "",
        "x_studio_plan": datos.plan or "",
        "x_studio_credencial": datos.credencial or "",
        "x_studio_nro_causa": datos.nro_causa or "",
        "x_studio_practica": datos.practica or "",
        "x_studio_medico_solicitante": datos.medico_solicitante or "",
        "x_studio_fecha_prescripcion": datos.fecha_prescripcion or False,
        "x_studio_fecha_autorizacion": datos.fecha_autorizacion or False,
        "x_studio_periodo": datos.periodo or "",
        "x_studio_extra_capita": datos.extra_capita or False,
        "x_studio_estado": "borrador",
        "x_studio_documento": pdf_base64,
    }

    try:
        autorizacion_id = _odoo_create("x_autorizacion_dev", autorizacion_values)
    except Exception as e:
        logger.error("Error al crear autorizacion en Odoo: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Paciente creado (id={paciente_id}) pero fallo la autorizacion: {e}",
        )

    return AutorizacionUploadResponse(
        status="creado",
        datos_extraidos=datos,
        paciente_id=paciente_id,
        autorizacion_id=autorizacion_id,
        mensaje="Paciente y autorizacion creados en borrador.",
    )


@router.get("/{autorizacion_id}")
async def obtener_autorizacion(
    autorizacion_id: int,
    user: User = Depends(require_role("admin", "operador")),
):
    """Retorna datos de una autorizacion por ID."""
    autorizaciones = _odoo_search_read(
        "x_autorizacion_dev",
        [["id", "=", autorizacion_id]],
        [
            "id", "x_name", "x_studio_paciente_id",
            "x_studio_nro_afiliado", "x_studio_plan_os_categoria",
            "x_studio_nro_causa", "x_studio_practica", "x_studio_medico_solicitante",
            "x_studio_fecha_prescripcion", "x_studio_fecha_autorizacion",
            "x_studio_periodo", "x_studio_extra_capita", "x_studio_obra_social",
            "x_studio_estado", "create_date", "write_date",
        ],
        limit=1,
    )

    if not autorizaciones:
        raise HTTPException(status_code=404, detail="Autorizacion no encontrada")

    return autorizaciones[0]


@router.get("")
async def listar_autorizaciones(
    paciente_id: int | None = None,
    estado: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    user: User = Depends(require_role("admin", "operador")),
):
    """Lista autorizaciones con filtros opcionales."""
    domain: list = []

    if paciente_id:
        domain.append(["x_studio_paciente_id", "=", paciente_id])
    if estado:
        domain.append(["x_studio_estado", "=", estado])
    if fecha_desde:
        domain.append(["x_studio_fecha_autorizacion", ">=", fecha_desde])
    if fecha_hasta:
        domain.append(["x_studio_fecha_autorizacion", "<=", fecha_hasta])

    autorizaciones = _odoo_search_read(
        "x_autorizacion_dev",
        domain,
        [
            "id", "x_name", "x_studio_paciente_id",
            "x_studio_nro_afiliado", "x_studio_practica",
            "x_studio_periodo",
            "x_studio_estado", "create_date",
        ],
    )

    return autorizaciones


@router.post("/procesar-pendientes")
async def procesar_pendientes(user: User = Depends(require_role("admin", "operador"))):
    """Procesa autorizaciones subidas desde Odoo que aun no fueron procesadas por IA."""
    pendientes = _odoo_search_read(
        "x_autorizacion_dev",
        [["x_studio_procesado_ia", "=", False], ["x_studio_documento", "!=", False]],
        ["id", "x_studio_documento", "x_studio_documento_nombre", "x_studio_paciente_id"],
        limit=10,
    )

    if not pendientes:
        return {"procesadas": 0, "mensaje": "No hay autorizaciones pendientes"}

    resultados = []
    for aut in pendientes:
        try:
            pdf_b64 = aut.get("x_studio_documento")
            if not pdf_b64:
                continue

            pdf_bytes = base64.b64decode(pdf_b64)
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            texto = ""
            for page in doc:
                texto += page.get_text()
            doc.close()

            if not texto.strip():
                _odoo_write("x_autorizacion_dev", [aut["id"]], {
                    "x_studio_procesado_ia": True,
                    "x_studio_notas": "PDF sin texto extraible",
                })
                resultados.append({"id": aut["id"], "status": "sin_texto"})
                continue

            datos = _extraer_datos_con_claude(texto)
            nombre = datos.beneficiario_nombre or ""
            apellido = datos.beneficiario_apellido or ""

            paciente_id = None
            if aut.get("x_studio_paciente_id") and isinstance(aut["x_studio_paciente_id"], list):
                paciente_id = aut["x_studio_paciente_id"][0]

            if not paciente_id:
                dup = _buscar_paciente_duplicado(nombre, apellido, datos.nro_afiliado)
                if dup:
                    paciente_id = dup["id"]
                else:
                    pac_vals: dict[str, Any] = {"x_name": nombre}
                    if apellido:
                        pac_vals["x_studio_apellido"] = apellido
                    if datos.nro_afiliado:
                        pac_vals["x_studio_nro_afiliado"] = datos.nro_afiliado
                    if datos.plan:
                        pac_vals["x_studio_plan_os_categoria"] = datos.plan
                    paciente_id = _odoo_create("x_pacientes_dev", pac_vals)

            aut_update: dict[str, Any] = {
                "x_studio_procesado_ia": True,
                "x_studio_paciente_id": paciente_id,
                "x_studio_nro_afiliado": datos.nro_afiliado or "",
                "x_studio_plan": datos.plan or "",
                "x_studio_credencial": datos.credencial or "",
                "x_studio_nro_causa": datos.nro_causa or "",
                "x_studio_practica": datos.practica or "",
                "x_studio_periodo": datos.periodo or "",
                "x_studio_extra_capita": datos.extra_capita or False,
                "x_studio_estado": "vigente",
            }
            if datos.fecha_autorizacion:
                aut_update["x_studio_fecha_autorizacion"] = datos.fecha_autorizacion

            _odoo_write("x_autorizacion_dev", [aut["id"]], aut_update)
            resultados.append({"id": aut["id"], "status": "ok", "paciente_id": paciente_id})

        except Exception as e:
            logger.error("Error procesando aut %s: %s", aut["id"], e)
            _odoo_write("x_autorizacion_dev", [aut["id"]], {
                "x_studio_procesado_ia": True,
                "x_studio_notas": f"Error: {str(e)[:200]}",
            })
            resultados.append({"id": aut["id"], "status": "error"})

    return {"procesadas": len(resultados), "resultados": resultados}
