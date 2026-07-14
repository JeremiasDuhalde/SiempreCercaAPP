"""Autenticación: JWT + Argon2 (con fallback bcrypt para migración) + roles."""

from datetime import datetime, timedelta, timezone
from typing import Any

import argon2
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_ph = argon2.PasswordHasher()


def hash_password(password: str) -> str:
    """Hash con Argon2id."""
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica password. Soporta Argon2 y bcrypt (migración)."""
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        # Legacy bcrypt
        try:
            return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
        except ValueError:
            return False
    # Argon2
    try:
        return _ph.verify(hashed, plain)
    except (argon2.exceptions.VerifyMismatchError, argon2.exceptions.VerificationError):
        return False


def needs_rehash(hashed: str) -> bool:
    """True si el hash es bcrypt (legacy) y debe migrarse a Argon2."""
    return hashed.startswith("$2b$") or hashed.startswith("$2a$")


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_error
    except JWTError as e:
        raise credentials_error from e

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_role(*roles: str):
    """Dependency factory para restringir acceso por rol."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{user.role}' no tiene permiso para esta acción",
            )
        return user

    return _check
