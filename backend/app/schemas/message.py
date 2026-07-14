"""Schemas de mensajes y plantillas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    body_template: str
    is_active: bool
    icon: str | None
    color: str | None
    created_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    template_key: str | None
    body: str
    channel: str
    wa_message_id: str | None
    status: str
    sent_at: datetime | None
    delivered_at: datetime | None
    read_at: datetime | None
    created_at: datetime

    client_name: str | None = None


class MessageSendRequest(BaseModel):
    client_id: int
    template_key: str | None = None
    body: str
    channel: str = "whatsapp"
