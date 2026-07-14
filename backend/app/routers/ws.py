"""Endpoint WebSocket para push de alertas en tiempo real al frontend."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


async def _get_user_from_token(token: str | None) -> User | None:
    """Valida JWT y retorna el usuario. Retorna None si el token es inválido o falta."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        email: str | None = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            return None
        return user


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    """Conexión WebSocket para operadoras.

    Requiere token JWT válido via query param: /ws?token=<jwt>
    Si el token es inválido o está ausente, cierra con código 1008 (Policy Violation).
    """
    user = await _get_user_from_token(token)
    if user is None:
        await websocket.close(code=1008)
        logger.warning("WebSocket rechazado: token inválido o ausente")
        return

    user_id: int = user.id

    await ws_manager.connect(user_id, websocket)
    logger.info("WebSocket conectado: user_id=%d email=%s", user_id, user.email)

    try:
        while True:
            # Mantener conexión viva, recibir mensajes del frontend si los hay
            data = await websocket.receive_text()
            logger.debug("WS mensaje de user_id=%d: %s", user_id, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
        logger.info("WebSocket desconectado: user_id=%d", user_id)
    except Exception as e:
        ws_manager.disconnect(user_id)
        logger.warning("WebSocket error user_id=%d: %s", user_id, e)
