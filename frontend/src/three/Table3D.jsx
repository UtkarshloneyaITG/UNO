/**
 * Table3D — the round casino felt table plus the surrounding dark room.
 * Purely decorative; no interaction.
 */
import { TABLE_RADIUS, TABLE_TOP_Y } from './layout'

export default function Table3D() {
  return (
    <group>
      {/* Wooden rim */}
      <mesh position={[0, TABLE_TOP_Y - 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TABLE_RADIUS + 0.55, TABLE_RADIUS + 0.7, 0.5, 80]} />
        <meshStandardMaterial color="#3a2417" roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Felt top */}
      <mesh position={[0, TABLE_TOP_Y, 0]} receiveShadow>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.42, 80]} />
        <meshStandardMaterial color="#0f5d3a" roughness={0.95} metalness={0} />
      </mesh>

      {/* Felt centre highlight ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP_Y + 0.212, 0]}>
        <ringGeometry args={[TABLE_RADIUS - 1.4, TABLE_RADIUS - 1.25, 80]} />
        <meshBasicMaterial color="#1c8a59" transparent opacity={0.5} />
      </mesh>

      {/* Table pedestal */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[1.2, 2.2, 0.9, 32]} />
        <meshStandardMaterial color="#241712" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}
