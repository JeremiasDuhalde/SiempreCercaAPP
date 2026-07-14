"""Schemas Pydantic del backend SiempreCerca."""

from app.schemas.alert import (
    AlertLogOut,
    AlertOut,
    AlertStats,
    AlertStatusUpdate,
    AlertWithLogs,
)
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.client import (
    ClientCreate,
    ClientListItem,
    ClientOut,
    ClientUpdate,
    ContactOut,
    DeviceOut,
    GeofenceOut,
)
from app.schemas.common import GeoPoint, PaginatedResponse
from app.schemas.message import MessageOut, MessageSendRequest, MessageTemplateOut
from app.schemas.user import PasswordChange, UserCreate, UserOut, UserUpdate
from app.schemas.wellbeing import WellbeingSnapshotCreate, WellbeingSnapshotOut

__all__ = [
    # common
    "GeoPoint",
    "PaginatedResponse",
    # auth
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    # client
    "ContactOut",
    "DeviceOut",
    "GeofenceOut",
    "ClientCreate",
    "ClientUpdate",
    "ClientListItem",
    "ClientOut",
    # alert
    "AlertOut",
    "AlertLogOut",
    "AlertWithLogs",
    "AlertStatusUpdate",
    "AlertStats",
    # message
    "MessageTemplateOut",
    "MessageOut",
    "MessageSendRequest",
    # appointment
    "AppointmentOut",
    "AppointmentCreate",
    "AppointmentUpdate",
    # user
    "UserOut",
    "UserCreate",
    "UserUpdate",
    "PasswordChange",
    # wellbeing
    "WellbeingSnapshotOut",
    "WellbeingSnapshotCreate",
]
