/**
 * TableClock3D — a turn countdown clock floating over the centre of the table.
 *
 * It counts down 10s for the current player's turn. The countdown resets
 * whenever the turn / action changes (the server resets its authoritative
 * timer at the same moments and applies a 2-card penalty at zero). We count
 * locally from TURN_SECONDS so it stays accurate regardless of clock skew.
 */
import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import { TABLE_TOP_Y } from './layout'

const TURN_SECONDS = 10

export default function TableClock3D() {
  const { gameState, playerId } = useGameStore()
  const [left, setLeft] = useState(TURN_SECONDS)

  const status = gameState?.status
  const deadline = gameState?.turn_deadline
  const currentId = gameState?.current_player_id

  // Reset + tick whenever the turn/action changes.
  useEffect(() => {
    if (status !== 'playing') return
    setLeft(TURN_SECONDS)
    const id = setInterval(() => {
      setLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [deadline, currentId, status])

  if (!gameState || status !== 'playing') return null

  const isMyTurn = currentId === playerId
  const name = gameState.players?.find((p) => p.id === currentId)?.name ?? ''
  const frac = Math.max(0, Math.min(1, left / TURN_SECONDS))
  const danger = left <= 3
  const ringColor = danger ? '#ff4d4d' : isMyTurn ? '#5ce0a0' : '#ffd84d'

  return (
    <Html position={[0, TABLE_TOP_Y + 1.75, 0]} center distanceFactor={9}>
      <div className={`tclock ${danger ? 'tclock--danger' : ''}`}>
        <div
          className="tclock-ring"
          style={{
            background: `conic-gradient(${ringColor} ${frac * 360}deg, rgba(255,255,255,0.12) 0deg)`,
          }}
        >
          <div className="tclock-face">
            <span className="tclock-num">{left}</span>
          </div>
        </div>
        <div className="tclock-label">
          {isMyTurn ? 'Your turn' : `${name}'s turn`}
        </div>
      </div>
    </Html>
  )
}
