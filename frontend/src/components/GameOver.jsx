/**
 * GameOver — overlay shown when the game finishes.
 * Announces the winner and provides a "Back to Lobby" button.
 */

import React, { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'

const CONFETTI_COLORS = ['#c9a227','#e84060','#4488ff','#18e87a','#f0aa20','#a855f7','#e8c84a']

export default function GameOver({ winner, winnerId, myId }) {
  const { leaveRoom } = useGameStore()
  const isWinner = winnerId === myId

  const confetti = useMemo(() => {
    if (!isWinner) return []
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: `${((i * 97) % 100)}%`,
      delay: `${((i * 0.09) % 1.3).toFixed(2)}s`,
      duration: `${(1.3 + (i * 0.13) % 1.4).toFixed(2)}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${6 + (i * 3) % 9}px`,
      isCircle: i % 3 === 0,
    }))
  }, [isWinner])

  return (
    <div className="modal-overlay">
      {isWinner && (
        <div className="confetti-container" aria-hidden="true">
          {confetti.map(p => (
            <div
              key={p.id}
              className={`confetti-piece${p.isCircle ? ' confetti-piece--circle' : ''}`}
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                background: p.color,
                animationDuration: p.duration,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}
      <div className="game-over-card">
        <div className="game-over-emoji">{isWinner ? '🏆' : '😔'}</div>
        <h2 className="game-over-title">
          {isWinner ? 'You Win!' : `${winner} Wins!`}
        </h2>
        <p className="game-over-sub">
          {isWinner
            ? 'Congratulations! You played all your cards.'
            : `Better luck next time!`}
        </p>
        <button
          className="btn btn--primary btn--large"
          onClick={leaveRoom}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}

