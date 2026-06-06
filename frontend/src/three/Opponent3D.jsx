/**
 * Opponent3D — one opponent seated on a chair around the table, holding their
 * cards, with a floating HTML nameplate (avatar, name, card count, turn glow,
 * UNO badge, and a "Catch!" button when they fail to call UNO).
 */
import { useState, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import PlayerCharacter3D from './PlayerCharacter3D'
import { TABLE_TOP_Y } from './layout'

export default function Opponent3D({ player, seat, hue = 200, isCurrentTurn }) {
  const { playerId, catchUno } = useGameStore()
  const bubble = useGameStore((s) => s.bubbles?.[player.id])
  const [showCatch, setShowCatch] = useState(false)
  const timerRef = useRef(null)

  const cardCount = player.card_count ?? 0
  const isOffline = !player.is_connected
  const hasUno = player.has_called_uno
  const canCatch = cardCount === 1 && !hasUno && player.id !== playerId

  useEffect(() => {
    if (canCatch) {
      timerRef.current = setTimeout(() => setShowCatch(true), 1000)
    } else {
      clearTimeout(timerRef.current)
      setShowCatch(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [canCatch])

  const playerColor = `hsl(${hue}, 85%, 62%)`

  return (
    <group>
      {/* Seated 3D character on a chair, holding their cards */}
      <PlayerCharacter3D
        seat={seat}
        hue={hue}
        active={isCurrentTurn}
        offline={isOffline}
        count={cardCount}
      />

      {/* Chat / emoji bubble (floats above the nameplate) */}
      {bubble && (
        <Html position={[seat.x, TABLE_TOP_Y + 3.35, seat.z]} center distanceFactor={11}>
          <div key={bubble.key} className="op3d-bubble">
            {bubble.text}
          </div>
        </Html>
      )}

      {/* Floating nameplate above the character's head — name + total cards */}
      <Html position={[seat.x, TABLE_TOP_Y + 2.5, seat.z]} center distanceFactor={11}>
        <div
          className={`op3d ${isOffline ? 'op3d--offline' : ''}`}
          style={{ '--pc': playerColor }}
        >
          <span className="op3d-name">{player.name}</span>
          <span className="op3d-count">
            {cardCount} card{cardCount === 1 ? '' : 's'}
          </span>
          {hasUno && <span className="op3d-uno">UNO!</span>}
          {isOffline && <span className="op3d-badge">offline</span>}
          {showCatch && (
            <button className="op3d-catch" onClick={() => catchUno(player.id)}>
              Catch!
            </button>
          )}
        </div>
      </Html>
    </group>
  )
}
