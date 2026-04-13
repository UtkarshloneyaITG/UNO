/**
 * PlayerHand — the current player's cards at the bottom of the screen.
 *
 * Props:
 *   onCardPlay(rect)  called just before a card is played, with the
 *                     card slot's DOMRect so the parent can animate it
 */

import React, { useMemo, useRef } from 'react'
import Card from './Card'
import { useGameStore } from '../store/gameStore'

function isCardPlayable(card, gameState) {
  if (!gameState || gameState.status !== 'playing') return false
  const top = gameState.discard_top
  const currentColor = gameState.current_color
  if (!top) return false
  // Official rules: no stacking — must draw the full penalty (or challenge +4)
  if (gameState.draw_stack > 0) return false
  if (gameState.drawn_card_id)
    return card.id === gameState.drawn_card_id
  if (card.card_type === 'wild' || card.card_type === 'wild_draw_four') return true
  if (card.color === currentColor) return true
  if (card.card_type === top.card_type) {
    if (card.card_type === 'number') return card.number === top.number
    return true
  }
  return false
}

export default function PlayerHand({ onCardPlay }) {
  const { gameState, playerId, selectCard, passTurn, callUno, drawCard } =
    useGameStore()

  // Ref map: card.id → slot DOM element
  const slotRefs = useRef({})

  const isMyTurn    = gameState?.current_player_id === playerId
  const hand        = gameState?.my_hand || []
  const drawnCardId = gameState?.drawn_card_id
  const drawStack   = gameState?.draw_stack ?? 0

  const playableIds = useMemo(
    () =>
      isMyTurn && gameState
        ? new Set(hand.filter((c) => isCardPlayable(c, gameState)).map((c) => c.id))
        : new Set(),
    [hand, gameState, isMyTurn]
  )

  const myData       = gameState?.players?.find((p) => p.id === playerId)
  const hasCalledUno = myData?.has_called_uno

  // All hooks above — safe to early-return now
  if (!gameState || gameState.status !== 'playing') return null

  const handleCardClick = (card) => {
    // Fire the play animation before the store action
    const slotEl = slotRefs.current[card.id]
    if (slotEl && onCardPlay) {
      onCardPlay(slotEl.getBoundingClientRect())
    }
    selectCard(card)
  }

  return (
    <div className={`player-hand ${isMyTurn ? 'player-hand--active' : ''}`}>
      {/* Header */}
      <div className="hand-header">
        <span className="hand-label">
          {isMyTurn ? '✨ Your Turn' : 'Your Hand'}
        </span>
        <span className="hand-count">{hand.length} card{hand.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards */}
      <div className="hand-cards">
        {hand.map((card) => {
          const playable = playableIds.has(card.id)
          return (
            <div
              key={card.id}
              className="hand-card-slot"
              ref={(el) => {
                if (el) slotRefs.current[card.id] = el
                else delete slotRefs.current[card.id]
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

      {/* Action buttons */}
      {isMyTurn && (
        <div className="hand-actions">
          {!drawnCardId && (
            <button className="btn btn--draw" onClick={drawCard}>
              {drawStack > 0 ? `Draw ${drawStack} Cards` : 'Draw Card'}
            </button>
          )}
          {drawnCardId && (
            <button className="btn btn--pass" onClick={passTurn}>
              Pass Turn
            </button>
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

      {/* UNO button */}
      {hand.length === 1 && !hasCalledUno && (
        <button className="uno-btn" onClick={callUno}>
          UNO!
        </button>
      )}
    </div>
  )
}
