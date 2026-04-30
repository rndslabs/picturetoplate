interface AISuggestionRowProps {
  suggestions: readonly string[]
  onAdd: (name: string) => void
}

export default function AISuggestionRow({ suggestions, onAdd }: AISuggestionRowProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] p-[14px]"
      style={{ marginTop: 14, border: '1px dashed var(--sage)' }}
    >
      {/* AI avatar */}
      <span
        className="inline-flex items-center justify-center flex-shrink-0 rounded-full bg-sage-soft text-sage-deep font-serif italic"
        style={{ width: 28, height: 28, fontSize: 16 }}
      >
        p
      </span>

      <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-serif italic text-ink-2">Often paired with these:</span>
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onAdd(s)}
            className="inline-flex items-center gap-1 bg-paper border border-hairline-2 rounded-full text-[13px] hover:bg-sage-soft transition-colors"
            style={{ padding: '4px 10px' }}
          >
            <span className="text-sage-deep font-mono text-[11px]">+</span>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
