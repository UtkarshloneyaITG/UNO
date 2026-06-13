/**
 * ColorAccentLight — a point light over the discard pile whose colour
 * smoothly follows the active UNO colour, so the felt picks up a red/
 * green/blue/yellow tint after every colour change.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ACTIVE_COLOR_HEX } from '../cardTextures'

const FALLBACK = '#ffd84d'
const target = new THREE.Color()

export default function ColorAccentLight({ currentColor }) {
  const ref = useRef()

  useFrame((_, dt) => {
    if (!ref.current) return
    target.set(ACTIVE_COLOR_HEX[currentColor] || FALLBACK)
    ref.current.color.lerp(target, Math.min(1, dt * 3))
  })

  return (
    <pointLight
      ref={ref}
      position={[2.4, 3.5, 0]}
      intensity={16}
      distance={10}
      color={FALLBACK}
    />
  )
}
