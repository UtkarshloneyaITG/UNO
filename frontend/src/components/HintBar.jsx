/**
 * HintBar — contextual guidance strip above the player hand.
 * Tells the player exactly what they can / should do right now.
 */
import { useGameStore } from '../store/gameStore'

export default function HintBar() {
  const { gameState, playerId } = useGameStore()

  if (!gameState || gameState.status !== 'playing') return null

  const isMyTurn      = gameState.current_player_id === playerId
  const currentPlayer = gameState.players?.find(p => p.id === gameState.current_player_id)
  const name          = currentPlayer?.name ?? '...'

  let icon = ''
  let text = ''
  let type = 'idle'

  if (isMyTurn) {
    if (gameState.draw_stack > 0) {
      const n = gameState.draw_stack
      if (gameState.challenge_available) {
        icon = '⚡'
        text = `Wild Draw 4! Draw ${n} cards from the deck — or Challenge if you suspect a bluff.`
        type = 'challenge'
      } else {
        icon = '⚠'
        text = `Penalty! You must draw ${n} card${n > 1 ? 's' : ''} from the deck (no stacking).`
        type = 'warning'
      }
    } else if (gameState.drawn_card_id) {
      icon = '↩'
      text = 'You drew a card — play it if it matches, or press Pass Turn to end your turn.'
      type = 'action'
    } else if (gameState.challenge_available) {
      icon = '⚡'
      text = 'Suspect a bluff? Challenge the Wild Draw 4 before drawing your penalty cards!'
      type = 'challenge'
    } else {
      icon = '✦'
      text = 'Your turn — play a card matching the color or symbol, or click the deck to draw.'
      type = 'action'
    }
  } else {
    icon = '⏳'
    text = `${name}'s turn — waiting for them to play…`
    type = 'idle'
  }

  return (
    <div className={`hint-bar hint-bar--${type}`} role="status" aria-live="polite">
      <span className="hint-icon">{icon}</span>
      <span className="hint-text">{text}</span>
    </div>
  )
}
