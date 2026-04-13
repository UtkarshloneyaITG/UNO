/**
 * DrawPile — clickable face-down deck.
 * Shows the remaining card count. Clicking it triggers a draw action.
 */

import React, { useState, useCallback, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import Card from './Card'

export default function DrawPile({ count, isMyTurn, drawStack, onDrawAnimate }) {
  const { drawCard } = useGameStore()
  const [isBouncing, setIsBouncing] = useState(false)
  const stackRef = useRef(null)

  const handleClick = useCallback(() => {
    if (!isMyTurn) return

    // Fire flying-card animation before the store action
    if (onDrawAnimate && stackRef.current) {
      onDrawAnimate(stackRef.current.getBoundingClientRect())
    }

    setIsBouncing(true)
    setTimeout(() => setIsBouncing(false), 500)
    drawCard()
  }, [isMyTurn, drawCard, onDrawAnimate])

  const label =
    drawStack > 0
      ? `Draw ${drawStack}!`
      : `${count ?? '?'} left`

  return (
    <div className={`draw-pile-area ${isMyTurn ? 'draw-pile-area--active' : ''}`}>
      <div className="pile-label">Draw Pile</div>
      <div
        ref={stackRef}
        className={[
          'draw-pile-stack',
          isMyTurn ? 'draw-pile-stack--clickable' : '',
          isBouncing ? 'draw-pile-stack--bounce' : '',
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
        title={isMyTurn ? 'Click to draw' : undefined}
      >
        {/* Stack effect — a few offset card backs */}
        <Card card={null} faceDown />
        <Card card={null} faceDown />
        <Card card={null} faceDown />
      </div>
      <div className={`pile-count ${drawStack > 0 ? 'pile-count--penalty' : ''}`}>
        {label}
      </div>
    </div>
  )
}
