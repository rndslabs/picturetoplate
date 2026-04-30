# Architecture Research: Python ORM / Database Access Layer

**Decision:** Use SQLAlchemy 2.x with async support as the ORM  
**Prepared:** April 2026  
**Feeds into:** ADR-003

---

## What we needed from a database access layer

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Async I/O | FastAPI routes are `async def`; a synchronous ORM blocks the event loop on every DB call, eliminating async's benefits |
| H2 | PostgreSQL JSONB support | `recipe_cards` and `pantry_sessions` store variable-depth JSON in JSONB columns; the ORM must handle JSONB natively |
| H3 | Alembic compatibility | Schema migrations are managed by Alembic; the ORM's metadata must feed directly into Alembic's autogenerate |
| H4 | Python type annotations | SQLAlchemy 2.x `Mapped[]` syntax gives type-safe column access; we need IDE autocompletion and `mypy` compatibility across the codebase |
| H5 | Mature and production-proven | User allergen profiles are safety-critical data; the ORM must not have known data-loss bugs |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Pydantic v2 interoperability | Schemas and ORM models should map cleanly; `model_config = {"from_attributes": True}` enables direct ORM → Pydantic conversion |
| S2 | Relationship loading (lazy vs eager) | Sessions reference ingredients; recipes reference sessions; explicit loading control prevents N+1 query bugs |
| S3 | Raw SQL escape hatch | Complex nutritional aggregation queries may be easier to write in SQL than ORM expressions |
| S4 | Connection pooling | Under concurrent load, a pool of persistent connections is significantly faster than re-connecting per request |

---

## Options evaluated

### 1. SQLAlchemy 2.x (async) ✅ CHOSEN

**What it is:** The most widely used Python ORM, completely redesigned in version 2.0. The 2.x release introduced `Mapped[]` type annotations, a native async engine via `asyncpg`, and the `async_sessionmaker` pattern. Version 1.4 was the transitional release; 2.0 is the stable, async-first API.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Async | `create_async_engine` + `AsyncSession` + `async_sessionmaker`; all DB calls use `await` |
| H2 JSONB | `from sqlalchemy.dialects.postgresql import JSONB` — first-class dialect support |
| H3 Alembic | Alembic is made by the same team as SQLAlchemy; `Base.metadata` feeds `target_metadata` directly in `env.py` |
| H4 Type annotations | `Mapped[str]`, `Mapped[Optional[int]]` — mypy and Pyright understand these natively |
| H5 Maturity | Released 2006; used at scale by Airbnb, Reddit, Dropbox; 2.0 stable since January 2023 |
| S1 Pydantic | `model_config = {"from_attributes": True}` — Pydantic reads ORM attributes directly |
| S2 Relationship loading | `selectinload()`, `joinedload()`, `lazy="raise"` — explicit and configurable per query |
| S3 Raw SQL | `session.execute(text("SELECT ..."))` — first-class raw SQL support |
| S4 Connection pooling | `pool_size=5`, `max_overflow=10` configured on `create_async_engine` |

**Weaknesses:**
- **Verbosity:** The `Mapped[]` declarative style is more verbose than dataclass-style ORMs. A `User` model with 10 columns takes ~25 lines. Acceptable for our domain size; would be painful for 50+ columns.
- **`Optional` on Python 3.9:** The `X | None` union syntax requires Python 3.10+. On 3.9, all nullable columns must use `Optional[X]` from `typing`. This was a real friction point during scaffolding.
- **Async session lifecycle:** `expire_on_commit=False` must be set explicitly; forgetting it causes `MissingGreenlet` errors in async contexts after a commit.
- **Learning curve:** The 2.x API is significantly different from 1.x. Developers familiar with SQLAlchemy 1.x need to un-learn the `session.query()` pattern.

---

### 2. Tortoise ORM

**What it is:** An async-first ORM inspired by Django's ORM, designed from the ground up for `asyncio`. Uses a syntax similar to Django models (`CharField`, `ForeignKeyField`) rather than SQLAlchemy's declarative base.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Async | ✅ Built for async; uses `asyncpg` as its PostgreSQL driver |
| H2 JSONB | ⚠️ `JSONField` is available but stores data as text in some configurations; JSONB-specific operators (`@>`, `->>`) require raw SQL |
| H3 Alembic | ❌ Tortoise ORM uses Aerich for migrations, not Alembic. Alembic cannot read Tortoise metadata — a complete migration toolchain swap |
| H4 Type annotations | ⚠️ Tortoise fields are not natively understood by mypy without a plugin; type stubs exist but are community-maintained |
| H5 Maturity | ⚠️ Stable but significantly younger than SQLAlchemy; fewer production deployments at scale |
| S1 Pydantic | ✅ `tortoise.contrib.pydantic` module exists for generating Pydantic models from Tortoise models |
| S2 Relationship loading | ✅ `prefetch_related()`, `select_related()` |

**The core problem:** Tortoise ORM is not compatible with Alembic (H3). Since we chose Alembic for migrations, the ORM must be SQLAlchemy. Switching to Tortoise would require replacing Alembic with Aerich — a cascading change that touches `migrations/env.py`, all migration scripts, and the Alembic documentation and team knowledge.

**Where Tortoise wins:** Projects that start fresh with async and prefer Django-style model syntax. The `init_models()` bootstrap is simpler than SQLAlchemy's engine + sessionmaker pattern.

**Verdict:** Ruled out on H3 (Alembic incompatibility).

---

### 3. SQLModel

**What it is:** A library by the creator of FastAPI that combines SQLAlchemy and Pydantic into a single model class. A `SQLModel` class serves as both the ORM table definition and the Pydantic schema, eliminating the need to maintain separate model and schema classes.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Async | ✅ Built on SQLAlchemy 2.x; inherits full async support |
| H2 JSONB | ✅ Inherits SQLAlchemy's PostgreSQL dialect |
| H3 Alembic | ✅ SQLModel's metadata is SQLAlchemy metadata; Alembic reads it normally |
| H4 Type annotations | ✅ Pydantic-style type annotations on all fields |
| H5 Maturity | ⚠️ SQLModel is relatively new (2021); version 0.x; known breaking changes between releases |
| S1 Pydantic | ✅ This is SQLModel's core value proposition |

**Why it was not chosen:**

SQLModel's promise — one class for ORM and API schema — works well for simple models but breaks down for our use case:

1. **DB shape ≠ API shape.** `UserPreferences` in the DB stores `nutrition_goals` as JSONB. The API returns it as a nested `NutritionGoals` Pydantic object. A single class cannot cleanly represent both shapes.
2. **`SessionIngredient` flat vs nested quantity.** The DB stores `quantity_amount` (float) and `quantity_unit` (string) as flat columns. The API returns `{amount: float, unit: string}` as a nested `IngredientQuantity` object. A single model class cannot express this without custom `@property` definitions that break SQLModel's reflection.
3. **Version instability.** SQLModel 0.x has had several breaking changes. Production use requires pinning to a specific version with known migration paths — the documentation lags behind the code.

**Verdict:** Appealing in theory; not appropriate when DB shape and API shape diverge significantly (which they do throughout our schema). SQLAlchemy + Pydantic as separate layers gives clearer separation.

---

### 4. Raw `asyncpg` (no ORM)

**What it is:** `asyncpg` is a high-performance async PostgreSQL driver. Used directly, it means writing SQL strings for every query — no ORM abstraction, no model classes, no migration metadata.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Async | ✅ Fastest possible async PostgreSQL access in Python |
| H2 JSONB | ✅ `asyncpg` handles JSONB encoding/decoding natively |
| H3 Alembic | ❌ Alembic requires SQLAlchemy metadata to autogenerate migrations. Without SQLAlchemy models, all migration scripts must be hand-written. |
| H4 Type annotations | ❌ `asyncpg` returns `Record` objects; fields accessed by string key — no type safety |
| H5 Maturity | ✅ Extremely stable; maintained by MagicStack |
| S3 Raw SQL | ✅ This is the entire interface |
| S4 Connection pooling | ✅ Built-in connection pool |

**Where raw asyncpg wins:** Maximum performance applications where SQL is hand-tuned for every query and ORM abstraction is a liability. At PictureToPlate's MVP scale (<10k DAU), the performance difference between SQLAlchemy async and raw asyncpg is immeasurable.

**The cost of no ORM:**
- Every insert, update, and select requires a hand-written SQL string
- Alembic autogenerate does not work; every migration is manually written
- No relationship loading helpers — joins must be hand-written
- No type safety on column access — `row["user_id"]` vs `user.user_id`

This would cost more developer time than it saves in performance at our scale.

**Verdict:** Ruled out on H3 (Alembic autogenerate requires SQLAlchemy metadata) and H4 (no type safety). SQLAlchemy uses `asyncpg` as its driver internally — we get both.

---

## Side-by-side comparison

| Criterion | SQLAlchemy 2.x | Tortoise ORM | SQLModel | Raw asyncpg |
|---|---|---|---|---|
| Async native | ✅ | ✅ | ✅ | ✅ |
| JSONB dialect support | ✅ First-class | ⚠️ Partial | ✅ | ✅ |
| Alembic compatible | ✅ | ❌ | ✅ | ❌ |
| Python type annotations | ✅ `Mapped[]` | ⚠️ Plugin needed | ✅ | ❌ |
| Production maturity | ✅ 18 years | ⚠️ 4 years | ⚠️ 3 years | ✅ |
| Pydantic interop | ✅ `from_attributes` | ✅ contrib module | ✅ Native | ❌ Manual |
| Relationship loading | ✅ Explicit | ✅ | ✅ | ❌ Manual JOIN |
| Raw SQL escape hatch | ✅ `text()` | ✅ `raw()` | ✅ | ✅ Native |
| Connection pooling | ✅ Configurable | ✅ | ✅ | ✅ |
| Hard constraints met (of 5) | **5 / 5** | 4 / 5 | 4 / 5 | 3 / 5 |

---

## Decision rationale summary

SQLAlchemy 2.x is the only option that satisfies all five hard constraints. The Alembic constraint (H3) alone eliminates Tortoise ORM and raw asyncpg. SQLModel is eliminated by the DB/API shape divergence in our domain.

The `Mapped[]` type annotation system, introduced in SQLAlchemy 2.0, is specifically what makes the codebase maintainable: every column is statically typed, IDE autocompletion works correctly, and `mypy` catches type errors before runtime. Given that we have eight ORM models with cross-references, untyped column access would be a significant source of bugs.

---

## Revisit if

- We need to support multiple databases (e.g. SQLite for local tests, Postgres in production) — SQLAlchemy's dialect abstraction handles this natively.
- Query performance becomes a bottleneck — profile with `pg_stat_statements`; drop to raw `asyncpg` for specific hot-path queries while keeping SQLAlchemy for the rest.
- The team grows and newer engineers find SQLAlchemy's verbosity a barrier — evaluate SQLModel again once it reaches 1.0 stability.
