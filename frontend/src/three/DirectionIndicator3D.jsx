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
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= direction * dt * 0.4
  })
  const y = TABLE_TOP_Y + 0.23

  return (
    <group position={[0, y, 0]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.06, 12, 48, Math.PI * 1.5]} />
        <meshStandardMaterial
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
