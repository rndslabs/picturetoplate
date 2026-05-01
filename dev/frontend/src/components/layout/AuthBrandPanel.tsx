const FEATURES = [
  { label: 'Photo detection',  desc: 'AI spots every ingredient in a shot.' },
  { label: 'Recipe matching',  desc: 'Recipes built from what you actually have.' },
  { label: 'Pantry memory',    desc: 'Remembers your staples so you don\'t have to.' },
]

export default function AuthBrandPanel() {
  return (
    <div
      className="flex flex-col"
      style={{
        width: '52%',
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle texture overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(
            135deg,
            rgba(241,236,224,0.015) 0 8px,
            rgba(241,236,224,0.00) 8px 18px
          )`,
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-3" style={{ position: 'relative' }}>
        <span
          className="inline-flex items-center justify-center rounded-full font-serif font-medium"
          style={{
            width: 32, height: 32,
            background: 'var(--paper)', color: 'var(--ink)',
            fontSize: 20,
          }}
        >
          p
        </span>
        <span
          className="p2p-mono"
          style={{ color: 'rgba(241,236,224,0.55)', letterSpacing: '0.05em' }}
        >
          pic — to — plate
        </span>
      </div>

      {/* Main brand statement — vertically centered */}
      <div className="flex flex-col justify-center flex-1" style={{ position: 'relative', paddingTop: 48 }}>
        {/* Eyebrow */}
        <div
          className="flex items-center gap-2"
          style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'var(--sage)', marginBottom: 22,
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: 'var(--sage)' }}
          />
          kitchen companion
        </div>

        {/* Wordmark */}
        <h1
          className="font-serif font-normal m-0"
          style={{
            fontSize: 72, lineHeight: 1,
            letterSpacing: '-0.03em',
            fontVariationSettings: '"SOFT" 100, "WONK" 0',
            color: 'var(--paper)',
          }}
        >
          Pic-to-Plate
          <span style={{ color: 'var(--sage)' }}>.</span>
        </h1>

        {/* Tagline */}
        <p
          className="font-serif italic font-light"
          style={{
            fontSize: 20, lineHeight: 1.5,
            color: 'rgba(241,236,224,0.65)',
            maxWidth: 380, margin: '20px 0 0',
          }}
        >
          Snap what's in the fridge. Cook what's on the plate.
        </p>

        {/* Feature list */}
        <div className="flex flex-col" style={{ gap: 18, marginTop: 52 }}>
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start" style={{ gap: 14 }}>
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{
                  width: 6, height: 6,
                  background: 'var(--sage)',
                  marginTop: 6,
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'rgba(241,236,224,0.4)',
                    marginBottom: 3,
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)', fontSize: 14,
                    color: 'rgba(241,236,224,0.7)',
                    lineHeight: 1.45,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version footer */}
      <div
        className="p2p-mono"
        style={{ color: 'rgba(241,236,224,0.25)', position: 'relative' }}
      >
        v0.4 · alpha · Apr 2026
      </div>
    </div>
  )
}
