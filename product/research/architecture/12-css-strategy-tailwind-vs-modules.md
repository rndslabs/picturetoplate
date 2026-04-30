# Research: CSS Strategy — Tailwind vs CSS Modules vs Alternatives

**Decision recorded in:** ADR-009  
**Outcome:** Tailwind CSS v3 + CSS custom properties

---

## The question

How should components be styled? The brand design system is already defined in `brand.css` as CSS custom properties. The question is which authoring strategy best preserves those tokens, supports the two-column grid layout, and enables dark mode.

---

## Options evaluated

### Option A: Tailwind CSS v3 + CSS custom properties (chosen)

Extend `tailwind.config.ts` to map brand tokens to Tailwind color/font/radius keys as `var(--token)` references. Use Tailwind utility classes for layout, spacing, and responsive breakpoints. Never hardcode hex values in components.

```ts
// tailwind.config.ts
colors: {
  paper:     'var(--paper)',
  ink:       'var(--ink)',
  sage:      'var(--sage)',
  'ink-2':   'var(--ink-2)',
  ...
}
```

**Strengths:**
- The two-column `1.4fr 1fr 1fr` grid and responsive collapse are expressed in one className string (`grid-cols-[1.4fr_1fr_1fr]`).
- Dark mode works automatically: toggling `.theme-dark` on the root changes CSS variable values; Tailwind classes reference variables, so all components update with zero code changes.
- `brand.css` stays as single source of truth for all hex values — no duplication.
- Vite + Tailwind JIT tree-shakes unused utilities: production CSS bundle is minimal.

**Weaknesses:**
- Tailwind's opacity modifier syntax (`bg-paper/50`) does not work when color values are `var()` references rather than RGB channels. Mitigation: use `opacity` utility or `rgba()` arbitrary values for transparency.
- Long className strings on complex components reduce readability. Mitigation: extract repeated patterns into named subcomponents.

---

### Option B: CSS Modules

Per-component `.module.css` files. Classes are locally scoped by the bundler.

**Strengths:**
- True CSS — no new syntax to learn.
- Local scoping prevents accidental class collisions.

**Weaknesses:**
- Grid layouts like `grid-template-columns: 1.4fr 1fr 1fr` and responsive breakpoints must be written in full CSS media queries — more verbose than Tailwind's utility approach.
- Dark mode requires either CSS `prefers-color-scheme` (system-only) or duplicating selectors under `.theme-dark` in every module file. Neither is clean.
- No token enforcement — developers can still hardcode `#6B8A5A` instead of `var(--sage)`.

---

### Option C: Styled Components / Emotion (CSS-in-JS)

Style rules written as tagged template literals or object literals inside component files.

**Strengths:**
- Co-located styles and markup.
- Dynamic styles from props are ergonomic.

**Weaknesses:**
- Runtime style injection adds ~15 KB gzipped and causes a flash-of-unstyled-content on SSR.
- TypeScript typed props for styled components add boilerplate.
- The team already has a CSS variable system — bridging it into CSS-in-JS requires a theme provider abstraction.
- Styled-components v6 dropped React 17 support; Emotion requires separate RSC-safe wrappers.

---

### Option D: Vanilla Extract

Zero-runtime CSS-in-TypeScript. Styles are compiled to `.css` files at build time.

**Strengths:**
- True zero-runtime.
- Full TypeScript type safety on the style values.

**Weaknesses:**
- API is verbose (an object per style rule, sprinkle functions for dynamic variants).
- Tailwind's JIT is simpler and produces a smaller CSS footprint for utility-heavy layouts.
- Overkill for a single-page MVP with an established token system.

---

### Option E: Inline `style={}` prop (wireframe approach)

The wireframe prototype uses inline `style={{ ... }}` everywhere.

**Acceptable for prototyping** — not for production. Inline styles:
- Cannot express pseudo-classes (`:hover`, `:focus`).
- Cannot be tree-shaken.
- Break Tailwind's responsive breakpoint utilities.
- Are not extracted to a CSS file — expensive to re-parse per element.

---

## Decision matrix

| Criterion | Tailwind + CSS vars | CSS Modules | CSS-in-JS | Vanilla Extract |
|---|---|---|---|---|
| Token system preserved (single source) | ✅ | ⚠️ Manual | ⚠️ Provider needed | ✅ |
| Dark mode via CSS var toggle | ✅ Automatic | ⚠️ Verbose | ⚠️ Complex | ✅ |
| Grid layout ergonomics | ✅ One className | ❌ Full CSS | ✅ | ❌ Verbose |
| Runtime overhead | ✅ None | ✅ None | ❌ ~15 KB | ✅ None |
| Bundle size | ✅ JIT minimal | ✅ Minimal | ⚠️ Moderate | ✅ Minimal |
| Learning curve | ✅ Low | ✅ Low | ⚠️ Moderate | ❌ High |

**Tailwind + CSS vars wins on token preservation, dark mode, and grid ergonomics simultaneously.**

---

## Critical trade-off: opacity modifiers

`bg-paper/50` would be the natural Tailwind syntax for 50% opacity on the paper color. It doesn't work when the color value is `var(--paper)` (a variable, not RGB channels). The workaround is explicit: `bg-[rgba(246,243,236,0.5)]` or `opacity-50`. This is a minor authoring inconvenience — the actual cases where transparency is needed (hairline overlays, photo placeholders) are few and already identified in the wireframe.

---

## Revisit if

- The team migrates to Tailwind v4 (CSS-native config) — the token mapping approach becomes even more natural; the explicit `tailwind.config.ts` may be replaced by CSS `@theme` blocks.
- Dark mode needs a runtime toggle (not just CSS class) — add `darkMode: 'class'` to Tailwind config and wire to a theme toggle component.
