"""Router para prestadores de internacion domiciliaria.

Los prestadores se loguean via este endpoint. No necesitan usuario Odoo.
El backend consulta Odoo con credenciales admin para validar y leer datos.
"""

import xmlrpc.client
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.security import create_access_token

router = APIRouter(prefix="/api/prestadores", tags=["prestadores"])

limiter = Limiter(key_func=get_remote_address)

# Odoo connection config (usa las vars de entorno del backend)
ODOO_URL = getattr(settings, "odoo_url", "https://siempre-cerca-srl.odoo.com")
ODOO_DB = getattr(settings, "odoo_db", "siempre-cerca-srl")
ODOO_USER = getattr(settings, "odoo_user", "administracion@siemprecercasrl.com")
ODOO_PASSWORD = getattr(settings, "odoo_password", "")


def _odoo_models():
    return xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")


def _odoo_uid():
    """Autentica con Odoo y retorna uid admin."""
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


# --- Schemas ---

class PrestadorLoginRequest(BaseModel):
    email: str
    password: str


class PrestadorTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    prestador: dict


class VisitaCreateRequest(BaseModel):
    frecuencia_id: int | None = None
    paciente_id: int
    orden_id: int | None = None
    fecha: str
    hora_llegada: float | None = None
    hora_salida: float | None = None
    tipo_prestacion: str | None = None
    asistencia: str
    motivo_ausencia: str | None = None
    # Signos vitales
    temperatura: float | None = None
    presion_sistolica: int | None = None
    presion_diastolica: int | None = None
    frecuencia_cardiaca: int | None = None
    frecuencia_respiratoria: int | None = None
    saturacion_o2: int | None = None
    glucemia: int | None = None
    peso: float | None = None
    dolor_escala: int | None = None
    # Clinicos
    estado_general: str | None = None
    estado_conciencia: str | None = None
    vigil: str | None = None
    orientado: str | None = None
    hidratacion: str | None = None
    catarsis: str | None = None
    miccion: str | None = None
    sonda_vesical: str | None = None
    lesiones_piel: str | None = None
    lesiones_detalle: str | None = None
    necesita_rehabilitacion: bool = False
    evolucion: str | None = None
    examen_fisico: str | None = None
    indicaciones: str | None = None
    observaciones: str | None = None
    # Firmas
    firma_profesional: str | None = None
    firma_paciente: str | None = None
    firmante_nombre: str | None = None
    firmante_dni: str | None = None
    firmante_relacion: str | None = None
    # Geo
    geolat: float | None = None
    geolon: float | None = None
    estado: str = "completada"


# --- Endpoints ---

@router.post("/login", response_model=PrestadorTokenResponse)
@limiter.limit("10/minute")
async def prestador_login(request: Request, body: PrestadorLoginRequest):
    """Login de prestador. Busca por email en Odoo y valida password."""
    # Buscar prestador en Odoo por email
    prestadores = _odoo_search_read(
        "x_prestadores_dev",
        [["x_studio_partner_email", "=", body.email]],
        [
            "id", "x_name", "x_studio_razon_social", "x_studio_nombre_fantasia",
            "x_studio_dni", "x_studio_cuit", "x_studio_celular",
            "x_studio_partner_email", "x_studio_localidad",
            "x_studio_calle", "x_studio_nro_dir",
        ],
        limit=1,
    )

    if not prestadores:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Prestador no encontrado",
        )

    prestador = prestadores[0]

    # Validar password: por ahora usamos DNI como password
    # En el futuro se puede agregar un campo password en el prestador
    dni = prestador.get("x_studio_dni", "")
    if body.password != dni:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    # Generar JWT
    token = create_access_token(
        subject=body.email,
        extra={
            "role": "prestador",
            "name": prestador.get("x_studio_razon_social") or prestador.get("x_name", ""),
            "prestador_id": prestador["id"],
        },
    )

    return PrestadorTokenResponse(
        access_token=token,
        prestador={
            "id": prestador["id"],
            "nombre": prestador.get("x_studio_razon_social") or prestador.get("x_name", ""),
            "email": prestador.get("x_studio_partner_email", ""),
            "dni": prestador.get("x_studio_dni", ""),
            "cuit": prestador.get("x_studio_cuit", ""),
            "telefono": prestador.get("x_studio_celular", ""),
            "localidad": prestador.get("x_studio_localidad", ""),
        },
    )


@router.get("/me")
async def prestador_me(request: Request):
    """Retorna datos del prestador autenticado."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    if payload.get("role") != "prestador":
        raise HTTPException(status_code=403, detail="No es prestador")

    prestador_id = payload.get("prestador_id")
    if not prestador_id:
        raise HTTPException(status_code=400, detail="Token sin prestador_id")

    prestadores = _odoo_search_read(
        "x_prestadores_dev",
        [["id", "=", prestador_id]],
        [
            "id", "x_name", "x_studio_razon_social", "x_studio_nombre_fantasia",
            "x_studio_dni", "x_studio_cuit", "x_studio_celular",
            "x_studio_partner_email", "x_studio_localidad",
            "x_studio_calle", "x_studio_nro_dir", "x_studio_banco",
            "x_studio_cbu", "x_studio_alias_cbu",
        ],
        limit=1,
    )

    if not prestadores:
        raise HTTPException(status_code=404, detail="Prestador no encontrado")

    return prestadores[0]


@router.get("/frecuencia/{frecuencia_id}")
async def detalle_frecuencia(request: Request, frecuencia_id: int):
    """Retorna frecuencia + orden + paciente para el wizard de visita."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    # Frecuencia
    frecs = _odoo_search_read(
        "x_frecuencia_dev",
        [["id", "=", frecuencia_id]],
        ["id", "x_name", "x_studio_orden_id", "x_studio_paciente_id",
         "x_studio_prestador_id", "x_studio_fecha",
         "x_studio_hora_inicio", "x_studio_hora_fin", "x_studio_cumplida"],
        limit=1,
    )
    if not frecs:
        raise HTTPException(status_code=404, detail="Frecuencia no encontrada")

    frec = frecs[0]
    result: dict[str, Any] = {"frecuencia": frec, "orden": None, "paciente": None}

    # Orden
    orden_id = frec.get("x_studio_orden_id")
    if orden_id and isinstance(orden_id, list):
        ordenes = _odoo_search_read(
            "x_ordenes_dev",
            [["id", "=", orden_id[0]]],
            ["id", "x_name", "x_studio_paciente_id", "x_studio_obra_social_id",
             "x_studio_tipo_servicio", "x_studio_codigo_autorizacion"],
            limit=1,
        )
        if ordenes:
            result["orden"] = ordenes[0]

            # Paciente
            pac_id = ordenes[0].get("x_studio_paciente_id")
            if pac_id and isinstance(pac_id, list):
                pacientes = _odoo_search_read(
                    "x_pacientes_dev",
                    [["id", "=", pac_id[0]]],
                    ["id", "x_name", "x_studio_apellido", "x_studio_dni",
                     "x_studio_obra_social_id", "x_studio_calle", "x_studio_nro_dir",
                     "x_studio_localidad", "x_studio_patologia", "x_studio_diagnostico",
                     "x_studio_celular", "x_studio_telefono"],
                    limit=1,
                )
                if pacientes:
                    result["paciente"] = pacientes[0]

    return result


@router.get("/agenda")
async def prestador_agenda(request: Request, fecha: str | None = None):
    """Retorna frecuencias/visitas del prestador para una fecha."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    prestador_id = payload.get("prestador_id")
    if not prestador_id:
        raise HTTPException(status_code=400, detail="Token sin prestador_id")

    domain: list = [["x_studio_prestador_id", "=", prestador_id]]
    if fecha:
        domain.append(["x_studio_fecha", "=", fecha])

    frecuencias = _odoo_search_read(
        "x_frecuencia_dev",
        domain,
        [
            "id", "x_name", "x_studio_paciente_id", "x_studio_prestador_id",
            "x_studio_fecha", "x_studio_hora_inicio", "x_studio_hora_fin",
            "x_studio_cumplida", "x_studio_orden_id", "x_studio_observaciones",
        ],
    )

    return frecuencias


@router.get("/pacientes")
async def prestador_pacientes(request: Request):
    """Retorna pacientes asignados al prestador (via ordenes activas)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    prestador_id = payload.get("prestador_id")
    if not prestador_id:
        raise HTTPException(status_code=400, detail="Token sin prestador_id")

    # Buscar lineas de orden activas de este prestador
    lineas = _odoo_search_read(
        "x_orden_lineas_dev",
        [["x_studio_prestador_id", "=", prestador_id]],
        ["x_studio_orden_id"],
    )

    orden_ids = list({l["x_studio_orden_id"][0] for l in lineas if l.get("x_studio_orden_id")})
    if not orden_ids:
        return []

    # Obtener pacientes de esas ordenes
    ordenes = _odoo_search_read(
        "x_ordenes_dev",
        [["id", "in", orden_ids], ["x_studio_estado", "in", ["en_curso", "pendiente"]]],
        ["x_studio_paciente_id"],
    )

    paciente_ids = list({o["x_studio_paciente_id"][0] for o in ordenes if o.get("x_studio_paciente_id")})
    if not paciente_ids:
        return []

    pacientes = _odoo_search_read(
        "x_pacientes_dev",
        [["id", "in", paciente_ids]],
        [
            "id", "x_name", "x_studio_apellido", "x_studio_dni",
            "x_studio_obra_social_id", "x_studio_calle", "x_studio_nro_dir",
            "x_studio_localidad", "x_studio_patologia", "x_studio_diagnostico",
            "x_studio_celular", "x_studio_telefono",
        ],
    )

    return pacientes


@router.post("/visitas")
async def crear_visita(request: Request, body: VisitaCreateRequest):
    """Crea una visita en Odoo."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    prestador_id = payload.get("prestador_id")
    if not prestador_id:
        raise HTTPException(status_code=400, detail="Token sin prestador_id")

    values: dict[str, Any] = {
        "x_studio_prestador_id": prestador_id,
        "x_studio_paciente_id": body.paciente_id,
        "x_studio_fecha": body.fecha,
        "x_studio_asistencia": body.asistencia,
        "x_studio_estado": body.estado,
    }

    # Campos opcionales
    optional_map = {
        "frecuencia_id": "x_studio_frecuencia_id",
        "orden_id": "x_studio_orden_id",
        "hora_llegada": "x_studio_hora_llegada",
        "hora_salida": "x_studio_hora_salida",
        "tipo_prestacion": "x_studio_tipo_prestacion",
        "motivo_ausencia": "x_studio_motivo_ausencia",
        "temperatura": "x_studio_temperatura",
        "presion_sistolica": "x_studio_presion_sistolica",
        "presion_diastolica": "x_studio_presion_diastolica",
        "frecuencia_cardiaca": "x_studio_frecuencia_cardiaca",
        "frecuencia_respiratoria": "x_studio_frecuencia_respiratoria",
        "saturacion_o2": "x_studio_saturacion_o2",
        "glucemia": "x_studio_glucemia",
        "peso": "x_studio_peso",
        "dolor_escala": "x_studio_dolor_escala",
        "estado_general": "x_studio_estado_general",
        "estado_conciencia": "x_studio_estado_conciencia",
        "vigil": "x_studio_vigil",
        "orientado": "x_studio_orientado",
        "hidratacion": "x_studio_hidratacion",
        "catarsis": "x_studio_catarsis",
        "miccion": "x_studio_miccion",
        "sonda_vesical": "x_studio_sonda_vesical",
        "lesiones_piel": "x_studio_lesiones_piel",
        "lesiones_detalle": "x_studio_lesiones_detalle",
        "necesita_rehabilitacion": "x_studio_necesita_rehabilitacion",
        "evolucion": "x_studio_evolucion",
        "examen_fisico": "x_studio_examen_fisico",
        "indicaciones": "x_studio_indicaciones",
        "observaciones": "x_studio_observaciones",
        "firma_profesional": "x_studio_firma_profesional",
        "firma_paciente": "x_studio_firma_paciente",
        "firmante_nombre": "x_studio_firmante_nombre",
        "firmante_dni": "x_studio_firmante_dni",
        "firmante_relacion": "x_studio_firmante_relacion",
        "geolat": "x_studio_geolat",
        "geolon": "x_studio_geolon",
    }

    for py_field, odoo_field in optional_map.items():
        val = getattr(body, py_field, None)
        if val is not None:
            values[odoo_field] = val

    visita_id = _odoo_create("x_visita_dev", values)

    # Si hay frecuencia, marcarla como cumplida
    if body.frecuencia_id and body.asistencia == "presente":
        _odoo_write("x_frecuencia_dev", [body.frecuencia_id], {"x_studio_cumplida": True})

    return {"id": visita_id, "status": "ok"}


@router.get("/visitas")
async def listar_visitas(request: Request, fecha_desde: str | None = None, fecha_hasta: str | None = None):
    """Lista visitas del prestador."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    from jose import JWTError, jwt as jose_jwt
    try:
        payload = jose_jwt.decode(auth[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    prestador_id = payload.get("prestador_id")
    if not prestador_id:
        raise HTTPException(status_code=400, detail="Token sin prestador_id")

    domain: list = [["x_studio_prestador_id", "=", prestador_id]]
    if fecha_desde:
        domain.append(["x_studio_fecha", ">=", fecha_desde])
    if fecha_hasta:
        domain.append(["x_studio_fecha", "<=", fecha_hasta])

    visitas = _odoo_search_read(
        "x_visita_dev",
        domain,
        [
            "id", "x_name", "x_studio_paciente_id", "x_studio_fecha",
            "x_studio_tipo_prestacion", "x_studio_asistencia",
            "x_studio_estado_general", "x_studio_estado",
            "x_studio_hora_llegada", "x_studio_hora_salida",
        ],
    )

    return visitas
