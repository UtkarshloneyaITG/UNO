/**
 * DrawPile3D — a stack of face-down cards lying flat on the table.
 * Clickable on your turn to draw. When it's your turn (and especially when
 * you must draw), a glowing pulsing ring under the deck highlights it.
 */
import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'
import Card3D from './Card3D'
import { CARD_T } from './cardTextures'
import { TABLE_TOP_Y as TOP_Y } from './layout'

export default function DrawPile3D({ count = 0, isMyTurn, drawStack = 0, mustDraw = false }) {
  const drawCard = useGameStore((s) => s.drawCard)
  const ringRef = useRef()

  const stack = useMemo(() => {
    const n = count > 0 ? 3 : 0
    return Array.from({ length: n }, (_, i) => i)
  }, [count])

  const baseY = TOP_Y + 0.22
  const label = drawStack > 0 ? `Draw ${drawStack}!` : `${count} left`
  const urgent = mustDraw || drawStack > 0
  const ringColor = urgent ? '#ff6060' : '#ffd84d'

  // Pulse the highlight ring (stronger when you must draw).
  useFrame((state) => {
    if (!ringRef.current) return
    const amp = urgent ? 0.14 : 0.06
    ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * amp)
  })

  return (
    <group position={[-2.4, 0, 0]}>
      {/* Highlight ring under the deck on your turn */}
      {isMyTurn && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY - 0.19, 0]}>
          <ringGeometry args={[0.95, 1.25, 44]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
        </mesh>
      )}

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
