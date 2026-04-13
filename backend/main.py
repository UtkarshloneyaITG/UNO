"""
UNO Game Server — FastAPI + WebSockets

WebSocket endpoint: ws://localhost:8000/ws
REST endpoint:      GET /rooms   (list open lobbies)

All game messages are JSON objects with a "type" field.

──────────────────────────────────────────────
CLIENT  →  SERVER  messages
──────────────────────────────────────────────
create_room        { type, player_name }
join_room          { type, room_id, player_name, player_id? }
start_game         { type }
play_card          { type, card_id, chosen_color? }
draw_card          { type }
pass_turn          { type }
call_uno           { type }
catch_uno          { type, target_id }
challenge_wild4    { type }
leave_room         { type }

──────────────────────────────────────────────
SERVER  →  CLIENT  messages
──────────────────────────────────────────────
joined             { type, player_id, room_id, room_state }
room_update        { type, room_state }            – lobby changes
game_state         { type, state }                 – personalised per player
error              { type, message }
player_left        { type, player_name }
player_reconnected { type, player_name }
"""

import json
import logging
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from game.room_manager import RoomManager
from game.player import Player
from websocket.connection_manager import ConnectionManager

# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("uno")

app = FastAPI(title="UNO Multiplayer Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()
room_manager = RoomManager()


# ---------------------------------------------------------------------------
# REST helpers
# ---------------------------------------------------------------------------

@app.get("/rooms")
async def list_rooms():
    """Return open lobbies so the frontend can show a join list."""
    return {"rooms": room_manager.list_open_rooms()}


@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    log.info("WebSocket connected")
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send({"type": "error", "message": "Invalid JSON."}, ws)
                continue
            await _dispatch(ws, msg)
    except WebSocketDisconnect:
        await _on_disconnect(ws)
    except Exception as exc:
        log.exception("Unexpected WebSocket error: %s", exc)
        await _on_disconnect(ws)


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

async def _dispatch(ws: WebSocket, msg: dict) -> None:
    t = msg.get("type", "")
    handlers = {
        "create_room":      _create_room,
        "join_room":        _join_room,
        "start_game":       _start_game,
        "play_card":        _play_card,
        "draw_card":        _draw_card,
        "pass_turn":        _pass_turn,
        "call_uno":         _call_uno,
        "catch_uno":        _catch_uno,
        "challenge_wild4":  _challenge_wild4,
        "leave_room":       _leave_room,
    }
    handler = handlers.get(t)
    if handler:
        try:
            await handler(ws, msg)
        except Exception as exc:
            log.exception("Handler error for type=%s: %s", t, exc)
            await manager.send({"type": "error", "message": str(exc)}, ws)
    else:
        await manager.send({"type": "error", "message": f"Unknown message type: {t}"}, ws)


# ---------------------------------------------------------------------------
# Disconnect handler
# ---------------------------------------------------------------------------

async def _on_disconnect(ws: WebSocket) -> None:
    player_id = await manager.disconnect(ws)
    if not player_id:
        return

    room_id = room_manager.remove_player(player_id)
    if not room_id:
        return

    game = room_manager.get_room(room_id)
    if game:
        player = game._find_player(player_id)
        name = player.name if player else "A player"
        log.info("Player '%s' disconnected from room %s", name, room_id)
        await _broadcast_room_state(room_id)
        await _broadcast_to_room(
            room_id, {"type": "player_left", "player_name": name}
        )


# ---------------------------------------------------------------------------
# Message handlers
# ---------------------------------------------------------------------------

async def _create_room(ws: WebSocket, msg: dict) -> None:
    player_name = (msg.get("player_name") or "").strip()
    if not player_name:
        return await manager.send({"type": "error", "message": "player_name required."}, ws)

    room_id = room_manager.create_room()
    player = Player(name=player_name)
    result = room_manager.add_player_to_room(room_id, player)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    manager.register(ws, player.id, room_id)
    game = room_manager.get_room(room_id)
    log.info("Room %s created by '%s'", room_id, player_name)

    await manager.send(
        {
            "type": "joined",
            "player_id": player.id,
            "room_id": room_id,
            "room_state": game.get_room_state(),
        },
        ws,
    )


async def _join_room(ws: WebSocket, msg: dict) -> None:
    room_id = (msg.get("room_id") or "").strip().upper()
    player_name = (msg.get("player_name") or "").strip()
    existing_player_id: Optional[str] = msg.get("player_id")

    if not room_id or not player_name:
        return await manager.send(
            {"type": "error", "message": "room_id and player_name are required."}, ws
        )

    game = room_manager.get_room(room_id)
    if not game:
        return await manager.send({"type": "error", "message": f"Room '{room_id}' not found."}, ws)

    # --- Reconnection: player sends their saved player_id ---
    if existing_player_id:
        existing = game._find_player(existing_player_id)
        if existing:
            # Re-register the WebSocket for this player
            game.reconnect_player(existing_player_id)
            room_manager.register_player_in_room(existing_player_id, room_id)
            manager.register(ws, existing_player_id, room_id)
            log.info("Player '%s' reconnected to room %s", existing.name, room_id)

            await manager.send(
                {
                    "type": "joined",
                    "player_id": existing_player_id,
                    "room_id": room_id,
                    "room_state": game.get_room_state(),
                },
                ws,
            )
            if game.status.value == "playing":
                state = game.get_state_for_player(existing_player_id)
                await manager.send({"type": "game_state", "state": state}, ws)

            await _broadcast_to_room(
                room_id,
                {"type": "player_reconnected", "player_name": existing.name},
                exclude_player=existing_player_id,
            )
            await _broadcast_room_state(room_id)
            return

    # --- New player joining the lobby ---
    player = Player(name=player_name)
    result = room_manager.add_player_to_room(room_id, player)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    manager.register(ws, player.id, room_id)
    log.info("Player '%s' joined room %s", player_name, room_id)

    await manager.send(
        {
            "type": "joined",
            "player_id": player.id,
            "room_id": room_id,
            "room_state": game.get_room_state(),
        },
        ws,
    )
    # Notify existing players
    await _broadcast_to_room(
        room_id,
        {"type": "player_joined", "player_name": player_name, "room_state": game.get_room_state()},
        exclude_player=player.id,
    )


async def _start_game(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game:
        return await manager.send({"type": "error", "message": "You are not in a room."}, ws)
    if game.host_player_id != player_id:
        return await manager.send({"type": "error", "message": "Only the host can start the game."}, ws)

    result = game.start_game()
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    log.info("Game started in room %s", game.room_id)
    await _broadcast_game_state(game.room_id)


async def _play_card(ws: WebSocket, msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    card_id: str = msg.get("card_id", "")
    chosen_color: Optional[str] = msg.get("chosen_color")

    result = game.play_card(player_id, card_id, chosen_color)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _draw_card(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    result = game.draw_card(player_id)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _pass_turn(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    result = game.pass_turn(player_id)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _call_uno(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    result = game.call_uno(player_id)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _catch_uno(ws: WebSocket, msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    target_id: str = msg.get("target_id", "")
    result = game.catch_uno_violation(player_id, target_id)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _challenge_wild4(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    game = room_manager.get_room_for_player(player_id) if player_id else None
    if not game or not player_id:
        return await manager.send({"type": "error", "message": "Not in a game."}, ws)

    result = game.challenge_wild_four(player_id)
    if not result["success"]:
        return await manager.send({"type": "error", "message": result["error"]}, ws)

    await _broadcast_game_state(game.room_id)


async def _leave_room(ws: WebSocket, _msg: dict) -> None:
    player_id = manager.get_player_id(ws)
    if not player_id:
        return

    game = room_manager.get_room_for_player(player_id)
    player = game._find_player(player_id) if game else None
    name = player.name if player else "A player"

    room_id = room_manager.remove_player(player_id)
    manager._ws_to_player.pop(id(ws), None)
    manager._ws_to_room.pop(id(ws), None)
    manager._player_to_ws.pop(player_id, None)

    if room_id:
        await _broadcast_to_room(room_id, {"type": "player_left", "player_name": name})
        await _broadcast_room_state(room_id)


# ---------------------------------------------------------------------------
# Broadcast helpers
# ---------------------------------------------------------------------------

async def _broadcast_game_state(room_id: str) -> None:
    """Send a personalised game_state message to every player in a room."""
    game = room_manager.get_room(room_id)
    if not game:
        return
    messages = {
        p.id: {"type": "game_state", "state": game.get_state_for_player(p.id)}
        for p in game.players
    }
    await manager.broadcast_room(messages)


async def _broadcast_room_state(room_id: str) -> None:
    """Send the lobby state to every player in the room."""
    game = room_manager.get_room(room_id)
    if not game:
        return
    msg = {"type": "room_update", "room_state": game.get_room_state()}
    await manager.broadcast_common(msg, [p.id for p in game.players])


async def _broadcast_to_room(
    room_id: str,
    message: dict,
    exclude_player: Optional[str] = None,
) -> None:
    """Broadcast a generic message to all (or most) players in a room."""
    game = room_manager.get_room(room_id)
    if not game:
        return
    players = [
        p.id for p in game.players if p.id != exclude_player
    ]
    await manager.broadcast_common(message, players)
