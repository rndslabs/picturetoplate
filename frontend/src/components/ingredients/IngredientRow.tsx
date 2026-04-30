import type { SessionIngredientRead } from '../../types/ingredient'
import SourceBadge from './SourceBadge'
import ConfidenceTooltip from './ConfidenceTooltip'

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12">
      <path
        d="M2 6.5L4.8 9 10 3"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatQuantity(ing: SessionIngredientRead): string {
  const { amount, unit } = ing.quantity
  if (unit === 'pantry') return '—'
  return `${amount} ${unit}`
}

export default function IngredientRow({ ing }: { ing: SessionIngredientRead }) {
  const score = ing.confidence_score
  const confDisplay = score === null ? '—' : `${Math.round(score * 100)}%`
  const confColor =
    score === null      ? 'var(--ink-3)'      :
    score >= 0.85       ? 'var(--sage-deep)'  :
                          'var(--apricot-deep)'

  return (
    <div
      className="bg-paper rounded-[14px] mb-[6px] border border-hairline-2 items-center"
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 80px 1fr auto auto',
        gap: 14,
        padding: '14px',
      }}
    >
      {/* Confirmed check */}
      <span
        className="inline-flex items-center justify-center rounded-full bg-ink text-paper"
        style={{ width: 18, height: 18 }}
      >
        <CheckIcon />
      </span>

      {/* Source badge */}
      <SourceBadge source={ing.source} />

      {/* Ingredient name */}
      <span
        className="font-serif"
        style={{ fontSize: 17, fontVariationSettings: '"SOFT" 100' }}
      >
        {ing.name}
      </span>

      {/* Quantity */}
      <span className="font-mono text-ink-2" style={{ fontSize: 12 }}>
        {formatQuantity(ing)}
      </span>

      {/* Confidence score — wrapped in tooltip */}
      <ConfidenceTooltip score={score}>
        <span
          className="font-mono uppercase tracking-[0.05em] text-right cursor-default"
          style={{ fontSize: 10, minWidth: 40, color: confColor }}
        >
          {confDisplay}
        </span>
      </ConfidenceTooltip>
    </div>
  )
}
