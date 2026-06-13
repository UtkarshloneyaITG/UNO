/**
 * WinConfetti3D — one THREE.Points burst of falling confetti above the
 * table when the game ends. All positions/velocities live in pre-allocated
 * Float32Arrays mutated in useFrame — no per-frame allocation.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 250
const DUR = 4
const PALETTE = ['#f0d060', '#f04468', '#5294ff', '#20ee86', '#f5b820', '#b060ff', '#ff8040']

export default function WinConfetti3D({ origin = [0, 8, 0], onDone }) {
  const points = useRef()
  const elapsed = useRef(0)
  const done = useRef(false)

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const velocities = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const color = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      // Deterministic pseudo-random spread (index-hashed) — no Math.random
      // needed for a one-shot burst, and it keeps renders stable.
      const a = (i * 2.399963) % (Math.PI * 2) // golden-angle spiral
      const r = 0.2 + ((i * 37) % 100) / 55
      positions[i * 3] = origin[0] + Math.cos(a) * r * 0.4
      positions[i * 3 + 1] = origin[1] + ((i * 13) % 100) / 80
      positions[i * 3 + 2] = origin[2] + Math.sin(a) * r * 0.4
      velocities[i * 3] = Math.cos(a) * (0.8 + ((i * 7) % 50) / 40)
      velocities[i * 3 + 1] = 0.6 + ((i * 11) % 60) / 50
      velocities[i * 3 + 2] = Math.sin(a) * (0.8 + ((i * 17) % 50) / 40)
      color.set(PALETTE[i % PALETTE.length])
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return { positions, velocities, colors }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, dt) => {
    if (done.current || !points.current) return
    elapsed.current += dt
    const pos = points.current.geometry.attributes.position
    const arr = pos.array
    for (let i = 0; i < COUNT; i++) {
      velocities[i * 3 + 1] -= 3.2 * dt // gravity
      arr[i * 3] += velocities[i * 3] * dt
      arr[i * 3 + 1] += velocities[i * 3 + 1] * dt
      arr[i * 3 + 2] += velocities[i * 3 + 2] * dt
      // slight horizontal damping for a flutter feel
      velocities[i * 3] *= 1 - 0.4 * dt
      velocities[i * 3 + 2] *= 1 - 0.4 * dt
    }
    pos.needsUpdate = true
    const mat = points.current.material
    mat.opacity = Math.max(0, 1 - Math.max(0, elapsed.current - DUR * 0.6) / (DUR * 0.4))
    if (elapsed.current >= DUR) {
      done.current = true
      onDone?.()
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.16} vertexColors transparent opacity={1} depthWrite={false} />
    </points>
  )
}
