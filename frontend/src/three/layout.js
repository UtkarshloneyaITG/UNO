/**
 * Shared 3D layout constants and seat geometry.
 *
 * The table lies in the XZ plane (Y up). The local player always sits at the
 * "front" of the table (nearest the default camera, +Z), and opponents are
 * distributed around the remaining arc — walking clockwise from the player,
 * matching the original 2D seating logic.
 */
export const TABLE_RADIUS = 6
export const TABLE_TOP_Y = 0.42
export const SEAT_RADIUS = 7.4 // distance of seats from table centre

// Distinct, well-separated hues so no two players share a colour (max 7 seats).
export const PLAYER_HUES = [0, 210, 120, 45, 280, 28, 170, 320, 95, 250]

/** Stable, unique hue for a player by their index in the room's player list. */
export function playerHue(index) {
  const n = PLAYER_HUES.length
  return PLAYER_HUES[(((index % n) + n) % n)]
}

/**
 * Returns world positions/angles for opponents seated around the table.
 *
 * @param {number} count number of opponents
 * @returns {{x:number, z:number, angle:number}[]}
 *   angle is the heading (radians) from table centre toward the seat.
 */
export function opponentSeats(count) {
  if (count <= 0) return []
  // The player sits at angle = +90° (i.e. +Z, toward camera). Opponents fill
  // the arc from one side, across the far edge, to the other side — never the
  // player's own seat. Spread them across ~280° centred on the far side (-Z).
  const seats = []
  const spreadDeg = count === 1 ? 0 : Math.min(260, 50 * count)
  const startDeg = -90 - spreadDeg / 2 // far side is -90° in this convention
  const stepDeg = count > 1 ? spreadDeg / (count - 1) : 0

  for (let i = 0; i < count; i++) {
    const deg = startDeg + i * stepDeg
    const rad = (deg * Math.PI) / 180
    seats.push({
      x: Math.cos(rad) * SEAT_RADIUS,
      z: Math.sin(rad) * SEAT_RADIUS,
      angle: rad,
    })
  }
  return seats
}

/**
 * World anchor for a player's seat — where cards fly to/from and where
 * seat-targeted effects (skip stamp, UNO shout, penalty label) appear.
 * The local player sits at the front (+Z); opponents around the rim.
 */
export function seatAnchor(pid, players, myId) {
  if (!pid || pid === myId) {
    return {
      pos: [0, TABLE_TOP_Y + 1.0, 6.0],
      rot: [-0.46, 0, 0],
      isMe: true,
    }
  }
  const opps = orderedOpponents(players, myId)
  const seats = opponentSeats(opps.length)
  const idx = opps.findIndex((p) => p.id === pid)
  const seat = idx >= 0 ? seats[idx] : null
  if (seat) {
    return {
      pos: [seat.x * 0.66, TABLE_TOP_Y + 1.1, seat.z * 0.66],
      rot: [-0.3, Math.atan2(-seat.x, -seat.z), 0],
      isMe: false,
    }
  }
  return { pos: [0, TABLE_TOP_Y + 1.0, 0], rot: [-Math.PI / 2 + 0.62, 0, 0], isMe: false }
}

/**
 * Order opponents clockwise starting from the player's left neighbour,
 * identical to the original 2D board's `orderedOpponents` walk.
 */
export function orderedOpponents(players, playerId) {
  const myIndex = players.findIndex((p) => p.id === playerId)
  const n = players.length
  const out = []
  if (myIndex !== -1) {
    for (let step = 1; step < n; step++) out.push(players[(myIndex + step) % n])
  } else {
    players.forEach((p) => {
      if (p.id !== playerId) out.push(p)
    })
  }
  return out
}
