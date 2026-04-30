# Research: TypeScript vs JavaScript for Frontend

**Decision recorded in:** ADR-008  
**Outcome:** TypeScript

---

## The question

Should the frontend be written in TypeScript (statically typed) or plain JavaScript? The question matters most for teams that value velocity over safety, or for projects where the type overhead exceeds the bug-prevention benefit.

---

## Options evaluated

### Option A: TypeScript (chosen)

TypeScript is a typed superset of JavaScript. All `.ts` / `.tsx` files are compiled by the TypeScript compiler (`tsc`) to plain JavaScript. Type errors are caught at build time; the runtime is still JS.

**Strengths:**
- Compile-time errors for property access mistakes (`ingredient.conf` vs `ingredient.confidence_score`).
- IDE autocomplete across the full API response shape — reduces the need to switch between backend ADRs and frontend code.
- Refactoring safety: rename a field in the type definition and every usage lights up immediately.
- Four domain objects with 12–20 fields each are already defined in ADRs 004–007. Encoding them as TypeScript interfaces costs ~30 minutes and pays back on every component that consumes the data.

**Weaknesses:**
- ~5 minutes of extra setup (tsconfig, Vite plugin).
- Generic types and union syntax have a learning curve for developers new to TypeScript.
- Some third-party libraries have incomplete or wrong type definitions.

---

### Option B: Plain JavaScript

No compilation step for types. Files are `.js` / `.jsx`.

**Strengths:**
- No config overhead.
- Lower barrier for developers unfamiliar with TypeScript.

**Weaknesses:**
- A typo like `ingredient.conf_score` silently evaluates to `undefined` instead of throwing at build time.
- No autocomplete for API response shapes — developers must mentally track field names from ADRs.
- As the codebase grows (Recipes page, History page, Preferences page) the absence of types compounds — each new component re-introduces the same runtime risk.
- JSDoc type annotations can add back some of the type benefit, but they are non-enforced comments, not compiler guarantees.

---

### Option C: TypeScript with `allowJs: true` (gradual migration path)

Allows `.js` and `.ts` files to coexist in the same project. Useful when migrating a large existing JavaScript codebase.

**Not applicable here** — the project has no existing JavaScript frontend. Starting with `allowJs: true` gains nothing and adds configuration noise.

---

## Decision matrix

| Criterion | TypeScript | JavaScript | Weight |
|---|---|---|---|
| Catches API shape errors at compile time | ✅ Yes | ❌ No | High |
| IDE autocomplete for API responses | ✅ Full | ⚠️ Partial (JSDoc) | High |
| Setup overhead | ⚠️ 5 min | ✅ Zero | Low |
| Learning curve | ⚠️ Moderate | ✅ Low | Medium |
| Scales to multi-page app | ✅ Well | ⚠️ Degrades | High |
| Works with Vite | ✅ Native | ✅ Native | — |

**TypeScript wins on the three high-weight criteria.**

---

## Key constraint that drove the decision

The backend already defines four richly structured JSON contracts (ADRs 004–007). Not encoding those contracts as TypeScript types means discarding design work that has already been done — and replacing guaranteed compile-time checks with error-prone runtime duck-typing.

---

## Revisit if

- The team expands to include engineers who find TypeScript a significant velocity blocker — evaluate `allowJs: true` to allow a gradual adoption path.
- The project migrates to React Server Components (Next.js) — TypeScript support is first-class and no change is needed; this note is informational only.
