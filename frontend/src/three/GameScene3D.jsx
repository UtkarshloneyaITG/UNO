/**
 * GameScene3D — the full in-play 3D table: piles, direction ring,
 * opponents around the rim, and the local player's hand.
 *
 * It is also the effects director. A ref snapshot of the previous game
 * state is diffed on every update; differences spawn transient animated
 * elements (flying cards, seat stamps, pulses, confetti) that remove
 * themselves via onDone:
 *   • discard top changed   → card flies from the player's seat to the pile
 *   • a hand grew           → card(s) fly from the deck (fanned out for +2/+4,
 *                             with a "+N" stamp over the victim)
 *   • status → playing      → the opening 7-card deal is animated round-robin
 *   • skipped_player_id set → "⊘ SKIPPED" stamp over the seat
 *   • direction flipped     → ring over-spin + radial pulse at table centre
 *   • UNO called            → "UNO!" shout over the caller's seat
 *   • status → finished     → confetti burst over the table
 */
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import DrawPile3D from './DrawPile3D'
import DiscardPile3D from './DiscardPile3D'
import DirectionIndicator3D from './DirectionIndicator3D'
import Opponent3D from './Opponent3D'
import PlayerHand3D from './PlayerHand3D'
import FlyingCard3D from './FlyingCard3D'
import RadialPulse3D from './effects/RadialPulse3D'
import SeatStamp3D from './effects/SeatStamp3D'
import WinConfetti3D from './effects/WinConfetti3D'
import ColorAccentLight from './effects/ColorAccentLight'
import TurnGlowRing3D from './effects/TurnGlowRing3D'
import { opponentSeats, orderedOpponents, playerHue, seatAnchor, TABLE_TOP_Y } from './layout'
import { DRAW_STAGGER, DEAL_STEP, FLY_DRAW_DUR } from './fxTiming'

// The discard's top card is propped up toward the viewer (see DiscardPile3D)
// so it's clearly readable on the table; played cards land into that pose.
const DISCARD_POS = [2.4, TABLE_TOP_Y + 0.6, -0.25]
const DISCARD_ROT = [-Math.PI / 2 + 0.62, 0, 0]
const DRAW_POS = [-2.4, TABLE_TOP_Y + 0.5, 0]
const DRAW_ROT = [Math.PI / 2, 0, 0] // face-down (back up)

// Whether a card is legally playable right now (mirrors the backend rule).
function canPlay(c, gs) {
  const top = gs.discard_top
  if (!top) return false
  if (gs.draw_stack > 0) {
    if (!gs.settings?.stack_draw_cards) return false
    if (c.card_type === 'wild_draw_four') return true
    return c.card_type === 'draw_two' && top.card_type !== 'wild_draw_four'
  }
  if (c.card_type === 'wild' || c.card_type === 'wild_draw_four') return true
  if (c.color === gs.current_color) return true
  if (c.card_type === top.card_type) {
    return c.card_type === 'number' ? c.number === top.number : true
  }
  return false
}

export default function GameScene3D() {
  const { gameState, playerId } = useGameStore()
  const [flying, setFlying] = useState([])
  const [fx, setFx] = useState([])
  const [dealing, setDealing] = useState(false)
  const [suppressId, setSuppressId] = useState(null)
  const [underCard, setUnderCard] = useState(null)
  const [recentCards, setRecentCards] = useState([])
  const prev = useRef(null)
  const drawSeq = useRef(0)
  const fxSeq = useRef(0)
  const dealTimer = useRef(null)

  const handTotal = (gameState?.players || []).reduce((s, p) => s + (p.card_count || 0), 0)
  const unoKey = (gameState?.players || [])
    .filter((p) => p.has_called_uno)
    .map((p) => p.id)
    .join('|')

  // Diff the previous state and launch every matching transient effect.
  useEffect(() => {
    if (!gameState) return
    const players = gameState.players || []
    const did = gameState.discard_top?.id
    const p = prev.current
    const spawns = []
    const fxSpawns = []
    const stamp = (props) => fxSpawns.push({ key: `fx-${fxSeq.current++}`, ...props })

    // ── Opening deal: fresh game, everyone at exactly 7 cards ──
    // (A mid-game session resume never looks like this, so reconnecting
    //  players don't get a phantom deal.)
    const allSeven = players.length > 0 && players.every((pl) => (pl.card_count || 0) === 7)
    if (gameState.status === 'playing' && p?.status !== 'playing' && allSeven) {
      const ids = players.map((pl) => pl.id)
      for (let round = 0; round < 7; round++) {
        ids.forEach((pid, s) => {
          const dest = seatAnchor(pid, players, playerId)
          spawns.push({
            key: `deal-${drawSeq.current++}`,
            card: null,
            faceDown: true,
            from: DRAW_POS,
            fromRot: DRAW_ROT,
            to: dest.pos,
            toRot: dest.rot,
            delay: (round * ids.length + s) * DEAL_STEP,
          })
        })
      }
      const total = 7 * ids.length * DEAL_STEP + FLY_DRAW_DUR
      setDealing(true)
      clearTimeout(dealTimer.current)
      dealTimer.current = setTimeout(() => setDealing(false), total * 1000)
    }

    if (p && p.status === 'playing') {
      // ── Play: discard top changed ──
      if (did && did !== p.discardId) {
        const from = seatAnchor(p.currentPlayerId, players, playerId)
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
        // Older cards stay visible lying flat beneath the propped top card.
        if (p.discardCard) {
          setRecentCards((r) => [p.discardCard, ...r.filter((c) => c.id !== p.discardCard.id)].slice(0, 2))
        }
      }

      // ── Draw: any player's card count increased ──
      players.forEach((pl) => {
        const before = p.counts?.[pl.id] ?? pl.card_count
        const delta = (pl.card_count || 0) - before
        if (delta > 0) {
          const dest = seatAnchor(pl.id, players, playerId)
          const n = Math.min(delta, 6)
          const penalty = delta >= 2
          for (let i = 0; i < n; i++) {
            // Penalty bursts fan out a little so the cards don't overlap.
            const jx = penalty ? ((i % 3) - 1) * 0.35 : 0
            const jz = penalty ? ((i % 2) - 0.5) * 0.3 : 0
            spawns.push({
              key: `draw-${drawSeq.current++}`,
              card: null,
              faceDown: true,
              from: DRAW_POS,
              fromRot: DRAW_ROT,
              to: [dest.pos[0] + jx, dest.pos[1], dest.pos[2] + jz],
              toRot: dest.rot,
              delay: i * DRAW_STAGGER,
              arc: 1.7 + (i % 3) * 0.25,
            })
          }
          if (penalty) {
            stamp({ type: 'stamp', variant: 'penalty', text: `+${delta}`, pos: dest.pos, pulseColor: '#ff5050' })
          }
        }
      })

      // ── Skip ──
      if (gameState.skipped_player_id && gameState.skipped_player_id !== p.skippedId) {
        const seat = seatAnchor(gameState.skipped_player_id, players, playerId)
        stamp({ type: 'stamp', variant: 'skip', text: '⊘ SKIPPED', pos: seat.pos, pulseColor: '#ff5050' })
      }

      // ── Reverse ──
      if (p.direction && gameState.direction !== p.direction) {
        stamp({ type: 'pulse' })
      }

      // ── UNO called ──
      players.forEach((pl) => {
        if (pl.has_called_uno && !p.unoFlags?.[pl.id]) {
          const seat = seatAnchor(pl.id, players, playerId)
          stamp({ type: 'stamp', variant: 'uno', text: 'UNO!', pos: seat.pos, pulseColor: '#ffd84d' })
        }
      })

      // ── Game over: confetti before the modal arrives ──
      if (gameState.status === 'finished') {
        stamp({ type: 'confetti' })
      }
    }

    if (spawns.length) setFlying((f) => [...f, ...spawns])
    if (fxSpawns.length) setFx((f) => [...f, ...fxSpawns])

    prev.current = {
      discardId: did,
      discardCard: gameState.discard_top,
      currentPlayerId: gameState.current_player_id,
      status: gameState.status,
      direction: gameState.direction,
      skippedId: gameState.skipped_player_id,
      counts: Object.fromEntries(players.map((pl) => [pl.id, pl.card_count || 0])),
      unoFlags: Object.fromEntries(players.map((pl) => [pl.id, !!pl.has_called_uno])),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState?.discard_top?.id,
    gameState?.current_player_id,
    gameState?.status,
    gameState?.direction,
    gameState?.skipped_player_id,
    unoKey,
    handTotal,
  ])

  useEffect(() => () => clearTimeout(dealTimer.current), [])

  if (!gameState) return null

  const {
    players = [],
    current_player_id,
    direction,
    current_color,
    discard_top,
    draw_pile_count,
    draw_stack,
    status,
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

  const handleFxDone = (key) => setFx((f) => f.filter((x) => x.key !== key))

  return (
    <group>
      <ColorAccentLight currentColor={current_color} />
      {isMyTurn && status === 'playing' && !dealing && <TurnGlowRing3D />}

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
        recentCards={recentCards}
      />
      <DirectionIndicator3D direction={direction} />

      {opponents.map((p, i) => (
        <Opponent3D
          key={p.id}
          player={p}
          seat={seats[i]}
          hue={playerHue(players.findIndex((x) => x.id === p.id))}
          isCurrentTurn={p.id === current_player_id}
          dealing={dealing}
        />
      ))}

      <PlayerHand3D hidden={dealing} />

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
          arc={f.arc}
          onDone={() => handleDone(f.key)}
        />
      ))}

      {fx.map((f) => {
        if (f.type === 'pulse') {
          return (
            <RadialPulse3D
              key={f.key}
              position={[0, TABLE_TOP_Y + 0.24, 0]}
              color="#ffd84d"
              onDone={() => handleFxDone(f.key)}
            />
          )
        }
        if (f.type === 'confetti') {
          return <WinConfetti3D key={f.key} onDone={() => handleFxDone(f.key)} />
        }
        return (
          <SeatStamp3D
            key={f.key}
            position={f.pos}
            text={f.text}
            variant={f.variant}
            pulseColor={f.pulseColor}
            dur={f.variant === 'uno' ? 1.5 : 1.3}
            onDone={() => handleFxDone(f.key)}
          />
        )
      })}
    </group>
  )
}
