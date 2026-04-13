/**
 * DiscardPile — displays the top card of the discard pile plus a
 * coloured "active colour" indicator (important after a Wild card).
 */

import React from 'react'
import Card from './Card'

const COLOR_HEX = {
  red: '#e74c3c',
  green: '#2ecc71',
  blue: '#3498db',
  yellow: '#f1c40f',
  wild: '#9b59b6',
}

export default function DiscardPile({ topCard, currentColor }) {
  if (!topCard) return null

  const colorHex = COLOR_HEX[currentColor] || COLOR_HEX.wild
  const showColorIndicator = topCard.card_type === 'wild' || topCard.card_type === 'wild_draw_four'

  return (
    <div className="discard-pile-area">
      <div className="pile-label">Discard</div>

      {/* Active colour ring — always visible to show the current valid colour */}
      <div
        className="color-ring"
        style={{ borderColor: colorHex, boxShadow: `0 0 12px ${colorHex}` }}
      >
        {/* Key forces re-mount on each new card → triggers flip-in animation */}
        <div key={topCard.id} className="discard-card-anim">
          <Card card={topCard} />
        </div>
      </div>

      {/* Explicit colour badge for when a Wild was played */}
      {showColorIndicator && (
        <div
          className="active-color-badge"
          style={{ background: colorHex }}
        >
          {currentColor}
        </div>
      )}
    </div>
  )
}
