"""
RoomManager — in-memory registry of all active UNO rooms.
"""
import random
import string
from typing import Dict, Optional, List

from .game_state import GameState
from .player import Player


class RoomManager:
    def __init__(self) -> None:
        # room_id -> GameState
        self._rooms: Dict[str, GameState] = {}
        # player_id -> room_id  (fast reverse lookup)
        self._player_room: Dict[str, str] = {}

    # ------------------------------------------------------------------
    # Room lifecycle
    # ------------------------------------------------------------------

    def create_room(self) -> str:
        """Create a new empty room and return its 6-character ID."""
        room_id = self._unique_id()
        self._rooms[room_id] = GameState(room_id)
        return room_id

    def get_room(self, room_id: str) -> Optional[GameState]:
        return self._rooms.get(room_id)

    def get_room_for_player(self, player_id: str) -> Optional[GameState]:
        room_id = self._player_room.get(player_id)
        if room_id:
            return self._rooms.get(room_id)
        return None

    def delete_room(self, room_id: str) -> None:
        game = self._rooms.pop(room_id, None)
        if game:
            for p in game.players:
                self._player_room.pop(p.id, None)

    # ------------------------------------------------------------------
    # Player management
    # ------------------------------------------------------------------

    def add_player_to_room(
        self, room_id: str, player: Player
    ) -> dict:
        """
        Add `player` to `room_id`.

        Returns {"success": True, "reconnected": bool} or {"success": False, "error": ...}.
        """
        game = self._rooms.get(room_id)
        if not game:
            return {"success": False, "error": f"Room '{room_id}' not found."}

        # Check if this player is reconnecting to an ongoing game
        existing = game._find_player(player.id)
        if existing:
            game.reconnect_player(player.id)
            return {"success": True, "reconnected": True}

        # Add as a new player (lobby only)
        if not game.add_player(player):
            if game.status.value != "waiting":
                return {"success": False, "error": "Game already in progress."}
            return {"success": False, "error": "Room is full (max 7 players)."}

        self._player_room[player.id] = room_id
        return {"success": True, "reconnected": False}

    def remove_player(self, player_id: str) -> Optional[str]:
        """
        Remove player from their room.
        Returns the room_id they were in (or None).
        """
        room_id = self._player_room.pop(player_id, None)
        if not room_id:
            return None
        game = self._rooms.get(room_id)
        if game and game.status.value == "waiting":
            game.remove_player(player_id)
            # If room is empty, clean it up
            if not game.players:
                del self._rooms[room_id]
        elif game:
            game.disconnect_player(player_id)
        return room_id

    def register_player_in_room(self, player_id: str, room_id: str) -> None:
        """Register the player->room mapping (after reconnect)."""
        self._player_room[player_id] = room_id

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def list_open_rooms(self) -> List[dict]:
        """List rooms that are in the lobby (waiting) state."""
        return [
            {
                "room_id": rid,
                "player_count": len(g.players),
                "players": [p.name for p in g.players],
            }
            for rid, g in self._rooms.items()
            if g.status.value == "waiting"
        ]

    def _unique_id(self) -> str:
        while True:
            rid = "".join(random.choices(string.ascii_uppercase, k=6))
            if rid not in self._rooms:
                return rid
