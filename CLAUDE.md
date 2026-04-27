# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PictureToPlate** is an AI-powered recipe suggestion app. Users upload a fridge/pantry photo → Claude Vision detects ingredients → Claude generates recipe suggestions. Early-stage MVP: backend is implemented, frontend is not yet scaffolded.

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
```

### Frontend (not yet scaffolded)

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Environment Setup

Copy or create `dev/.env` from this template:

```
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_ENV=development
APP_SECRET_KEY=your_secret_key
FRONTEND_ORIGIN=http://localhost:5173
RATE_LIMIT_RPM=20
```

API keys from [console.anthropic.com](https://console.anthropic.com).

## Architecture

### Backend (`dev/backend/`)

```
main.py               FastAPI app, CORS middleware, rate limiting (slowapi)
config.py             Pydantic BaseSettings, reads dev/.env, cached via lru_cache
routes.py             Two core endpoints + health check; Pydantic request/response models
anthropic_service.py  Anthropic SDK calls — image base64 encoding, Claude Vision, recipe generation
app/tests/            pytest tests; unit vs integration split via @pytest.mark.integration
```

### Data Flow

1. `POST /api/detect-ingredients` — receives image upload (JPEG/PNG/WebP/GIF, <5MB), encodes to base64, calls Claude Vision, returns JSON array of ingredient strings.
2. `POST /api/generate-recipes` — receives ingredient list, calls Claude text API, returns 3 recipe objects: `{title, description, ingredients_used, steps, time_minutes, difficulty}`.

### Key Design Decisions (see `product/decisions/`)

- **ADR-001:** Allergen safety check is string-match v1 with a visible disclaimer; v2 will use Claude API.
- **ADR-002:** FastAPI chosen over Flask for async support and auto-generated `/docs`.

## Git & Branching

- `main` — production-ready, PR required, no direct pushes
- `develop` — integration branch; PRs target here first
- Commit conventions: `feat/`, `fix/`, `chore/` prefixes

## API Exploration

Swagger UI available at `http://localhost:8000/docs` when backend is running.
