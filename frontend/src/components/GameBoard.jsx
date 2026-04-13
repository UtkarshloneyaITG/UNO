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
  const opponents = players.filter((p) => p.id !== playerId)

  // Assign opponents to table positions based on count
  //
  //  1 opp  →  top
  //  2 opps →  top · right
  //  3 opps →  top · left · right
  //  4 opps →  top(×2) · left · right
  //  5 opps →  top(×3) · left · right   (6-player game)
  let topOpponents = []
  let leftOpponent  = null
  let rightOpponent = null

  if (opponents.length === 1) {
    topOpponents = [opponents[0]]
  } else if (opponents.length === 2) {
    topOpponents  = [opponents[0]]
    rightOpponent = opponents[1]
  } else if (opponents.length === 3) {
    topOpponents  = [opponents[0]]
    leftOpponent  = opponents[1]
    rightOpponent = opponents[2]
  } else if (opponents.length === 4) {
    topOpponents  = [opponents[0], opponents[1]]
    leftOpponent  = opponents[2]
    rightOpponent = opponents[3]
  } else if (opponents.length >= 5) {
    topOpponents  = [opponents[0], opponents[1], opponents[2]]
    leftOpponent  = opponents[3]
    rightOpponent = opponents[4]
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
