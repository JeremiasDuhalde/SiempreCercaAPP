"""Servicio de mensajes y plantillas."""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client
from app.models.message import Message, MessageTemplate


async def list_templates(db: AsyncSession) -> list[MessageTemplate]:
    query = select(MessageTemplate).where(MessageTemplate.is_active == True).order_by(MessageTemplate.name)  # noqa: E712
    result = await db.execute(query)
    return list(result.scalars().all())


async def list_messages(
    db: AsyncSession,
    *,
    client_id: int | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[Message], int]:
    query = select(Message).options(selectinload(Message.client))

    if client_id is not None:
        query = query.where(Message.client_id == client_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Message.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def send_message(
    db: AsyncSession,
    client_id: int,
    template_key: str | None,
    body: str,
    channel: str = "whatsapp",
) -> Message:
    # Verificar que el cliente exista
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    message = Message(
        client_id=client_id,
        template_key=template_key,
        body=body,
        channel=channel,
        status="queued",
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message
