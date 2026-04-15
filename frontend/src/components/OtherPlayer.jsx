/**
 * OtherPlayer — opponent seat around the table.
 *
 * Props:
 *   player        { id, name, card_count, has_called_uno, is_connected }
 *   isCurrentTurn bool
 *   position      'top' | 'left' | 'right'
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import Card from './Card'

const MAX_FAN    = 5
const FAN_THRESH = 5

/** Deterministic hue from a player name for unique avatar colors. */
function nameHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return h % 360
}

/** Rotation angles for a horizontal arc fan of `count` slots. */
function buildFanAngles(count) {
  if (count === 0) return []
  const spread = Math.min(28, count * 4.5)
  const step   = count > 1 ? spread / (count - 1) : 0
  return Array.from({ length: count }, (_, i) => -spread / 2 + i * step)
}

export default function OtherPlayer({ player, isCurrentTurn, position = 'top' }) {
  const { playerId, catchUno } = useGameStore()
  const [showCatch, setShowCatch] = useState(false)
  const timerRef = useRef(null)

  if (player.id === playerId) return null

  const cardCount = player.card_count ?? 0
  const isOffline = !player.is_connected
  const hasUno    = player.has_called_uno
  const canCatch  = cardCount === 1 && !hasUno

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (canCatch) {
      timerRef.current = setTimeout(() => setShowCatch(true), 1000)
    } else {
      clearTimeout(timerRef.current)
      setShowCatch(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [canCatch])

  const isCollapsed  = cardCount > FAN_THRESH
  const shownCount   = isCollapsed ? MAX_FAN : cardCount
  const hiddenCount  = isCollapsed ? cardCount - MAX_FAN : 0
  const fanSlots     = shownCount + (isCollapsed ? 1 : 0)
  const fanAngles    = buildFanAngles(fanSlots)

  const hue = nameHue(player.name)
  const avatarStyle = {
    background: `linear-gradient(145deg, hsl(${hue},45%,18%), hsl(${hue},55%,30%))`,
    borderColor: isCurrentTurn
      ? `hsl(${hue},80%,62%)`
      : `hsl(${hue},40%,35%)`,
  }

  const rootClass = [
    'other-player',
    `other-player--${position}`,
    isCurrentTurn ? 'other-player--active' : '',
    isOffline     ? 'other-player--offline' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      {/* Active-seat glow beam */}
      {isCurrentTurn && <div className="seat-spotlight" />}

      {/* Turn arrow */}
      {isCurrentTurn && <div className="turn-arrow">▼</div>}

      {/* ── Catch UNO button — above avatar ────────────────── */}
      {showCatch && (
        <button
          className="btn btn--catch"
          onClick={() => catchUno(player.id)}
          title={`Catch ${player.name} for not saying UNO!`}
        >
          Catch!
        </button>
      )}

      {/* ── Avatar ─────────────────────────────────────────── */}
      <div className="op-avatar" style={avatarStyle}>
        <span className="op-avatar__letter">
          {player.name.charAt(0).toUpperCase()}
        </span>
        {isCurrentTurn && <div className="op-avatar__ring" />}
        {isOffline && <span className="op-avatar__offline-dot" title="Offline" />}
      </div>

      {/* ── Name + card count ──────────────────────────────── */}
      <div className="op-info">
        <span className="op-name" title={player.name}>{player.name}</span>
        <span className={`op-count${isCurrentTurn ? ' op-count--active' : ''}`}>
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* UNO badge */}
      {hasUno && <div className="uno-badge">UNO!</div>}

      {/* ── Card fan ───────────────────────────────────────── */}
      <div className="op-cards">
        {Array.from({ length: shownCount }).map((_, i) => (
          <div
            key={i}
            className="op-card-wrap"
            style={{ '--fan-rot': `${fanAngles[i] ?? 0}deg`, '--fan-i': i }}
          >
            <Card card={null} faceDown isMini />
          </div>
        ))}

        {isCollapsed && (
          <div
            className="op-card-wrap op-card-wrap--overflow"
            style={{ '--fan-rot': `${fanAngles[shownCount] ?? 0}deg`, '--fan-i': shownCount }}
          >
            <div className="op-overflow-badge">
              <span>+{hiddenCount}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
