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

const RANK_MEDALS = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅']
const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th']

export default function GameOver({ winner, winnerId, myId }) {
  const { leaveRoom, gameState } = useGameStore()
  const isWinner = winnerId === myId
  const placements = gameState?.placements || []

  // Fallback: if no placements data, build a minimal one from winner
  const rankings = placements.length > 0
    ? placements
    : (winner ? [{ rank: 1, name: winner, id: winnerId }] : [])

  const myRank = rankings.find(p => p.id === myId)?.rank ?? null

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

  const heroEmoji = myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎭'
  const heroTitle = myRank === 1
    ? 'Victory!'
    : myRank === 2
    ? `${RANK_LABELS[1]} Place!`
    : myRank
    ? `${RANK_LABELS[myRank - 1]} Place`
    : `${winner} Wins!`

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
        <div className="game-over-emoji">{heroEmoji}</div>
        <h2 className="game-over-title">{heroTitle}</h2>
        <div className="game-over-divider" />

        {/* Rankings table */}
        {rankings.length > 1 && (
          <div className="game-over-rankings">
            {rankings.map((p) => (
              <div
                key={p.id}
                className={`ranking-row${p.id === myId ? ' ranking-row--me' : ''}`}
              >
                <span className="ranking-medal">{RANK_MEDALS[p.rank - 1]}</span>
                <span className="ranking-place">{RANK_LABELS[p.rank - 1]}</span>
                <span className="ranking-name">{p.name}{p.id === myId ? ' (you)' : ''}</span>
              </div>
            ))}
          </div>
        )}

        <p className="game-over-sub">
          {isWinner
            ? 'Magnificent! You claimed the throne.'
            : myRank === 2
            ? 'So close! A strong showing.'
            : 'Fortune may favour you next round.'}
        </p>

        <button className="btn btn--primary btn--large" onClick={leaveRoom}>
          Back to Lobby
        </button>
      </div>
    </div>
  )
}

