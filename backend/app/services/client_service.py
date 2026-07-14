"""Servicio de clientes."""

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client


async def list_clients(
    db: AsyncSession,
    *,
    page: int = 1,
    per_page: int = 50,
    barrio: str | None = None,
    search: str | None = None,
    is_active: bool | None = True,
) -> tuple[list[Client], int]:
    query = select(Client).options(
        selectinload(Client.contacts),
        selectinload(Client.device),
        selectinload(Client.geofence),
    )

    if is_active is not None:
        query = query.where(Client.is_active == is_active)
    if barrio:
        query = query.where(Client.barrio == barrio)
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                Client.name.ilike(term),
                Client.phone.ilike(term),
                Client.address.ilike(term),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Client.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_client(db: AsyncSession, client_id: int) -> Client:
    query = (
        select(Client)
        .options(
            selectinload(Client.contacts),
            selectinload(Client.device),
            selectinload(Client.geofence),
        )
        .where(Client.id == client_id)
    )
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


async def create_client(db: AsyncSession, data) -> Client:
    client = Client(**data.model_dump(exclude_unset=False))
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def update_client(db: AsyncSession, client_id: int, data) -> Client:
    client = await get_client(db, client_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


async def delete_client(db: AsyncSession, client_id: int) -> None:
    client = await get_client(db, client_id)
    client.is_active = False
    await db.commit()
