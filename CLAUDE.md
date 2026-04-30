# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PictureToPlate** is an AI-powered recipe suggestion app. Users upload a fridge/pantry photo → Claude Vision detects ingredients → Claude generates recipe suggestions.

User flow: Capture (photo/voice/text) → Ingredient confirmation → Preferences → Recipe generation (4-step wizard).

## Development Commands

### Backend

```bash
cd dev/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000

# Run tests (unit — no API key needed)
pytest app/tests/ -v

# Run integration tests (requires ANTHROPIC_API_KEY in dev/.env)
pytest app/tests/ -v -m integration

# Run a single test
pytest app/tests/test_api.py::TestClassName::test_method_name -v

# Database migrations
alembic upgrade head
```

### Frontend

```bash
cd dev/frontend
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck  # tsc --noEmit
```

## Environment Setup

Create `dev/.env`:

```
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_ENV=development
APP_SECRET_KEY=your_secret_key
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/picturetoplate
SUPABASE_URL=https://....supabase.co
SUPABASE_ANON_KEY=...
FRONTEND_ORIGIN=http://localhost:5173
RATE_LIMIT_RPM=20
```

## Architecture

### Backend (`dev/backend/app/`)

```
main.py                FastAPI app, CORS middleware, rate limiting (slowapi)
core/config.py         Pydantic BaseSettings, reads dev/.env, cached via lru_cache
core/database.py       SQLAlchemy 2.x async engine + get_db() dependency
api/routes.py          /detect-ingredients, /generate-recipes, /health
services/anthropic_service.py  Claude Vision + text; returns plain dicts (not Pydantic)
models/                SQLAlchemy ORM: User, UserPreferences, PantrySession,
                         SessionIngredient, IngredientCatalog, NutritionCatalog,
                         RecipeCard, SavedRecipe (8 tables, all async)
schemas/               Pydantic models for API boundaries (ingredient, session, user, recipe)
migrations/            Alembic — one migration: 0001_initial_schema.py
tests/test_api.py      Unit tests (no key) + @pytest.mark.integration tests (live Claude)
```

> **Note:** Root-level `main.py`, `routes.py`, `config.py`, `anthropic_service.py` are legacy stubs. Working code lives in `app/`.

### Data Flow

1. `POST /api/detect-ingredients` — multipart image upload (JPEG/PNG/WebP/GIF, <5 MB) → base64 → Claude Vision → `["chicken", "lemon", ...]`
2. `POST /api/generate-recipes` — `{ingredients, servings, dietary_notes}` → Claude text → 3 recipe objects: `{title, description, ingredients_used, steps, time_minutes, difficulty}`

`anthropic_service.py` prompts Claude for **JSON-only** output and parses with `json.loads()`.

### Database

8 tables via SQLAlchemy async ORM. Key relationships:
- `pantry_sessions` → `session_ingredients` → `ingredient_catalog` (nullable FK)
- `users` → `user_preferences` (1-to-1), `pantry_sessions`, `recipe_cards`, `saved_recipes`
- `recipe_cards` stores `ingredients_used` and `steps` as JSONB
- `allergen_confidence_level` column reserved for ADR-001 v2 (Claude-based allergen check)

### Frontend (`dev/frontend/src/`)

React 18 + TypeScript + Vite. Desktop-first at 1280×800 (mobile is Phase 2).

**Routes** (`main.tsx`): `/` → `/signin`, `/signin` → `SignIn`, `/signup` → `SignUp`, `/app` → `IngredientInput`.

```
pages/SignIn.tsx             Auth sign-in form (placeholder nav — Supabase not wired)
pages/SignUp.tsx             Auth sign-up form (placeholder nav — Supabase not wired)
pages/IngredientInput.tsx    Main app page: Header + Stepper + 2-col layout (step 1)
components/layout/           Header, Stepper (4 steps), AuthBrandPanel (left panel on auth pages)
components/ingredients/      TriInputZone, PhotoCapture, VoiceCapture, TextCapture,
                               IngredientList, IngredientRow, AISuggestionRow,
                               SourceBadge, ConfidenceTooltip
api/detectIngredients.ts     USE_MOCK flag (true = 2 s delay + mock data; false = real backend)
types/                       ingredient.ts (SessionIngredientRead, QuantityUnit),
                               session.ts (PantrySessionRead, SessionStatus)
mocks/ingredientSession.ts   6-ingredient mock session matching ADR-004/007 contracts
styles/brand.css             All design tokens as CSS custom properties; dark mode via .theme-dark
```

**State management:** plain `useState` + `fetch` (Phase 1). React Query deferred to Phase 2.

**Component library:** Radix UI (unstyled primitives — currently only Tooltip used).

**Design tokens** (from `brand.css`, extended into Tailwind via `tailwind.config.ts`):
- Surfaces: `--paper` (#F6F3EC cream), `--paper-2`, `--cream`
- Text: `--ink` (#1B2420 dark green), `--ink-2`, `--ink-3`
- Dividers: `--hairline`, `--hairline-2`
- Accents: `--sage` / `--sage-deep` / `--sage-soft`, `--apricot` / `--apricot-deep` / `--apricot-soft`, `--tomato` (#C2543C alert/recording)
- Radii: `--r-sm` (10px), `--r-md` (16px), `--r-lg` (24px), `--r-xl` (32px)
- Type: `--serif` (Fraunces), `--sans` (Inter), `--mono` (JetBrains Mono)
- Use Tailwind classes `bg-paper`, `text-ink`, `text-sage`, etc. — not raw hex values.

**CSS utility classes** (defined in `brand.css`, use directly in JSX):
- `.p2p-mono` — 11px uppercase mono label style
- `.p2p-dot` — 6px sage-colored bullet
- `.p2p-field` — form input style
- `.p2p-btn` / `.p2p-btn-primary` — button variants

**Switching to real backend:** set `USE_MOCK = false` in `src/api/detectIngredients.ts`. Vite proxies `/api/*` → `http://localhost:8000`.

### API Schema Migration Note

`api/routes.py` currently uses inline Pydantic models (`IngredientsResponse`, `Recipe`, etc.) marked as "legacy minimal shape." The full expanded schemas live in `app/schemas/` and are not yet wired to these endpoints.

### What's Not Built Yet

- Auth middleware (Supabase JWT) — SignIn/SignUp pages exist but navigate directly without real auth
- Preferences and Recipes pages (steps 3 & 4)
- Session/CRUD route handlers (models defined, not wired to routes)
- Image storage via Supabase Storage
- Frontend tests (no Vitest setup yet)
- Mobile layout

## Key Design Decisions (see `product/decisions/`)

- **ADR-001:** Allergen safety = string-match v1 with visible disclaimer; v2 will use Claude.
- **ADR-003:** PostgreSQL via Supabase (relational integrity + JSONB + built-in auth + storage).
- **ADR-004/007:** `SessionIngredientRead` and `PantrySessionRead` are the canonical API contracts; frontend types mirror these exactly.
- **ADR-010:** Plain fetch + useState in Phase 1; React Query in Phase 2.
- **ADR-012:** Desktop-first 1280×800; mobile responsive deferred.

## Git & Branching

- `main` — production-ready, PR required
- `develop` — integration branch; PRs target here first
- Commit prefix conventions: `feat/`, `fix/`, `chore/`

## API Exploration

Swagger UI: `http://localhost:8000/docs` (disabled in production via `app_env`).
