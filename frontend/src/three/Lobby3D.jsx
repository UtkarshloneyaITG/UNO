/**
 * Lobby3D — the pre-game lobby presented inside the 3D world.
 *
 * A floating 3D "UNO" wordmark hovers over the table while the create/join
 * forms (and the waiting room) live in an in-scene HTML panel. All store
 * actions are unchanged from the original 2D Lobby.
 */
import { Suspense, useState, useEffect } from 'react'
import { Float, Text, Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import { TABLE_TOP_Y } from './layout'

const WS_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL
    : 'wss://uno-nq5x.onrender.com/ws'
const ROOMS_BASE = WS_URL.replace(/^ws/, 'http').replace(/\/ws$/, '')

function LobbyPanel() {
  const {
    isConnected,
    playerId,
    playerName,
    roomId,
    roomState,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
  } = useGameStore()

  const [tab, setTab] = useState('create')
  const [name, setName] = useState(playerName || '')
  const [joinCode, setJoinCode] = useState('')
  const [openRooms, setOpenRooms] = useState([])

  useEffect(() => {
    if (tab !== 'join') return
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${ROOMS_BASE}/rooms`)
        const data = await res.json()
        setOpenRooms(data.rooms || [])
      } catch {}
    }
    fetchRooms()
    const id = setInterval(fetchRooms, 4000)
    return () => clearInterval(id)
  }, [tab])

  // ── Waiting room ──────────────────────────────────────────────
  if (roomState || roomId) {
    const rs = roomState || {}
    const players = rs.players || []
    const isHost = rs.host_player_id === playerId
    const canStart = rs.can_start && isHost

    return (
      <div className="lobby3d-card waiting-room">
        <h1 className="logo">UNO</h1>
        <div className="room-code-display">
          Room Code
          <span className="room-code">{rs.room_id || roomId}</span>
        </div>
        <p className="room-hint">Share this code with friends to join!</p>
        <div className="lobby-divider">✦</div>
        <div className="player-list">
          <div className="player-list-label">Players ({players.length}/7)</div>
          {players.map((p) => (
            <div key={p.id} className="player-row">
              <span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span>
              <span className="player-name">{p.name}</span>
              {p.id === rs.host_player_id && <span className="badge badge--host">Host</span>}
              {!p.is_connected && <span className="badge badge--offline">Offline</span>}
            </div>
          ))}
        </div>
        {isHost ? (
          <div className="waiting-actions">
            {canStart ? (
              <button className="btn btn--primary btn--large" onClick={startGame}>
                Start Game
              </button>
            ) : (
              <p className="waiting-hint">Waiting for at least 2 players…</p>
            )}
          </div>
        ) : (
          <p className="waiting-hint">Waiting for the host to start the game…</p>
        )}
        <button className="btn btn--ghost" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>
    )
  }

  // ── Create / Join ─────────────────────────────────────────────
  return (
    <div className="lobby3d-card">
      <h1 className="logo">UNO</h1>
      <p className="logo-sub">Royal Chamber · 3D</p>

      <div className="tabs">
        <button className={`tab ${tab === 'create' ? 'tab--active' : ''}`} onClick={() => setTab('create')}>
          Create Room
        </button>
        <button className={`tab ${tab === 'join' ? 'tab--active' : ''}`} onClick={() => setTab('join')}>
          Join Room
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Your Name</label>
        <input
          className="form-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (tab === 'create') createRoom(name)
              else if (joinCode) joinRoom(joinCode, name)
            }
          }}
        />
      </div>

      {tab === 'create' ? (
        <button
          className="btn btn--primary btn--large"
          disabled={!name.trim() || !isConnected}
          onClick={() => createRoom(name)}
        >
          {isConnected ? 'Create Room' : 'Connecting…'}
        </button>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Room Code</label>
            <input
              className="form-input form-input--code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDEF"
              maxLength={6}
            />
          </div>
          <button
            className="btn btn--primary btn--large"
            disabled={!name.trim() || !joinCode.trim() || !isConnected}
            onClick={() => joinRoom(joinCode, name)}
          >
            Join Room
          </button>
          {openRooms.length > 0 && (
            <div className="open-rooms">
              <h4>Open Rooms</h4>
              {openRooms.map((r) => (
                <div key={r.room_id} className="open-room-row" onClick={() => setJoinCode(r.room_id)}>
                  <span className="open-room-id">{r.room_id}</span>
                  <span className="open-room-players">{r.player_count} players</span>
                  <span className="open-room-names">{r.players.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Lobby3D() {
  return (
    <group>
      {/* Floating 3D wordmark above the table (isolated so a slow font
          load can never hide the form panel below) */}
      <Suspense fallback={null}>
        <Float speed={2} rotationIntensity={0.25} floatIntensity={0.6}>
          <Text
            position={[0, TABLE_TOP_Y + 3.4, 0]}
            fontSize={1.7}
            letterSpacing={0.04}
            outlineWidth={0.04}
            outlineColor="#000000"
            anchorX="center"
            anchorY="middle"
          >
            UNO
            <meshStandardMaterial color="#f5d020" emissive="#7a5a00" emissiveIntensity={0.5} />
          </Text>
        </Float>
      </Suspense>

      {/* In-scene form panel, billboarded over the table */}
      <Html position={[0, TABLE_TOP_Y + 1.4, 1.5]} center distanceFactor={7}>
        <LobbyPanel />
      </Html>
    </group>
  )
}
