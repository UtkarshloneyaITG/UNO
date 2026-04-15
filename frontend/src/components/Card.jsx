/**
 * Card — renders a single UNO card with 3D depth and gloss.
 *
 * Props:
 *   card        { id, color, card_type, number }
 *   onClick     called when the card is clicked
 *   isPlayable  highlights the card as a valid play
 *   isSelected  shows the card as currently selected
 *   isMini      smaller version used for opponent hand previews
 *   faceDown    renders the card back (draw pile, hidden hands)
 */


const SYMBOLS = {
  number:         (card) => card.number,
  skip:           '⊘',
  reverse:        '↺',
  draw_two:       '+2',
  wild:           'W',
  wild_draw_four: '+4',
}

const COLOR_CLASS = {
  red:    'card--red',
  green:  'card--green',
  blue:   'card--blue',
  yellow: 'card--yellow',
  wild:   'card--wild',
}

export default function Card({
  card,
  onClick,
  isPlayable = false,
  isSelected = false,
  isMini     = false,
  faceDown   = false,
}) {
  if (faceDown) {
    return (
      <div className={`card card--back ${isMini ? 'card--mini' : ''}`}>
        <div className="card-back-inner">
          <div className="card-back-pattern">UNO</div>
        </div>
        {/* Gloss overlay */}
        <div className="card-gloss" />
      </div>
    )
  }

  const symbol =
    typeof SYMBOLS[card.card_type] === 'function'
      ? SYMBOLS[card.card_type](card)
      : SYMBOLS[card.card_type] ?? '?'

  const colorClass = COLOR_CLASS[card.color] || 'card--wild'

  const classes = [
    'card',
    colorClass,
    isPlayable  ? 'card--playable'  : '',
    isSelected  ? 'card--selected'  : '',
    isMini      ? 'card--mini'      : '',
    onClick     ? 'card--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} onClick={onClick} title={cardTitle(card)}>
      {/* Top-left corner */}
      <span className="card-corner card-corner--tl">{symbol}</span>

      {/* Centre oval */}
      <div className="card-center">
        <div className="card-oval">
          <span className="card-symbol">{symbol}</span>
        </div>
      </div>

      {/* Bottom-right corner (rotated 180°) */}
      <span className="card-corner card-corner--br">{symbol}</span>

      {/* 3D gloss layer — sits above content */}
      <div className="card-gloss" />
    </div>
  )
}

function cardTitle(card) {
  if (card.card_type === 'number') return `${card.color} ${card.number}`
  const names = {
    skip:           'Skip',
    reverse:        'Reverse',
    draw_two:       'Draw Two',
    wild:           'Wild',
    wild_draw_four: 'Wild Draw Four',
  }
  const prefix = card.color === 'wild' ? '' : `${card.color} `
  return `${prefix}${names[card.card_type] || card.card_type}`
}
