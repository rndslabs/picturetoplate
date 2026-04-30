# Research: Data Fetching — Plain fetch + useState vs TanStack Query vs SWR

**Decision recorded in:** ADR-010  
**Outcome:** Plain fetch + useState for Phase 1; TanStack Query deferred to Phase 2

---

## The question

Which data-fetching strategy should the ingredient input page use for its two async API calls (`POST /api/detect-ingredients` and `POST /api/generate-recipes`)? The choice determines how loading state, error state, and caching are managed.

---

## Options evaluated

### Option A: Plain fetch + useState (chosen for Phase 1)

Each async operation is managed with three `useState` values: `isLoading`, `error`, and `data`. The fetch call is made inside an event handler or `useEffect`.

```ts
const [isDetecting, setIsDetecting] = useState(false)
const [session, setSession] = useState<PantrySessionRead | null>(null)
const [error, setError] = useState<Error | null>(null)

async function handleDetect(file: File) {
  setIsDetecting(true)
  try {
    const result = await detectIngredients(file)
    setSession(result)
  } catch (e) {
    setError(e as Error)
  } finally {
    setIsDetecting(false)
  }
}
```

**Strengths:**
- Zero additional dependencies.
- Explicit, readable state machine — no abstraction layer between the call and the UI.
- Phase 1 uses mock data exclusively; the mock function has the same signature as the real fetch, so switching is a one-line change (`USE_MOCK = false`).
- Sufficient for a single-page, two-call use case.

**Weaknesses:**
- Manual error/loading state per call — no automatic retry.
- No request deduplication (mitigated by disabling the upload zone while `isDetecting === true`).
- Does not cache responses across page navigations (irrelevant for Phase 1 — there is only one page).

---

### Option B: TanStack Query (React Query)

A server-state library that manages fetching, caching, background revalidation, deduplication, and retry with exponential backoff.

**Strengths:**
- Automatic retry on network failure.
- Cache sharing: if the History page and Recipes page both need the same session data, TanStack Query deduplicates the fetch and serves from cache.
- `useQuery` / `useMutation` hooks replace the manual `useState` pattern.
- DevTools for inspecting cache state.

**Weaknesses:**
- Adds ~13 KB gzipped to the bundle.
- Adds a `QueryClientProvider` wrapper to the component tree.
- The caching and deduplication features add value only when multiple pages share server state — not applicable to a single-page MVP.
- `useMutation` for the detect endpoint is slightly awkward (mutations are typically for write operations; image detection is a POST that returns read data).

**When it becomes worth it:** When the Recipes page and History page are built and they share session data. At that point, the cost of the library is amortized across many hooks.

---

### Option C: SWR (Stale-While-Revalidate)

Vercel's lighter alternative to TanStack Query. ~4 KB gzipped.

**Strengths:**
- Smaller than TanStack Query.
- Simple `useSWR(key, fetcher)` API.

**Weaknesses:**
- `useSWR` is optimised for GET requests. The two ingredient page calls are POST mutations; `useSWRMutation` is more verbose and less ergonomic than TanStack Query's `useMutation`.
- Still adds a dependency for a use case that `useState` handles cleanly.
- Less community adoption than TanStack Query — fewer answers to edge-case questions.

---

### Option D: React's built-in `use()` hook (React 19+)

In React 19, `use(promise)` allows suspending a component on a promise. Pairs with Suspense for loading states.

**Not yet applicable** — React 18 is the target. The `use()` API is experimental in React 18 and stable only in React 19. Revisit when upgrading.

---

## Decision matrix

| Criterion | fetch + useState | TanStack Query | SWR |
|---|---|---|---|
| Bundle cost | ✅ Zero | ⚠️ +13 KB | ⚠️ +4 KB |
| Cross-page cache sharing | ❌ None | ✅ Full | ✅ Full |
| Automatic retry | ❌ Manual | ✅ Yes | ✅ Yes |
| Request deduplication | ❌ Manual guard | ✅ Yes | ✅ Yes |
| Setup complexity | ✅ None | ⚠️ Provider + config | ⚠️ Provider |
| Fits POST mutation pattern | ✅ Direct | ⚠️ useMutation | ⚠️ useSWRMutation |
| Phase 1 value (1 page, mock data) | ✅ Perfect fit | ❌ Overkill | ❌ Overkill |

**fetch + useState is the right fit for Phase 1. TanStack Query becomes the right fit when Phase 2 introduces cross-page state.**

---

## Mock data strategy

Phase 1 uses mock data exclusively. The API module is structured so switching to the real backend is a one-line change:

```ts
// src/api/detectIngredients.ts
export const USE_MOCK = true  // flip to false to hit live backend
```

The mock function returns a `PantrySessionRead` object matching the ADR-007 contract after a 2-second simulated delay, exercising the same loading/error UI that the real call will trigger.

---

## Revisit if

- The Recipes and History pages are built — introduce TanStack Query at that point.
- Network reliability becomes a concern (flaky connections) — TanStack Query's automatic retry with exponential backoff is worth adding.
- React 19 is adopted — evaluate the `use()` hook for suspense-based data fetching.
