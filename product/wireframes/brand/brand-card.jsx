// brand-card.jsx — Pic-to-Plate brand specimen for the canvas

const BrandCard = () => {
  const swatch = (name, val, fg = '#1B2420') => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        height: 92, borderRadius: 14, background: val,
        border: '1px solid rgba(27,36,32,0.08)',
        display: 'flex', alignItems: 'flex-end', padding: 10,
        color: fg, fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>{val}</div>
      <div style={{
        marginTop: 8, fontFamily: 'var(--sans)',
        fontSize: 12, color: 'var(--ink-2)',
      }}>{name}</div>
    </div>
  );

  return (
    <div style={{
      width: 1100, padding: 56,
      background: 'var(--paper)',
      color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 40,
    }}>
      {/* Wordmark + meta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 14 }}>
            <span className="p2p-dot" style={{ marginRight: 8 }}></span>
            Brand · v0.1
          </div>
          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: 96, fontWeight: 400,
            lineHeight: 0.95, letterSpacing: '-0.03em',
            margin: 0, fontVariationSettings: '"SOFT" 100, "WONK" 0',
          }}>
            Pic-to-Plate<span style={{ color: 'var(--sage)' }}>.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 22, fontWeight: 300, color: 'var(--ink-2)',
            margin: '14px 0 0', maxWidth: 640, lineHeight: 1.4,
          }}>
            Snap what's in the fridge. Cook what's on the plate. A quiet kitchen
            companion for busy weeknights and curious appetites.
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          textAlign: 'right', lineHeight: 1.7,
        }}>
          02 / Ingredients<br/>
          iOS · Web<br/>
          Apr 2026
        </div>
      </div>

      <div className="p2p-hair" />

      {/* Color */}
      <div>
        <div className="p2p-mono" style={{ marginBottom: 16 }}>Palette</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {swatch('Paper · bg', '#F6F3EC')}
          {swatch('Cream · chip', '#ECE5D5')}
          {swatch('Ink · text', '#1B2420', '#F6F3EC')}
          {swatch('Sage · primary accent', '#6B8A5A', '#F6F3EC')}
          {swatch('Apricot · secondary', '#E8A579')}
          {swatch('Tomato · alert', '#C2543C', '#F6F3EC')}
        </div>
      </div>

      <div className="p2p-hair" />

      {/* Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>Display · Fraunces</div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 64, lineHeight: 1,
            letterSpacing: '-0.02em', fontVariationSettings: '"SOFT" 100',
          }}>Aa</div>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            color: 'var(--ink-2)', fontSize: 15, marginTop: 8,
          }}>Editorial, slightly food-mag</div>
        </div>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>UI · Inter</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 64, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em' }}>Aa</div>
          <div style={{ fontFamily: 'var(--sans)', color: 'var(--ink-2)', fontSize: 15, marginTop: 8 }}>
            Quiet workhorse, 14–17px
          </div>
        </div>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>Data · JetBrains Mono</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em' }}>Aa</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Microcopy · QTY · 11/13
          </div>
        </div>
      </div>

      <div className="p2p-hair" />

      {/* Voice & rules */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>Voice</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14, color: 'var(--ink-2)' }}>
            <li>Plain-spoken, never bossy.</li>
            <li>Uses food words: zest, char, simmer.</li>
            <li>Short sentences. One idea each.</li>
            <li>Never exclaims. Rarely emojis.</li>
          </ul>
        </div>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>Geometry</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14, color: 'var(--ink-2)' }}>
            <li>Radii: 10 / 16 / 24 / 32.</li>
            <li>Hairlines, not shadows.</li>
            <li>Generous negative space.</li>
            <li>1px sage outlines on focus.</li>
          </ul>
        </div>
        <div>
          <div className="p2p-mono" style={{ marginBottom: 12 }}>Brand glyph</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            background: 'var(--cream)', borderRadius: 14,
            fontFamily: 'var(--mono)', fontSize: 13,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 999,
              background: 'var(--ink)', color: 'var(--paper)',
              fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
            }}>p</span>
            <span style={{ color: 'var(--ink-3)' }}>•</span>
            <span style={{ color: 'var(--ink-2)' }}>pic — to — plate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

window.BrandCard = BrandCard;
