# ADR-011: Radix UI Primitives for Accessible Interactive Components

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The ingredient input page requires several interactive widgets: a confidence score tooltip, a unit-of-measure selector, and future modals (allergen warning, voice recording overlay). Building these correctly from scratch — with focus trapping, keyboard navigation, ARIA attributes, and screen reader support — is a multi-day task per component.

## Decision

Use **Radix UI primitives** (`@radix-ui/react-tooltip`, `@radix-ui/react-select`, etc.) for interactive widgets that require accessibility infrastructure. Provide all visual styling from scratch using Tailwind and brand tokens. Do not import any Radix visual theme.

Phase 1 installs only `@radix-ui/react-tooltip`. Additional primitives are added per screen as needed.

## Reasoning

Radix primitives are unstyled by design — they provide the behaviour (ARIA roles, keyboard handling, focus management, portal rendering) and nothing else. This is the correct fit for a bespoke design system: we never fight against default styles. The accessibility infrastructure (which is non-trivial to implement correctly for tooltips and dropdowns) is provided for free.

The alternative — shadcn/ui — pre-styles Radix components with a neutral grey theme that conflicts with the warm editorial brand. Every shadcn component would need restyling that approaches the effort of building from scratch.

## Trade-offs

- Each Radix primitive is a separate npm package. Installing 6 primitives means 6 packages in `package.json`. Tree-shaking keeps bundle impact per package small (~2–8 KB gzipped each).
- Radix primitives have an API surface that takes time to learn (Trigger, Content, Portal pattern). New team members need to read the Radix docs for each new component type.

## Revisit if

- We move to React 19 Server Components — Radix v2 has RSC-compatible variants.
- Accessibility requirements tighten (e.g. WCAG 2.2 AA audit) — Radix is already compliant; no change needed.
