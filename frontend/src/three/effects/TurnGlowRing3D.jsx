/**
 * TurnGlowRing3D — a soft pulsing ring on the felt while it's the local
 * player's turn. Mounts/unmounts with the turn.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { TABLE_RADIUS, TABLE_TOP_Y } from '../layout'

export default function TurnGlowRing3D() {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.material.opacity = 0.16 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.2
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP_Y + 0.205, 0]}>
      <ringGeometry args={[TABLE_RADIUS - 1.5, TABLE_RADIUS - 1.15, 64]} />
      <meshBasicMaterial color="#5ce0a0" transparent opacity={0.2} depthWrite={false} />
    </mesh>
  )
}
