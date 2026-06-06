/**
 * GameHud — screen-space HUD shown over the 3D table during play:
 * room code, whose-turn banner, and the Leave button. (The 3D world
 * behind it stays fully orbit-controllable; only these chips capture clicks.)
 */
import { useGameStore } from '../store/gameStore'

export default function GameHud() {
  const { gameState, playerId, leaveRoom } = useGameStore()
  if (!gameState || gameState.status !== 'playing') return null

  const { players = [], current_player_id, room_id } = gameState
  const isMyTurn = current_player_id === playerId
  const currentName = players.find((p) => p.id === current_player_id)?.name ?? ''

  return (
    <div className="hud-topleft hud-topleft--3d">
      <span className="hud-logo">UNO</span>
      <span className="hud-room">{room_id}</span>
      <span className="hud-turn">
        {isMyTurn ? <span className="hud-turn--mine">✦ Your Turn</span> : `${currentName}'s Turn`}
      </span>
      <button className="hud-leave" onClick={leaveRoom}>
        Leave
      </button>
    </div>
  )
}
