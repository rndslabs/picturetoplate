// p2p-web.jsx — Responsive web Ingredients Input page
// Two-pane editorial layout: photo + AI moments on the left, structured input on the right.
// Sized as a 1280×800 desktop viewport for the canvas; designed to collapse responsively.

function ScreenWeb() {
  const [items, setItems] = React.useState([
    { name: 'Heirloom tomato', qty: 3, unit: 'ea', conf: 0.95, src: 'photo' },
    { name: 'Shallot',         qty: 2, unit: 'ea', conf: 0.92, src: 'photo' },
    { name: 'Buratta',         qty: 1, unit: 'ball', conf: 0.81, src: 'photo' },
    { name: 'Sourdough',       qty: '½', unit: 'loaf', conf: null, src: 'text' },
    { name: 'Olive oil',       qty: '—', unit: 'pantry', conf: null, src: 'pantry' },
    { name: 'Sea salt',        qty: '—', unit: 'pantry', conf: null, src: 'pantry' },
  ]);
  const [draftQty, setDraftQty] = React.useState('1');
  const [draftName, setDraftName] = React.useState('');

  const sourceTone = {
    photo:  { bg: 'var(--sage-soft)',    fg: 'var(--sage-deep)' },
    voice:  { bg: 'var(--apricot-soft)', fg: 'var(--apricot-deep)' },
    text:   { bg: 'var(--cream)',        fg: 'var(--ink-2)' },
    pantry: { bg: 'transparent',         fg: 'var(--ink-3)' },
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--paper)', color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--hairline-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'var(--ink)', color: 'var(--paper)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500,
          }}>p</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)',
            letterSpacing: '0.04em',
          }}>pic — to — plate</span>
        </div>
        <nav style={{ display: 'flex', gap: 28, fontSize: 14, color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Cook</span>
          <span>Pantry</span>
          <span>Saved</span>
          <span>History</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="p2p-mono">v0.4 · alpha</span>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--sage-soft)', color: 'var(--sage-deep)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600,
          }}>MK</div>
        </div>
      </header>

      {/* Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '14px 40px',
        borderBottom: '1px solid var(--hairline-2)',
      }}>
        {['Capture', 'Ingredients', 'Preferences', 'Recipes'].map((s, i) => {
          const active = i === 1, done = i < 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 20, color: active ? 'var(--ink)' : 'var(--ink-3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: done ? 'var(--ink)' : active ? 'var(--paper)' : 'transparent',
                  border: active ? '1px solid var(--ink)' : done ? 'none' : '1px solid var(--hairline)',
                  color: done ? 'var(--paper)' : 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 10,
                }}>{done ? '✓' : i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{s}</span>
              </span>
              {i < 3 && <span style={{ width: 24, height: 1, background: 'var(--hairline)' }} />}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        minHeight: 0,
      }}>
        {/* LEFT — Capture column */}
        <section style={{
          padding: '36px 40px',
          borderRight: '1px solid var(--hairline-2)',
          overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 22,
        }}>
          <div>
            <div className="p2p-mono" style={{ marginBottom: 10 }}>
              <span className="p2p-dot" style={{ marginRight: 8 }}></span>capture
            </div>
            <h1 style={{
              fontFamily: 'var(--serif)', fontWeight: 400,
              fontSize: 56, lineHeight: 1, letterSpacing: '-0.025em',
              margin: 0,
              fontVariationSettings: '"SOFT" 100',
            }}>What's in the<br/>fridge tonight?</h1>
            <p style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 18, color: 'var(--ink-2)',
              maxWidth: 460, margin: '14px 0 0', lineHeight: 1.45, fontWeight: 300,
            }}>
              Drop a photo, talk it through, or type it out. Mix and match — I'll
              keep one tidy list.
            </p>
          </div>

          {/* Tri-input dropzone */}
          <div style={{
            border: '1.5px dashed var(--hairline)',
            borderRadius: 28, padding: 28,
            background: 'rgba(236,229,213,0.35)',
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 20,
            position: 'relative',
          }}>
            {/* Photo card */}
            <div style={{
              position: 'relative', borderRadius: 18, overflow: 'hidden',
              minHeight: 220,
            }}>
              <div className="p2p-photo-ph" style={{ position: 'absolute', inset: 0 }}>
                <span style={{ opacity: 0.5 }}>FRIDGE-SHELF · 01.JPG</span>
              </div>
              {/* Dots */}
              {[
                { x: 22, y: 38, l: 'tomato' },
                { x: 50, y: 26, l: 'shallot' },
                { x: 70, y: 60, l: 'buratta', soft: true },
              ].map((d, i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
                  transform: 'translate(-50%,-50%)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: 999,
                    background: d.soft ? 'var(--apricot)' : 'var(--sage)',
                    boxShadow: '0 0 0 4px rgba(246,243,236,0.6)',
                  }}/>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    background: 'rgba(246,243,236,0.9)', color: 'var(--ink)',
                    padding: '2px 6px', borderRadius: 4,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>{d.l}</span>
                </div>
              ))}
              <div style={{
                position: 'absolute', left: 12, top: 12,
                background: 'rgba(27,36,32,0.85)', color: 'var(--paper)',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '4px 8px', borderRadius: 999,
              }}>photo · 3 detected</div>
              <div style={{
                position: 'absolute', right: 12, bottom: 12,
                display: 'flex', gap: 6,
              }}>
                <button style={btnSquare}>retake</button>
                <button style={{ ...btnSquare, background: 'var(--ink)', color: 'var(--paper)' }}>+ add another</button>
              </div>
            </div>

            {/* Voice card */}
            <div style={{
              borderRadius: 18, padding: 18,
              background: 'var(--paper)',
              border: '1px solid var(--hairline-2)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div className="p2p-mono">voice · idle</div>
              <button style={{
                alignSelf: 'flex-start',
                width: 56, height: 56, borderRadius: 999, border: 'none',
                background: 'var(--ink)', color: 'var(--paper)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z"/></svg>
              </button>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 3, height: 30,
              }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} style={{
                    flex: 1, height: `${30 + Math.sin(i * 1.1) * 30 + 30}%`,
                    minHeight: 4,
                    background: 'var(--ink-3)', opacity: 0.4, borderRadius: 99,
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
                "Tap, then say what you see. I'll fill the list."
              </div>
            </div>

            {/* Text card */}
            <div style={{
              borderRadius: 18, padding: 18,
              background: 'var(--paper)',
              border: '1px solid var(--hairline-2)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div className="p2p-mono">text · type or paste</div>
              <input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                placeholder="e.g. half a sourdough loaf"
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--hairline)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={draftQty} onChange={e => setDraftQty(e.target.value)} style={{
                  width: 60, border: '1px solid var(--hairline)', borderRadius: 8,
                  padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 13,
                  background: 'var(--paper)', color: 'var(--ink)', outline: 'none',
                }} />
                <select style={{
                  flex: 1, border: '1px solid var(--hairline)', borderRadius: 8,
                  padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 13,
                  background: 'var(--paper)', color: 'var(--ink)',
                  appearance: 'none',
                }}>
                  <option>ea</option><option>g</option><option>cup</option><option>loaf</option>
                </select>
              </div>
              <button className="p2p-btn p2p-btn-primary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Add to list
              </button>
            </div>
          </div>

          {/* Helpers row */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            color: 'var(--ink-2)',
          }}>
            {['Pantry staples on', 'Family of 4', '~30 min', 'No nuts'].map((c, i) => (
              <span key={c} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 999,
                background: 'var(--paper-2)', border: '1px solid var(--hairline-2)',
                fontSize: 13,
              }}>
                <span className="p2p-dot" style={{
                  background: i === 0 ? 'var(--sage)' : i === 1 ? 'var(--apricot)' : 'var(--ink-3)',
                }} />
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* RIGHT — Live list column */}
        <section style={{
          padding: '36px 40px',
          background: 'var(--paper-2)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="p2p-mono">tonight's list</div>
              <h2 style={{
                fontFamily: 'var(--serif)', fontWeight: 400,
                fontSize: 32, letterSpacing: '-0.02em', margin: '4px 0 0',
              }}>{items.length} ingredients</h2>
            </div>
            <button style={{
              border: '1px solid var(--hairline)', background: 'var(--paper)',
              borderRadius: 999, padding: '8px 12px',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
              cursor: 'pointer', color: 'var(--ink-2)',
            }}>clear all</button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
            {items.map((it, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '24px 80px 1fr auto auto',
                alignItems: 'center', gap: 14,
                padding: '14px 14px',
                background: 'var(--paper)', borderRadius: 14,
                marginBottom: 6,
                border: '1px solid var(--hairline-2)',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 999,
                  background: 'var(--ink)', color: 'var(--paper)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12">
                    <path d="M2 6.5L4.8 9 10 3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  padding: '4px 8px', borderRadius: 6,
                  background: sourceTone[it.src].bg,
                  color: sourceTone[it.src].fg,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  border: it.src === 'pantry' ? '1px dashed var(--hairline)' : 'none',
                  textAlign: 'center',
                }}>{it.src}</span>
                <span style={{
                  fontFamily: 'var(--serif)', fontSize: 17,
                  fontVariationSettings: '"SOFT" 100',
                }}>{it.name}</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 12,
                  color: 'var(--ink-2)',
                }}>{it.qty} {it.unit}</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: it.conf == null ? 'var(--ink-3)' : it.conf >= 0.85 ? 'var(--sage-deep)' : 'var(--apricot-deep)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  minWidth: 40, textAlign: 'right',
                }}>{it.conf == null ? '—' : `${Math.round(it.conf * 100)}%`}</span>
              </div>
            ))}

            {/* AI suggestion */}
            <div style={{
              marginTop: 14,
              padding: 14, borderRadius: 14,
              background: 'transparent',
              border: '1px dashed var(--sage)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 999,
                background: 'var(--sage-soft)', color: 'var(--sage-deep)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontStyle: 'italic',
                fontSize: 16,
              }}>p</span>
              <div style={{ flex: 1, fontSize: 14 }}>
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  Often paired with these:
                </span>
                <span style={{ marginLeft: 8 }}>
                  {['basil', 'balsamic', 'flaky salt'].map((s, i) => (
                    <span key={s} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 999,
                      background: 'var(--paper)', border: '1px solid var(--hairline-2)',
                      fontSize: 13, marginRight: 6,
                    }}>
                      <span style={{ color: 'var(--sage-deep)', fontFamily: 'var(--mono)', fontSize: 11 }}>+</span>
                      {s}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>

          {/* Summary + CTA */}
          <div style={{
            marginTop: 20, paddingTop: 18,
            borderTop: '1px solid var(--hairline)',
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <div className="p2p-mono">est. matches</div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1.05,
                letterSpacing: '-0.02em', marginTop: 2,
              }}>
                42 recipes <span style={{ color: 'var(--sage)', fontStyle: 'italic' }}>ready</span>
              </div>
            </div>
            <button className="p2p-btn p2p-btn-ghost">Save list</button>
            <button className="p2p-btn p2p-btn-primary" style={{ padding: '14px 26px' }}>
              Find recipes →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const btnSquare = {
  background: 'rgba(246,243,236,0.92)', color: 'var(--ink)',
  border: 'none', padding: '6px 10px',
  borderRadius: 999, cursor: 'pointer',
  fontFamily: 'var(--mono)', fontSize: 10,
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

window.ScreenWeb = ScreenWeb;
