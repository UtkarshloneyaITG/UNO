/**
 * GameBoard — table-layout in-game screen.
 *
 * Table structure (mirrors a physical card table):
 *
 *   ┌────────────────────────────────────────┐
 *   │           top-bar                      │
 *   ├──────┬─────────────────────┬───────────┤
 *   │      │   Top opponent(s)   │           │
 *   │ Left ├─────────────────────┤  Right    │
 *   │      │  Draw · Dir · Disc  │           │
 *   ├──────┴─────────────────────┴───────────┤
 *   │       Alerts · Log                     │
 *   ├────────────────────────────────────────┤
 *   │       Your hand                        │
 *   └────────────────────────────────────────┘
 */

import React, { useState, useCallback, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import OtherPlayer from './OtherPlayer'
import DiscardPile from './DiscardPile'
import DrawPile from './DrawPile'
import PlayerHand from './PlayerHand'
import GameLog from './GameLog'
import FlyingCard from './FlyingCard'
// GameOver is rendered at the App root level — not here

const DIR_ICON = { 1: '↻', [-1]: '↺' }

export default function GameBoard() {
  const { gameState, playerId, leaveRoom } = useGameStore()
  const [logOpen, setLogOpen] = useState(false)
  // Draw animation: pile → hand
  const [flyFrom, setFlyFrom] = useState(null)
  // Play animation: hand → discard pile
  const [playFly, setPlayFly] = useState(null)   // { from: DOMRect, to: DOMRect }
  const discardRef = useRef(null)

  const handleDrawAnimate = useCallback((rect) => { setFlyFrom(rect) }, [])
  const handleFlyDone     = useCallback(() => { setFlyFrom(null) }, [])

  const handleCardPlay = useCallback((fromRect) => {
    const toRect = discardRef.current?.getBoundingClientRect()
    if (fromRect && toRect) setPlayFly({ from: fromRect, to: toRect })
  }, [])
  const handlePlayFlyDone = useCallback(() => { setPlayFly(null) }, [])

  if (!gameState) return null

  const {
    players = [],
    current_player_id,
    direction,
    current_color,
    discard_top,
    draw_pile_count,
    draw_stack,
    action_log = [],
  } = gameState

  const isMyTurn  = current_player_id === playerId

  // ── Turn-order seating ──────────────────────────────────────────────────
  // Walk the players array from our seat in the current direction so that
  // the opponent who plays immediately after us always sits to the right
  // (direction=1 / clockwise) or to the left (direction=-1 / CCW).
  //
  // Clockwise  layout: right → top... → left
  // CCW layout:        left  → top... → right
  const myIndex = players.findIndex((p) => p.id === playerId)
  const n = players.length

  // orderedOpponents[0] = next player after me, [1] after that, etc.
  const orderedOpponents = []
  if (myIndex !== -1) {
    for (let step = 1; step < n; step++) {
      const idx = ((myIndex + step * direction) % n + n) % n
      orderedOpponents.push(players[idx])
    }
  } else {
    // Fallback: just use array order (shouldn't happen)
    players.forEach((p) => { if (p.id !== playerId) orderedOpponents.push(p) })
  }

  const oCount = orderedOpponents.length
  let topOpponents = []
  let leftOpponent  = null
  let rightOpponent = null

  if (oCount === 1) {
    topOpponents = [orderedOpponents[0]]
  } else if (oCount === 2) {
    // direction=1:  right(next) · top
    // direction=-1: left(next)  · top
    if (direction === 1) {
      rightOpponent = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1]]
    } else {
      leftOpponent  = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1]]
    }
  } else if (oCount === 3) {
    if (direction === 1) {
      rightOpponent = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1]]
      leftOpponent  = orderedOpponents[2]
    } else {
      leftOpponent  = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1]]
      rightOpponent = orderedOpponents[2]
    }
  } else if (oCount === 4) {
    if (direction === 1) {
      rightOpponent = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1], orderedOpponents[2]]
      leftOpponent  = orderedOpponents[3]
    } else {
      leftOpponent  = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1], orderedOpponents[2]]
      rightOpponent = orderedOpponents[3]
    }
  } else if (oCount >= 5) {
    if (direction === 1) {
      rightOpponent = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1], orderedOpponents[2], orderedOpponents[3]]
      leftOpponent  = orderedOpponents[4]
    } else {
      leftOpponent  = orderedOpponents[0]
      topOpponents  = [orderedOpponents[1], orderedOpponents[2], orderedOpponents[3]]
      rightOpponent = orderedOpponents[4]
    }
  }

  const currentPlayerName =
    players.find((p) => p.id === current_player_id)?.name ?? ''

  return (
    <div className="game-board">
      {flyFrom  && <FlyingCard from={flyFrom} onDone={handleFlyDone} variant="draw" />}
      {playFly  && <FlyingCard from={playFly.from} to={playFly.to} onDone={handlePlayFlyDone} variant="play" />}

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="top-bar-logo">UNO</span>
          <span className="room-id-badge">{gameState.room_id}</span>
        </div>
        <div className="top-bar-center">
          {isMyTurn ? (
            <span className="turn-indicator turn-indicator--mine">✦ Your Turn ✦</span>
          ) : (
            <span className="turn-indicator">{currentPlayerName}'s Turn</span>
          )}
        </div>
        <div className="top-bar-right">
          <button className="btn btn--ghost btn--sm" onClick={leaveRoom}>Leave</button>
        </div>
      </div>

      {/* ── Table grid ────────────────────────────────────────────── */}
      <div className="game-table">

        {/* Left column — side opponent */}
        <div className="table-left">
          {leftOpponent && (
            <OtherPlayer
              player={leftOpponent}
              isCurrentTurn={leftOpponent.id === current_player_id}
              position="left"
            />
          )}
        </div>

        {/* Middle column: top opponents + play area */}
        <div className="table-middle">
          <div className="table-top">
            {topOpponents.map((p) => (
              <OtherPlayer
                key={p.id}
                player={p}
                isCurrentTurn={p.id === current_player_id}
                position="top"
              />
            ))}
          </div>

          <div className="play-area">
            <DrawPile
              count={draw_pile_count}
              isMyTurn={isMyTurn}
              drawStack={draw_stack}
              onDrawAnimate={handleDrawAnimate}
            />

            <div className="direction-indicator" title={direction === 1 ? 'Clockwise' : 'Counter-clockwise'}>
              <span key={direction} className="direction-arrow">{DIR_ICON[direction] || '↻'}</span>
              <span className="direction-label">{direction === 1 ? 'CW' : 'CCW'}</span>
            </div>

            <div ref={discardRef}>
              <DiscardPile topCard={discard_top} currentColor={current_color} />
            </div>
          </div>
        </div>

        {/* Right column — side opponent */}
        <div className="table-right">
          {rightOpponent && (
            <OtherPlayer
              player={rightOpponent}
              isCurrentTurn={rightOpponent.id === current_player_id}
              position="right"
            />
          )}
        </div>

      </div>

      {/* ── Alerts & log ──────────────────────────────────────────── */}
      <div className="game-info">
        {draw_stack > 0 && isMyTurn && (
          <div className="draw-alert">
            ⚠️ You must draw {draw_stack} card{draw_stack !== 1 ? 's' : ''}!{draw_stack === 4 ? ' (or Challenge the +4)' : ''}
          </div>
        )}
        {gameState.last_action && (
          <div key={gameState.last_action} className="last-action">
            {gameState.last_action}
          </div>
        )}
        <div className="log-section">
          <button className="log-toggle" onClick={() => setLogOpen((v) => !v)}>
            {logOpen ? '▾ Hide Log' : '▸ Show Log'}
          </button>
          {logOpen && <GameLog log={action_log} />}
        </div>
      </div>

      {/* ── Player's hand ─────────────────────────────────────────── */}
      <PlayerHand onCardPlay={handleCardPlay} />
    </div>
  )
}
