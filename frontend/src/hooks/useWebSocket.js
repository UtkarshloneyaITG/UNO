/**
 * useWebSocket — manages the persistent WebSocket connection.
 *
 * On mount it:
 *   1. Opens a connection to the server.
 *   2. Injects a `sendMessage` function into the Zustand store.
 *   3. Schedules a reconnect on unexpected close.
 *
 * No localStorage is read or written. All session state lives on
 * the server — refreshing the page returns the player to the lobby.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'

const WS_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL
    : 'wss://uno-nq5x.onrender.com/ws'

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const isMounted = useRef(true)

  const handleMessage = useGameStore((s) => s.handleMessage)
  const setConnected  = useGameStore((s) => s.setConnected)
  const setSendMessage = useGameStore((s) => s.setSendMessage)
  const setError      = useGameStore((s) => s.setError)

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

      const send = (msg) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg))
        }
      }
      setSendMessage(send)
      // No auto-rejoin — session state lives on the server only
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
      setSendMessage(null)
      // Reconnect after 2.5 seconds (restores the WS connection but
      // player must re-enter the lobby — no session is remembered)
      reconnectTimer.current = setTimeout(connect, 2500)
    }
  }, [handleMessage, setConnected, setSendMessage, setError])

  useEffect(() => {
    isMounted.current = true
    connect()

    return () => {
      isMounted.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}
