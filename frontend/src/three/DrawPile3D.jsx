/**
 * DrawPile3D — a stack of face-down cards lying flat on the table.
 * Clickable on your turn to draw. Shows remaining count + any penalty.
 */
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import Card3D from './Card3D'
import { CARD_T } from './cardTextures'
import { TABLE_TOP_Y as TOP_Y } from './layout'

export default function DrawPile3D({ count = 0, isMyTurn, drawStack = 0 }) {
  const drawCard = useGameStore((s) => s.drawCard)

  // A few stacked backs for visual depth (kept low for performance)
  const stack = useMemo(() => {
    const n = count > 0 ? 3 : 0
    return Array.from({ length: n }, (_, i) => i)
  }, [count])

  const baseY = TOP_Y + 0.22
  const label = drawStack > 0 ? `Draw ${drawStack}!` : `${count} left`

  return (
    <group position={[-2.4, 0, 0]}>
      {stack.map((i) => (
        <Card3D
          key={i}
          faceDown
          liftOnHover={false}
          playable={isMyTurn && i === stack.length - 1}
          onClick={isMyTurn ? () => drawCard() : undefined}
          position={[0, baseY + i * (CARD_T + 0.004), 0]}
          rotation={[Math.PI / 2, 0, (i % 2) * 0.04]}
        />
      ))}

      <Html
        position={[0, baseY + 0.02, 1.15]}
        center
        distanceFactor={9}
        pointerEvents="none"
      >
        <div className={`pile3d-label ${drawStack > 0 ? 'pile3d-label--penalty' : ''}`}>
          {label}
        </div>
      </Html>
    </group>
  )
}
