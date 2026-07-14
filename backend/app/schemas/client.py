"""Schemas de cliente, contacto, dispositivo y geocerca."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    name: str
    relationship_label: str
    phone: str
    has_key: bool


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model: str
    serial_number: str | None
    external_device_id: str | None
    battery_pct: int
    signal_strength: int
    is_online: bool
    last_seen_at: datetime | None


# ---------------------------------------------------------------------------
# Geofence
# ---------------------------------------------------------------------------


class GeofenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    radius_m: int
    is_active: bool
    lat: float | None = None
    lng: float | None = None


# ---------------------------------------------------------------------------
# Client — escritura
# ---------------------------------------------------------------------------


class ClientCreate(BaseModel):
    name: str
    age: int
    phone: str | None = None
    address: str
    address_entre: str | None = None
    barrio: str
    conditions: list[str] | None = None
    medications: dict[str, Any] | None = None
    color: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    phone: str | None = None
    address: str | None = None
    address_entre: str | None = None
    barrio: str | None = None
    conditions: list[str] | None = None
    medications: dict[str, Any] | None = None
    color: str | None = None
    notes: str | None = None


# ---------------------------------------------------------------------------
# Client — lectura
# ---------------------------------------------------------------------------


class ClientListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    age: int
    barrio: str
    phone: str | None
    is_active: bool
    color: str | None
    device: DeviceOut | None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None
    name: str
    age: int
    birthdate: date | None
    phone: str | None
    address: str
    address_entre: str | None
    barrio: str
    conditions: list[str] | None
    medications: dict[str, Any] | None
    color: str | None
    is_active: bool
    notes: str | None
    alta_completa: bool
    created_at: datetime
    updated_at: datetime

    contacts: list[ContactOut]
    device: DeviceOut | None
    geofence: GeofenceOut | None
