# Directory Structure — PictureToPlate

**Last updated:** April 2026

---

## Repository root

```
picturetoplate/
├── dev/
│   ├── backend/                  ← Python / FastAPI backend
│   └── README.md
├── frontend/                     ← React frontend (not yet scaffolded)
├── product/
│   ├── architecture/             ← This folder — system design docs
│   ├── decisions/                ← Architecture Decision Records (ADRs)
│   ├── research/                 ← Options analyses and trade-off notes
│   ├── sprint-notes/
│   └── wireframes/
└── CLAUDE.md                     ← Coding agent instructions
```

---

## Backend (`dev/backend/`)

```
dev/backend/
│
├── app/                          ← Importable Python package (uvicorn app.main:app)
│   │
│   ├── main.py                   ← FastAPI app factory: CORS, rate limiter, router mount
│   │
│   ├── core/
│   │   ├── config.py             ← Pydantic Settings: reads dev/.env, cached via lru_cache
│   │   └── database.py           ← Async SQLAlchemy engine + AsyncSession factory + get_db()
│   │
│   ├── api/
│   │   └── routes.py             ← HTTP endpoints: /detect-ingredients, /generate-recipes, /health
│   │
│   ├── models/                   ← SQLAlchemy ORM — one class per DB table
│   │   ├── base.py               ← DeclarativeBase + TimestampMixin (created_at, updated_at)
│   │   ├── user.py               ← User, UserPreferences
│   │   ├── ingredient.py         ← IngredientCatalog, NutritionCatalog
│   │   ├── session.py            ← PantrySession, SessionIngredient
│   │   └── recipe.py             ← RecipeCard, SavedRecipe
│   │
│   ├── schemas/                  ← Pydantic v2 — API request/response shapes
│   │   ├── ingredient.py         ← IngredientQuantity, NutritionPer100g, SessionIngredientRead/Create
│   │   ├── user.py               ← Household, UserProfileRead/Create, UserPreferencesRead/Create
│   │   ├── session.py            ← PantrySessionRead/Create, SessionStatus, DetectionMeta
│   │   └── recipe.py             ← RecipeCardRead, RecipeCardSummary, RecipeSafety, NutritionPerServing
│   │
│   ├── services/
│   │   └── anthropic_service.py  ← Claude Vision (detect) + Claude text (recipes); returns plain dicts
│   │
│   └── tests/
│       └── test_api.py           ← Unit + integration tests; @pytest.mark.integration for live API
│
├── migrations/                   ← Alembic migration scripts (schema version control)
│   ├── env.py                    ← Alembic runtime: loads async engine from Settings.database_url
│   ├── script.py.mako            ← Template for auto-generated migration files
│   └── versions/
│       └── 0001_initial_schema.py ← Creates all 8 tables and 14 indexes; fully reversible
│
├── alembic.ini                   ← Alembic config: points to migrations/, URL overridden by env.py
└── requirements.txt              ← Pinned dependencies for the backend
```

### What lives where and why

| Folder | Contains | Rule |
|---|---|---|
| `models/` | SQLAlchemy ORM classes | One file per domain. Only describes shape; no business logic. |
| `schemas/` | Pydantic models | API boundary only. Validated on every request and before every DB write. |
| `services/` | External API calls | Anthropic SDK lives here. Returns plain Python dicts/lists; routes handle serialisation. |
| `migrations/` | Alembic version scripts | Never edited by hand after merging. One script per schema change. |
| `core/` | Cross-cutting infrastructure | Config and DB session. Imported by models, services, and routes; imports nothing from them. |

### What Alembic does

Alembic is the schema version-control tool for SQLAlchemy. Each file in `migrations/versions/` is a numbered Python script with two functions:

- `upgrade()` — applies the change to the live database (e.g. `CREATE TABLE users`)
- `downgrade()` — reverses it (e.g. `DROP TABLE users`)

**Common commands:**

```bash
cd dev/backend

# Apply all pending migrations to the DB
alembic upgrade head

# Roll back the last migration
alembic downgrade -1

# Auto-generate a new migration after changing a model
alembic revision --autogenerate -m "add column X to table Y"

# Show current schema version applied to the DB
alembic current

# Show full migration history
alembic history
```

Alembic is the reason schema changes are safe during a sprint: any developer who pulls the branch runs `alembic upgrade head` and their local DB matches production schema exactly.

---

## Frontend (`frontend/`) — not yet scaffolded

Will be a React + Vite project. Planned structure:

```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── api/                      ← Typed fetch wrappers for backend endpoints
├── public/
├── package.json
└── vite.config.ts
```

---

## Product (`product/`)

```
product/
├── architecture/
│   ├── directory-structure.md    ← This file
│   └── system-architecture.md    ← Visual system diagram and component descriptions
├── decisions/
│   ├── ADR-001-safety-layer-string-match.md
│   ├── ADR-002-fastapi-over-flask.md
│   ├── ADR-003-data-store-postgresql-supabase.md
│   ├── ADR-004-ingredient-json-contract.md
│   ├── ADR-005-user-profile-preferences-contract.md
│   ├── ADR-006-recipe-card-contract.md
│   └── ADR-007-pantry-scan-session-contract.md
└── research/
    └── datastore/
        └── datastore-options-analysis.md
```
