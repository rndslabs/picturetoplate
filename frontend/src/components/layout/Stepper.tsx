const STEPS = ['Capture', 'Ingredients', 'Preferences', 'Recipes'] as const

interface StepperProps {
  current: number // 0-indexed; 0 = Capture, 1 = Ingredients, etc.
}

export default function Stepper({ current }: StepperProps) {
  return (
    <div className="flex items-center gap-5 px-10 border-b border-hairline-2" style={{ padding: '14px 40px' }}>
      {STEPS.map((step, i) => {
        const active = i === current
        const done   = i < current
        return (
          <div
            key={step}
            className="flex items-center gap-5"
            style={{ color: active ? 'var(--ink)' : 'var(--ink-3)' }}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center font-mono text-[10px] rounded-full"
                style={{
                  width: 22, height: 22,
                  background: done   ? 'var(--ink)'   : active ? 'var(--paper)' : 'transparent',
                  border:     done   ? 'none'          : active ? '1px solid var(--ink)' : '1px solid var(--hairline)',
                  color:      done   ? 'var(--paper)'  : 'inherit',
                }}
              >
                {done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{step}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="block h-px bg-hairline" style={{ width: 24 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
