# ADR-008: TypeScript for the Frontend

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The backend has strict Pydantic-validated JSON contracts for four domain objects (ADR-004 through ADR-007). The frontend must consume these contracts. The question is whether the frontend enforces the same shapes at compile time (TypeScript) or leaves them as runtime duck-typed JavaScript.

## Decision

Use **TypeScript** for all frontend source files (`.ts`, `.tsx`).

## Reasoning

The ingredient input page alone consumes `SessionIngredientRead` (12 fields), `IngredientQuantity` (2 fields), and `PantrySessionRead` (20+ fields). A typo like `ingredient.confidence_score` vs `ingredient.conf` is a silent `undefined` in JavaScript and a compile error in TypeScript. Given the richness of the contracts already defined, not typing the frontend discards existing design work.

TypeScript also enables IDE autocomplete across the API response shapes — reducing the cognitive load of switching between backend ADRs and frontend component code.

## Trade-offs

- ~5 minutes of additional setup (tsconfig, vite plugin config).
- Some third-party libraries have incomplete type definitions — handled with `// @ts-ignore` or a local `.d.ts` shim where necessary.
- Developers unfamiliar with TypeScript face a learning curve on generics and union types.

## Revisit if

- The team expands to include engineers who find TypeScript a significant velocity blocker — evaluate `allowJs: true` to allow gradual migration.
