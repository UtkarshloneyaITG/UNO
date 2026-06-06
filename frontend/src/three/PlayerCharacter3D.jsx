/**
 * PlayerCharacter3D — an opponent seated on a chair, holding a fan of cards.
 *
 * The figure is posed procedurally (hips on the seat, thighs forward, shins
 * down, arms raised holding a card fan) so it genuinely *sits* and *holds
 * cards* — something the downloaded standing/walking rigged GLB can't do
 * without skeletal re-posing. The CesiumMan.glb is still bundled; to use it
 * instead, swap the <Body/> group for a <CharacterModel/> (see git history).
 *
 * Shirt/pants/cushion are tinted from the player's name hue; the figure lights
 * up on its turn and greys out when offline.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Card3D from './Card3D'
import Chair3D from './Chair3D'
import { TABLE_TOP_Y } from './layout'

const FLOOR_Y = -0.4
const HIP_Y = 0.42

function HeldCards({ count, y }) {
  const shown = Math.min(3, Math.max(0, count))
  if (shown === 0) return null
  const mid = (shown - 1) / 2
  return (
    // Held out in front of the hands (z pushed forward) so the cards never
    // clip through the fingers.
    <group position={[0, y, 0.78]} rotation={[-0.22, 0, 0]}>
      {Array.from({ length: shown }).map((_, i) => {
        const off = i - mid
        const a = off * 0.17
        return (
          <Card3D
            key={i}
            faceDown
            liftOnHover={false}
            scale={0.5}
            renderOrder={i}
            position={[off * 0.11, Math.cos(a) * 0.12 - 0.12, i * 0.012]}
            rotation={[-0.4, 0, -a]}
          />
        )
      })}
    </group>
  )
}

/* Floating cone that points down at whoever's turn it is */
function TurnCone({ hue }) {
  const ref = useRef()
  const color = `hsl(${hue}, 75%, 55%)`
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = HIP_Y + 1.95 + Math.sin(t * 3) * 0.08
    ref.current.rotation.y += 0.03
  })
  return (
    <group ref={ref} position={[0, HIP_Y + 1.95, 0]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.24, 0.5, 5]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.35}
        />
      </mesh>
    </group>
  )
}

function Body({ hue, active, offline, count }) {
  const ref = useRef()
  const phase = useMemo(() => ((hue % 100) / 100) * Math.PI * 2, [hue])

  const shirt = offline ? '#4a4a52' : `hsl(${hue}, 55%, 46%)`
  const pants = offline ? '#36363c' : `hsl(${hue}, 30%, 28%)`
  const skin = offline ? '#8d8d92' : '#e8b58a'
  const hair = offline ? '#2c2c30' : `hsl(${hue}, 35%, 20%)`
  const emissive = active ? `hsl(${hue}, 70%, 26%)` : '#000000'

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.sin(t * 1.3 + phase) * 0.018
    ref.current.rotation.z = Math.sin(t * 0.7 + phase) * 0.012
  })

  const mat = (color, emis = false) => (
    <meshLambertMaterial
      color={color}
      emissive={emis ? emissive : '#000000'}
      emissiveIntensity={emis && active ? 0.5 : 0}
    />
  )

  return (
    <group ref={ref}>
      {/* Pelvis */}
      <mesh position={[0, HIP_Y, 0.02]} castShadow>
        <boxGeometry args={[0.5, 0.26, 0.36]} />
        {mat(pants)}
      </mesh>

      {/* Thighs (forward) */}
      <mesh position={[0.16, HIP_Y, 0.27]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 6, 12]} />
        {mat(pants)}
      </mesh>
      <mesh position={[-0.16, HIP_Y, 0.27]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 6, 12]} />
        {mat(pants)}
      </mesh>

      {/* Shins (down) */}
      <mesh position={[0.16, 0.05, 0.5]} rotation={[0.12, 0, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.46, 6, 12]} />
        {mat(pants)}
      </mesh>
      <mesh position={[-0.16, 0.05, 0.5]} rotation={[0.12, 0, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.46, 6, 12]} />
        {mat(pants)}
      </mesh>

      {/* Feet */}
      <mesh position={[0.16, FLOOR_Y + 0.07, 0.64]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.34]} />
        {mat('#241a14')}
      </mesh>
      <mesh position={[-0.16, FLOOR_Y + 0.07, 0.64]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.34]} />
        {mat('#241a14')}
      </mesh>

      {/* Torso */}
      <mesh position={[0, HIP_Y + 0.52, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.5, 8, 16]} />
        {mat(shirt, true)}
      </mesh>

      {/* Neck + head */}
      <mesh position={[0, HIP_Y + 0.9, -0.05]}>
        <cylinderGeometry args={[0.11, 0.13, 0.16, 12]} />
        {mat(skin)}
      </mesh>
      <mesh position={[0, HIP_Y + 1.14, -0.06]} castShadow>
        <sphereGeometry args={[0.29, 24, 24]} />
        {mat(skin)}
      </mesh>
      <mesh position={[0, HIP_Y + 1.22, -0.08]}>
        <sphereGeometry args={[0.305, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        {mat(hair)}
      </mesh>

      {/* Upper arms */}
      <mesh position={[0.36, HIP_Y + 0.62, 0.04]} rotation={[0.7, 0, -0.12]} castShadow>
        <capsuleGeometry args={[0.12, 0.34, 6, 12]} />
        {mat(shirt)}
      </mesh>
      <mesh position={[-0.36, HIP_Y + 0.62, 0.04]} rotation={[0.7, 0, 0.12]} castShadow>
        <capsuleGeometry args={[0.12, 0.34, 6, 12]} />
        {mat(shirt)}
      </mesh>

      {/* Forearms (raised toward the held cards) */}
      <mesh position={[0.26, HIP_Y + 0.66, 0.34]} rotation={[1.15, 0, -0.32]} castShadow>
        <capsuleGeometry args={[0.11, 0.36, 6, 12]} />
        {mat(skin)}
      </mesh>
      <mesh position={[-0.26, HIP_Y + 0.66, 0.34]} rotation={[1.15, 0, 0.32]} castShadow>
        <capsuleGeometry args={[0.11, 0.36, 6, 12]} />
        {mat(skin)}
      </mesh>

      {/* Hands */}
      <mesh position={[0.17, HIP_Y + 0.64, 0.5]}>
        <sphereGeometry args={[0.12, 14, 14]} />
        {mat(skin)}
      </mesh>
      <mesh position={[-0.17, HIP_Y + 0.64, 0.5]}>
        <sphereGeometry args={[0.12, 14, 14]} />
        {mat(skin)}
      </mesh>

      {/* The fan of cards being held, out in front of the hands */}
      <HeldCards count={count} y={HIP_Y + 0.74} />
    </group>
  )
}

export default function PlayerCharacter3D({
  seat,
  hue = 200,
  active = false,
  offline = false,
  count = 0,
}) {
  const yaw = Math.atan2(-seat.x, -seat.z) // face the table centre

  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, yaw, 0]}>
      <Chair3D hue={hue} offline={offline} />
      <Body hue={hue} active={active} offline={offline} count={count} />

      {active && <TurnCone hue={hue} />}
    </group>
  )
}
