# ADR-012: Desktop-First Layout at 1280px (MacBook Pro)

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The target persona (busy parents and caregivers) will initially access the web product from a laptop during meal planning — not from mobile. The wireframe is explicitly designed at 1280×800 (MacBook Pro 13" logical resolution). A responsive-first approach would defer the desktop design to breakpoint overrides, which is backwards for a design already specified at desktop width.

## Decision

Build the ingredient input page at **1280px as the primary viewport**. Use Tailwind's `lg:` and `xl:` breakpoints defensively (to prevent overflow on larger screens), and `md:` breakpoints to stack the two-column layout on tablet. Mobile layout is deferred to Phase 2.

**Target resolutions:**

| Device | Logical resolution | Priority |
|---|---|---|
| MacBook Pro 13" | 1280 × 800 | **Phase 1 primary** |
| MacBook Pro 14" | 1512 × 982 | Phase 1 (test) |
| MacBook Pro 16" | 1728 × 1117 | Phase 1 (test) |
| iPad landscape | 1024 × 768 | Phase 2 |
| Mobile | 390 × 844 | Phase 2 |

## Reasoning

The mobile app (React Native / Flutter) covers the mobile surface area. The web product's primary job is the laptop/desktop planning session — a focused meal-prep moment, not a one-handed mobile interaction. Building the desktop layout first matches the design artefact and avoids the responsive-degradation problem (designing for small then expanding is harder when the design is inherently two-pane).

## Trade-offs

- The two-pane `1.4fr 1fr 1fr` grid becomes a single column below `md:` (768px). The stacked layout is functional but not yet designed — Phase 2 designs the collapsed state intentionally.
- The app will appear broken on mobile browsers until Phase 2. Acceptable given the mobile app will handle that surface.

## Revisit if

- User research shows meaningful web traffic from mobile devices — design the collapsed layout before Phase 2 planned date.
- The mobile native app is delayed beyond 3 months — prioritise responsive web earlier.
