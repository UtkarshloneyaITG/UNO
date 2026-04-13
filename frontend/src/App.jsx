/**
 * App — root component.
 *
 * GameOver is rendered HERE at the app root (not inside GameBoard) so it
 * is guaranteed to be visible even if GameBoard's internal state is stale.
 */

import React from 'react'
import { useGameStore } from './store/gameStore'
import { useWebSocket } from './hooks/useWebSocket'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import WildColorPicker from './components/WildColorPicker'
import GameOver from './components/GameOver'

export default function App() {
  useWebSocket()

  const { gameState, playerId, isConnected, showColorPicker, error, notification } =
    useGameStore()

  const isPlaying  = gameState?.status === 'playing'
  const isFinished = gameState?.status === 'finished'

  return (
    <div className="app">
      {/* ── Atmospheric texture overlay ───────────────────────────── */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Connection banner ─────────────────────────────────────── */}
      {!isConnected && (
        <div className="banner banner--offline">
          Reconnecting to the chamber…
        </div>
      )}

      {/* ── Error toast ───────────────────────────────────────────── */}
      {error && <div className="toast toast--error">{error}</div>}

      {/* ── Notification toast ────────────────────────────────────── */}
      {notification && <div className="toast toast--info">{notification}</div>}

      {/* ── Wild colour picker overlay ────────────────────────────── */}
      {showColorPicker && <WildColorPicker />}

      {/* ── Victory overlay — rendered at root so it always appears ─ */}
      {isFinished && gameState && (
        <GameOver
          winner={gameState.winner}
          winnerId={gameState.winner_id}
          myId={playerId}
        />
      )}

      {/* ── Main screen ───────────────────────────────────────────── */}
      {isFinished ? null : isPlaying ? <GameBoard /> : <Lobby />}
    </div>
  )
}
