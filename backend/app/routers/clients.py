"""Router de clientes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert
from app.models.client import Client
from app.models.device import Device
from app.models.user import User
from app.schemas.client import ClientCreate, ClientListItem, ClientOut, ClientUpdate
from app.schemas.common import PaginatedResponse
from app.security import get_current_user, require_role
from app.services import client_service

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("/", response_model=PaginatedResponse[ClientListItem])
async def list_clients(
    page: int = 1,
    per_page: int = 50,
    barrio: str | None = None,
    search: str | None = None,
    is_active: bool | None = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = await client_service.list_clients(
        db,
        page=page,
        per_page=per_page,
        barrio=barrio,
        search=search,
        is_active=is_active,
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("supervisor", "admin")),
):
    return await client_service.create_client(db, body)


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await client_service.get_client(db, client_id)


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("supervisor", "admin")),
):
    return await client_service.update_client(db, client_id, body)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    await client_service.delete_client(db, client_id)


# --- Asociar dispositivo FLIC a cliente ---

class AssignDeviceRequest(BaseModel):
    button_serial: str
    client_id: int | None = None  # si es None, crear cliente nuevo
    # Datos para cliente nuevo (opcionales)
    name: str | None = None
    age: int | None = None
    phone: str | None = None
    address: str | None = None
    barrio: str | None = None


@router.post("/assign-device", status_code=status.HTTP_200_OK)
async def assign_device(
    body: AssignDeviceRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Asocia un dispositivo FLIC a un cliente existente o crea uno nuevo."""
    if body.client_id:
        # Asociar a cliente existente
        result = await db.execute(select(Client).where(Client.id == body.client_id))
        client = result.scalar_one_or_none()
        if not client:
            raise HTTPException(404, "Cliente no encontrado")

        # Ver si ya tiene device
        result = await db.execute(select(Device).where(Device.client_id == body.client_id))
        device = result.scalar_one_or_none()
        if device:
            device.external_device_id = body.button_serial
        else:
            device = Device(
                client_id=body.client_id,
                model="FLIC Button",
                external_device_id=body.button_serial,
                is_online=True,
            )
            db.add(device)
    else:
        # Crear cliente nuevo
        if not body.name:
            raise HTTPException(400, "Se requiere nombre para crear cliente nuevo")
        client = Client(
            name=body.name,
            age=body.age or 0,
            phone=body.phone or "",
            address=body.address or "",
            barrio=body.barrio or "Sin asignar",
        )
        db.add(client)
        await db.flush()

        device = Device(
            client_id=client.id,
            model="FLIC Button",
            external_device_id=body.button_serial,
            is_online=True,
        )
        db.add(device)

    await db.flush()

    # Vincular alertas huérfanas de este serial al cliente
    orphan_alerts = await db.execute(
        select(Alert).where(
            Alert.client_id.is_(None),
            Alert.raw_payload["button_serial_number"].astext == body.button_serial,
        )
    )
    updated_count = 0
    for alert in orphan_alerts.scalars().all():
        alert.client_id = client.id
        alert.device_id = device.id if device else None
        updated_count += 1

    await db.commit()
    return {
        "ok": True,
        "client_id": client.id,
        "client_name": client.name,
        "button_serial": body.button_serial,
        "alerts_linked": updated_count,
    }
