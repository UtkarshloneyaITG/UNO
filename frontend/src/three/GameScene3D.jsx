/**
 * GameScene3D — the full in-play 3D table: piles, direction ring,
 * opponents around the rim, and the local player's hand.
 *
 * Also drives the "card played" fly animation: whenever the discard top
 * changes, a card arcs from whoever just played (their seat, or your hand)
 * into the discard pile. The discard's real top card is suppressed until the
 * flight lands, so the card appears to travel onto the pile.
 */
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import DrawPile3D from './DrawPile3D'
import DiscardPile3D from './DiscardPile3D'
import DirectionIndicator3D from './DirectionIndicator3D'
import TableClock3D from './TableClock3D'
import Opponent3D from './Opponent3D'
import PlayerHand3D from './PlayerHand3D'
import FlyingCard3D from './FlyingCard3D'
import { opponentSeats, orderedOpponents, playerHue, TABLE_TOP_Y } from './layout'

// The discard's top card is propped up toward the viewer (see DiscardPile3D)
// so it's clearly readable on the table; played cards land into that pose.
const DISCARD_POS = [2.4, TABLE_TOP_Y + 0.6, -0.25]
const DISCARD_ROT = [-Math.PI / 2 + 0.62, 0, 0]
const DRAW_POS = [-2.4, TABLE_TOP_Y + 0.5, 0]
const DRAW_ROT = [Math.PI / 2, 0, 0] // face-down (back up)

// Whether a card is legally playable right now (mirrors the backend rule).
function canPlay(c, gs) {
  const top = gs.discard_top
  if (!top || gs.draw_stack > 0) return false
  if (c.card_type === 'wild' || c.card_type === 'wild_draw_four') return true
  if (c.color === gs.current_color) return true
  if (c.card_type === top.card_type) {
    return c.card_type === 'number' ? c.number === top.number : true
  }
  return false
}

// Where a played card flies *from*, given who played it.
function fromTransform(pid, players, myId) {
  if (!pid || pid === myId) {
    return { pos: [0, TABLE_TOP_Y + 1.0, 6.0], rot: [-0.46, 0, 0] }
  }
  const opps = orderedOpponents(players, myId)
  const seats = opponentSeats(opps.length)
  const idx = opps.findIndex((p) => p.id === pid)
  const seat = idx >= 0 ? seats[idx] : null
  if (seat) {
    return {
      pos: [seat.x * 0.66, TABLE_TOP_Y + 1.1, seat.z * 0.66],
      rot: [-0.3, Math.atan2(-seat.x, -seat.z), 0],
    }
  }
  return { pos: [0, TABLE_TOP_Y + 1.0, 0], rot: DISCARD_ROT }
}

export default function GameScene3D() {
  const { gameState, playerId } = useGameStore()
  const [flying, setFlying] = useState([])
  const [suppressId, setSuppressId] = useState(null)
  const [underCard, setUnderCard] = useState(null)
  const prev = useRef(null)
  const drawSeq = useRef(0)

  const handTotal = (gameState?.players || []).reduce((s, p) => s + (p.card_count || 0), 0)

  // Detect plays (discard top changed) and draws (a hand grew) and launch the
  // matching flying cards. We depend on current_player_id and handTotal too, so
  // `prev` always reflects the immediately-previous state.
  useEffect(() => {
    if (!gameState) return
    const players = gameState.players || []
    const did = gameState.discard_top?.id
    const p = prev.current
    const spawns = []

    if (p && p.status === 'playing') {
      // ── Play: discard top changed ──
      if (did && did !== p.discardId) {
        const from = fromTransform(p.currentPlayerId, players, playerId)
        spawns.push({
          key: did,
          card: gameState.discard_top,
          faceDown: false,
          from: from.pos,
          fromRot: from.rot,
          to: DISCARD_POS,
          toRot: DISCARD_ROT,
          delay: 0,
        })
        setUnderCard(p.discardCard || null)
        setSuppressId(did)
      }

      // ── Draw: any player's card count increased ──
      players.forEach((pl) => {
        const before = p.counts?.[pl.id] ?? pl.card_count
        const delta = (pl.card_count || 0) - before
        if (delta > 0) {
          const dest = fromTransform(pl.id, players, playerId)
          const n = Math.min(delta, 6)
          for (let i = 0; i < n; i++) {
            spawns.push({
              key: `draw-${drawSeq.current++}`,
              card: null,
              faceDown: true,
              from: DRAW_POS,
              fromRot: DRAW_ROT,
              to: dest.pos,
              toRot: dest.rot,
              delay: i * 0.12,
            })
          }
        }
      })
    }

    if (spawns.length) setFlying((f) => [...f, ...spawns])

    prev.current = {
      discardId: did,
      discardCard: gameState.discard_top,
      currentPlayerId: gameState.current_player_id,
      status: gameState.status,
      counts: Object.fromEntries(players.map((pl) => [pl.id, pl.card_count || 0])),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.discard_top?.id, gameState?.current_player_id, gameState?.status, handTotal])

  if (!gameState) return null

  const {
    players = [],
    current_player_id,
    direction,
    current_color,
    discard_top,
    draw_pile_count,
    draw_stack,
  } = gameState

  const isMyTurn = current_player_id === playerId
  const opponents = orderedOpponents(players, playerId)
  const seats = opponentSeats(opponents.length)

  // Highlight the deck when it's your turn and you should/must draw.
  const myHand = gameState.my_hand || []
  const hasPlayable = myHand.some((c) => canPlay(c, gameState))
  const mustDraw =
    isMyTurn && !gameState.drawn_card_id && (draw_stack > 0 || !hasPlayable)

  const handleDone = (key) => {
    setFlying((f) => f.filter((x) => x.key !== key))
    if (key === suppressId) {
      setSuppressId(null)
      setUnderCard(null)
    }
  }

  return (
    <group>
      <DrawPile3D
        count={draw_pile_count}
        isMyTurn={isMyTurn}
        drawStack={draw_stack}
        mustDraw={mustDraw}
      />
      <DiscardPile3D
        topCard={discard_top}
        currentColor={current_color}
        suppressId={suppressId}
        underCard={underCard}
      />
      <DirectionIndicator3D direction={direction} />
      <TableClock3D />

      {opponents.map((p, i) => (
        <Opponent3D
          key={p.id}
          player={p}
          seat={seats[i]}
          hue={playerHue(players.findIndex((x) => x.id === p.id))}
          isCurrentTurn={p.id === current_player_id}
        />
      ))}

      <PlayerHand3D />

      {flying.map((f) => (
        <FlyingCard3D
          key={f.key}
          card={f.card}
          faceDown={f.faceDown}
          from={f.from}
          fromRot={f.fromRot}
          via={f.via}
          viaRot={f.viaRot}
          to={f.to}
          toRot={f.toRot}
          delay={f.delay}
          onDone={() => handleDone(f.key)}
        />
      ))}
    </group>
  )
}
