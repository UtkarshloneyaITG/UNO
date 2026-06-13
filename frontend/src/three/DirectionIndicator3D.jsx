/**
 * DirectionIndicator3D — a slowly spinning arrow ring at the table centre
 * showing the current play direction (clockwise / counter-clockwise).
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { TABLE_TOP_Y } from './layout'

export default function DirectionIndicator3D({ direction = 1 }) {
  const ref = useRef()
  const matRef = useRef()
  const prevDir = useRef(direction)
  const boost = useRef(1)

  // A direction flip kicks the ring into a dramatic over-spin that eases
  // back to the normal rate, with a matching glow/scale pulse.
  if (prevDir.current !== direction) {
    prevDir.current = direction
    boost.current = 9
  }

  useFrame((_, dt) => {
    if (!ref.current) return
    boost.current += (1 - boost.current) * Math.min(1, dt * 3)
    ref.current.rotation.z -= direction * dt * 0.4 * boost.current
    const excite = boost.current - 1
    ref.current.scale.setScalar(1 + excite * 0.04)
    if (matRef.current) matRef.current.emissiveIntensity = 0.6 + excite * 0.5
  })
  const y = TABLE_TOP_Y + 0.23

  return (
    <group position={[0, y, 0]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.06, 12, 48, Math.PI * 1.5]} />
        <meshStandardMaterial
          ref={matRef}
          color="#ffd84d"
          emissive="#7a5a00"
          emissiveIntensity={0.6}
          roughness={0.4}
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0.02, 0]} pointerEvents="none">
        <div className="dir3d">{direction === 1 ? '↻ CW' : '↺ CCW'}</div>
      </Html>
    </group>
  )
}
