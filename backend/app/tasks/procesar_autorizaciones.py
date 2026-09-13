"""Task Celery para procesar autorizaciones pendientes con IA.

Se ejecuta cada 30 segundos. Busca autorizaciones con procesado_ia=False
en Odoo, extrae datos del PDF con Claude, y crea/actualiza pacientes.
"""

import base64
import json
import logging
import xmlrpc.client
from typing import Any

from app.celery_app import celery
from app.config import settings

logger = logging.getLogger(__name__)

ODOO_URL = settings.odoo_url
ODOO_DB = settings.odoo_db
ODOO_USER = settings.odoo_user
ODOO_PASSWORD = settings.odoo_password


def _odoo_uid():
    common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
    return uid


def _odoo_models():
    return xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")


def _odoo_search_read(model, domain, fields, limit=0):
    uid = _odoo_uid()
    m = _odoo_models()
    opts: dict[str, Any] = {"fields": fields}
    if limit:
        opts["limit"] = limit
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "search_read", [domain], opts)


def _odoo_create(model, values):
    uid = _odoo_uid()
    m = _odoo_models()
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "create", [values])


def _odoo_write(model, ids, values):
    uid = _odoo_uid()
    m = _odoo_models()
    return m.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, model, "write", [ids, values])


def _extraer_con_claude(texto: str) -> dict:
    """Extrae datos de una autorizacion usando Claude AI."""
    try:
        import anthropic
    except ImportError:
        logger.error("anthropic no instalado")
        return {}

    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY no configurada")
        return {}

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "Analiza esta autorizacion medica y extrae los datos en JSON puro (sin markdown):\n"
        '{"beneficiario_nombre": "", "beneficiario_apellido": "", "nro_afiliado": "", '
        '"plan": "", "credencial": "", "nro_causa": "", "practica": "", '
        '"medico_solicitante": "", "fecha_autorizacion": "", "periodo": "", '
        '"extra_capita": false, "obra_social": ""}\n\n'
        f"Texto:\n{texto[:3000]}"
    )

    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Limpiar markdown si viene
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        raw = raw.rsplit("```", 1)[0] if "```" in raw else raw

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Claude no retorno JSON valido: %s", raw[:200])
        return {}


@celery.task(name="app.tasks.procesar_autorizaciones.procesar_pendientes")
def procesar_pendientes():
    """Busca autorizaciones sin procesar y las procesa con IA."""
    if not ODOO_PASSWORD:
        return {"skip": "ODOO_PASSWORD no configurado"}

    try:
        pendientes = _odoo_search_read(
            "x_autorizacion_dev",
            [["x_studio_procesado_ia", "=", False], ["x_studio_documento", "!=", False]],
            ["id", "x_studio_documento", "x_studio_paciente_id"],
            limit=5,
        )
    except Exception as e:
        logger.error("Error buscando autorizaciones: %s", e)
        return {"error": str(e)}

    if not pendientes:
        return {"procesadas": 0}

    resultados = []
    for aut in pendientes:
        try:
            pdf_b64 = aut.get("x_studio_documento")
            if not pdf_b64:
                continue

            # Extraer texto del PDF
            pdf_bytes = base64.b64decode(pdf_b64)
            try:
                import pymupdf
                doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
                texto = ""
                for page in doc:
                    texto += page.get_text()
                doc.close()
            except Exception:
                texto = pdf_bytes.decode("latin-1", errors="ignore")

            if not texto.strip():
                _odoo_write("x_autorizacion_dev", [aut["id"]], {
                    "x_studio_procesado_ia": True,
                    "x_studio_notas": "PDF sin texto extraible",
                })
                continue

            # Extraer con IA
            datos = _extraer_con_claude(texto)
            if not datos:
                _odoo_write("x_autorizacion_dev", [aut["id"]], {
                    "x_studio_procesado_ia": True,
                    "x_studio_notas": "Error al procesar con IA",
                })
                continue

            nombre = datos.get("beneficiario_nombre", "")
            apellido = datos.get("beneficiario_apellido", "")
            nro_afiliado = datos.get("nro_afiliado", "")

            # Buscar o crear paciente
            paciente_id = None
            if aut.get("x_studio_paciente_id") and isinstance(aut["x_studio_paciente_id"], list):
                paciente_id = aut["x_studio_paciente_id"][0]

            if not paciente_id and nro_afiliado:
                existentes = _odoo_search_read(
                    "x_pacientes_dev",
                    [["x_studio_nro_afiliado", "=", nro_afiliado]],
                    ["id"],
                    limit=1,
                )
                if existentes:
                    paciente_id = existentes[0]["id"]

            if not paciente_id and nombre:
                pac_vals: dict[str, Any] = {
                    "x_name": nombre,
                    "x_studio_estado": "borrador",
                    "x_studio_observaciones": "Creado automaticamente por IA desde autorizacion. Completar datos faltantes.",
                }
                if apellido:
                    pac_vals["x_studio_apellido"] = apellido
                if nro_afiliado:
                    pac_vals["x_studio_nro_afiliado"] = nro_afiliado
                if datos.get("plan"):
                    pac_vals["x_studio_plan_os_categoria"] = datos["plan"]
                paciente_id = _odoo_create("x_pacientes_dev", pac_vals)

            # Actualizar autorizacion
            aut_update: dict[str, Any] = {
                "x_studio_procesado_ia": True,
                "x_studio_estado": "vigente",
            }
            if paciente_id:
                aut_update["x_studio_paciente_id"] = paciente_id
            for campo_odoo, campo_ia in [
                ("x_studio_nro_afiliado", "nro_afiliado"),
                ("x_studio_plan", "plan"),
                ("x_studio_credencial", "credencial"),
                ("x_studio_nro_causa", "nro_causa"),
                ("x_studio_practica", "practica"),
                ("x_studio_periodo", "periodo"),
            ]:
                if datos.get(campo_ia):
                    aut_update[campo_odoo] = datos[campo_ia]
            if datos.get("extra_capita"):
                aut_update["x_studio_extra_capita"] = True

            _odoo_write("x_autorizacion_dev", [aut["id"]], aut_update)

            logger.info("Autorizacion %s procesada -> paciente %s", aut["id"], paciente_id)
            resultados.append({"id": aut["id"], "paciente_id": paciente_id})

        except Exception as e:
            logger.error("Error en autorizacion %s: %s", aut["id"], e)
            try:
                _odoo_write("x_autorizacion_dev", [aut["id"]], {
                    "x_studio_procesado_ia": True,
                    "x_studio_notas": f"Error: {str(e)[:200]}",
                })
            except Exception:
                pass

    return {"procesadas": len(resultados), "resultados": resultados}
