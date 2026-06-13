/**
 * TurnTimerBar — top-of-screen turn countdown shown as a depleting loading bar
 * plus the seconds remaining and whose turn it is. The bar restarts whenever
 * the turn/action changes (the server resets its authoritative 10s timer at the
 * same moments and applies a 2-card penalty at zero).
 */
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export default function TurnTimerBar() {
  const { gameState, playerId } = useGameStore()
  const status = gameState?.status
  const currentId = gameState?.current_player_id
  const deadline = gameState?.turn_deadline
  const resetKey = `${currentId}-${deadline ?? ''}`
  const turnSeconds = gameState?.settings?.turn_seconds ?? 30

  const [left, setLeft] = useState(turnSeconds)

  useEffect(() => {
    if (status !== 'playing') return
    setLeft(turnSeconds)
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resetKey, status, turnSeconds])

  if (!gameState || status !== 'playing') return null

  const isMyTurn = currentId === playerId
  const name = gameState.players?.find((p) => p.id === currentId)?.name ?? ''
  const danger = left <= 3

  return (
    <div className={`timerbar ${danger ? 'timerbar--danger' : ''} ${isMyTurn ? 'timerbar--mine' : ''}`}>
      <div className="timerbar-top">
        <span className="timerbar-label">{isMyTurn ? '✦ Your turn' : `${name}'s turn`}</span>
        <span className="timerbar-secs">{left}s</span>
      </div>
      <div className="timerbar-track">
        {/* key restarts the CSS deplete animation on each new turn/action */}
        <div
          key={resetKey}
          className="timerbar-fill"
          style={{ animationDuration: `${turnSeconds}s` }}
        />
      </div>
    </div>
  )
}
