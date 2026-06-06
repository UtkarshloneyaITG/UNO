/**
 * Procedural UNO card textures.
 *
 * Card faces and the shared card back are drawn onto an offscreen 2D canvas
 * and wrapped in a THREE.CanvasTexture. No image assets are required.
 *
 * Textures are cached by a stable key so the 108-card deck only ever
 * produces a handful of unique GPU textures (one per distinct face + 1 back).
 */
import * as THREE from 'three'

export const CARD_W = 1
export const CARD_H = 1.5
export const CARD_T = 0.035 // thickness

const TEX_W = 320
const TEX_H = 480

const COLOR_HEX = {
  red: '#d9352c',
  green: '#2bb24c',
  blue: '#2d7fd4',
  yellow: '#e8b417',
  wild: '#1a1a1a',
}

// Four quadrant colours used on wild cards
const WILD_QUADS = ['#d9352c', '#e8b417', '#2bb24c', '#2d7fd4']

const SYMBOLS = {
  skip: '⊘',        // ⊘
  reverse: '↺',     // ↺
  draw_two: '+2',
  wild: '',              // drawn as quadrants
  wild_draw_four: '+4',
}

const _cache = new Map()

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  return c
}

function finishTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function symbolFor(card) {
  if (card.card_type === 'number') return String(card.number)
  return SYMBOLS[card.card_type] ?? '?'
}

/** Stable cache key for a card's face. */
function faceKey(card) {
  if (card.card_type === 'number') return `num-${card.color}-${card.number}`
  return `${card.card_type}-${card.color}`
}

function drawCornerSymbol(ctx, text, x, y, rotate) {
  ctx.save()
  ctx.translate(x, y)
  if (rotate) ctx.rotate(Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

/** Returns a cached CanvasTexture for the given card's face. */
export function getCardFaceTexture(card) {
  const key = faceKey(card)
  if (_cache.has(key)) return _cache.get(key)

  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')
  const isWild = card.card_type === 'wild' || card.card_type === 'wild_draw_four'
  const base = COLOR_HEX[card.color] || COLOR_HEX.wild

  // Card body
  ctx.fillStyle = isWild ? '#161616' : base
  roundRect(ctx, 6, 6, TEX_W - 12, TEX_H - 12, 36)
  ctx.fill()

  // White inner border
  ctx.lineWidth = 14
  ctx.strokeStyle = '#ffffff'
  roundRect(ctx, 20, 20, TEX_W - 40, TEX_H - 40, 28)
  ctx.stroke()

  // Central white oval (tilted)
  ctx.save()
  ctx.translate(TEX_W / 2, TEX_H / 2)
  ctx.rotate(-Math.PI / 4)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(0, 0, TEX_W * 0.34, TEX_H * 0.30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (isWild) {
    // Four colour quadrants inside the oval
    ctx.save()
    ctx.translate(TEX_W / 2, TEX_H / 2)
    const r = TEX_W * 0.24
    const quads = [
      [-Math.PI / 2, 0],
      [0, Math.PI / 2],
      [Math.PI / 2, Math.PI],
      [Math.PI, Math.PI * 1.5],
    ]
    quads.forEach(([a0, a1], i) => {
      ctx.fillStyle = WILD_QUADS[i]
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, a0, a1)
      ctx.closePath()
      ctx.fill()
    })
    ctx.restore()

    // "+4" overlay text for wild draw four
    if (card.card_type === 'wild_draw_four') {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 8
      ctx.font = 'bold 120px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeText('+4', TEX_W / 2, TEX_H / 2)
      ctx.fillText('+4', TEX_W / 2, TEX_H / 2)
    }
    drawCornerSymbol(ctx, card.card_type === 'wild_draw_four' ? '+4' : '✦', 64, 70, false)
    drawCornerSymbol(ctx, card.card_type === 'wild_draw_four' ? '+4' : '✦', TEX_W - 64, TEX_H - 70, true)
  } else {
    // Central symbol in the card's colour
    const sym = symbolFor(card)
    ctx.fillStyle = base
    ctx.font = `bold ${sym.length > 1 ? 150 : 200}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sym, TEX_W / 2, TEX_H / 2 + 6)

    // Corner symbols
    drawCornerSymbol(ctx, sym, 60, 74, false)
    drawCornerSymbol(ctx, sym, TEX_W - 60, TEX_H - 74, true)
  }

  const tex = finishTexture(canvas)
  _cache.set(key, tex)
  return tex
}

let _backTex = null
/** Returns the shared card-back texture. */
export function getCardBackTexture() {
  if (_backTex) return _backTex
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#15151b'
  roundRect(ctx, 6, 6, TEX_W - 12, TEX_H - 12, 36)
  ctx.fill()

  ctx.lineWidth = 14
  ctx.strokeStyle = '#ffffff'
  roundRect(ctx, 20, 20, TEX_W - 40, TEX_H - 40, 28)
  ctx.stroke()

  // Red tilted ellipse
  ctx.save()
  ctx.translate(TEX_W / 2, TEX_H / 2)
  ctx.rotate(-Math.PI / 5)
  ctx.fillStyle = '#d9352c'
  ctx.beginPath()
  ctx.ellipse(0, 0, TEX_W * 0.40, TEX_H * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // UNO wordmark
  ctx.fillStyle = '#f5d020'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 7
  ctx.font = 'bold 92px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(TEX_W / 2, TEX_H / 2)
  ctx.rotate(-Math.PI / 12)
  ctx.strokeText('UNO', 0, 0)
  ctx.fillText('UNO', 0, 0)
  ctx.restore()

  _backTex = finishTexture(canvas)
  return _backTex
}

export const ACTIVE_COLOR_HEX = {
  red: '#e74c3c',
  green: '#2ecc71',
  blue: '#3498db',
  yellow: '#f1c40f',
  wild: '#9b59b6',
}
