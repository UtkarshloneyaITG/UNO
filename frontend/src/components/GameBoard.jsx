/**
 * GameBoard — 3D round-table casino layout.
 *
 * Visual structure:
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  top-bar: Logo | Turn banner | Leave             │
 *   ├──────────────────────────────────────────────────┤
 *   │                                                  │
 *   │    [Top opponents]    [Top opponents]            │
 *   │                                                  │
 *   │  [Left]  ╔══════════════════╗  [Right]          │
 *   │          ║  Draw · Dir · Disc║                   │
 *   │          ╚══════════════════╝                   │
 *   │        ↑ Round green felt table ↑               │
 *   ├──────────────────────────────────────────────────┤
 *   │  Alerts · Log                                    │
 *   ├──────────────────────────────────────────────────┤
 *   │  Your hand (arc fan)                             │
 *   └──────────────────────────────────────────────────┘
 *
 * Seating logic is identical to the original — we only change
 * the visual wrapper elements, not the turn-order calculation.
 */

import { useState, useCallback, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import OtherPlayer    from './OtherPlayer'
import DiscardPile    from './DiscardPile'
import DrawPile       from './DrawPile'
import PlayerHand     from './PlayerHand'
import FlyingCard     from './FlyingCard'
import TurnAnnouncer  from './TurnAnnouncer'
import HintBar        from './HintBar'

const DIR_ICON = { 1: '↻', [-1]: '↺' }

export default function GameBoard() {
  const { gameState, playerId, leaveRoom } = useGameStore()
  const [flyFrom,  setFlyFrom]  = useState(null)
  const [playFly,  setPlayFly]  = useState(null)
  const discardRef = useRef(null)

  const handleDrawAnimate = useCallback((rect) => setFlyFrom(rect), [])
  const handleFlyDone     = useCallback(() => setFlyFrom(null), [])
  const handleCardPlay    = useCallback((fromRect) => {
    const toRect = discardRef.current?.getBoundingClientRect()
    if (fromRect && toRect) setPlayFly({ from: fromRect, to: toRect })
  }, [])
  const handlePlayFlyDone = useCallback(() => setPlayFly(null), [])

  if (!gameState) return null

  const {
    players = [],
    current_player_id,
    direction,
    current_color,
    discard_top,
    draw_pile_count,
    draw_stack,
  } = gameState

  const isMyTurn = current_player_id === playerId

  // ── Fixed-seat seating ─────────────────────────────────────────────
  // Always walk clockwise (+1) regardless of current direction.
  // Positions never change when a Reverse card is played — only the
  // direction arrow flips. This mirrors a real round table.
  //
  // Seat mapping (always clockwise from me):
  //   index 0       → right seat  (first clockwise neighbour)
  //   index 1..last-1 → top row   (far opponents)
  //   index last    → left seat   (last clockwise = first CCW neighbour)
  const myIndex = players.findIndex((p) => p.id === playerId)
  const n       = players.length

  const orderedOpponents = []
  if (myIndex !== -1) {
    for (let step = 1; step < n; step++) {
      orderedOpponents.push(players[(myIndex + step) % n])
    }
  } else {
    players.forEach((p) => { if (p.id !== playerId) orderedOpponents.push(p) })
  }

  const oCount = orderedOpponents.length
  let topOpponents  = []
  let leftOpponent  = null
  let rightOpponent = null

  if (oCount === 1) {
    topOpponents = [orderedOpponents[0]]
  } else if (oCount === 2) {
    rightOpponent = orderedOpponents[0]
    topOpponents  = [orderedOpponents[1]]
  } else if (oCount === 3) {
    rightOpponent = orderedOpponents[0]
    topOpponents  = [orderedOpponents[1]]
    leftOpponent  = orderedOpponents[2]
  } else if (oCount === 4) {
    rightOpponent = orderedOpponents[0]
    topOpponents  = [orderedOpponents[1], orderedOpponents[2]]
    leftOpponent  = orderedOpponents[3]
  } else if (oCount === 5) {
    rightOpponent = orderedOpponents[0]
    topOpponents  = [orderedOpponents[1], orderedOpponents[2], orderedOpponents[3]]
    leftOpponent  = orderedOpponents[4]
  } else if (oCount >= 6) {
    rightOpponent = orderedOpponents[0]
    topOpponents  = [orderedOpponents[1], orderedOpponents[2], orderedOpponents[3], orderedOpponents[4]]
    leftOpponent  = orderedOpponents[5]
  }

  return (
    <div className="game-board">
      {/* ── Flying card animations ─────────────────────────────────── */}
      {flyFrom && (
        <FlyingCard from={flyFrom} onDone={handleFlyDone} variant="draw" />
      )}
      {playFly && (
        <FlyingCard from={playFly.from} to={playFly.to} onDone={handlePlayFlyDone} variant="play" />
      )}

      {/* ── Top-left HUD ───────────────────────────────────────────── */}
      <div className="hud-topleft">
        <span className="hud-logo">UNO</span>
        <span className="hud-room">{gameState.room_id}</span>
        <span className="hud-turn">
          {isMyTurn
            ? <span className="hud-turn--mine">✦ Your Turn</span>
            : `${players.find(p => p.id === current_player_id)?.name ?? ''}'s Turn`}
        </span>
        <button className="hud-leave" onClick={leaveRoom}>Leave</button>
      </div>

      {/* ── Table scene ────────────────────────────────────────────── */}
      <div className="game-table">

        {/* Decorative round felt table (purely visual, pointer-events: none) */}
        <div className="table-felt-bg" />

        {/* Ambient ceiling light cone */}
        <div className="table-light-cone" />

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

          {/* Center play area — sits on top of the felt */}
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

      {/* ── Contextual hint bar ────────────────────────────────────── */}
      <HintBar />

      {/* ── Player's hand ──────────────────────────────────────────── */}
      <PlayerHand onCardPlay={handleCardPlay} />

      {/* ── Turn flash overlay ─────────────────────────────────────── */}
      <TurnAnnouncer />
    </div>
  )
}
