/**
 * OtherPlayer — shows a single opponent's status.
 *
 * Props:
 *   player        { id, name, card_count, has_called_uno, is_connected }
 *   isCurrentTurn bool
 *   position      'top' | 'left' | 'right'   (default: 'top')
 *
 * Side positions (left/right) render cards in a vertical column.
 * Top position renders cards in a horizontal row.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import Card from './Card'

export default function OtherPlayer({ player, isCurrentTurn, position = 'top' }) {
  const { playerId, catchUno } = useGameStore()
  const [showCatch, setShowCatch] = useState(false)
  const timerRef = useRef(null)

  if (player.id === playerId) return null

  const cardCount   = player.card_count ?? 0
  const isOffline   = !player.is_connected
  const hasUno      = player.has_called_uno
  const canCatch    = cardCount === 1 && !hasUno

  // Show the Catch button only after a 3-second delay.
  // Reset immediately if the opponent calls UNO, plays their card, or draws.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (canCatch) {
      timerRef.current = setTimeout(() => setShowCatch(true), 3000)
    } else {
      clearTimeout(timerRef.current)
      setShowCatch(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [canCatch])
  const isSide      = position === 'left' || position === 'right'
  // If opponent has more than 5 cards, collapse to a badge — don't render individual card backs
  const MAX_SHOW    = 5
  const collapsed   = cardCount > MAX_SHOW

  return (
    <div
      className={[
        'other-player',
        `other-player--${position}`,
        isCurrentTurn ? 'other-player--active' : '',
        isOffline     ? 'other-player--offline' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Player header */}
      <div className="other-player-header">
        <div className="other-player-avatar">{player.name.charAt(0).toUpperCase()}</div>
        <div className="other-player-info">
          <span className="other-player-name">
            {player.name}
            {isOffline && <span className="badge badge--offline"> Offline</span>}
          </span>
          <span className="other-player-count">
            {cardCount} card{cardCount !== 1 ? 's' : ''}
          </span>
        </div>
        {isCurrentTurn && <div className="turn-arrow">▶</div>}
      </div>

      {/* UNO badge */}
      {hasUno && <div className="uno-badge">UNO!</div>}

      {/* Card backs — collapsed badge when > 5 cards */}
      <div className={`other-player-cards-row${isSide ? ' other-player-cards-row--vert' : ''}`}>
        {collapsed ? (
          <div className="card-count-badge">
            <span className="card-count-badge-plus">+</span>
            <span className="card-count-badge-num">{cardCount}</span>
          </div>
        ) : (
          Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} card={null} faceDown isMini />
          ))
        )}
      </div>

      {/* Catch UNO button — appears after 3-second delay */}
      {showCatch && (
        <button
          className="btn btn--catch"
          onClick={() => catchUno(player.id)}
          title="Catch this player for not calling UNO!"
        >
          Catch!
        </button>
      )}
    </div>
  )
}
