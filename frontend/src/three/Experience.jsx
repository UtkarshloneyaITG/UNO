/**
 * Experience — the persistent 3D world.
 *
 * A single <Canvas> hosts the room, round table, lighting and orbit camera.
 * Depending on game status it shows the 3D lobby or the 3D play table.
 * Screen-space HUD/modals are layered on top in App.jsx (standard for a
 * 3D game — the WebGL world is fully 3D and orbit-controllable).
 */
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useGameStore } from '../store/gameStore'
import Room3D from './Room3D'
import Table3D from './Table3D'
import Lobby3D from './Lobby3D'
import GameScene3D from './GameScene3D'
import LookControls from './LookControls'

function World() {
  const status = useGameStore((s) => s.gameState?.status)
  const inGame = status === 'playing' || status === 'finished'

  return (
    <>
      <Room3D />
      <Table3D />

      <Suspense fallback={null}>{inGame ? <GameScene3D /> : <Lobby3D />}</Suspense>

      {/* Fixed seat; drag to look around (up/down/left/right) — no orbit/zoom */}
      <LookControls position={[0, 4.6, 10]} lookAt={[0, 1.1, 1]} />

      {/* Cinematic post: light bloom on emissive glows + a soft vignette */}
      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.65} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.3} darkness={0.8} />
      </EffectComposer>
    </>
  )
}

export default function Experience() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 4.6, 10], fov: 46 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#06060a']} />
      <fog attach="fog" args={['#06060a', 18, 34]} />
      <World />
    </Canvas>
  )
}
