/**
 * PlayerHand3D — the local player's hand, an arced fan of face-up 3D cards
 * floating at the near edge of the table. Playable cards glow and lift;
 * clicking one plays it (wilds open the colour picker via the store).
 *
 * Action buttons (Pass / Challenge / UNO) ride along as an HTML strip.
 */
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import Card3D from './Card3D'
import { TABLE_TOP_Y } from './layout'

function isCardPlayable(card, gameState) {
  if (!gameState || gameState.status !== 'playing') return false
  const top = gameState.discard_top
  if (!top) return false
  if (gameState.draw_stack > 0) return false
  if (gameState.drawn_card_id) return card.id === gameState.drawn_card_id
  if (card.card_type === 'wild' || card.card_type === 'wild_draw_four') return true
  if (card.color === gameState.current_color) return true
  if (card.card_type === top.card_type) {
    if (card.card_type === 'number') return card.number === top.number
    return true
  }
  return false
}

const FAN_R = 4.2 // radius of the imaginary holding circle
const DEG_PER_CARD = 6.5 // angular spacing between neighbouring cards
const MAX_SPREAD = 58 // cap total fan spread (degrees)
const DEPTH_STEP = 0.03 // per-card forward offset — kills z-fighting
const HAND_Z = 6.1
const HAND_Y = TABLE_TOP_Y + 1.0
const TILT = -0.46 // lean cards back toward the camera

export default function PlayerHand3D() {
  const { gameState, playerId, selectCard, passTurn, callUno, challengeWildFour } =
    useGameStore()

  const hand = gameState?.my_hand || []
  const isMyTurn = gameState?.current_player_id === playerId
  const drawnCardId = gameState?.drawn_card_id
  const myData = gameState?.players?.find((p) => p.id === playerId)
  const hasCalledUno = myData?.has_called_uno

  const playable = useMemo(() => {
    if (!isMyTurn) return new Set()
    return new Set(hand.filter((c) => isCardPlayable(c, gameState)).map((c) => c.id))
  }, [hand, gameState, isMyTurn])

  if (!gameState || gameState.status !== 'playing') return null

  const count = hand.length
  // Even angular spacing, capped so big hands don't wrap off-screen.
  const spreadDeg = count <= 1 ? 0 : Math.min(MAX_SPREAD, DEG_PER_CARD * (count - 1))
  const step = count > 1 ? spreadDeg / (count - 1) : 0
  const mid = (count - 1) / 2

  return (
    <group>
      {hand.map((card, i) => {
        const deg = -spreadDeg / 2 + i * step
        const rad = (deg * Math.PI) / 180
        const x = Math.sin(rad) * FAN_R
        const dy = (1 - Math.cos(rad)) * FAN_R // outer cards dip along the arc
        const isPlayable = playable.has(card.id)
        const lift = isPlayable ? 0.18 : 0
        // Monotonic depth stagger so neighbours never share a plane.
        const z = HAND_Z + i * DEPTH_STEP

        return (
          <Card3D
            key={card.id}
            card={card}
            playable={isMyTurn && isPlayable}
            dimmed={isMyTurn && !isPlayable}
            onClick={isMyTurn && isPlayable ? () => selectCard(card) : undefined}
            position={[x, HAND_Y - dy + lift, z]}
            rotation={[TILT, 0, -rad]}
            scale={1.0}
            renderOrder={i}
          />
        )
      })}

      {/* Action strip just under the hand */}
      <Html position={[0, HAND_Y - 1.0, HAND_Z + 0.6]} center distanceFactor={10}>
        <div className="hand3d-actions">
          <span className="hand3d-count">
            {count} card{count === 1 ? '' : 's'} {isMyTurn ? '· your turn' : ''}
          </span>
          <div className="hand3d-buttons">
            {isMyTurn && drawnCardId && (
              <button className="btn btn--pass" onClick={passTurn}>
                Pass Turn
              </button>
            )}
            {isMyTurn && gameState.challenge_available && (
              <button className="btn btn--challenge" onClick={() => challengeWildFour()}>
                ⚡ Challenge!
              </button>
            )}
            {count === 1 && !hasCalledUno && (
              <button className="uno-btn uno-btn--3d" onClick={callUno}>
                UNO!
              </button>
            )}
          </div>
        </div>
      </Html>
    </group>
  )
}
