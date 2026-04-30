import type { SessionIngredientRead } from '../../types/ingredient'
import IngredientRow from './IngredientRow'
import AISuggestionRow from './AISuggestionRow'
import { AI_SUGGESTIONS } from '../../mocks/ingredientSession'

interface IngredientListProps {
  ingredients: SessionIngredientRead[]
  onClearAll: () => void
  onAddSuggestion: (name: string) => void
  onFindRecipes: () => void
  onSaveList: () => void
}

export default function IngredientList({
  ingredients,
  onClearAll,
  onAddSuggestion,
  onFindRecipes,
  onSaveList,
}: IngredientListProps) {
  const visible = ingredients.filter(i => !i.is_deleted)

  return (
    <section
      className="flex flex-col min-h-0"
      style={{ padding: '36px 40px', background: 'var(--paper-2)' }}
    >
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
        <button onClick={onSaveList}   className="p2p-btn p2p-btn-ghost">Save list</button>
        <button onClick={onFindRecipes} className="p2p-btn p2p-btn-primary" style={{ padding: '14px 26px' }}>
          Find recipes →
        </button>
      </div>
    </section>
  )
}
