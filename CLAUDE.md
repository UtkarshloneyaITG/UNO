# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
# Run the server (port 8000). Working dir MUST be backend/ — imports are top-level (game.*, websocket.*)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Tests (pytest is NOT in requirements.txt — install it first)
pip install pytest
python -m pytest tests/test_rules.py -v
python -m pytest tests/test_rules.py -v -k "challenge"   # run a single test / subset by name
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev       # Vite dev server on port 3000
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Architecture

Real-time multiplayer UNO. The **backend is fully authoritative** — all rules, turn order, and validation live server-side; the client only renders the personalised state it receives and sends intent messages. There is no database: all state is in-memory and lost on server restart.

### Backend flow (`backend/`)
- `main.py` — FastAPI app. The single `/ws` WebSocket endpoint receives JSON messages and routes them through `_dispatch()` to per-type handlers (`_create_room`, `_play_card`, etc.). Each handler calls a `GameState` method, then broadcasts. Also exposes `GET /rooms` (open lobbies) and `GET /health`.
- `game/game_state.py` — **the rule engine** (`GameState`). Every game action is a method returning `{"success": bool, "error"?: str}`. Holds turn pointer, direction, draw stack, UNO-call set, placements, and the action log. This is where all UNO logic lives — see "Game rules" below.
- `game/room_manager.py` — `RoomManager`: in-memory `room_id → GameState` registry plus a `player_id → room_id` reverse index. Generates 6-char uppercase room codes. Cleans up empty waiting rooms.
- `websocket/connection_manager.py` — `ConnectionManager`: tracks `ws ↔ player_id ↔ room_id` mappings and handles message delivery. Keyed by `id(ws)` (the Python object id), not the WebSocket object itself.
- `game/card.py` / `game/deck.py` / `game/player.py` — `Card` dataclass (with `can_play_on()` matching logic), 108-card deck builder, and `Player` model (hand + `is_connected`).

### Three layers of identity (important)
- **`ws`** — the live socket connection (in `ConnectionManager`).
- **`player_id`** — a stable UUID that survives reconnection; the key the game logic uses.
- **`room_id`** — 6-char code.
On reconnect, a new `ws` is bound to the **existing** `player_id`, so game state is preserved. `ConnectionManager` and `RoomManager` keep their own copies of these mappings — when changing connection/room lifecycle, update both.

### Broadcasting
After any state change a handler calls one of:
- `_broadcast_game_state(room_id)` — sends a **personalised** `game_state` to each player (each player only sees their own hand; opponents show card counts via `get_state_for_player`).
- `_broadcast_room_state(room_id)` — sends the shared lobby `room_update`.
- `_broadcast_to_room(...)` — a generic message to all/most players.

### Frontend flow (`frontend/src/`)
- `store/gameStore.js` — **Zustand store, the single client source of truth.** `handleMessage(msg)` is the inbound reducer (switches on `msg.type`); the action methods (`createRoom`, `selectCard`, `drawCard`, …) send outbound WS messages via the injected `sendMessage`.
- `hooks/useWebSocket.js` — owns the persistent socket, injects `sendMessage` into the store, auto-reconnects 2.5s after close. **No session is persisted** — a page refresh returns the player to the lobby (no auto-rejoin), even though the backend supports reconnection by `player_id`.
- `App.jsx` decides Lobby vs GameBoard vs GameOver based on `roomState`/`gameState`. Components under `components/` are presentational and read from the store.

### Configuring the backend URL (frontend)
`useWebSocket.js` reads `import.meta.env.VITE_WS_URL`; if unset it **defaults to a hardcoded Render deployment URL** (`wss://uno-nq5x.onrender.com/ws`), NOT localhost. For local dev against a local backend, set `VITE_WS_URL=ws://localhost:8000/ws` (see `frontend/.env.example`). Note `vite.config.js` also proxies `/ws` and `/rooms` to `localhost:8000`, but that proxy is only used if the WS URL points at the dev server's own origin.

## Game rules (where logic lives, in `game_state.py`)

- **Player count:** 2–7 (lobby `add_player` caps at 7; `start_game` deals 7 cards each).
- **Placements/ranking:** finishing is multi-place — players who empty their hand are appended to `self.placements` and the game continues until ≤1 active player remains. `winner` = 1st placement. Do not assume a single-winner model.
- **Turn-after-draw:** drawing a *playable* card does NOT end the turn — `drawn_card_id` is set and the player may either play that specific card or `pass_turn`. Any other card play is rejected while `drawn_card_id` is set.
- **Draw stacking:** the engine *accumulates* `draw_stack` from Draw Two / Wild Draw Four, but `play_card` **forbids stacking another card on top** — when `draw_stack > 0` you must `draw_card` (or challenge a +4). Don't "fix" this as a bug; it's the implemented house rule.
- **Wild Draw Four challenge** (`challenge_wild_four`): checks whether the previous player held a card of `previous_color`. Success → they draw 4; failure → challenger draws 6.
- **UNO call/catch:** `uno_called` is a set of player_ids; it's cleared for a player when their hand size leaves 1. `catch_uno_violation` penalises a target sitting at 1 card who never called UNO.
- **Reverse** acts as **Skip** in 2-player games (both at game start and mid-game).
- **Offline handling:** `_auto_skip_offline()` runs after most actions — if the current player is disconnected it auto-draws/passes for them so the game never stalls, and awards a default win if only one active player remains online.
- **Reshuffle:** when the deck empties, `_reshuffle()` recycles the discard pile (keeping its top card).

When adding a new game action: add the method to `GameState` (return the `{"success": ...}` shape), add a `_handler` + dispatch entry in `main.py`, add the outbound action + inbound `case` in `gameStore.js`, and cover it in `tests/test_rules.py`.
