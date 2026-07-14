"""WebSocket connection manager para push de alertas en tiempo real."""

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Maneja conexiones WebSocket de operadores."""

    def __init__(self) -> None:
        self._connections: dict[int, WebSocket] = {}  # user_id -> ws

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id] = websocket
        logger.info("WS conectado: user_id=%d (total: %d)", user_id, len(self._connections))

    def disconnect(self, user_id: int) -> None:
        self._connections.pop(user_id, None)
        logger.info("WS desconectado: user_id=%d (total: %d)", user_id, len(self._connections))

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def send_to(self, user_id: int, event_type: str, data: dict[str, Any]) -> None:
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_json({"type": event_type, "data": data})
            except Exception:
                logger.warning("Error enviando a user_id=%d, desconectando", user_id)
                self.disconnect(user_id)

    async def broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        message = json.dumps({"type": event_type, "data": data})
        disconnected: list[int] = []
        for user_id, ws in self._connections.items():
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)


ws_manager = ConnectionManager()
