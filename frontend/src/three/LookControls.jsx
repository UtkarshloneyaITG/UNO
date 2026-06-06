/**
 * LookControls — the camera stays pinned at the player's seat; dragging
 * only swings the view direction (look up / down / left / right), like
 * turning your head. No orbiting around the table, no zoom.
 *
 * A plain click (no drag) still passes through to the cards' raycaster,
 * so card play / draw remain clickable.
 */
import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SENS = 0.0026          // radians per pixel dragged
const YAW_LIMIT = 0.62       // ~35° left/right
const PITCH_UP = 0.26        // how far you can tilt up
const PITCH_DOWN = 0.42      // how far you can tilt down

export default function LookControls({
  position = [0, 4.6, 10],
  lookAt = [0, 1, 1],
}) {
  const { camera, gl } = useThree()

  const eye = useRef(new THREE.Vector3(...position))
  const baseDir = useRef(new THREE.Vector3())

  // current + target look offsets (yaw around Y, pitch around X)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)

  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  // Pin the camera and capture its base forward direction once.
  useEffect(() => {
    eye.current.set(...position)
    camera.position.copy(eye.current)
    baseDir.current
      .set(lookAt[0], lookAt[1], lookAt[2])
      .sub(eye.current)
      .normalize()
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drag-to-look listeners on the canvas element.
  useEffect(() => {
    const el = gl.domElement

    const onDown = (e) => {
      dragging.current = true
      last.current = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e) => {
      if (!dragging.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      targetYaw.current = THREE.MathUtils.clamp(
        targetYaw.current - dx * SENS,
        -YAW_LIMIT,
        YAW_LIMIT,
      )
      targetPitch.current = THREE.MathUtils.clamp(
        targetPitch.current - dy * SENS,
        -PITCH_DOWN,
        PITCH_UP,
      )
    }
    const onUp = () => {
      dragging.current = false
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl])

  const tmp = useRef(new THREE.Vector3()).current
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ')).current

  useFrame(() => {
    // ease toward target angles
    yaw.current += (targetYaw.current - yaw.current) * 0.12
    pitch.current += (targetPitch.current - pitch.current) * 0.12

    euler.set(pitch.current, yaw.current, 0, 'YXZ')
    tmp.copy(baseDir.current).applyEuler(euler)

    camera.position.copy(eye.current) // stay fixed
    camera.lookAt(
      eye.current.x + tmp.x,
      eye.current.y + tmp.y,
      eye.current.z + tmp.z,
    )
  })

  return null
}
