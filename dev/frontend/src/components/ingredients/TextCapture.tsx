import { useState } from 'react'
import type { SessionIngredientRead, QuantityUnit } from '../../types/ingredient'

const UNITS: QuantityUnit[] = [
  'ea', 'g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp',
  'oz', 'lb', 'bunch', 'slice', 'loaf', 'ball', 'other',
]

interface TextCaptureProps {
  sessionId: string
  onAdd: (ing: SessionIngredientRead) => void
}

export default function TextCapture({ sessionId, onAdd }: TextCaptureProps) {
  const [name, setName] = useState('')
  const [qty,  setQty]  = useState('1')
  const [unit, setUnit] = useState<QuantityUnit>('ea')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    const parsed = Number(qty)
    onAdd({
      session_ingredient_id: `text-${Date.now()}`,
      session_id:            sessionId,
      catalog_ref:           null,
      name:                  trimmed,
      quantity:              { amount: Number.isFinite(parsed) && qty !== '' ? parsed : qty, unit },
      confidence_score:      null,
      source:                'text',
      is_confirmed:          false,
      is_deleted:            false,
      added_at:              new Date().toISOString(),
    })
    setName('')
    setQty('1')
  }

  return (
    <div
      className="rounded-[18px] bg-paper border border-hairline-2 flex flex-col gap-3"
      style={{ padding: 18 }}
    >
      <div className="p2p-mono">text · type or paste</div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="e.g. half a sourdough loaf"
        className="bg-transparent outline-none font-serif text-ink"
        style={{
          border: 'none',
          borderBottom: '1px solid var(--hairline)',
          fontSize: 18,
          padding: '8px 0',
          fontFamily: 'var(--serif)',
        }}
      />

      <div className="flex gap-2">
        <input
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="border border-hairline rounded-[8px] bg-paper text-ink font-mono outline-none"
          style={{ width: 60, padding: '8px 10px', fontSize: 13 }}
        />
        <select
          value={unit}
          onChange={e => setUnit(e.target.value as QuantityUnit)}
          className="flex-1 border border-hairline rounded-[8px] bg-paper text-ink font-mono appearance-none outline-none"
          style={{ padding: '8px 10px', fontSize: 13 }}
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <button
        onClick={handleAdd}
        className="p2p-btn p2p-btn-primary"
        style={{ padding: '10px 14px', fontSize: 13 }}
      >
        Add to list
      </button>
    </div>
  )
}
