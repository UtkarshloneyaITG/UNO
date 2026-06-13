/**
 * Zustand store — single source of truth for the UNO client.
 *
 * Game state lives on the server (in-memory). The only thing persisted
 * client-side is the session identity {playerId, roomId, playerName} in
 * sessionStorage (per-tab), so a page refresh rejoins the same game
 * instead of dropping the player back to the lobby.
 */

import { create } from 'zustand'

// ── Session persistence (sessionStorage: per-tab, so two tabs never fight
//    over the same player_id's socket binding on the server) ───────────────
const SESSION_KEY = 'uno_session'

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
  } catch {
    // storage unavailable — resume simply won't survive a refresh
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

const RESUME_TIMEOUT_MS = 6000
let resumeTimer = null
let actionPendingTimer = null

export const useGameStore = create((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────────────
  isConnected: false,
  sendMessage: null,          // injected by the useWebSocket hook
  // 'connecting' | 'online' | 'reconnecting' | 'resuming'
  connectionPhase: 'connecting',
  resumePending: false,       // true while a session-resume join is in flight
  actionPending: false,       // true while a gameplay action awaits the server
  joinPending: false,         // true while create/join room awaits the server

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

  setConnected: (v) =>
    set((s) => ({
      isConnected: v,
      connectionPhase: v
        ? s.resumePending
          ? 'resuming'
          : 'online'
        : s.playerId || loadSession()
          ? 'reconnecting'
          : 'connecting',
    })),

  setSendMessage: (fn) => set({ sendMessage: fn }),

  // Called by useWebSocket right before it sends the resume join_room.
  beginResume: (session) => {
    clearTimeout(resumeTimer)
    set((s) => ({
      resumePending: true,
      connectionPhase: 'resuming',
      playerName: s.playerName || session.playerName || null,
    }))
    resumeTimer = setTimeout(() => {
      if (get().resumePending) get()._failResume()
    }, RESUME_TIMEOUT_MS)
  },

  _failResume: () => {
    clearTimeout(resumeTimer)
    clearSession()
    set({
      resumePending: false,
      connectionPhase: 'online',
      roomId: null,
      roomState: null,
      gameState: null,
      playerId: null,
      bubbles: {},
    })
    get().setError('Your previous game is no longer available.')
  },

  _clearActionPending: () => {
    clearTimeout(actionPendingTimer)
    set({ actionPending: false })
  },

  _setActionPending: () => {
    set({ actionPending: true })
    clearTimeout(actionPendingTimer)
    // Safety valve: never wedge the UI if the server response goes missing.
    actionPendingTimer = setTimeout(() => set({ actionPending: false }), 3000)
  },

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
      // ── Joined room (create, join, or session resume) ────────────────────
      case 'joined': {
        const { player_id, room_id, room_state } = message
        clearTimeout(resumeTimer)
        set({
          playerId: player_id,
          roomId: room_id,
          roomState: room_state,
          gameState: null,
          error: null,
          resumePending: false,
          joinPending: false,
          connectionPhase: 'online',
        })
        saveSession({
          playerId: player_id,
          roomId: room_id,
          playerName: get().playerName,
        })
        break
      }

      // ── Lobby update ─────────────────────────────────────────────────────
      case 'room_update': {
        set({ roomState: message.room_state })
        break
      }

      // ── Rematch — everyone returns to the waiting room ───────────────────
      case 'rematch_started': {
        set({ gameState: null, roomState: message.room_state })
        get().setNotification('🔄 Rematch! Back to the waiting room.')
        break
      }

      // ── This client was kicked by the host ───────────────────────────────
      case 'kicked': {
        clearSession()
        set({
          roomId: null,
          roomState: null,
          gameState: null,
          playerId: null,
          bubbles: {},
        })
        get().setError(message.message || 'You were removed from the room.')
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

        get()._clearActionPending()
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
        // While a resume join is in flight, the server answers this socket
        // sequentially — any error necessarily answers our join_room.
        if (get().resumePending) {
          get()._failResume()
          break
        }
        get()._clearActionPending()
        set({ joinPending: false })
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
    if (!name || get().joinPending) return
    set({ playerName: name, joinPending: true })
    get().sendMessage?.({ type: 'create_room', player_name: name })
  },

  joinRoom: (roomId, playerName) => {
    const name = playerName.trim()
    const rid = roomId.trim().toUpperCase()
    if (!name || !rid || get().joinPending) return
    set({ playerName: name, joinPending: true })
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

  rematch: () => {
    get().sendMessage?.({ type: 'rematch' })
  },

  updateSettings: (partial) => {
    get().sendMessage?.({ type: 'update_settings', settings: partial })
  },

  kickPlayer: (targetId) => {
    get().sendMessage?.({ type: 'kick_player', target_id: targetId })
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
      get()._setActionPending()
      get().sendMessage?.({ type: 'play_card', card_id: card.id })
    }
  },

  chooseColor: (color) => {
    const { pendingWildCardId } = get()
    if (pendingWildCardId) {
      get()._setActionPending()
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
    get()._setActionPending()
    get().sendMessage?.({ type: 'draw_card' })
  },

  passTurn: () => {
    get()._setActionPending()
    get().sendMessage?.({ type: 'pass_turn' })
  },

  callUno: () => {
    get().sendMessage?.({ type: 'call_uno' })
  },

  catchUno: (targetId) => {
    get().sendMessage?.({ type: 'catch_uno', target_id: targetId })
  },

  challengeWildFour: () => {
    get()._setActionPending()
    get().sendMessage?.({ type: 'challenge_wild4' })
  },

  leaveRoom: () => {
    get().sendMessage?.({ type: 'leave_room' })
    clearSession()
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
