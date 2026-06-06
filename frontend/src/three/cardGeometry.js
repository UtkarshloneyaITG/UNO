/**
 * Rounded-rectangle card geometry, built once and shared by every card.
 *
 * A plain BoxGeometry gives square corners; instead we use:
 *   - front / back ShapeGeometry planes (rounded rect, UVs remapped to 0..1
 *     so the card-face textures map correctly)
 *   - an ExtrudeGeometry "body" that supplies the rounded silhouette + the
 *     white rounded edge wall
 *
 * The back plane's U is mirrored so the UNO wordmark reads correctly when the
 * plane is flipped to face -Z.
 */
import * as THREE from 'three'
import { CARD_W, CARD_H, CARD_T } from './cardTextures'

const RADIUS = 0.14
const SEG = 10

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function remapUV(geo) {
  geo.computeBoundingBox()
  const { min, max } = geo.boundingBox
  const w = max.x - min.x
  const h = max.y - min.y
  const uv = geo.attributes.uv
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - min.x) / w, (pos.getY(i) - min.y) / h)
  }
  uv.needsUpdate = true
}

let _cache = null
export function getCardGeometries() {
  if (_cache) return _cache

  const shape = roundedRectShape(CARD_W, CARD_H, RADIUS)

  const front = new THREE.ShapeGeometry(shape, SEG)
  remapUV(front)

  const back = front.clone()
  const uv = back.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)) // mirror U
  uv.needsUpdate = true

  const body = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_T,
    bevelEnabled: false,
    curveSegments: SEG,
  })
  body.translate(0, 0, -CARD_T / 2) // centre the thickness

  _cache = { front, back, body }
  return _cache
}
