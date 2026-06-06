/**
 * Card3D — a single physical UNO card with genuinely rounded corners.
 *
 * Geometry is a rounded-rectangle extrusion (white edge wall) with two rounded
 * face planes: the front shows the card art (+Z), the back shows the UNO back
 * (-Z). Orientation (face up / down, tilt) is controlled by the parent <group>.
 *
 * Props:
 *   card        card object, or null for a pure back (draw pile / hidden hand)
 *   faceDown    force the back texture on the front face
 *   playable    glowing outline + lift to signal a legal play
 *   dimmed      slightly darken non-playable cards
 *   onClick     pointer click handler (raycast)
 *   ...group props (position/rotation/scale) are spread onto the wrapper group
 */
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD_T, getCardFaceTexture, getCardBackTexture } from './cardTextures'
import { getCardGeometries } from './cardGeometry'

const EDGE_COLOR = '#f4f4f4'
const FACE_OFFSET = CARD_T / 2 + 0.0012

export default function Card3D({
  card = null,
  faceDown = false,
  playable = false,
  dimmed = false,
  onClick,
  liftOnHover = true,
  renderOrder = 0,
  ...groupProps
}) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)

  const { front, back, body } = getCardGeometries()
  const backTex = getCardBackTexture()
  const faceTex = useMemo(
    () => (card && !faceDown ? getCardFaceTexture(card) : backTex),
    [card, faceDown, backTex],
  )

  const { edgeMat, frontMat, backMat } = useMemo(() => {
    return {
      // Playable cards glow only on the BORDER (the rim) — the face is never
      // tinted; the glow comes from the edge material + the Outlines below.
      edgeMat: new THREE.MeshLambertMaterial({
        color: playable ? '#fff0b0' : EDGE_COLOR,
        emissive: playable ? '#ffd24a' : '#000000',
        emissiveIntensity: playable ? 1.1 : 0,
      }),
      frontMat: new THREE.MeshLambertMaterial({ map: faceTex }),
      backMat: new THREE.MeshLambertMaterial({ map: backTex }),
    }
  }, [faceTex, backTex, playable])

  const baseY = groupProps.position ? groupProps.position[1] : 0

  useFrame(() => {
    if (!groupRef.current || !liftOnHover) return
    const target = hovered && (playable || onClick) ? baseY + 0.22 : baseY
    groupRef.current.position.y += (target - groupRef.current.position.y) * 0.25
  })

  const interactive = !!onClick

  return (
    <group ref={groupRef} {...groupProps}>
      {/* Rounded white body / edge — also the raycast target */}
      <mesh
        geometry={body}
        material={edgeMat}
        renderOrder={renderOrder}
        onClick={
          interactive
            ? (e) => {
                e.stopPropagation()
                onClick(e)
              }
            : undefined
        }
        onPointerOver={
          interactive
            ? (e) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
              }
            : undefined
        }
        onPointerOut={
          interactive
            ? () => {
                setHovered(false)
                document.body.style.cursor = 'auto'
              }
            : undefined
        }
      >
      </mesh>

      {/* Glowing border frame behind playable cards (border glow, not a face
          tint) — a bright inner frame + a softer outer halo. */}
      {playable && (
        <>
          <mesh geometry={front} position={[0, 0, -FACE_OFFSET - 0.012]} scale={1.12}>
            <meshBasicMaterial
              color={hovered ? '#fff7c8' : '#ffd24a'}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>
          <mesh geometry={front} position={[0, 0, -FACE_OFFSET - 0.02]} scale={1.26}>
            <meshBasicMaterial color="#ffcf3a" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* Front face art */}
      <mesh geometry={front} material={frontMat} position={[0, 0, FACE_OFFSET]} renderOrder={renderOrder} />

      {/* Back face (flipped to face -Z) */}
      <mesh
        geometry={back}
        material={backMat}
        rotation={[0, Math.PI, 0]}
        position={[0, 0, -FACE_OFFSET]}
        renderOrder={renderOrder}
      />

      {/* Dim veil over non-playable cards */}
      {dimmed && (
        <mesh geometry={front} position={[0, 0, FACE_OFFSET + 0.001]}>
          <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
