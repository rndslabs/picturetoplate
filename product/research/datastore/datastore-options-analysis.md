# Data Store Options Analysis — PictureToPlate

**Prepared:** April 2026  
**Author:** Deb (PM Lead / Architect)  
**Feeds into:** ADR-003

---

## What we needed from a data store

Before comparing options, we defined the requirements that any choice had to satisfy. We separated them into hard constraints (must-have) and soft preferences (nice-to-have).

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Multi-user, always-on | Web + mobile clients; no single-device or offline-only solutions |
| H2 | Relational integrity | `session → user`, `recipe → session`, `ingredient → catalog` links must be enforced, not application-managed |
| H3 | Flexible JSON payloads | Recipe steps, nutrition objects, and ingredient aliases are variable-length and nested; forcing them into rigid columns would make the schema brittle |
| H4 | Auth for web and mobile | The app handles household data including allergen profiles of children; auth cannot be an afterthought |
| H5 | Python / FastAPI compatible | Existing backend is FastAPI + Pydantic; the ORM or client must have a mature async Python driver |
| H6 | MVP cost ≤ $0/month | Build week; no budget for infrastructure until the product validates |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Real-time capability (WebSockets) | Future: live ingredient confirmation as the user edits the list |
| S2 | Vector search | Future: semantic recipe search ("something light with chicken") |
| S3 | Object storage co-located | Pantry scan images need to live somewhere; a single vendor reduces ops complexity |
| S4 | Mobile SDK (Flutter / React Native) | Avoids writing custom auth middleware for the mobile client |
| S5 | Managed migrations | Schema will evolve rapidly during build week |

---

## Options evaluated

### 1. PostgreSQL via Supabase ✅ CHOSEN

**What it is:** Supabase wraps a standard PostgreSQL 15 instance with a REST API (PostgREST), real-time subscriptions (via logical replication), auth (GoTrue), and object storage — all behind a single dashboard and set of client SDKs.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Multi-user, always-on | Supabase is a fully managed, always-on hosted Postgres |
| H2 Relational integrity | Full foreign key support, transactions, row-level security policies |
| H3 Flexible JSON | Native JSONB column type: indexable, queryable, stored in binary format |
| H4 Auth | Supabase Auth (GoTrue) covers email/password, OAuth (Google, Apple), magic link |
| H5 Python / FastAPI | `asyncpg` for low-level async; `SQLAlchemy 2.x` async ORM; `supabase-py` client |
| H6 Cost | Free tier: 500 MB DB storage, 1 GB object storage, unlimited API requests |
| S1 Real-time | Built-in via Postgres logical replication → WebSocket broadcast |
| S2 Vector search | `pgvector` extension available on Supabase Pro |
| S3 Object storage | Supabase Storage (S3-compatible) included |
| S4 Mobile SDK | Official Flutter, React Native, Swift, Kotlin SDKs |
| S5 Managed migrations | Supabase CLI supports versioned migration files |

**Weaknesses:**

- **Project pause policy:** Free tier projects are paused after 1 week of inactivity. A real-user test session that hits a paused project will fail with a cold-start delay of ~30 seconds. Must upgrade to Pro ($25/month) before any external user testing.
- **Supabase is an abstraction layer over Postgres:** If Supabase-specific features (auth, real-time) are used heavily, migrating off Supabase later (e.g. to RDS) requires replacing those layers. Mitigation: keep auth and real-time calls behind service interfaces in the backend, not called directly from the frontend.
- **JSONB is not type-enforced at the DB level:** Pydantic is the enforcement boundary. Any script or migration that writes directly to the DB can insert invalid JSON. Mitigation: never write to `recipe_cards.steps` or `nutrition_per_serving` outside the FastAPI service layer.
- **Supabase free compute is shared:** A sudden spike (e.g. a Reddit post) can cause slowdowns. Not a concern for build week but worth noting.

**Verdict:** Satisfies all 6 hard constraints and 5 of 5 soft preferences. No other option comes close on breadth at zero cost for an MVP.

---

### 2. MongoDB Atlas

**What it is:** A fully managed document database with a flexible BSON (JSON-superset) data model. Atlas includes Atlas Search (full-text), Atlas Vector Search, and App Services (auth, mobile sync).

**How it satisfies requirements:**

| Requirement | Assessment |
|---|---|
| H1 Multi-user, always-on | ✅ Atlas is fully managed and always-on |
| H2 Relational integrity | ❌ No native foreign keys. Referential integrity is application-enforced. A bug can leave orphaned recipe cards with no parent session |
| H3 Flexible JSON | ✅ Native document model — this is MongoDB's core strength |
| H4 Auth | ⚠️ Atlas App Services has auth but it is a separate product layer, less mature than Supabase Auth |
| H5 Python / FastAPI | ✅ `motor` (async MongoDB driver) works well with FastAPI |
| H6 Cost | ✅ Atlas free tier (M0): 512 MB storage, shared compute |
| S1 Real-time | ⚠️ Change Streams exist but require Atlas App Services trigger setup — significantly more configuration than Supabase |
| S2 Vector search | ✅ Atlas Vector Search is mature |
| S3 Object storage | ❌ Not included; requires AWS S3 or similar separately |
| S4 Mobile SDK | ✅ Realm SDK for mobile |
| S5 Managed migrations | ⚠️ MongoDB has no schema migrations concept by design; version discipline must be entirely in application code |

**The core problem:** H2 is a hard constraint. The PictureToPlate data model has three layers of entity ownership — a user owns sessions, sessions own recipe cards. Without DB-level foreign keys, a cascade delete (user deletes their account) requires carefully orchestrated application code. In a fast-moving build week, this is a meaningful risk of leaving orphaned records that corrupt the history view.

**Where MongoDB would win:** If the data model were entirely document-shaped with no cross-entity lookups — for example, a single `scan` document that embedded the full recipe cards and ingredients. We evaluated this "single-document" model but rejected it because:
1. Nutritional catalog data would be duplicated across every recipe card that contains chicken breast.
2. Querying "all recipes saved by this user across all sessions" becomes a collection scan rather than a join.

**Verdict:** Ruled out on H2 (relational integrity) and H3 is better served by Postgres JSONB for our mixed relational + document needs.

---

### 3. Firebase / Firestore

**What it is:** Google's serverless NoSQL document database with real-time sync, tightly coupled with Firebase Auth, Cloud Storage, and Cloud Functions.

**How it satisfies requirements:**

| Requirement | Assessment |
|---|---|
| H1 Multi-user, always-on | ✅ Fully managed, global CDN-backed |
| H2 Relational integrity | ❌ No foreign keys. Same problem as MongoDB, possibly worse — Firestore's document/subcollection model makes cross-collection joins expensive |
| H3 Flexible JSON | ✅ Native document model |
| H4 Auth | ✅ Firebase Auth is the best-in-class managed auth for mobile apps — Google/Apple/email/phone |
| H5 Python / FastAPI | ⚠️ `firebase-admin` Python SDK exists but is designed for server-side admin use, not a primary ORM. No async driver; must use a thread pool executor |
| H6 Cost | ✅ Spark (free) plan: 1 GB storage, 50k reads/day, 20k writes/day |
| S1 Real-time | ✅ Firestore's core feature — real-time listeners are excellent |
| S2 Vector search | ⚠️ Available as a preview feature via Vertex AI integration; not production-ready |
| S3 Object storage | ✅ Firebase Storage (GCS-backed) included |
| S4 Mobile SDK | ✅ Best-in-class Flutter, React Native SDKs |
| S5 Managed migrations | ❌ No migration tooling; schema evolution requires custom scripts and careful rollout |

**The core problems:**

1. **H2 relational integrity:** Same fundamental issue as MongoDB. Firestore's data model encourages denormalization (embedding recipes inside sessions inside users), which works until you need to display "all saved recipes across all scans" — then it requires either heavy denormalization or expensive fan-out writes.

2. **H5 Python/FastAPI async:** `firebase-admin` is synchronous. Wrapping it in `asyncio.run_in_executor` for every DB call adds overhead and complexity. This directly conflicts with FastAPI's async model.

3. **Vendor lock-in:** Firebase is a Google product. Firestore's query model (no joins, limited `OR` filters, no full-text without Algolia) means query requirements that seem trivial in SQL require workarounds. Migrating away later means rewriting the data access layer entirely.

4. **Pricing unpredictability:** The Spark free tier has per-operation limits (50k reads/day). A moderately viral day — or a mistake in the frontend that causes excessive reads — could exhaust the free quota. Firestore pricing is per operation, not per GB, which is hard to budget.

**Where Firebase would win:** A fully mobile-first app with real-time collaborative features, built by a team already in the Google ecosystem with no existing backend. For PictureToPlate, the Python FastAPI backend already exists, making Firebase's SDKs a poor fit.

**Verdict:** Ruled out on H2 (relational integrity), H5 (no async Python driver), and vendor lock-in risk.

---

### 4. PlanetScale (MySQL-compatible)

**What it is:** A serverless MySQL-compatible database built on Vitess (the same sharding layer that powers YouTube). Known for its branching model (database branches like git branches) and zero-downtime schema changes.

**How it satisfies requirements:**

| Requirement | Assessment |
|---|---|
| H1 Multi-user, always-on | ✅ Fully managed |
| H2 Relational integrity | ⚠️ PlanetScale **disables foreign key constraints** by design (Vitess limitation). Referential integrity is again application-enforced |
| H3 Flexible JSON | ✅ MySQL 8 has a `JSON` column type, but it is less capable than Postgres JSONB — no GIN indexing, limited operators |
| H4 Auth | ❌ No built-in auth; requires a separate service |
| H5 Python / FastAPI | ✅ Standard `aiomysql` or `asyncmy` async drivers |
| H6 Cost | ✅ Hobby (free) plan: 5 GB storage, 1 billion row reads/month |
| S1–S5 | ❌ No real-time, no vector search, no object storage, no mobile SDK, limited migration tooling |

**Fatal flaw:** PlanetScale explicitly disables foreign key constraints to enable horizontal sharding. This re-introduces the same relational integrity gap as MongoDB and Firestore — exactly what we need to avoid.

**Verdict:** Ruled out on H2 (foreign key constraints disabled) and H4 (no auth).

---

### 5. SQLite (local file)

Included for completeness — this was ruled out immediately.

SQLite is a single-file, single-process database. It has no concept of multiple concurrent connections from different machines. A web client and a mobile client hitting the same backend would be fine if the backend is a single instance, but:

- Multiple backend instances (for scale or redundancy) would each have their own SQLite file — data diverges.
- No cloud hosting; the file lives on the server's disk. A server restart or redeploy loses all data unless the disk is persistent.
- No auth, no real-time, no object storage, no mobile SDK.

**Verdict:** Not viable for a multi-client, hosted application.

---

## Side-by-side comparison

| Criterion | PostgreSQL (Supabase) | MongoDB Atlas | Firebase/Firestore | PlanetScale |
|---|---|---|---|---|
| Foreign keys / relational integrity | ✅ Full | ❌ None | ❌ None | ❌ Disabled |
| Flexible JSON columns | ✅ JSONB (indexed) | ✅ Native document | ✅ Native document | ⚠️ JSON (limited) |
| Built-in auth | ✅ Supabase Auth | ⚠️ App Services | ✅ Firebase Auth | ❌ |
| Async Python driver | ✅ asyncpg | ✅ motor | ❌ Sync only | ✅ asyncmy |
| Real-time / WebSockets | ✅ Built-in | ⚠️ Requires setup | ✅ Core feature | ❌ |
| Object storage included | ✅ Supabase Storage | ❌ | ✅ Firebase Storage | ❌ |
| Mobile SDK | ✅ | ✅ Realm | ✅ Best-in-class | ❌ |
| Vector search | ✅ pgvector (Pro) | ✅ Atlas Vector | ⚠️ Preview | ❌ |
| Managed migrations | ✅ Supabase CLI | ❌ | ❌ | ✅ Branching model |
| Free tier storage | 500 MB | 512 MB | 1 GB | 5 GB |
| Free tier write limits | Unlimited | Unlimited | 20k writes/day | Unlimited |
| Vendor lock-in risk | Low (standard Postgres) | Medium | High (Google ecosystem) | Medium |
| Hard constraints met (of 6) | **6 / 6** | 4 / 6 | 4 / 6 | 3 / 6 |

---

## Decision rationale summary

PostgreSQL via Supabase is the only option that satisfies all six hard constraints simultaneously. The key differentiators:

1. **Relational integrity is non-negotiable.** The user → session → recipe ownership chain must be enforced at the database level, not application logic. MongoDB, Firestore, and PlanetScale all fail here.

2. **JSONB gives us both worlds.** Recipe steps, nutrition objects, and allergen lists are variable-depth JSON — a pure relational schema would require many nullable columns or EAV anti-patterns. JSONB stores them as binary, supports GIN indexing, and can be queried with `->` operators. No separate document DB needed.

3. **Supabase bundles what would otherwise be four separate services** (Postgres hosting, auth, object storage, real-time). For a build-week MVP with a small team, reducing the number of vendor accounts, API keys, and integration points is a meaningful time saving.

4. **Standard Postgres underneath means low lock-in.** If Supabase pricing or reliability becomes a problem at scale, the migration path is straightforward: export the Postgres dump, point the connection string at RDS or Railway, and swap out Supabase Auth for Auth0 or Clerk. The SQL schema and queries are portable.

---

## What to revisit post-MVP

| Trigger | Action |
|---|---|
| DAU > 10k | Migrate from Supabase shared compute to dedicated Postgres on RDS or Railway |
| Semantic recipe search needed | Enable `pgvector` on Supabase Pro; store recipe embeddings alongside recipe cards |
| Offline-first mobile required | Add WatermelonDB or SQLite local cache on mobile, sync via Supabase real-time |
| Per-user query latency > 200ms p95 | Profile with `pg_stat_statements`; add indexes before changing DB platform |
| International expansion | Evaluate multi-region Postgres (Neon, CockroachDB) for read replica placement |
