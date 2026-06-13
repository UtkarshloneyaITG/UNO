/**
 * App — root component.
 *
 * The entire game now lives inside a 3D world (React Three Fiber): the lobby
 * and the play table are rendered in <Experience/>. Screen-space HUD and
 * modals (turn flash, hints, colour picker, game over, toasts) are layered
 * on top of the WebGL canvas — the standard structure for a 3D web game.
 *
 * The PythonDocs camouflage gate is intentionally left as a plain webpage.
 */

import React, { useState, useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { useWebSocket } from './hooks/useWebSocket'
import Experience from './three/Experience'
import GameHud from './components/GameHud'
import ChatBar from './components/ChatBar'
import TurnTimerBar from './components/TurnTimerBar'
import HintBar from './components/HintBar'
import TurnAnnouncer from './components/TurnAnnouncer'
import WildColorPicker from './components/WildColorPicker'
import GameOver from './components/GameOver'
import PythonDocs from './components/PythonDocs'

// Hold the Game Over modal back briefly so the in-scene 3D win moment
// (confetti over the table) reads first.
const GAME_OVER_DELAY_MS = 1800

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)

  useWebSocket()

  const {
    gameState,
    playerId,
    isConnected,
    connectionPhase,
    roomId,
    showColorPicker,
    error,
    notification,
  } = useGameStore()

  const isFinished = gameState?.status === 'finished'

  useEffect(() => {
    if (!isFinished) {
      setShowGameOver(false)
      return
    }
    const id = setTimeout(() => setShowGameOver(true), GAME_OVER_DELAY_MS)
    return () => clearTimeout(id)
  }, [isFinished])

  if (!unlocked) return <PythonDocs onUnlock={() => setUnlocked(true)} />

  const bannerText =
    connectionPhase === 'resuming'
      ? 'Rejoining your game…'
      : roomId
      ? 'Reconnecting to the chamber…'
      : 'Connecting to the chamber…'
  const showBanner = !isConnected || connectionPhase === 'resuming'

  return (
    <div className="app app--3d">
      {/* ── 3D world (lobby + table) ───────────────────────────────── */}
      <div className="canvas-root">
        <Experience />
      </div>

      {/* ── Screen-space HUD / overlays ────────────────────────────── */}
      {showBanner && (
        <div className="banner banner--offline">
          <span className="spinner spinner--banner" aria-hidden="true" />
          {bannerText}
        </div>
      )}

      {error && <div className="toast toast--error">{error}</div>}
      {notification && <div className="toast toast--info">{notification}</div>}

      <GameHud />
      <TurnTimerBar />
      <HintBar />
      <ChatBar />
      <TurnAnnouncer />

      {showColorPicker && <WildColorPicker />}

      {isFinished && showGameOver && gameState && (
        <GameOver
          winner={gameState.winner}
          winnerId={gameState.winner_id}
          myId={playerId}
        />
      )}
    </div>
  )
}
