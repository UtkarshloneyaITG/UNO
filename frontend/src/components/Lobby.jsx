/**
 * Lobby — pre-game screen.
 *
 * Shows:
 *  • Create room form
 *  • Join room form (with room code)
 *  • Open rooms list (fetched from REST endpoint)
 *  • Waiting room (once inside a room)
 */

import React, { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export default function Lobby() {
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

  const [tab, setTab] = useState('create')          // 'create' | 'join'
  const [name, setName] = useState(playerName || '')
  const [joinCode, setJoinCode] = useState('')
  const [openRooms, setOpenRooms] = useState([])

  // Fetch open rooms every 4 seconds when on the join tab
  useEffect(() => {
    if (tab !== 'join') return
    const fetchRooms = async () => {
      try {
        const res = await fetch('https://uno-nq5x.onrender.com/rooms')
        const data = await res.json()
        setOpenRooms(data.rooms || [])
      } catch {}
    }
    fetchRooms()
    const id = setInterval(fetchRooms, 4000)
    return () => clearInterval(id)
  }, [tab])

  // ── Waiting room (after joining) ──────────────────────────────────────
  if (roomState || roomId) {
    const rs = roomState || {}
    const players = rs.players || []
    const isHost = rs.host_player_id === playerId
    const canStart = rs.can_start && isHost

    return (
      <div className="lobby">
        <div className="lobby-card waiting-room">
          <h1 className="logo">UNO</h1>

          <div className="room-code-display">
            Room Code
            <span className="room-code">{rs.room_id || roomId}</span>
          </div>
          <p className="room-hint">Share this code with friends to join!</p>

          <div className="lobby-divider">✦</div>

          <div className="player-list">
            <div className="player-list-label">Players ({players.length}/6)</div>
            {players.map((p) => (
              <div key={p.id} className="player-row">
                <span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span>
                <span className="player-name">{p.name}</span>
                {p.id === rs.host_player_id && (
                  <span className="badge badge--host">Host</span>
                )}
                {!p.is_connected && (
                  <span className="badge badge--offline">Offline</span>
                )}
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
      </div>
    )
  }

  // ── Initial join / create UI ──────────────────────────────────────────
  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1 className="logo">UNO</h1>
        <p className="logo-sub">Royal Chamber</p>

        {/* Suit decorations */}
        <div className="lobby-suits" aria-hidden="true">
          <span className="lobby-suit">♥</span>
          <span className="lobby-suit">♠</span>
          <span className="lobby-suit">♦</span>
          <span className="lobby-suit">♣</span>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'create' ? 'tab--active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
          <button
            className={`tab ${tab === 'join' ? 'tab--active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
        </div>

        {/* Name input (shared) */}
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

            {/* Open rooms list */}
            {openRooms.length > 0 && (
              <div className="open-rooms">
                <h4>Open Rooms</h4>
                {openRooms.map((r) => (
                  <div
                    key={r.room_id}
                    className="open-room-row"
                    onClick={() => {
                      setJoinCode(r.room_id)
                    }}
                  >
                    <span className="open-room-id">{r.room_id}</span>
                    <span className="open-room-players">
                      {r.player_count}/4 players
                    </span>
                    <span className="open-room-names">
                      {r.players.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
