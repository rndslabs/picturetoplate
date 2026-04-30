# Research: Component Library — Radix UI vs Alternatives

**Decision recorded in:** ADR-011  
**Outcome:** Radix UI primitives (unstyled); Phase 1 installs only @radix-ui/react-tooltip

---

## The question

Interactive widgets — tooltips, dropdowns, modals, voice recording overlays — require accessibility infrastructure (ARIA roles, keyboard navigation, focus trapping). Should the project build these from scratch, use a pre-styled component library, or use unstyled primitives?

---

## Options evaluated

### Option A: Radix UI primitives (chosen)

Radix UI provides zero-visual-style React components that handle behaviour and accessibility only. Each widget is a separate npm package (`@radix-ui/react-tooltip`, `@radix-ui/react-select`, etc.).

```tsx
import * as Tooltip from '@radix-ui/react-tooltip'
// Trigger, Content, Portal, Arrow — all visually naked,
// styled entirely with Tailwind and brand tokens.
```

**Strengths:**
- Unstyled by design — no default styles to override, no specificity battles.
- WCAG 2.1 AA compliant out of the box: ARIA roles, keyboard navigation, focus management, screen reader announcements.
- Tree-shakeable: each package is ~2–8 KB gzipped; only installed packages are in the bundle.
- Well-maintained: Radix is used by Vercel, Linear, Supabase, and thousands of design systems.
- Portal rendering (tooltips/modals render at the document body, not inside the component tree) prevents z-index and overflow:hidden clipping issues.

**Weaknesses:**
- Each primitive is a separate npm package — 6 primitives = 6 entries in `package.json`.
- The Trigger / Content / Portal pattern is an API surface that takes reading the docs for each new primitive type.

**Phase 1 install:** Only `@radix-ui/react-tooltip`. Other primitives (Select for unit-of-measure, Dialog for voice overlay) are added when those screens are built.

---

### Option B: shadcn/ui

shadcn/ui is a collection of pre-styled Radix UI components distributed as copy-pasteable source files (not an npm package). Visual style defaults to a neutral grey/white Tailwind theme.

**Strengths:**
- Fast to prototype — copy a component, get accessible markup and default styles.
- Good documentation with previews.

**Weaknesses:**
- The default grey/white theme conflicts directly with the warm editorial brand (--paper, --ink, --sage). Every shadcn component would need restyling that approaches the effort of building from scratch.
- Copy-paste distribution means the project owns the implementation — if Radix releases a breaking change, the project must manually update copied files.
- Can't install only part of shadcn; the `init` command installs a full theme system.

**Assessment:** shadcn is an excellent starting point for neutral SaaS UIs. For a bespoke design system with strong brand tokens, it adds more coupling than it removes.

---

### Option C: Headless UI (by Tailwind Labs)

Unstyled component primitives from the Tailwind Labs team. Designed to pair with Tailwind CSS.

**Strengths:**
- Designed explicitly for Tailwind integration.
- Smaller API surface — fewer primitives, simpler to learn.

**Weaknesses:**
- Smaller component catalogue than Radix. As of 2026, Headless UI has: Menu, Listbox, Combobox, Switch, Disclosure, Dialog, Popover, RadioGroup, Tab. No Tooltip primitive.
- For Phase 1, the primary needed primitive is Tooltip. Headless UI has no Tooltip component — would require adding a second library.
- Less active maintenance cadence than Radix (Headless UI v2 released Dec 2023; Radix has more frequent releases).

---

### Option D: Material UI (MUI) / Ant Design / Chakra UI

Full design system libraries with comprehensive component sets and built-in themes.

**Strengths:**
- Fastest time-to-component for standard SaaS patterns.

**Weaknesses:**
- Each library enforces a visual system (Material Design, Ant's enterprise look, Chakra's neutral grey) that conflicts with the warm editorial brand.
- Overriding the default theme is non-trivial — MUI's `sx` prop and `createTheme` are powerful but add learning overhead.
- Significant bundle weight: MUI core is ~90 KB gzipped.
- The restyling effort to match the brand likely exceeds building from Radix primitives.

---

### Option E: Build from scratch

Implement Tooltip, Select, Modal, etc. without any library.

**Strengths:**
- Zero dependencies.
- Full control over implementation details.

**Weaknesses:**
- Correct ARIA for a Tooltip (role="tooltip", aria-describedby wiring, escape-to-dismiss, focus-within behaviour, pointer-events handling) is a multi-day task per component.
- Focus trapping for modals (preventing keyboard focus from leaving the overlay) is a well-known source of accessibility bugs.
- The ROI is negative: Radix provides this infrastructure for free; time is better spent on product features.

---

## Decision matrix

| Criterion | Radix UI | shadcn/ui | Headless UI | MUI/Chakra | From scratch |
|---|---|---|---|---|---|
| Unstyled (no theme conflict) | ✅ | ❌ Neutral theme | ✅ | ❌ Full theme | ✅ |
| Accessibility (ARIA/keyboard) | ✅ | ✅ (via Radix) | ✅ | ✅ | ❌ Manual |
| Has Tooltip primitive | ✅ | ✅ | ❌ | ✅ | ✅ (manual) |
| Bundle per component | ✅ 2–8 KB | ✅ (copy-paste) | ✅ Small | ❌ ~90 KB total | ✅ Zero |
| Phase 1 effort to integrate | ✅ Low | ⚠️ Restyle needed | ⚠️ No tooltip | ❌ High restyle | ❌ High build |
| Long-term maintenance | ✅ Library owned | ⚠️ Self-owned | ✅ Library owned | ✅ Library owned | ❌ Self-owned |

**Radix UI wins on being unstyled, having a Tooltip primitive, and low Phase 1 effort — all simultaneously.**

---

## Accessibility infrastructure provided by Radix Tooltip

The confidence score tooltip on ingredient rows requires:
- `role="tooltip"` on the content element.
- `aria-describedby` wiring between the trigger and tooltip.
- Keyboard-accessible trigger (Tab focusable; tooltip appears on focus, dismisses on Escape).
- Pointer event handling (show on hover, dismiss on mouse-out).
- Portal rendering (renders at `document.body` to escape any `overflow: hidden` ancestor).
- Animation (enter/exit transitions via `data-state` attribute).

Radix Tooltip provides all of these. Building them correctly from scratch would take 1–2 days. Radix takes 15 minutes to integrate.

---

## Revisit if

- React 19 Server Components become the architecture — Radix v2 has RSC-compatible variants; no major migration needed.
- The component count grows large enough that the multi-package pattern becomes unwieldy — evaluate upgrading to Radix Themes (styled variant) if the brand has converged enough.
