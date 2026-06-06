/**
 * Zustand store — single source of truth for the UNO client.
 *
 * All session state lives on the server (in-memory). Nothing is
 * persisted to localStorage or any database — refreshing the page
 * returns the player to the lobby.
 */

import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────────────
  isConnected: false,
  sendMessage: null,          // injected by the useWebSocket hook

  // ── Identity ─────────────────────────────────────────────────────────────
  playerId: null,
  playerName: null,

  // ── Room (lobby) ─────────────────────────────────────────────────────────
  roomId: null,
  roomState: null,            // { room_id, status, players, host_player_id, can_start }

  // ── Game ─────────────────────────────────────────────────────────────────
  gameState: null,            // full personalised state from server

  // ── UI ───────────────────────────────────────────────────────────────────
  showColorPicker: false,
  pendingWildCardId: null,    // card ID waiting for colour selection
  error: null,
  notification: null,         // brief toast message
  bubbles: {},                // player_id -> { text, key } chat/emoji bubbles
  _bubbleSeq: 0,

  // =========================================================================
  // Setters injected / called by the WS hook
  // =========================================================================

  setConnected: (v) => set({ isConnected: v }),

  setSendMessage: (fn) => set({ sendMessage: fn }),

  setError: (msg) => {
    set({ error: msg })
    if (msg) setTimeout(() => set({ error: null }), 4000)
  },

  setNotification: (msg) => {
    set({ notification: msg })
    if (msg) setTimeout(() => set({ notification: null }), 3000)
  },

  // =========================================================================
  // Inbound message handler (called by useWebSocket on every WS message)
  // =========================================================================

  handleMessage: (message) => {
    const { type } = message

    switch (type) {
      // ── Joined room (create or join) ─────────────────────────────────────
      case 'joined': {
        const { player_id, room_id, room_state } = message
        set({
          playerId: player_id,
          roomId: room_id,
          roomState: room_state,
          gameState: null,
          error: null,
        })
        break
      }

      // ── Lobby update ─────────────────────────────────────────────────────
      case 'room_update': {
        set({ roomState: message.room_state })
        break
      }

      // ── Another player joined the lobby ──────────────────────────────────
      case 'player_joined': {
        if (message.room_state) set({ roomState: message.room_state })
        get().setNotification(`${message.player_name} joined the room.`)
        break
      }

      // ── Player left ──────────────────────────────────────────────────────
      case 'player_left': {
        get().setNotification(`${message.player_name} left the room.`)
        break
      }

      // ── Player reconnected ───────────────────────────────────────────────
      case 'player_reconnected': {
        get().setNotification(`${message.player_name} reconnected.`)
        break
      }

      // ── Live game state (personalised) ───────────────────────────────────
      case 'game_state': {
        const newState = message.state
        const { playerId } = get()

        // Show a toast when this player's turn was just skipped
        if (
          newState.skipped_player_id &&
          newState.skipped_player_id === playerId
        ) {
          get().setNotification('⊘ Your turn was skipped!')
        }

        set({ gameState: newState })
        break
      }

      // ── Chat / emoji bubble ──────────────────────────────────────────────
      case 'chat': {
        const { player_id, text } = message
        if (!player_id || !text) break
        const key = get()._bubbleSeq + 1
        set((s) => ({
          _bubbleSeq: key,
          bubbles: { ...s.bubbles, [player_id]: { text, key } },
        }))
        // Auto-dismiss after 5s, unless a newer bubble replaced it.
        setTimeout(() => {
          set((s) => {
            if (s.bubbles[player_id]?.key !== key) return {}
            const next = { ...s.bubbles }
            delete next[player_id]
            return { bubbles: next }
          })
        }, 5000)
        break
      }

      // ── Error from server ────────────────────────────────────────────────
      case 'error': {
        get().setError(message.message)
        break
      }

      default:
        break
    }
  },

  // =========================================================================
  // Game actions (call these to send WS messages)
  // =========================================================================

  createRoom: (playerName) => {
    const name = playerName.trim()
    if (!name) return
    set({ playerName: name })
    get().sendMessage?.({ type: 'create_room', player_name: name })
  },

  joinRoom: (roomId, playerName) => {
    const name = playerName.trim()
    const rid = roomId.trim().toUpperCase()
    if (!name || !rid) return
    set({ playerName: name })
    get().sendMessage?.({
      type: 'join_room',
      room_id: rid,
      player_name: name,
      // No player_id sent — server always treats this as a fresh join
    })
  },

  startGame: () => {
    get().sendMessage?.({ type: 'start_game' })
  },

  // `card` is the full card object from gameState.my_hand
  selectCard: (card) => {
    const { gameState, playerId } = get()
    if (!gameState) return
    if (gameState.current_player_id !== playerId) return
    if (gameState.status !== 'playing') return

    // Wild cards require a colour selection first
    if (card.card_type === 'wild' || card.card_type === 'wild_draw_four') {
      set({ showColorPicker: true, pendingWildCardId: card.id })
    } else {
      get().sendMessage?.({ type: 'play_card', card_id: card.id })
    }
  },

  chooseColor: (color) => {
    const { pendingWildCardId } = get()
    if (pendingWildCardId) {
      get().sendMessage?.({
        type: 'play_card',
        card_id: pendingWildCardId,
        chosen_color: color,
      })
    }
    set({ showColorPicker: false, pendingWildCardId: null })
  },

  cancelColorPicker: () => {
    set({ showColorPicker: false, pendingWildCardId: null })
  },

  drawCard: () => {
    get().sendMessage?.({ type: 'draw_card' })
  },

  passTurn: () => {
    get().sendMessage?.({ type: 'pass_turn' })
  },

  callUno: () => {
    get().sendMessage?.({ type: 'call_uno' })
  },

  catchUno: (targetId) => {
    get().sendMessage?.({ type: 'catch_uno', target_id: targetId })
  },

  challengeWildFour: () => {
    get().sendMessage?.({ type: 'challenge_wild4' })
  },

  leaveRoom: () => {
    get().sendMessage?.({ type: 'leave_room' })
    set({ roomId: null, roomState: null, gameState: null, playerId: null, bubbles: {} })
  },

  // Send a chat line or emoji; it echoes back to everyone (incl. sender) as a
  // bubble above the relevant player.
  sendChat: (text) => {
    const t = (text ?? '').toString().slice(0, 120).trim()
    if (!t) return
    get().sendMessage?.({ type: 'chat', text: t })
  },
}))
