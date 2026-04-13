/**
 * WildColorPicker — modal overlay that appears when the player
 * plays a Wild or Wild Draw Four card. They must choose a colour.
 */

import React from 'react'
import { useGameStore } from '../store/gameStore'

const COLORS = [
  { key: 'red',    label: 'Red',    emoji: '🔴' },
  { key: 'green',  label: 'Green',  emoji: '🟢' },
  { key: 'blue',   label: 'Blue',   emoji: '🔵' },
  { key: 'yellow', label: 'Yellow', emoji: '🟡' },
]

export default function WildColorPicker() {
  const { chooseColor, cancelColorPicker } = useGameStore()

  return (
    <div className="modal-overlay" onClick={cancelColorPicker}>
      <div className="color-picker" onClick={(e) => e.stopPropagation()}>
        <h2 className="color-picker-title">Choose a Colour</h2>
        <div className="color-picker-grid">
          {COLORS.map(({ key, label, emoji }) => (
            <button
              key={key}
              className={`color-btn color-btn--${key}`}
              onClick={() => chooseColor(key)}
            >
              <span className="color-emoji">{emoji}</span>
              <span className="color-label">{label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost" onClick={cancelColorPicker}>
          Cancel
        </button>
      </div>
    </div>
  )
}
