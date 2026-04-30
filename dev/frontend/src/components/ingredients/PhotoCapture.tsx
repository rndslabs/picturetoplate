interface PhotoCaptureProps {
  detectedCount: number
  onRetake: () => void
  onAddAnother: () => void
}

const DOTS = [
  { x: 22, y: 38, label: 'tomato',  accent: false },
  { x: 50, y: 26, label: 'shallot', accent: false },
  { x: 70, y: 60, label: 'buratta', accent: true  },
]

export default function PhotoCapture({ detectedCount, onRetake, onAddAnother }: PhotoCaptureProps) {
  return (
    <div className="relative rounded-[18px] overflow-hidden" style={{ minHeight: 220 }}>
      {/* Placeholder background — warm diagonal stripes */}
      <div className="p2p-photo-ph absolute inset-0">
        <span style={{ opacity: 0.5 }}>FRIDGE-SHELF · 01.JPG</span>
      </div>

      {/* Detection dot annotations */}
      {DOTS.map((d, i) => (
        <div
          key={i}
          className="absolute inline-flex items-center gap-[6px]"
          style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span
            className="rounded-full"
            style={{
              width: 9, height: 9,
              background: d.accent ? 'var(--apricot)' : 'var(--sage)',
              boxShadow: '0 0 0 4px rgba(246,243,236,0.6)',
            }}
          />
          <span
            className="font-mono uppercase tracking-[0.04em]"
            style={{
              fontSize: 9,
              background: 'rgba(246,243,236,0.9)',
              color: 'var(--ink)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {d.label}
          </span>
        </div>
      ))}

      {/* Detection count pill */}
      <div
        className="absolute left-3 top-3 font-mono uppercase tracking-[0.06em] rounded-full"
        style={{
          fontSize: 10,
          padding: '4px 8px',
          background: 'rgba(27,36,32,0.85)',
          color: 'var(--paper)',
        }}
      >
        photo · {detectedCount} detected
      </div>

      {/* Action buttons */}
      <div className="absolute right-3 bottom-3 flex gap-[6px]">
        <button
          onClick={onRetake}
          className="font-mono uppercase tracking-[0.06em] rounded-full cursor-pointer"
          style={{
            fontSize: 10,
            padding: '6px 10px',
            background: 'rgba(246,243,236,0.92)',
            color: 'var(--ink)',
            border: 'none',
          }}
        >
          retake
        </button>
        <button
          onClick={onAddAnother}
          className="font-mono uppercase tracking-[0.06em] rounded-full cursor-pointer"
          style={{
            fontSize: 10,
            padding: '6px 10px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
          }}
        >
          + add another
        </button>
      </div>
    </div>
  )
}
