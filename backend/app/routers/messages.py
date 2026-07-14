"""Router de mensajes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.message import MessageOut, MessageSendRequest, MessageTemplateOut
from app.security import get_current_user
from app.services import message_service

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/templates", response_model=list[MessageTemplateOut])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await message_service.list_templates(db)


@router.get("/", response_model=PaginatedResponse[MessageOut])
async def list_messages(
    client_id: int | None = None,
    page: int = 1,
    per_page: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = await message_service.list_messages(
        db,
        client_id=client_id,
        page=page,
        per_page=per_page,
    )
    enriched = []
    for msg in items:
        d = MessageOut.model_validate(msg)
        if msg.client:
            d.client_name = msg.client.name
        enriched.append(d)

    return PaginatedResponse(
        items=enriched,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/send", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: MessageSendRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await message_service.send_message(
        db,
        client_id=body.client_id,
        template_key=body.template_key,
        body=body.body,
        channel=body.channel,
    )
