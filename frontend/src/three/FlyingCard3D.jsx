/**
 * FlyingCard3D — animates a card from a start transform to the table.
 *
 * Two modes:
 *  • Direct (draws): a quick arc from the deck to the player.
 *  • Reveal (plays): the card first lifts up toward the viewer and grows, holds
 *    briefly so you can clearly see which card was played, then settles onto the
 *    discard pile. Pass `via` / `viaRot` to enable the reveal.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Card3D from './Card3D'

const DIRECT_DUR = 0.55
const REVEAL_DUR = 1.15
const ARC_HEIGHT = 1.7
const REVEAL_SCALE = 1.5
const BASE_SCALE = 1.08

const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function FlyingCard3D({
  card,
  faceDown = false,
  from,
  to,
  fromRot = [0, 0, 0],
  toRot = [-Math.PI / 2, 0, 0],
  via = null,
  viaRot = [-0.22, 0, 0],
  delay = 0,
  onDone,
}) {
  const ref = useRef()
  const t = useRef(0)
  const wait = useRef(delay)
  const done = useRef(false)
  const DUR = via ? REVEAL_DUR : DIRECT_DUR

  useFrame((_, dt) => {
    if (!ref.current || done.current) return
    if (wait.current > 0) {
      wait.current -= dt
      return
    }
    t.current = Math.min(1, t.current + dt / DUR)
    const tt = t.current

    let pos, rot, scale
    if (via) {
      // up → hold → down
      if (tt < 0.38) {
        const e = ease(tt / 0.38)
        pos = lerp3(from, via, e)
        rot = lerp3(fromRot, viaRot, e)
        scale = lerp(BASE_SCALE, REVEAL_SCALE, e)
      } else if (tt < 0.58) {
        pos = via
        rot = viaRot
        scale = REVEAL_SCALE
      } else {
        const e = ease((tt - 0.58) / 0.42)
        pos = lerp3(via, to, e)
        rot = lerp3(viaRot, toRot, e)
        scale = lerp(REVEAL_SCALE, BASE_SCALE, e)
      }
    } else {
      const e = ease(tt)
      pos = lerp3(from, to, e)
      pos[1] += Math.sin(Math.PI * tt) * ARC_HEIGHT
      rot = lerp3(fromRot, toRot, e)
      scale = BASE_SCALE
    }

    ref.current.position.set(pos[0], pos[1], pos[2])
    ref.current.rotation.set(rot[0], rot[1], rot[2])
    ref.current.scale.setScalar(scale)

    if (tt >= 1) {
      done.current = true
      onDone?.()
    }
  })

  return (
    <group ref={ref} position={from} rotation={fromRot} scale={BASE_SCALE}>
      <Card3D card={card} faceDown={faceDown} liftOnHover={false} />
    </group>
  )
}
