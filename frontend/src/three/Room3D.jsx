/**
 * Room3D — the atmosphere around the table: a dark lounge with a hanging
 * pendant lamp over the felt, layered cinematic lighting (warm key from the
 * lamp + cool fill + coloured rim accents), wall sconces, floating dust, a
 * soft volumetric light cone, and grounded contact shadows.
 *
 * This replaces the old "just a spotlight" setup. All lights live here.
 */
import { Sparkles, ContactShadows } from '@react-three/drei'
import { TABLE_TOP_Y } from './layout'

const LAMP_Y = 7.2

export default function Room3D() {
  return (
    <group>
      {/* ── Lighting rig (brighter atmosphere, soft lamp) ─────────── */}
      <ambientLight intensity={0.7} color="#d4dcff" />
      <hemisphereLight args={['#bcc8ff', '#1c1410', 0.75]} />

      {/* The pendant bulb as an omnidirectional light source — emits in all
          directions with soft inverse-square falloff (no sharp cone/pool). */}
      <pointLight
        position={[0, LAMP_Y, 0]}
        intensity={260}
        distance={34}
        decay={2}
        color="#ffe9d0"
      />

      {/* Cool front fill so faces/cards read clearly */}
      <pointLight position={[0, 5, 11]} intensity={24} distance={28} decay={1.6} color="#bcd2ff" />

      {/* ── Pendant lamp ─────────────────────────────────────────── */}
      <group>
        {/* Ceiling mount */}
        <mesh position={[0, 10.95, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 20]} />
          <meshStandardMaterial color="#15151a" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* Cord */}
        <mesh position={[0, (10.9 + LAMP_Y + 0.9) / 2, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 10.9 - (LAMP_Y + 0.9), 8]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* Brass shade */}
        <mesh position={[0, LAMP_Y + 0.45, 0]}>
          <coneGeometry args={[1.75, 1.25, 44, 1, true]} />
          <meshStandardMaterial color="#9c7a3c" metalness={0.9} roughness={0.32} side={2} />
        </mesh>
        {/* Soft inner lining (warm-white, very transparent) */}
        <mesh position={[0, LAMP_Y + 0.45, 0]}>
          <coneGeometry args={[1.66, 1.18, 44, 1, true]} />
          <meshBasicMaterial color="#ffeede" side={1} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        {/* Glowing mouth at the shade opening (warm-white, transparent) */}
        <mesh position={[0, LAMP_Y - 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.62, 44]} />
          <meshBasicMaterial color="#fff1df" side={2} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        {/* Bulb */}
        <mesh position={[0, LAMP_Y + 0.02, 0]}>
          <sphereGeometry args={[0.32, 20, 20]} />
          <meshStandardMaterial color="#fffaf0" emissive="#ffe6c2" emissiveIntensity={2.6} />
        </mesh>
        {/* Soft spherical halos — the glow radiates outward in all directions */}
        <mesh position={[0, LAMP_Y, 0]}>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshBasicMaterial color="#fff3e2" transparent opacity={0.12} depthWrite={false} />
        </mesh>
        <mesh position={[0, LAMP_Y, 0]}>
          <sphereGeometry args={[1.8, 20, 20]} />
          <meshBasicMaterial color="#ffeedd" transparent opacity={0.05} depthWrite={false} />
        </mesh>
      </group>

      {/* ── Room shell ───────────────────────────────────────────── */}
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <circleGeometry args={[30, 48]} />
        <meshStandardMaterial color="#0b0c12" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Glowing ground ring echoing the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <ringGeometry args={[8.2, 9.2, 80]} />
        <meshBasicMaterial color="#22386a" transparent opacity={0.35} />
      </mesh>
      {/* Surrounding wall */}
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[24, 24, 22, 64, 1, true]} />
        <meshStandardMaterial color="#0a0a11" roughness={1} metalness={0} side={1} />
      </mesh>

      {/* Wall sconces for depth (emissive only — bloom makes them glow) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 14, 3.6, -12]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color="#ffcaa0" emissive="#ff9a4d" emissiveIntensity={2.4} />
        </mesh>
      ))}

      {/* ── Atmosphere ───────────────────────────────────────────── */}
      <Sparkles
        count={28}
        scale={[18, 8, 18]}
        position={[0, 4.5, 0]}
        size={2}
        speed={0.2}
        opacity={0.45}
        color="#ffe6b0"
      />

      {/* Static soft contact shadow (rendered once — no per-frame cost) */}
      <ContactShadows
        frames={1}
        position={[0, -0.39, 0]}
        scale={30}
        far={6}
        blur={2.6}
        opacity={0.45}
        resolution={512}
        color="#000000"
      />
    </group>
  )
}
