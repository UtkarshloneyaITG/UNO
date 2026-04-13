"""
ConnectionManager — tracks active WebSocket connections and routes messages.

Maintains three mappings:
  ws → player_id
  player_id → ws   (fast direct delivery)
  player_id → room_id
"""
import json
import asyncio
from typing import Dict, Optional, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []
        self._ws_to_player: Dict[int, str] = {}     # id(ws) → player_id
        self._player_to_ws: Dict[str, WebSocket] = {}
        self._ws_to_room: Dict[int, str] = {}       # id(ws) → room_id

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    async def disconnect(self, ws: WebSocket) -> Optional[str]:
        """
        Clean up after a WebSocket disconnects.
        Returns the player_id that was associated with this connection (or None).
        """
        try:
            self._connections.remove(ws)
        except ValueError:
            pass

        wid = id(ws)
        player_id = self._ws_to_player.pop(wid, None)
        self._ws_to_room.pop(wid, None)
        if player_id:
            self._player_to_ws.pop(player_id, None)
        return player_id

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, ws: WebSocket, player_id: str, room_id: str) -> None:
        """Associate a WebSocket with a player and room."""
        wid = id(ws)
        self._ws_to_player[wid] = player_id
        self._ws_to_room[wid] = room_id
        self._player_to_ws[player_id] = ws

    def get_player_id(self, ws: WebSocket) -> Optional[str]:
        return self._ws_to_player.get(id(ws))

    def get_room_id(self, ws: WebSocket) -> Optional[str]:
        return self._ws_to_room.get(id(ws))

    def get_ws(self, player_id: str) -> Optional[WebSocket]:
        return self._player_to_ws.get(player_id)

    # ------------------------------------------------------------------
    # Messaging
    # ------------------------------------------------------------------

    async def send(self, message: dict, ws: WebSocket) -> None:
        """Send a message to a specific WebSocket."""
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            pass  # connection may have dropped

    async def send_to_player(self, message: dict, player_id: str) -> None:
        """Send a message to a player by their ID (if online)."""
        ws = self._player_to_ws.get(player_id)
        if ws:
            await self.send(message, ws)

    async def broadcast_room(
        self,
        messages: Dict[str, dict],
    ) -> None:
        """
        Send a per-player personalised message to every player in a room.

        `messages` is a dict of { player_id: message_payload }.
        """
        tasks = [
            self.send_to_player(msg, pid)
            for pid, msg in messages.items()
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_common(self, message: dict, player_ids: List[str]) -> None:
        """Send the same message to all listed players."""
        tasks = [self.send_to_player(message, pid) for pid in player_ids]
        await asyncio.gather(*tasks, return_exceptions=True)
