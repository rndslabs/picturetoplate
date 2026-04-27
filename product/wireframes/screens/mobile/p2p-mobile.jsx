// p2p-mobile.jsx — Three iOS variations of the Ingredients Input screen.
// All variants share the brand: Fraunces × Inter × JetBrains Mono on warm paper.
//
// V1 — "Detected"   : photo-led, AI auto-detects, user confirms in a stacked list
// V2 — "Conversation": voice-led, transcript-as-canvas with hands-free chips
// V3 — "Pantry Grid" : text-led, predictive grid that fills in as you type

const { IOSDevice } = window;

// ── shared bits ─────────────────────────────────────────────────────────────
const STATUS_TEXT = '#1B2420';

// "qty × unit" pill — the brand's data signature
const QtyPill = ({ qty, unit, onMinus, onPlus, tone = 'sage' }) => {
  const accent = tone === 'apricot' ? 'var(--apricot)' : 'var(--sage)';
  const bg = tone === 'apricot' ? 'var(--apricot-soft)' : 'var(--sage-soft)';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, borderRadius: 999,
      padding: '4px 6px', gap: 4,
      fontFamily: 'var(--mono)', fontSize: 11,
      letterSpacing: '0.02em',
      color: 'var(--ink)',
    }}>
      <button onClick={onMinus} style={{
        width: 20, height: 20, borderRadius: 999, border: 'none',
        background: 'rgba(255,255,255,0.6)', color: accent,
        fontSize: 14, lineHeight: 1, cursor: 'pointer',
      }}>−</button>
      <span style={{ minWidth: 44, textAlign: 'center' }}>
        {qty} {unit}
      </span>
      <button onClick={onPlus} style={{
        width: 20, height: 20, borderRadius: 999, border: 'none',
        background: 'rgba(255,255,255,0.6)', color: accent,
        fontSize: 14, lineHeight: 1, cursor: 'pointer',
      }}>+</button>
    </div>
  );
};

const SmallStatusBar = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px 6px',
    fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15,
    color: STATUS_TEXT,
  }}>
    <span>9:41</span>
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.7" fill={STATUS_TEXT}/><rect x="4.7" y="5" width="3" height="6" rx="0.7" fill={STATUS_TEXT}/><rect x="9.4" y="2.5" width="3" height="8.5" rx="0.7" fill={STATUS_TEXT}/><rect x="14.1" y="0" width="3" height="11" rx="0.7" fill={STATUS_TEXT}/></svg>
      <svg width="24" height="11" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={STATUS_TEXT} strokeOpacity="0.45" fill="none"/><rect x="2" y="2" width="18" height="9" rx="2" fill={STATUS_TEXT}/></svg>
    </span>
  </div>
);

const StepHeader = ({ step = 1, total = 4, title, sub }) => (
  <div style={{ padding: '58px 24px 0' }}>
    <div className="p2p-mono" style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span><span className="p2p-dot" style={{ marginRight: 8 }}></span>step {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <span>ingredients</span>
    </div>
    <h1 style={{
      fontFamily: 'var(--serif)', fontWeight: 400,
      fontSize: 38, lineHeight: 1.05,
      letterSpacing: '-0.02em',
      margin: '14px 0 6px', color: 'var(--ink)',
      fontVariationSettings: '"SOFT" 100',
    }}>{title}</h1>
    {sub && <p style={{
      fontFamily: 'var(--serif)', fontStyle: 'italic',
      color: 'var(--ink-2)', fontSize: 16,
      margin: 0, lineHeight: 1.4, fontWeight: 300,
    }}>{sub}</p>}
  </div>
);

const ModeTabs = ({ active, onChange }) => {
  const tabs = [
    { name: 'Photo', href: 'ios-detected.html' },
    { name: 'Voice', href: 'ios-conversation.html' },
    { name: 'Text',  href: 'ios-pantry-grid.html' },
  ];
  const handleClick = (t) => {
    if (active === t.name) return;
    if (onChange) onChange(t.name);
    try {
      const here = (window.location.pathname || '').split('/').pop();
      if (/^ios-(detected|conversation|pantry-grid)\.html$/.test(here)) {
        window.location.href = t.href;
      }
    } catch (e) { /* noop */ }
  };
  return (
    <div style={{
      display: 'flex', margin: '20px 24px 0',
      background: 'var(--cream)',
      borderRadius: 999, padding: 4, gap: 2,
    }}>
      {tabs.map(t => (
        <button key={t.name}
          onClick={() => handleClick(t)}
          style={{
            flex: 1, padding: '10px 0',
            border: 'none', cursor: 'pointer',
            background: active === t.name ? 'var(--paper)' : 'transparent',
            color: active === t.name ? 'var(--ink)' : 'var(--ink-3)',
            borderRadius: 999,
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.01em',
            boxShadow: active === t.name ? '0 1px 2px rgba(27,36,32,0.08)' : 'none',
            transition: 'all .15s',
          }}>
          {t.name}
        </button>
      ))}
    </div>
  );
};

const HomeIndicator = ({ dark = false }) => (
  <div style={{ height: 34, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}>
    <div style={{ width: 134, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(27,36,32,0.85)' }} />
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// V1 — DETECTED  (photo-led, AI auto-detects, confirm-as-you-scroll)
// ────────────────────────────────────────────────────────────────────────────
function ScreenDetected() {
  const [active, setActive] = React.useState('Photo');
  const [items, setItems] = React.useState([
    { id: 1, name: 'Roma tomatoes', qty: 4, unit: 'ea', conf: 0.96, confirmed: true },
    { id: 2, name: 'Garlic',        qty: 1, unit: 'head', conf: 0.91, confirmed: true },
    { id: 3, name: 'Lemon',         qty: 2, unit: 'ea', conf: 0.88, confirmed: true },
    { id: 4, name: 'Basil',         qty: 1, unit: 'bunch', conf: 0.74, confirmed: false },
    { id: 5, name: 'Parmesan',      qty: 80, unit: 'g', conf: 0.69, confirmed: false },
  ]);

  const bump = (id, d) => setItems(s => s.map(i => i.id === id
    ? { ...i, qty: Math.max(0, +(i.qty + d).toFixed(2)) } : i));
  const toggle = (id) => setItems(s => s.map(i => i.id === id
    ? { ...i, confirmed: !i.confirmed } : i));

  const confirmedCount = items.filter(i => i.confirmed).length;

  return (
    <div style={{ background: 'var(--paper)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StepHeader step={2} title="What's in there?" sub="I spotted these. Confirm or tweak amounts." />

      {/* Photo with detected dots */}
      <div style={{ margin: '20px 24px 0', borderRadius: 24, overflow: 'hidden', position: 'relative', border: '1px solid var(--hairline)' }}>
        <div className="p2p-photo-ph" style={{ height: 200, position: 'relative' }}>
          <span style={{ opacity: 0.45 }}>FRIDGE · 02</span>
          {/* detection dots */}
          {[
            { x: 22, y: 38, label: 'tomato' },
            { x: 48, y: 64, label: 'garlic' },
            { x: 70, y: 30, label: 'lemon' },
            { x: 32, y: 78, label: 'basil', soft: true },
            { x: 80, y: 70, label: 'parm', soft: true },
          ].map((d, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
              transform: 'translate(-50%,-50%)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: 999,
                background: d.soft ? 'var(--apricot)' : 'var(--sage)',
                boxShadow: '0 0 0 4px rgba(246,243,236,0.6)',
              }} />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: 'var(--ink)', background: 'rgba(246,243,236,0.85)',
                padding: '2px 6px', borderRadius: 4,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>{d.label}</span>
            </div>
          ))}
          {/* retake pill */}
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(27,36,32,0.85)', color: 'var(--paper)',
            padding: '6px 10px', borderRadius: 999,
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--apricot)' }}></span>
            retake
          </div>
        </div>
      </div>

      <div className="p2p-mono" style={{ padding: '18px 24px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>detected · {items.length}</span>
        <span style={{ color: 'var(--sage-deep)' }}>{confirmedCount} confirmed</span>
      </div>

      {/* Ingredients list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 8px' }}>
        {items.map((it) => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 0',
            borderBottom: '1px solid var(--hairline-2)',
            opacity: it.confirmed ? 1 : 0.78,
          }}>
            <button onClick={() => toggle(it.id)} style={{
              width: 24, height: 24, borderRadius: 999,
              border: it.confirmed ? 'none' : '1.5px dashed var(--ink-3)',
              background: it.confirmed ? 'var(--ink)' : 'transparent',
              color: 'var(--paper)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {it.confirmed && (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6.5L4.8 9 10 3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 18,
                color: 'var(--ink)', fontWeight: 400,
                fontVariationSettings: '"SOFT" 100',
              }}>{it.name}</div>
              <div className="p2p-mono" style={{ marginTop: 2, fontSize: 10 }}>
                {it.conf >= 0.85
                  ? <>confidence · {Math.round(it.conf*100)}%</>
                  : <span style={{ color: 'var(--apricot-deep)' }}>review · {Math.round(it.conf*100)}%</span>}
              </div>
            </div>
            <QtyPill
              qty={it.qty} unit={it.unit}
              tone={it.conf < 0.85 ? 'apricot' : 'sage'}
              onMinus={() => bump(it.id, it.unit === 'g' ? -10 : -1)}
              onPlus={() => bump(it.id, it.unit === 'g' ? 10 : 1)}
            />
          </div>
        ))}

        {/* add row */}
        <button style={{
          marginTop: 12, width: '100%',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 16,
          background: 'var(--cream)', border: 'none',
          fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-2)',
          cursor: 'pointer',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            border: '1.5px solid var(--ink-3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 14, lineHeight: 1,
          }}>+</span>
          Add something I'm missing
        </button>
      </div>

      {/* Mode tabs + CTA */}
      <ModeTabs active={active} onChange={setActive} />
      <div style={{ padding: '14px 24px 4px', display: 'flex', gap: 10 }}>
        <button className="p2p-btn p2p-btn-ghost" style={{ flex: 1 }}>Save list</button>
        <button className="p2p-btn p2p-btn-primary" style={{ flex: 2 }}>
          Find recipes →
        </button>
      </div>
      <HomeIndicator />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// V2 — CONVERSATION  (voice-first, transcript canvas, big mic)
// ────────────────────────────────────────────────────────────────────────────
function ScreenConversation() {
  const [active, setActive] = React.useState('Voice');
  const [recording, setRecording] = React.useState(true);
  const [tags, setTags] = React.useState([
    { word: 'half',  qty: '½', unit: 'ea',     name: 'red onion',     hl: true },
    { word: 'two',   qty: 2,   unit: 'cups',   name: 'cooked rice' },
    { word: 'a few', qty: 4,   unit: 'sprigs', name: 'cilantro', soft: true },
    { word: 'one',   qty: 1,   unit: 'ea',     name: 'lime' },
  ]);

  return (
    <div style={{ background: 'var(--paper)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StepHeader step={2} title="Tell me what you've got." sub="Tap and talk. I'll list as you go." />

      {/* Transcript canvas */}
      <div style={{ flex: 1, padding: '24px 24px 0', overflow: 'auto' }}>
        <div className="p2p-mono" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span><span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: 999,
            background: recording ? 'var(--tomato)' : 'var(--ink-3)', marginRight: 8,
            animation: recording ? 'p2p-shimmer 1.6s infinite' : 'none',
          }}></span>{recording ? 'listening · 00:14' : 'paused'}</span>
          <span>en-us</span>
        </div>

        <p style={{
          fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.45,
          color: 'var(--ink)', margin: 0, fontWeight: 300,
          letterSpacing: '-0.005em',
        }}>
          So I've got{' '}
          <ChipInline tag={tags[0]} />, about{' '}
          <ChipInline tag={tags[1]} />,{' '}
          <ChipInline tag={tags[2]} /> from the garden, and{' '}
          <ChipInline tag={tags[3]} />
          <span className="p2p-shimmer" style={{
            display: 'inline-block', width: 84, height: 14,
            borderRadius: 4, marginLeft: 6, verticalAlign: 'middle',
          }} />
        </p>

        {/* Captured tally */}
        <div style={{
          marginTop: 22, padding: 16, borderRadius: 18,
          background: 'var(--paper-2)', border: '1px solid var(--hairline-2)',
        }}>
          <div className="p2p-mono" style={{ marginBottom: 10 }}>captured · 4</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--paper)', borderRadius: 999,
                padding: '6px 10px',
                border: '1px solid var(--hairline)',
                fontFamily: 'var(--sans)', fontSize: 13,
                color: 'var(--ink)',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sage-deep)' }}>
                  {t.qty} {t.unit}
                </span>
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Big mic + waveform */}
      <div style={{ padding: '18px 24px 6px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 14, borderRadius: 28,
          background: 'var(--ink)',
        }}>
          <button onClick={() => setRecording(r => !r)} style={{
            width: 56, height: 56, borderRadius: 999, border: 'none',
            background: recording ? 'var(--tomato)' : 'var(--paper)',
            color: recording ? 'var(--paper)' : 'var(--ink)',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: recording ? '0 0 0 5px rgba(194,84,60,0.25)' : 'none',
            transition: 'all .2s',
          }}>
            {recording
              ? <div style={{ width: 16, height: 16, borderRadius: 4, background: 'currentColor' }} />
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z"/></svg>
            }
          </button>
          {/* waveform */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{
                flex: 1,
                height: '100%',
                borderRadius: 99,
                background: 'var(--paper)',
                opacity: recording ? 0.85 : 0.3,
                transformOrigin: 'center',
                animation: recording
                  ? `p2p-wave ${0.6 + (i % 5) * 0.18}s ease-in-out ${i * 0.04}s infinite`
                  : 'none',
              }} />
            ))}
          </div>
          <button style={{
            width: 44, height: 44, borderRadius: 999, border: 'none',
            background: 'rgba(246,243,236,0.12)', color: 'var(--paper)',
            cursor: 'pointer', flexShrink: 0,
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>done</button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 10, padding: '0 6px',
        }}>
          <button style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>+ add unit</button>
          <button style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>review list →</button>
        </div>
      </div>

      <ModeTabs active={active} onChange={setActive} />
      <HomeIndicator />
    </div>
  );
}

function ChipInline({ tag }) {
  const fill = tag.soft ? 'var(--apricot-soft)' : 'var(--sage-soft)';
  return (
    <span style={{
      background: fill, borderRadius: 8,
      padding: '2px 8px', whiteSpace: 'nowrap',
      fontFamily: 'var(--serif)', fontStyle: 'italic',
      color: 'var(--ink)',
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontStyle: 'normal',
        fontSize: 11, color: 'var(--sage-deep)',
        marginRight: 6, letterSpacing: '0.02em',
      }}>{tag.qty} {tag.unit}</span>
      {tag.name}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// V3 — PANTRY GRID  (text-led, predictive grid, tactile picker)
// ────────────────────────────────────────────────────────────────────────────
function ScreenPantryGrid() {
  const [active, setActive] = React.useState('Text');
  const [query, setQuery] = React.useState('chick');
  const [items, setItems] = React.useState([
    { name: 'Eggs',         qty: 6, unit: 'ea' },
    { name: 'Spinach',      qty: 1, unit: 'bag' },
    { name: 'Feta',         qty: 120, unit: 'g' },
  ]);

  const suggestions = [
    { name: 'Chickpeas',     unit: '1 can', match: [0,5] },
    { name: 'Chicken thigh', unit: '500 g', match: [0,5] },
    { name: 'Chicken stock', unit: '1 cup', match: [0,5] },
    { name: 'Chicory',       unit: '1 head', match: [0,5] },
  ];

  const pantry = [
    'Olive oil', 'Salt', 'Pepper', 'Garlic',
    'Onion', 'Butter', 'Lemon', 'Flour',
  ];

  const addItem = (s) => {
    const [q, u] = s.unit.split(' ');
    setItems(its => [...its, { name: s.name, qty: parseFloat(q) || 1, unit: u || 'ea' }]);
    setQuery('');
  };

  return (
    <div style={{ background: 'var(--paper)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StepHeader step={2} title="Type it in." sub="I'll guess as you go. Pantry staples are on." />

      {/* Search field */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderRadius: 16,
          background: 'var(--paper-2)',
          border: '1px solid var(--hairline)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--ink)' }}>
            {query}<span style={{
              display: 'inline-block', width: 1.5, height: 18,
              background: 'var(--sage)', marginLeft: 2,
              verticalAlign: 'middle', animation: 'p2p-wave 1s steps(2) infinite',
            }}/>
          </span>
          <span style={{ flex: 1 }} />
          <span className="p2p-mono">{items.length}/12</span>
        </div>

        {/* Suggestions */}
        {query && (
          <div style={{
            marginTop: 8, borderRadius: 16, overflow: 'hidden',
            border: '1px solid var(--hairline-2)',
            background: 'var(--paper)',
          }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => addItem(s)} style={{
                width: '100%', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--hairline-2)' : 'none',
                fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--ink)',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span>
                  <span style={{ background: 'var(--sage-soft)', padding: '0 1px' }}>
                    {s.name.slice(s.match[0], s.match[1])}
                  </span>
                  {s.name.slice(s.match[1])}
                </span>
                <span style={{ flex: 1 }} />
                <span className="p2p-mono">{s.unit}</span>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: 'var(--ink)', color: 'var(--paper)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>+</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pantry staples */}
      <div style={{ padding: '20px 24px 0' }}>
        <div className="p2p-mono" style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <span>pantry staples · always on</span>
          <span style={{ color: 'var(--sage-deep)' }}>edit</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pantry.map((p) => (
            <span key={p} style={{
              fontFamily: 'var(--sans)', fontSize: 13,
              padding: '6px 10px', borderRadius: 999,
              background: 'var(--cream)', color: 'var(--ink-2)',
            }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Your basket */}
      <div style={{ padding: '20px 24px 8px', flex: 1, overflow: 'auto' }}>
        <div className="p2p-mono" style={{ marginBottom: 10 }}>your basket · {items.length}</div>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: 'var(--paper-2)', marginBottom: 6,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: i === 0 ? 'var(--sage-soft)' : i === 1 ? 'var(--apricot-soft)' : 'var(--cream)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-2)',
            }}>{it.name.charAt(0)}</span>
            <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 15 }}>{it.name}</span>
            <span className="p2p-mono">{it.qty} {it.unit}</span>
          </div>
        ))}
      </div>

      <ModeTabs active={active} onChange={setActive} />
      <div style={{ padding: '14px 24px 4px' }}>
        <button className="p2p-btn p2p-btn-primary" style={{ width: '100%' }}>
          Find recipes — {items.length + 4} ingredients →
        </button>
      </div>
      <HomeIndicator />
    </div>
  );
}

window.ScreenDetected = ScreenDetected;
window.ScreenConversation = ScreenConversation;
window.ScreenPantryGrid = ScreenPantryGrid;
