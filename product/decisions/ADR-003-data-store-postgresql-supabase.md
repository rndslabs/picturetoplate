# ADR-003: Data Store — PostgreSQL via Supabase

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

PictureToPlate requires persistent storage for:

- User accounts, household settings, and dietary preferences
- Pantry scan sessions (image → detected ingredients → confirmed list → recipe cards)
- Generated and saved recipe cards (including nutritional summaries)
- A nutritional data catalog backing each detected ingredient

The app targets **busy parents and caregivers** via both a mobile app and a web page. This means multi-user, always-on storage accessible from two clients. SQLite (local file) is ruled out immediately. We evaluated PostgreSQL (self-hosted or managed), MongoDB, and Firebase/Firestore.

## Decision

Use **PostgreSQL** as the primary relational store, hosted on **[Supabase](https://supabase.com)**.

All structured entities (users, sessions, recipes) live in normalized PostgreSQL tables. Flexible, schema-variable fields (recipe `steps`, `nutrition_per_serving`, ingredient `aliases`) use PostgreSQL **JSONB** columns so they can be queried and indexed without a separate document store.

The static **nutritional catalog** (USDA/Open Food Facts data) is seeded once into a `nutrition_catalog` table and treated as read-only reference data.

## Reasoning

| Requirement | Why PostgreSQL + Supabase |
|---|---|
| Multi-user, multi-client | Supabase is a hosted, always-on Postgres instance with a REST and real-time layer |
| Strict relational integrity | Foreign keys enforce session → user, recipe → session links |
| Flexible recipe/nutrition payloads | JSONB columns avoid the need for a separate document DB |
| Auth out of the box | Supabase Auth covers email/password and social OAuth for both web and mobile |
| Mobile SDK | Supabase Flutter/React Native SDKs avoid writing custom auth middleware |
| FastAPI compatibility | `asyncpg` + `SQLAlchemy 2.x` async ORM integrates cleanly with the existing FastAPI backend |
| Cost at MVP | Supabase free tier (500 MB, unlimited API calls) covers the build week and early launch |

MongoDB would provide native JSON storage but loses relational integrity (user ↔ session ↔ recipe links become application-enforced). Firebase is operationally simpler but introduces vendor lock-in and a NoSQL data model that is harder to query for nutritional aggregation or recipe filtering.

## Trade-offs

- Supabase free tier has a **project pause** policy after 1 week of inactivity. Switch to the Pro tier before user testing with real families.
- JSONB payloads for steps/nutrition are **not type-enforced at the DB level** — Pydantic models in FastAPI are the enforcement boundary. Any direct DB write that bypasses the API can insert malformed JSON.
- Supabase real-time (WebSockets for live ingredient confirmation) is available but not required for v1.

## Schema overview (tables)

```
users                 — profile, household, created_at
user_preferences      — dietary restrictions, allergens, cuisine tags, skill level
pantry_sessions       — one row per scan; links user, input_method, status
session_ingredients   — detected/confirmed/added ingredients per session
ingredient_catalog    — canonical ingredient list with category and aliases
nutrition_catalog     — per-ingredient nutritional values (per 100 g)
recipe_cards          — generated recipes; JSONB for steps, ingredients_used, nutrition
saved_recipes         — user ↔ recipe_card join with rating and notes
```

Full column definitions are maintained in `dev/backend/migrations/`.

## Revisit if

- Daily active users exceed 10 k and Supabase compute becomes a bottleneck — migrate to a dedicated RDS instance.
- The team needs full-text semantic recipe search — add `pgvector` extension (Supabase supports it).
- Offline-first mobile mode is required — add a local SQLite cache synced via Supabase real-time.
