/**
 * GameOver — overlay shown when the game finishes.
 * Announces the winner and provides a "Back to Lobby" button.
 */

import React, { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'

const CONFETTI_COLORS = [
  '#f0d060','#f04468','#5294ff','#20ee86',
  '#f5b820','#b060ff','#ff8040','#e8c84a',
  '#40d0ff','#ff60a0',
]

export default function GameOver({ winner, winnerId, myId }) {
  const { leaveRoom } = useGameStore()
  const isWinner = winnerId === myId

  const confetti = useMemo(() => {
    if (!isWinner) return []
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${((i * 97 + i * 13) % 100).toFixed(1)}%`,
      delay: `${((i * 0.07) % 1.6).toFixed(2)}s`,
      duration: `${(1.2 + (i * 0.11) % 1.5).toFixed(2)}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${5 + (i * 4) % 10}px`,
      isCircle: i % 3 === 0,
      rotation: `${(i * 47) % 360}deg`,
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
                transform: `rotate(${p.rotation})`,
              }}
            />
          ))}
        </div>
      )}
      <div className="game-over-card">
        <div className="game-over-emoji">{isWinner ? '🏆' : '🎭'}</div>
        <h2 className="game-over-title">
          {isWinner ? 'Victory!' : `${winner} Wins!`}
        </h2>
        <div className="game-over-divider" />
        <p className="game-over-sub">
          {isWinner
            ? 'Magnificent! You played all your cards and claimed the throne.'
            : `A worthy champion. Fortune may favour you next round.`}
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

