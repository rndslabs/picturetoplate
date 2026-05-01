import { useState } from 'react'
import Header from '../components/layout/Header'
import Stepper from '../components/layout/Stepper'
import TriInputZone from '../components/ingredients/TriInputZone'
import IngredientList from '../components/ingredients/IngredientList'
import type { SessionIngredientRead } from '../types/ingredient'
import { detectIngredients } from '../api/detectIngredients'

const HELPER_CHIPS = [
  { label: 'Pantry staples on', dot: 'var(--sage)' },
  { label: 'Family of 4',       dot: 'var(--apricot)' },
  { label: '~30 min',           dot: 'var(--ink-3)' },
  { label: 'No nuts',           dot: 'var(--ink-3)' },
] as const

export default function IngredientInput() {
  const [sessionId]    = useState(() => crypto.randomUUID())
  const [ingredients, setIngredients] = useState<SessionIngredientRead[]>([])
  const [isRecording,  setIsRecording]  = useState(false)
  const [isDetecting,  setIsDetecting]  = useState(false)
  const [photoError,   setPhotoError]   = useState<string | null>(null)

  function addIngredient(ing: SessionIngredientRead) {
    setIngredients(prev => [...prev, ing])
  }

  function addSuggestion(name: string) {
    addIngredient({
      session_ingredient_id: `sugg-${Date.now()}`,
      session_id:            sessionId,
      catalog_ref:           null,
      name,
      quantity:              { amount: 1, unit: 'ea' },
      confidence_score:      null,
      source:                'text',
      is_confirmed:          false,
      is_deleted:            false,
      added_at:              new Date().toISOString(),
    })
  }

  function clearAll() {
    setIngredients(prev => prev.map(i => ({ ...i, is_deleted: true })))
  }

  async function handleFileSelected(file: File) {
    setPhotoError(null)
    setIsDetecting(true)
    try {
      const names = await detectIngredients(file)
      const now = new Date().toISOString()
      const detected: SessionIngredientRead[] = names.map((name, idx) => ({
        session_ingredient_id: `photo-${Date.now()}-${idx}`,
        session_id:            sessionId,
        catalog_ref:           null,
        name:                  name.charAt(0).toUpperCase() + name.slice(1),
        quantity:              { amount: 1, unit: 'ea' },
        confidence_score:      null,
        source:                'photo',
        is_confirmed:          false,
        is_deleted:            false,
        added_at:              now,
      }))
      setIngredients(prev => [...prev, ...detected])
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo detection failed.')
    } finally {
      setIsDetecting(false)
    }
  }

  const detectedCount = ingredients.filter(i => i.source === 'photo' && !i.is_deleted).length

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ width: '100%', height: '100vh', background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <Header />
      <Stepper current={1} />

      {/* Two-column body: left capture, right live list */}
      <div
        className="flex-1 min-h-0"
        style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}
      >
        {/* LEFT — Capture column */}
        <section
          className="overflow-auto flex flex-col gap-[22px] border-r border-hairline-2"
          style={{ padding: '36px 40px' }}
        >
          <div>
            <div className="p2p-mono" style={{ marginBottom: 10 }}>
              <span className="p2p-dot" style={{ marginRight: 8 }} />
              capture
            </div>
            <h1
              className="font-serif font-normal m-0"
              style={{
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: '-0.025em',
                fontVariationSettings: '"SOFT" 100',
              }}
            >
              What's in the<br />fridge tonight?
            </h1>
            <p
              className="font-serif italic text-ink-2 font-light m-0"
              style={{ fontSize: 18, maxWidth: 460, marginTop: 14, lineHeight: 1.45 }}
            >
              Drop a photo, talk it through, or type it out. Mix and match — I'll keep one tidy list.
            </p>
          </div>

          <TriInputZone
            sessionId={sessionId}
            detectedCount={detectedCount}
            isDetecting={isDetecting}
            isRecording={isRecording}
            onToggleRecording={() => setIsRecording(r => !r)}
            onAddIngredient={addIngredient}
            onFileSelected={handleFileSelected}
          />

          {/* Photo error */}
          {photoError && (
            <p className="p2p-mono" style={{ color: 'var(--tomato)', margin: 0 }}>
              {photoError}
            </p>
          )}

          {/* Context chips */}
          <div className="flex gap-[10px] flex-wrap text-ink-2">
            {HELPER_CHIPS.map(chip => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full bg-paper-2 border border-hairline-2 text-[13px]"
                style={{ padding: '8px 12px' }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, background: chip.dot }}
                />
                {chip.label}
              </span>
            ))}
          </div>
        </section>

        {/* RIGHT — Live ingredient list */}
        <IngredientList
          ingredients={ingredients}
          onClearAll={clearAll}
          onAddSuggestion={addSuggestion}
          onFindRecipes={() => alert('Navigate to Preferences →')}
        />
      </div>
    </div>
  )
}
