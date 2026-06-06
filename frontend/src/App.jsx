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

import React, { useState } from 'react'
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

export default function App() {
  const [unlocked, setUnlocked] = useState(false)

  useWebSocket()

  const { gameState, playerId, isConnected, showColorPicker, error, notification } =
    useGameStore()

  const isFinished = gameState?.status === 'finished'

  if (!unlocked) return <PythonDocs onUnlock={() => setUnlocked(true)} />

  return (
    <div className="app app--3d">
      {/* ── 3D world (lobby + table) ───────────────────────────────── */}
      <div className="canvas-root">
        <Experience />
      </div>

      {/* ── Screen-space HUD / overlays ────────────────────────────── */}
      {!isConnected && (
        <div className="banner banner--offline">Reconnecting to the chamber…</div>
      )}

      {error && <div className="toast toast--error">{error}</div>}
      {notification && <div className="toast toast--info">{notification}</div>}

      <GameHud />
      <TurnTimerBar />
      <HintBar />
      <ChatBar />
      <TurnAnnouncer />

      {showColorPicker && <WildColorPicker />}

      {isFinished && gameState && (
        <GameOver
          winner={gameState.winner}
          winnerId={gameState.winner_id}
          myId={playerId}
        />
      )}
    </div>
  )
}
