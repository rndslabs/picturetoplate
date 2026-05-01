import { useState } from 'react'
import type { SessionIngredientRead } from '../../types/ingredient'
import IngredientRow from './IngredientRow'
import AISuggestionRow from './AISuggestionRow'
import { AI_SUGGESTIONS } from '../../mocks/ingredientSession'

interface IngredientListProps {
  ingredients: SessionIngredientRead[]
  onClearAll: () => void
  onAddSuggestion: (name: string) => void
  onFindRecipes: () => void
}

export default function IngredientList({
  ingredients,
  onClearAll,
  onAddSuggestion,
  onFindRecipes,
}: IngredientListProps) {
  const [showJson, setShowJson] = useState(false)
  const visible = ingredients.filter(i => !i.is_deleted)

  return (
    <section
      className="flex flex-col min-h-0 relative"
      style={{ padding: '36px 40px', background: 'var(--paper-2)' }}
    >
      {/* JSONB overlay */}
      {showJson && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{ background: 'var(--ink)', zIndex: 10, padding: '28px 32px' }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span className="p2p-mono" style={{ color: 'rgba(241,236,224,0.5)' }}>ingredient list · jsonb</span>
            <button
              onClick={() => setShowJson(false)}
              className="p2p-mono cursor-pointer border-none bg-transparent"
              style={{ color: 'rgba(241,236,224,0.5)', padding: '4px 8px' }}
            >
              ✕ close
            </button>
          </div>
          <pre
            className="flex-1 overflow-auto"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              lineHeight: 1.65,
              color: 'var(--paper)',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(visible, null, 2)}
          </pre>
        </div>
      )}

      {/* List header */}
      <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="p2p-mono">tonight's list</div>
          <h2
            className="font-serif font-normal tracking-[-0.02em]"
            style={{ fontSize: 32, margin: '4px 0 0' }}
          >
            {visible.length} ingredients
          </h2>
        </div>
        <button
          onClick={onClearAll}
          className="border border-hairline bg-paper rounded-full font-mono uppercase tracking-[0.05em] text-ink-2 cursor-pointer"
          style={{ padding: '8px 12px', fontSize: 11 }}
        >
          clear all
        </button>
      </div>

      {/* Scrollable ingredient rows */}
      <div className="flex-1 overflow-auto" style={{ paddingRight: 4 }}>
        {visible.length === 0 && (
          <p
            className="font-serif italic"
            style={{ color: 'var(--ink-3)', fontSize: 15, marginTop: 8 }}
          >
            No ingredients yet — upload a photo, speak, or type.
          </p>
        )}
        {visible.map(ing => (
          <IngredientRow key={ing.session_ingredient_id} ing={ing} />
        ))}
        <AISuggestionRow suggestions={AI_SUGGESTIONS} onAdd={onAddSuggestion} />
      </div>

      {/* Footer CTA */}
      <div
        className="flex gap-[14px] items-center border-t border-hairline"
        style={{ marginTop: 20, paddingTop: 18 }}
      >
        <div className="flex-1">
          <div className="p2p-mono">est. matches</div>
          <div
            className="font-serif tracking-[-0.02em]"
            style={{ fontSize: 30, lineHeight: 1.05, marginTop: 2 }}
          >
            42 recipes{' '}
            <span style={{ color: 'var(--sage)', fontStyle: 'italic' }}>ready</span>
          </div>
        </div>
        <button
          onClick={() => setShowJson(true)}
          disabled={visible.length === 0}
          className="p2p-btn p2p-btn-ghost"
          style={{ opacity: visible.length === 0 ? 0.4 : 1 }}
        >
          Save list
        </button>
        <button onClick={onFindRecipes} className="p2p-btn p2p-btn-primary" style={{ padding: '14px 26px' }}>
          Find recipes →
        </button>
      </div>
    </section>
  )
}
