/**
 * TurnAnnouncer — full-screen flash overlay when the turn switches to you.
 * Appears for ~2.2 seconds then fades out.
 */
import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

export default function TurnAnnouncer() {
  const { gameState, playerId } = useGameStore()
  const [visible, setVisible]   = useState(false)
  const [info,    setInfo]       = useState({ title: '', sub: '' })
  const prevIdRef  = useRef(null)
  const timerRef   = useRef(null)

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return

    const curr = gameState.current_player_id
    const prev = prevIdRef.current
    prevIdRef.current = curr

    // Only fire when the turn *changes* to me
    if (curr === playerId && prev !== null && prev !== playerId) {
      let sub = 'Play a matching card or draw from the deck.'
      if (gameState.draw_stack > 0) {
        sub = `You must draw ${gameState.draw_stack} card${gameState.draw_stack > 1 ? 's' : ''} — or stack a Draw card!`
      } else if (gameState.challenge_available) {
        sub = 'You can challenge the Wild Draw 4 before drawing!'
      }

      setInfo({ sub })
      setVisible(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 2400)
    }

    return () => clearTimeout(timerRef.current)
  }, [gameState?.current_player_id, playerId])

  if (!visible) return null

  return (
    <div className="turn-announcer" aria-live="assertive">
      <div className="turn-announcer__badge">
        <div className="turn-announcer__label">YOUR TURN</div>
        <div className="turn-announcer__sub">{info.sub}</div>
      </div>
    </div>
  )
}
