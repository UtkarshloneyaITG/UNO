/**
 * FlyingCard — animates a card moving between two points on screen.
 *
 * Props:
 *   from     DOMRect  source element bounding rect
 *   to       DOMRect  destination bounding rect (optional)
 *   variant  'draw'   card flies from pile DOWN to hand  (default)
 *            'play'   card flies from hand  UP to discard pile
 *   onDone   called when the animation finishes
 */

import React, { useEffect, useRef } from 'react'

const CARD_W = 80   // matches --cw default
const CARD_H = 118  // matches --ch default

function centre(rect) {
  return {
    x: rect.left + rect.width  / 2 - CARD_W / 2,
    y: rect.top  + rect.height / 2 - CARD_H / 2,
  }
}

export default function FlyingCard({ from, to, variant = 'draw', onDone }) {
  const ref = useRef(null)

  const src = centre(from)

  // Destination: explicit rect, or default to hand / pile
  let dst
  if (to) {
    dst = centre(to)
  } else if (variant === 'play') {
    // fallback: centre of screen (approximate discard area)
    dst = {
      x: window.innerWidth  / 2 - CARD_W / 2,
      y: window.innerHeight / 2 - CARD_H / 2,
    }
  } else {
    // draw: default destination = bottom-centre (hand area)
    dst = {
      x: window.innerWidth  / 2 - CARD_W / 2,
      y: window.innerHeight - CARD_H - 20,
    }
  }

  const style = {
    '--fx': `${src.x}px`,
    '--fy': `${src.y}px`,
    '--tx': `${dst.x}px`,
    '--ty': `${dst.y}px`,
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onEnd = () => onDone?.()
    el.addEventListener('animationend', onEnd, { once: true })
    return () => el.removeEventListener('animationend', onEnd)
  }, [onDone])

  return (
    <div
      ref={ref}
      className={`flying-card flying-card--${variant}`}
      style={style}
      aria-hidden="true"
    >
      <div className="flying-card-inner card card--back">
        <div className="card-back-pattern">UNO</div>
      </div>
    </div>
  )
}
