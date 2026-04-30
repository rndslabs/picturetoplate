# ADR-010: Plain fetch + useState for Data Fetching (Phase 1)

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The ingredient input page makes two async API calls: `POST /api/detect-ingredients` (image → ingredient names) and eventually `POST /api/generate-recipes`. The question is whether to introduce a server-state library (TanStack Query, SWR) immediately or use native browser `fetch` with React `useState` for Phase 1.

## Decision

Use **plain `fetch` + `useState`** for Phase 1 (the ingredient input page). Introduce TanStack Query when the Recipes page and History page are built and cross-page cache sharing becomes necessary.

## Reasoning

A single page with two API calls does not justify a server-state library. The caching, deduplication, and background revalidation features of TanStack Query add value when multiple pages share the same data (e.g., a session fetched on the History page and re-used on the Recipes page). For one page, `isLoading`, `error`, and `data` as `useState` values are sufficient and require zero additional dependencies.

Phase 1 uses **mock data** — no real API calls are made. The mock function signature matches the real fetch function signature exactly, so switching is a one-line change when the backend is connected.

```ts
// src/api/detectIngredients.ts
export const USE_MOCK = true  // flip to false to hit live backend

export async function detectIngredients(file: File): Promise<string[]> {
  if (USE_MOCK) return detectIngredientsMock(file)
  // ... real fetch
}
```

## Trade-offs

- Manual loading/error state per call — no automatic retry. Acceptable for MVP; the UI shows a retry button on error.
- No request deduplication — if the user somehow triggers two detections simultaneously, both run. Mitigated by disabling the upload zone while `isDetecting === true`.

## Revisit if

- The Recipes and History pages are built and need to share session data — introduce TanStack Query at that point.
- Network reliability becomes a concern (mobile users on flaky connections) — TanStack Query's automatic retry with exponential backoff is worth adding.
