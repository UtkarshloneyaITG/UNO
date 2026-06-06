/**
 * Chair3D — a simple wooden chair drawn from boxes, with a cushion tinted
 * in the player's colour. Local +Z faces the table centre (same as the
 * seated character), so the backrest sits behind the player.
 */
const WOOD = '#3a2417'
const FLOOR_Y = -0.4
const SEAT_Y = 0.28

export default function Chair3D({ hue = 200, offline = false }) {
  const cushion = offline ? '#4a4a52' : `hsl(${hue}, 50%, 42%)`
  const legH = SEAT_Y - FLOOR_Y
  const legY = (SEAT_Y + FLOOR_Y) / 2
  const lx = 0.4
  const fz = 0.42 // front legs (toward centre)
  const bz = -0.42 // back legs

  return (
    <group>
      {/* Seat slab */}
      <mesh position={[0, SEAT_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.12, 0.95]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Cushion */}
      <mesh position={[0, SEAT_Y + 0.09, 0]} castShadow>
        <boxGeometry args={[0.82, 0.08, 0.82]} />
        <meshStandardMaterial color={cushion} roughness={0.85} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, SEAT_Y + 0.7, bz]} castShadow>
        <boxGeometry args={[0.95, 1.1, 0.12]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[0, SEAT_Y + 0.78, bz + 0.06]} castShadow>
        <boxGeometry args={[0.78, 0.5, 0.06]} />
        <meshStandardMaterial color={cushion} roughness={0.85} />
      </mesh>

      {/* Four legs */}
      {[
        [lx, fz],
        [-lx, fz],
        [lx, bz],
        [-lx, bz],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, legY, z]} castShadow>
          <boxGeometry args={[0.12, legH, 0.12]} />
          <meshStandardMaterial color={WOOD} roughness={0.65} />
        </mesh>
      ))}
    </group>
  )
}
