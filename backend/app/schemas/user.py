"""Schemas de usuario."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: str
    is_active: bool
    turno: str | None
    last_login: datetime | None
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "operador"
    turno: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    turno: str | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
