/**
 * DiscardPile3D — the top discard card lying flat, ringed by the current
 * active colour (important after a Wild). Remounts on each new card so the
 * card "drops" onto the pile.
 */
import { Html } from '@react-three/drei'
import Card3D from './Card3D'
import { ACTIVE_COLOR_HEX } from './cardTextures'
import { TABLE_TOP_Y } from './layout'

// Deterministic small rotation per card id so the pile looks hand-tossed
function jitter(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xff
  return ((h / 255) - 0.5) * 0.5
}

export default function DiscardPile3D({ topCard, currentColor, suppressId, underCard }) {
  if (!topCard) return null

  const ringColor = ACTIVE_COLOR_HEX[currentColor] || ACTIVE_COLOR_HEX.wild
  const isWildTop =
    topCard.card_type === 'wild' || topCard.card_type === 'wild_draw_four'
  const baseY = TABLE_TOP_Y + 0.22
  // While the new top card flies in, show the previously-played card on the
  // pile (so the table is never empty); the FlyingCard lands on top of it.
  const hideCard = topCard.id === suppressId
  const shownCard = hideCard ? underCard : topCard
  const rot = jitter(shownCard?.id)

  return (
    <group position={[2.4, 0, 0]}>
      {/* Active-colour glow ring under the card */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY - 0.04, 0]}>
        <ringGeometry args={[1.05, 1.35, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} />
      </mesh>

      {/* The card on the pile — the new top, or the previous card while the
          new one is still flying in. Propped up toward the viewer so it's
          clearly readable on the table. */}
      {shownCard && (
        <Card3D
          key={shownCard.id}
          card={shownCard}
          liftOnHover={false}
          position={[0, baseY + 0.38, -0.25]}
          rotation={[-Math.PI / 2 + 0.62, 0, rot]}
        />
      )}

      {isWildTop && (
        <Html position={[0, baseY + 0.02, 1.2]} center distanceFactor={9} pointerEvents="none">
          <div className="pile3d-color" style={{ background: ringColor }}>
            {currentColor}
          </div>
        </Html>
      )}
    </group>
  )
}
