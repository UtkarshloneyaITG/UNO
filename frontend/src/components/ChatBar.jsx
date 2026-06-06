/**
 * ChatBar — screen-space chat + quick-emoji bar (bottom-right). Messages are
 * broadcast via the store and appear as bubbles above each player's head;
 * your own message echoes here as confirmation.
 */
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

const EMOJIS = ['👍', '😂', '😮', '😡', '🎉', '❤️', '🤔', '😎', '🔥', '👋', '😭', '🤝']

export default function ChatBar() {
  const { gameState, playerId, sendChat, bubbles } = useGameStore()
  const [text, setText] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)

  if (!gameState || gameState.status !== 'playing') return null

  const myBubble = bubbles?.[playerId]

  const submit = (e) => {
    e?.preventDefault()
    if (text.trim()) {
      sendChat(text)
      setText('')
    }
  }

  return (
    <div className="chatbar">
      {myBubble && <div className="chatbar-echo">{myBubble.text}</div>}

      {showEmojis && (
        <div className="chatbar-emojis">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="chatbar-emoji"
              onClick={() => sendChat(e)}
              type="button"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form className="chatbar-form" onSubmit={submit}>
        <button
          type="button"
          className="chatbar-toggle"
          onClick={() => setShowEmojis((v) => !v)}
          title="Quick emoji"
        >
          😊
        </button>
        <input
          className="chatbar-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          maxLength={120}
        />
        <button className="chatbar-send" type="submit">
          Send
        </button>
      </form>
    </div>
  )
}
