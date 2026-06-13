/**
 * RadialPulse3D — a one-shot expanding, fading ring lying on the table.
 * Used for reverse (gold, table centre) and as the ground flash under
 * seat-targeted effects.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function RadialPulse3D({
  position = [0, 0, 0],
  color = '#ffd84d',
  dur = 0.8,
  startScale = 0.5,
  endScale = 5.5,
  onDone,
}) {
  const ref = useRef()
  const t = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    if (!ref.current || done.current) return
    t.current = Math.min(1, t.current + dt / dur)
    const e = 1 - Math.pow(1 - t.current, 3) // ease-out
    ref.current.scale.setScalar(startScale + (endScale - startScale) * e)
    ref.current.material.opacity = 0.8 * (1 - t.current)
    if (t.current >= 1) {
      done.current = true
      onDone?.()
    }
  })

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} scale={startScale}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  )
}
