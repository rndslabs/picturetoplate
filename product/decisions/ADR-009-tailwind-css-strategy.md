# ADR-009: Tailwind CSS + CSS Custom Properties for Frontend Styling

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The brand design system is defined in `brand.css` as CSS custom properties (`--paper`, `--ink`, `--sage`, etc.) with a complete dark-mode counterpart under `.theme-dark`. The wireframe uses inline React styles referencing these tokens. A production component library needs a scalable styling strategy that preserves the existing token system without redefining it.

## Decision

Use **Tailwind CSS v3** for layout, spacing, and responsive utilities. Extend `tailwind.config.ts` to map brand tokens to Tailwind colour/font/radius keys. Keep `brand.css` as the single source of truth for CSS custom property values — Tailwind references them via `var(--token)`, never hardcodes hex values.

```ts
// tailwind.config.ts (excerpt)
colors: {
  paper:        'var(--paper)',
  ink:          'var(--ink)',
  sage:         'var(--sage)',
  'sage-soft':  'var(--sage-soft)',
  // ...
}
```

This allows `className="bg-paper text-ink border-hairline"` in components while all actual hex values remain in `brand.css`.

## Reasoning

The two-column `1.4fr 1fr 1fr` grid and responsive collapse are trivial in Tailwind (`grid-cols-[1.4fr_1fr_1fr]`, breakpoint variants) and tedious in vanilla CSS or CSS Modules. The token mapping approach means dark mode works automatically — toggling `.theme-dark` on the root element changes the CSS variables; Tailwind classes reference variables, so they pick up the theme change without any component changes.

## Trade-offs

- Tailwind's opacity modifier syntax (`bg-paper/50`) does not work when color values are `var()` references rather than RGB channels. Mitigation: use `opacity` utility or `rgba()` arbitrary values for the rare cases where transparency is needed (e.g. `bg-[rgba(27,36,32,0.06)]` for `--hairline-2`).
- Long class strings reduce readability for complex components. Mitigation: extract repeated patterns into small named components rather than utility-dumping into one element.

## Revisit if

- The team migrates to Tailwind v4 (CSS-native config) — the token mapping approach is even more natural there.
- Dark mode needs to be toggled at runtime (not just via CSS class) — add `darkMode: 'class'` to Tailwind config and wire to a theme toggle component.
