# System Architecture — PictureToPlate

**Last updated:** April 2026  
**Status:** MVP / Build week

---

## System diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER DEVICES                                  │
│                                                                          │
│   ┌──────────────────────┐         ┌──────────────────────┐             │
│   │    Mobile App         │         │     Web Browser       │             │
│   │  (React Native /      │         │   (React + Vite)      │             │
│   │   Flutter — TBD)      │         │   localhost:5173       │             │
│   └──────────┬───────────┘         └──────────┬───────────┘             │
│              │  HTTPS                          │  HTTPS                   │
└──────────────┼─────────────────────────────────┼───────────────────────--┘
               │                                 │
               └─────────────┬───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   FastAPI       │
                    │   Backend       │  ← uvicorn, port 8000
                    │                 │
                    │  ┌───────────┐  │
                    │  │   CORS    │  │  ← allow_origins: [FRONTEND_ORIGIN]
                    │  │ Middleware │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │  Rate     │  │  ← slowapi, 20 req/min default
                    │  │ Limiter   │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │  Routes   │  │  ← /api/detect-ingredients
                    │  │  /api/*   │  │     /api/generate-recipes
                    │  └─────┬─────┘  │     /api/health
                    │        │        │
                    │  ┌─────▼─────┐  │
                    │  │ Pydantic  │  │  ← request validation
                    │  │  Schemas  │  │     response serialisation
                    │  └─────┬─────┘  │
                    │        │        │
                    │  ┌─────▼──────────────┐  │
                    │  │ AnthropicService   │  │
                    │  │                    │  │
                    │  │  detect_ingredients│  │
                    │  │  generate_recipes  │  │
                    │  └─────┬──────────────┘  │
                    └────────┼────────┘
                             │
               ┌─────────────┼──────────────────┐
               │             │                  │
      ┌────────▼───────┐     │        ┌─────────▼────────┐
      │  Anthropic API │     │        │    Supabase       │
      │                │     │        │   (PostgreSQL)    │
      │  Claude Vision │     │        │                   │
      │  (detect)      │     │        │  users            │
      │                │     │        │  user_preferences │
      │  Claude Text   │     │        │  pantry_sessions  │
      │  (recipes)     │     │        │  session_ingred.  │
      │                │     │        │  ingredient_cat.  │
      └────────────────┘     │        │  nutrition_cat.   │
                             │        │  recipe_cards     │
                             │        │  saved_recipes    │
                    ┌────────▼────────┤                   │
                    │  SQLAlchemy     │  Supabase Storage │
                    │  Async ORM +    │  (pantry images)  │
                    │  Alembic        │                   │
                    └─────────────────┴───────────────────┘
```

---

## Component descriptions

### 1. Client layer (Mobile + Web)

Two surfaces sharing the same backend API:

| Surface | Stack | Status |
|---|---|---|
| Web | React + Vite, `http://localhost:5173` | Not yet scaffolded |
| Mobile | React Native or Flutter (TBD) | Not yet scaffolded |

Both clients communicate with the backend over HTTPS. Authentication tokens (issued by Supabase Auth) are sent as `Authorization: Bearer <token>` headers. The backend validates these in the route layer before any DB operation.

**Key decision:** Frontend stack is not yet locked. The backend is client-agnostic by design — REST JSON with no server-side rendering.

---

### 2. FastAPI backend (`dev/backend/app/`)

The only server process. Runs with `uvicorn app.main:app --reload --port 8000`.

**Layers inside the backend (top to bottom):**

```
HTTP request
     │
     ▼
CORS middleware       ← rejects cross-origin requests not from FRONTEND_ORIGIN
     │
     ▼
Rate limiter          ← slowapi; 20 req/min per IP by default (configurable)
     │
     ▼
Route handler         ← validates file type, size, required fields
     │
     ▼
Pydantic schema       ← parses and validates request body / file; rejects bad input with 422
     │
     ▼
Service layer         ← calls Anthropic SDK; returns plain Python dicts
     │
     ▼
Pydantic schema       ← serialises response; enforces output shape
     │
     ▼
HTTP response
```

**Key decision:** Services return plain Python dicts/lists. They do not import Pydantic schemas or ORM models — this keeps the AI service layer testable in isolation without a database or schema dependency.

---

### 3. Anthropic service (`app/services/anthropic_service.py`)

Two functions; one shared SDK client:

| Function | Claude call | Input | Output |
|---|---|---|---|
| `detect_ingredients()` | `claude-sonnet-4-6` + Vision | image bytes + media type | `list[str]` of ingredient names |
| `generate_recipes()` | `claude-sonnet-4-6` text | ingredient list + servings + dietary notes | `list[dict]` — 3 recipe objects |

Both functions prompt Claude to return **JSON only** and parse the raw text response with `json.loads()`. No markdown, no wrapper keys.

**Key decision:** A single shared `anthropic.Anthropic` client instance at module load — the SDK manages connection pooling internally.

---

### 4. Database layer — SQLAlchemy + Alembic + Supabase

#### ORM models (`app/models/`)

Eight tables across four domain files:

```
users ──────────────────────────── 1 ── user_preferences
  │
  ├── pantry_sessions ─────────── * ── session_ingredients ── ingredient_catalog
  │         │                                                        │
  │         └── recipe_cards ──────────────────────────────────── (ref)
  │                   │
  └── saved_recipes ──┘
                                   ingredient_catalog ── 1 ── nutrition_catalog
```

| Table | Key columns | JSONB columns |
|---|---|---|
| `users` | email (unique), household_*, subscription_tier | — |
| `user_preferences` | allergens[], dietary_restrictions[], skill_level | nutrition_goals, ui_preferences |
| `pantry_sessions` | user_id (FK), status, input_method | detection_confidence_scores, error |
| `session_ingredients` | session_id (FK), catalog_ref (FK nullable), state | — |
| `ingredient_catalog` | name (unique), category, aliases[] | — |
| `nutrition_catalog` | ingredient_id (PK=FK), macros per 100g | — |
| `recipe_cards` | user_id (FK), total_minutes (indexed), difficulty (indexed) | ingredients_used, ingredients_missing, steps, nutrition_per_serving, generation_meta |
| `saved_recipes` | unique(user_id, recipe_id), rating | — |

**Key decision:** JSONB is used for fields that are variable-depth nested objects (recipe steps, nutrition summaries) to avoid EAV table patterns. All JSONB columns are validated by Pydantic schemas before write — never written to directly from outside the service layer.

#### Async database access (`app/core/database.py`)

```python
engine = create_async_engine(DATABASE_URL, pool_size=5, max_overflow=10)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # injected into route handlers via FastAPI Depends()
```

**Key decision:** `expire_on_commit=False` — prevents SQLAlchemy from expiring ORM objects after commit, which would cause lazy-load errors in async contexts where the session is already closed.

#### Alembic migrations (`migrations/`)

Alembic is the schema version-control layer. Every change to an ORM model that affects the DB shape must have a corresponding migration script.

```
migrations/versions/
  0001_initial_schema.py   ← CREATE TABLE for all 8 tables + 14 indexes
  0002_...                 ← next change goes here (auto-generated)
```

**Workflow:**
1. Edit an ORM model (e.g. add a column to `recipe_cards`)
2. Run `alembic revision --autogenerate -m "add X to recipe_cards"`
3. Review the generated script, commit it with the model change
4. On deploy: `alembic upgrade head` applies it to the live DB

**Key decision:** `env.py` overrides `alembic.ini`'s placeholder URL with `Settings.database_url` at runtime — one source of truth for the connection string, always from the `.env` file.

---

### 5. Supabase (hosted Postgres + Storage)

Supabase provides two things:

| Service | Used for |
|---|---|
| PostgreSQL (Supabase hosted) | All relational data — users, sessions, recipes, ingredients |
| Supabase Storage (S3-compatible) | Pantry scan images — stored by key, signed URL generated on read |

The backend connects to Supabase Postgres via `asyncpg` using `DATABASE_URL` from `.env`. Supabase Auth (for token issuance and verification) is used by the frontend SDK; the backend validates JWTs using the Supabase JWT secret.

**Key decision:** Images are stored by path key (`sessions/<session_id>/original.jpg`), not a hardcoded URL. The backend generates a signed URL at read time (short TTL) rather than storing a long-lived public URL. This prevents stale or leaked URLs.

---

## Data flow: image scan → recipe cards

```
1. User uploads fridge photo
        │
        ▼
2. POST /api/detect-ingredients
   - validate: JPEG/PNG/WebP/GIF, < 5 MB
   - create PantrySession (status: ingredients_detecting)
        │
        ▼
3. AnthropicService.detect_ingredients()
   - base64-encode image
   - call Claude Vision → JSON array of ingredient strings
   - update session (status: ingredients_detected, detection_raw: [...])
        │
        ▼
4. Frontend shows ingredient confirmation screen
   - user confirms, removes, or adds ingredients
   - PATCH /api/sessions/:id/confirm
   - update session (status: confirmed)
   - write SessionIngredient rows (state: confirmed / removed / added_manually)
        │
        ▼
5. POST /api/generate-recipes
   - read confirmed ingredients from session
   - apply allergen safety check (string-match-v1, ADR-001)
   - call Claude text API → 3 recipe objects
   - write RecipeCard rows (status: recipes_generated)
        │
        ▼
6. Frontend renders recipe cards
   - user can save, rate, view missing ingredients
   - POST /api/recipes/:id/save → SavedRecipe row
```

---

## Key architectural decisions (summary)

| # | Decision | Rationale | ADR |
|---|---|---|---|
| 1 | FastAPI over Flask | Async support, Pydantic validation, auto `/docs` | ADR-002 |
| 2 | PostgreSQL via Supabase | Relational integrity + JSONB + auth + storage in one | ADR-003 |
| 3 | SQLAlchemy 2.x async ORM | Non-blocking DB calls match FastAPI's async model | ADR-003 |
| 4 | Alembic for migrations | Schema changes are versioned, reversible, and team-shared | ADR-003 |
| 5 | JSONB for nested fields | Recipe steps and nutrition are variable-depth; avoids EAV anti-pattern | ADR-004, ADR-006 |
| 6 | Allergen check: string-match v1 | Deterministic, zero extra API calls, safe for MVP with disclaimer | ADR-001 |
| 7 | `allergen_confidence_level` reserved null | No schema change needed when upgrading to Claude-API safety in v2 | ADR-001, ADR-006 |
| 8 | Services return plain dicts | Decouples AI layer from ORM and Pydantic; testable in isolation | — |
| 9 | Images stored by key not URL | Signed URLs on read; prevents stale/leaked permanent links | ADR-007 |
| 10 | Session as top-level workflow unit | Links scan → ingredients → recipes; enables history screen and AI accuracy metrics | ADR-007 |

---

## Frontend architecture (web)

**Status:** Scaffolded — ingredient input page (Phase 1)  
**ADRs:** ADR-008 through ADR-012

### Stack decisions

| Decision | Choice | Rationale | ADR |
|---|---|---|---|
| Language | TypeScript | Compile-time safety for 4 richly-shaped API contracts | ADR-008 |
| Bundler | Vite 5 | Fast HMR, native ESM, zero config for React+TS | — |
| Styling | Tailwind CSS v3 + CSS custom properties | Grid layout ergonomics + automatic dark mode via CSS var toggle | ADR-009 |
| Data fetching | Plain `fetch` + `useState` | Single-page MVP; TanStack Query deferred to Phase 2 | ADR-010 |
| Component primitives | Radix UI (unstyled) | Accessible Tooltip/Select/Modal without theme conflict | ADR-011 |
| Viewport target | 1280×800 (MacBook Pro 13") | Desktop-first; mobile deferred to Phase 2 | ADR-012 |

### Directory structure (`frontend/src/`)

```
src/
  styles/
    brand.css             ← CSS custom properties (single source of truth for all tokens)
  types/
    ingredient.ts         ← SessionIngredientRead, IngredientQuantity, QuantityUnit
    session.ts            ← PantrySessionRead, SessionStatus, InputMethod
  mocks/
    ingredientSession.ts  ← PantrySessionRead mock matching ADR-007 contract; AI_SUGGESTIONS
  api/
    detectIngredients.ts  ← USE_MOCK flag; real fetch signature preserved
  components/
    layout/
      Header.tsx           ← Logo, nav, user avatar
      Stepper.tsx          ← 4-step wizard progress (Capture → Ingredients → Preferences → Recipes)
    ingredients/
      SourceBadge.tsx      ← Colour-coded photo/voice/text/pantry badge
      ConfidenceTooltip.tsx← Radix Tooltip wrapping confidence score; explains high/medium/low
      IngredientRow.tsx    ← One row: check icon, badge, name, qty, confidence
      AISuggestionRow.tsx  ← Dashed-border "Often paired with" suggestions row
      PhotoCapture.tsx     ← Photo placeholder + detection dots + retake/add buttons
      VoiceCapture.tsx     ← Mic button, waveform bars, idle/recording state
      TextCapture.tsx      ← Name input, qty + unit inputs, Add button
      TriInputZone.tsx     ← 1.4fr 1fr 1fr grid containing Photo + Voice + Text
      IngredientList.tsx   ← Right pane: list header, ingredient rows, AI row, CTA footer
  pages/
    IngredientInput.tsx   ← Composes Header + Stepper + left capture + right list
  main.tsx                ← React root; mounts IngredientInput
```

### Layout model (1280×800)

```
┌────────────────────────────────────────────────────┐
│  Header: logo · nav · version · avatar             │
├────────────────────────────────────────────────────┤
│  Stepper: Capture → [Ingredients] → Preferences   │
├─────────────────────────┬──────────────────────────┤
│  LEFT (1.1fr)           │  RIGHT (1fr)             │
│  "capture" eyebrow      │  "tonight's list" header │
│  Hero headline (56px)   │                          │
│  TriInputZone           │  IngredientRow × N       │
│  ┌──────┬────┬────┐     │  AISuggestionRow         │
│  │Photo │Mic │Text│     │                          │
│  │1.4fr │1fr │1fr │     │  est. matches footer     │
│  └──────┴────┴────┘     │  Save list | Find recipes│
│  Helper chips           │                          │
├─────────────────────────┴──────────────────────────┤
```

### Mock data strategy

Phase 1 uses `USE_MOCK = true` in `src/api/detectIngredients.ts`. The mock:
- Returns a `PantrySessionRead` object after a 2-second delay (simulates detection latency).
- Contains 6 ingredients matching the wireframe (3 photo, 1 text, 2 pantry).
- Adheres strictly to ADR-004 (ingredient quantity shape) and ADR-007 (session shape).
- Switching to the real backend is a one-line change: `USE_MOCK = false`.

### Tailwind token mapping

Brand tokens from `brand.css` are mapped as Tailwind color keys so components use `className="bg-paper text-ink border-hairline-2"` rather than inline style props:

```ts
// tailwind.config.ts
colors: {
  paper:        'var(--paper)',
  'paper-2':    'var(--paper-2)',
  ink:          'var(--ink)',
  'ink-2':      'var(--ink-2)',
  'ink-3':      'var(--ink-3)',
  sage:         'var(--sage)',
  'sage-deep':  'var(--sage-deep)',
  'sage-soft':  'var(--sage-soft)',
  apricot:      'var(--apricot)',
  ...
}
```

Dark mode is automatic: toggling `.theme-dark` on the root element changes CSS variable values; all Tailwind classes pick up the new values without any component changes.

---

## What is not yet built

| Component | Current state | Next step |
|---|---|---|
| Frontend (web) | ✅ Ingredient input page scaffolded | Preferences page (Phase 1), Recipes page (Phase 2) |
| Frontend (mobile) | Not decided | Choose React Native vs Flutter |
| Auth middleware | Not wired | Validate Supabase JWT in a FastAPI dependency |
| Session endpoints | Not implemented | PATCH /sessions/:id/confirm, GET /sessions |
| Saved recipe endpoints | Not implemented | POST /recipes/:id/save, GET /users/me/saved |
| Nutritional catalog seed | Not implemented | Script to load USDA FDC data into nutrition_catalog |
| Object storage wiring | Not implemented | Upload image to Supabase Storage; store key in pantry_sessions |
| Real API connection | Not wired | Flip `USE_MOCK = false` in `src/api/detectIngredients.ts` |
