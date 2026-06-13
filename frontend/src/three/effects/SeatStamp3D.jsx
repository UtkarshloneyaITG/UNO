/**
 * SeatStamp3D — a one-shot floating text stamp over a player's seat with a
 * ground pulse beneath it. Covers the skip slash ("⊘ SKIPPED"), the UNO
 * shout ("UNO!") and penalty labels ("+4") — same mechanics, different
 * styling class. Uses drei <Html> + CSS (the repo is asset-free; no troika
 * font fetches).
 */
import { useEffect } from 'react'
import { Html } from '@react-three/drei'
import RadialPulse3D from './RadialPulse3D'

export default function SeatStamp3D({
  position = [0, 0, 0],
  text = '',
  variant = 'skip', // 'skip' | 'uno' | 'penalty'
  dur = 1.3,
  pulseColor = '#ff5050',
  onDone,
}) {
  useEffect(() => {
    const id = setTimeout(() => onDone?.(), dur * 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group>
      <Html
        position={[position[0], position[1] + 1.1, position[2]]}
        center
        distanceFactor={9}
        pointerEvents="none"
      >
        <div className={`fx-stamp fx-stamp--${variant}`} style={{ '--fx-dur': `${dur}s` }}>
          {text}
        </div>
      </Html>
      <RadialPulse3D
        position={[position[0], position[1] - 0.7, position[2]]}
        color={pulseColor}
        dur={Math.min(0.9, dur)}
        endScale={2.6}
      />
    </group>
  )
}
