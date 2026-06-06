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
      {/* ── Lighting rig (dim, moody, kept minimal for performance) ── */}
      <ambientLight intensity={0.3} color="#cdd6ff" />
      <hemisphereLight args={['#aeb8ff', '#140d08', 0.32]} />

      {/* Warm key light from the pendant lamp (no realtime shadows) */}
      <spotLight
        position={[0, LAMP_Y, 0]}
        target-position={[0, TABLE_TOP_Y, 0]}
        angle={0.7}
        penumbra={0.8}
        intensity={150}
        distance={26}
        decay={1.5}
        color="#ffdfae"
      />

      {/* Subtle cool front fill so faces/cards aren't fully black */}
      <pointLight position={[0, 5, 11]} intensity={16} distance={26} decay={1.7} color="#bcd2ff" />

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
        {/* Warm inner lining (glows from inside) */}
        <mesh position={[0, LAMP_Y + 0.45, 0]}>
          <coneGeometry args={[1.66, 1.18, 44, 1, true]} />
          <meshBasicMaterial color="#ffdca0" side={1} />
        </mesh>
        {/* Glowing mouth at the shade opening */}
        <mesh position={[0, LAMP_Y - 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.62, 44]} />
          <meshBasicMaterial color="#ffcf86" side={2} />
        </mesh>
        {/* Bulb */}
        <mesh position={[0, LAMP_Y + 0.02, 0]}>
          <sphereGeometry args={[0.32, 20, 20]} />
          <meshStandardMaterial color="#fff6e0" emissive="#ffd28a" emissiveIntensity={4.5} />
        </mesh>
        {/* Soft glow halo around the bulb */}
        <mesh position={[0, LAMP_Y - 0.12, 0]}>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshBasicMaterial color="#ffd9a0" transparent opacity={0.14} depthWrite={false} />
        </mesh>
        {/* Layered volumetric light cones down to the table */}
        <mesh position={[0, (LAMP_Y + TABLE_TOP_Y) / 2, 0]}>
          <coneGeometry args={[3.7, LAMP_Y - TABLE_TOP_Y, 44, 1, true]} />
          <meshBasicMaterial color="#ffdca0" transparent opacity={0.06} depthWrite={false} side={2} />
        </mesh>
        <mesh position={[0, (LAMP_Y + TABLE_TOP_Y) / 2, 0]}>
          <coneGeometry args={[2.2, LAMP_Y - TABLE_TOP_Y, 36, 1, true]} />
          <meshBasicMaterial color="#ffe8c0" transparent opacity={0.06} depthWrite={false} side={2} />
        </mesh>
      </group>

      {/* Warm pool of light cast on the felt under the lamp */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP_Y + 0.215, 0]}>
        <circleGeometry args={[3.4, 48]} />
        <meshBasicMaterial color="#ffce86" transparent opacity={0.08} depthWrite={false} />
      </mesh>

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
