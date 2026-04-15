/**
 * PlayerHand — curved arc arrangement at bottom-center.
 *
 * Each card is placed on an imaginary circle of radius ARC_R whose
 * centre sits ARC_R pixels BELOW the card baseline.  That produces
 * the classic "fan of cards" layout:
 *
 *         ┌─┐   ┌─┐ ┌─┐ ┌─┐   ┌─┐
 *        /   \ /   X   X   \ /   \
 *       ←── spread ──────────────→
 *
 * Centre card  : no x/y shift, no rotation  (top of arc)
 * Edge cards   : shifted outward + rotated + dropped slightly along arc
 *
 * All transforms are applied inline so the CSS just reads variables:
 *   translateX(--cx)  translateY(--cy)  rotate(--cr)
 */

import { useMemo, useRef } from 'react'
import Card from './Card'
import { useGameStore } from '../store/gameStore'

/* ── Game-rule helpers ───────────────────────────────────────── */
function isCardPlayable(card, gameState) {
  if (!gameState || gameState.status !== 'playing') return false
  const top          = gameState.discard_top
  const currentColor = gameState.current_color
  if (!top) return false
  if (gameState.draw_stack > 0) return false
  if (gameState.drawn_card_id) return card.id === gameState.drawn_card_id
  if (card.card_type === 'wild' || card.card_type === 'wild_draw_four') return true
  if (card.color === currentColor) return true
  if (card.card_type === top.card_type) {
    if (card.card_type === 'number') return card.number === top.number
    return true
  }
  return false
}

/* ── Arc geometry ────────────────────────────────────────────── */
const ARC_R   = 600   // px — radius of the imaginary holding-circle
const MAX_DEG = 70    // max total spread in degrees

/**
 * Returns per-slot { x, y, deg, zIndex } for `count` fan slots.
 *
 * x   — horizontal offset from centre (px)
 * y   — vertical drop from baseline  (px, positive = downward in CSS)
 * deg — rotation angle (degrees, negative = left-lean)
 */
function buildArcStyles(count) {
  if (count === 0) return []

  // For large hands, compress the angle per card so cards stay within
  // a reasonable spread without going off-screen
  const spread = count === 1 ? 0 : Math.min(MAX_DEG, count * 6)
  const step   = count > 1 ? spread / (count - 1) : 0
  const start  = -spread / 2
  const mid    = (count - 1) / 2

  return Array.from({ length: count }, (_, i) => {
    const deg = start + i * step
    const rad = (deg * Math.PI) / 180
    return {
      x:      Math.round(ARC_R * Math.sin(rad)),
      y:      Math.round(ARC_R * (1 - Math.cos(rad))),
      deg,
      zIndex: count - Math.round(Math.abs(i - mid)),
    }
  })
}

/* ── Component ───────────────────────────────────────────────── */
export default function PlayerHand({ onCardPlay }) {
  const { gameState, playerId, selectCard, passTurn, callUno } = useGameStore()
  const slotRefs = useRef({})

  const isMyTurn    = gameState?.current_player_id === playerId
  const hand        = gameState?.my_hand || []
  const drawnCardId = gameState?.drawn_card_id

  const playableIds = useMemo(
    () =>
      isMyTurn && gameState
        ? new Set(hand.filter((c) => isCardPlayable(c, gameState)).map((c) => c.id))
        : new Set(),
    [hand, gameState, isMyTurn],
  )

  const myData       = gameState?.players?.find((p) => p.id === playerId)
  const hasCalledUno = myData?.has_called_uno

  // Hooks must be above early-return
  if (!gameState || gameState.status !== 'playing') return null

  // Show every card — no collapsing
  const visibleCards = hand
  const arcStyles    = buildArcStyles(hand.length)

  const handleCardClick = (card) => {
    const el = slotRefs.current[card.id]
    if (el && onCardPlay) onCardPlay(el.getBoundingClientRect())
    selectCard(card)
  }

  return (
    <div className={`player-hand ${isMyTurn ? 'player-hand--active' : ''}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="hand-header">
        <span className="hand-label">{isMyTurn ? '✦ Your Turn' : 'Your Hand'}</span>
        <span className="hand-count">{hand.length} card{hand.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Curved arc fan ─────────────────────────────────── */}
      <div className="hand-cards">

        {visibleCards.map((card, i) => {
          const playable       = playableIds.has(card.id)
          const { x, y, deg, zIndex } = arcStyles[i] || { x: 0, y: 0, deg: 0, zIndex: 1 }

          return (
            <div
              key={card.id}
              className={`hand-card-slot${isMyTurn && playable ? ' hand-card-slot--playable' : ''}${!isMyTurn || !playable ? ' hand-card-slot--dim' : ''}`}
              style={{ '--cx': `${x}px`, '--cy': `${y}px`, '--cr': `${deg}deg`, zIndex }}
              ref={(el) => {
                if (el) slotRefs.current[card.id] = el
                else    delete slotRefs.current[card.id]
              }}
            >
              <Card
                card={card}
                isPlayable={isMyTurn && playable}
                onClick={isMyTurn && playable ? () => handleCardClick(card) : undefined}
              />
            </div>
          )
        })}

      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      {isMyTurn && (
        <div className="hand-actions">
          {drawnCardId && (
            <button className="btn btn--pass" onClick={passTurn}>Pass Turn</button>
          )}
          {gameState.challenge_available && (
            <button
              className="btn btn--challenge"
              onClick={() => useGameStore.getState().challengeWildFour()}
            >
              ⚡ Challenge!
            </button>
          )}
        </div>
      )}

      {/* ── UNO button ─────────────────────────────────────── */}
      {hand.length === 1 && !hasCalledUno && (
        <button className="uno-btn" onClick={callUno}>UNO!</button>
      )}
    </div>
  )
}
