/**
 * GameLog — scrolling list of recent game events.
 * Automatically scrolls to the latest message.
 */

import React, { useEffect, useRef } from 'react'

export default function GameLog({ log = [] }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  if (!log.length) return null

  return (
    <div className="game-log">
      <div className="game-log-title">Game Log</div>
      <div className="game-log-entries">
        {log.map((entry, i) => (
          <div
            key={i}
            className={`log-entry ${i === log.length - 1 ? 'log-entry--latest' : ''}`}
          >
            {entry}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
