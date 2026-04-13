/**
 * App — root component.
 *
 * GameOver is rendered HERE at the app root (not inside GameBoard) so it
 * is guaranteed to be visible even if GameBoard's internal state is stale.
 */

import React, { useState } from 'react'
import { useGameStore } from './store/gameStore'
import { useWebSocket } from './hooks/useWebSocket'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import WildColorPicker from './components/WildColorPicker'
import GameOver from './components/GameOver'
import PythonDocs from './components/PythonDocs'

export default function App() {
  const [unlocked, setUnlocked] = useState(false)

  useWebSocket()

  const { gameState, playerId, isConnected, showColorPicker, error, notification } =
    useGameStore()

  const isPlaying  = gameState?.status === 'playing'
  const isFinished = gameState?.status === 'finished'

  if (!unlocked) return <PythonDocs onUnlock={() => {
    setUnlocked(true)
    document.title = 'Python — Functional'
    document.querySelector("link[rel='icon']").href =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♛</text></svg>"
  }} />

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
