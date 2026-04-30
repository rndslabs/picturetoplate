import type { IngredientSource } from '../../types/ingredient'

const tones: Record<IngredientSource, { bg: string; color: string; border?: string }> = {
  photo:  { bg: 'var(--sage-soft)',    color: 'var(--sage-deep)' },
  voice:  { bg: 'var(--apricot-soft)', color: 'var(--apricot-deep)' },
  text:   { bg: 'var(--cream)',        color: 'var(--ink-2)' },
  pantry: { bg: 'transparent',         color: 'var(--ink-3)', border: '1px dashed var(--hairline)' },
}

export default function SourceBadge({ source }: { source: IngredientSource }) {
  const { bg, color, border } = tones[source]
  return (
    <span
      className="font-mono text-center uppercase tracking-[0.04em]"
      style={{
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 6,
        background: bg,
        color,
        border,
      }}
    >
      {source}
    </span>
  )
}
