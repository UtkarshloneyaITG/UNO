/**
 * useWebSocket — manages the persistent WebSocket connection.
 *
 * On mount it:
 *   1. Opens a connection to the server.
 *   2. Injects a stable `sendMessage` function into the Zustand store.
 *      Messages sent while the socket is connecting/closed are queued
 *      and flushed on open (stale entries are dropped).
 *   3. On open, resumes the saved session (sessionStorage) by rejoining
 *      the room with the stored player_id, so a page refresh or a
 *      transient drop puts the player straight back into their game.
 *   4. Schedules a reconnect on unexpected close.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore, loadSession } from '../store/gameStore'

const WS_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL
    : 'wss://uno-nq5x.onrender.com/ws'

const QUEUE_MAX = 20        // outbound messages buffered while offline
const QUEUE_MAX_AGE = 5000  // ms — older queued actions are stale, drop them

export function useWebSocket() {
  const wsRef = useRef(null)
  const queueRef = useRef([])
  const reconnectTimer = useRef(null)
  const isMounted = useRef(true)

  const handleMessage = useGameStore((s) => s.handleMessage)
  const setConnected  = useGameStore((s) => s.setConnected)
  const setSendMessage = useGameStore((s) => s.setSendMessage)
  const setError      = useGameStore((s) => s.setError)

  // One stable sender for the lifetime of the hook: sends immediately when
  // the socket is open, otherwise queues for the next onopen flush.
  const sendMessage = useCallback((msg) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else {
      queueRef.current.push({ msg, ts: Date.now() })
      if (queueRef.current.length > QUEUE_MAX) queueRef.current.shift()
    }
  }, [])

  const connect = useCallback(() => {
    if (!isMounted.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMounted.current) return
      setConnected(true)
      setError(null)

      // Resume identity first so the server knows who we are before any
      // queued action arrives. Live store identity wins (mid-game WS drop);
      // sessionStorage covers a full page reload.
      const store = useGameStore.getState()
      const session =
        store.playerId && store.roomId
          ? { playerId: store.playerId, roomId: store.roomId, playerName: store.playerName }
          : loadSession()
      if (session?.playerId && session?.roomId) {
        store.beginResume(session)
        ws.send(
          JSON.stringify({
            type: 'join_room',
            room_id: session.roomId,
            player_name: session.playerName || 'Player',
            player_id: session.playerId,
          })
        )
      }

      // Flush queued messages, dropping stale gameplay actions.
      const now = Date.now()
      const pending = queueRef.current.filter((q) => now - q.ts < QUEUE_MAX_AGE)
      queueRef.current = []
      for (const q of pending) ws.send(JSON.stringify(q.msg))
    }

    ws.onmessage = (event) => {
      if (!isMounted.current) return
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onerror = () => {
      // onerror is always followed by onclose; handle reconnect there
    }

    ws.onclose = () => {
      if (!isMounted.current) return
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 2500)
    }
  }, [handleMessage, setConnected, setError])

  useEffect(() => {
    isMounted.current = true
    setSendMessage(sendMessage)
    connect()

    return () => {
      isMounted.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect, sendMessage, setSendMessage])
}
