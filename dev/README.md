# PictureToPlate 🍽️

> Snap a photo of your fridge. Get recipe ideas instantly.

AI-powered ingredient detection (Claude Vision) + recipe generation (Claude) built on FastAPI + React.

---

## Project Structure

```
picturetoplate/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   ├── core/          # Config, settings
│   │   ├── services/      # Anthropic API wrapper
│   │   └── tests/         # Pytest suite
│   ├── .env.example       # ← copy to .env, fill in values
│   └── requirements.txt
├── frontend/
│   └── src/
├── .github/
│   └── workflows/ci.yml   # GitHub Actions CI
└── .gitignore
```

---

## Local Setup

### 1. Clone & branch

```bash
git clone https://github.com/YOUR_USERNAME/picturetoplate.git
cd picturetoplate
git checkout -b develop          # all dev work happens here, not on main
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy env template and fill in your Anthropic key
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and APP_SECRET_KEY

# Start the dev server
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs (dev only).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                      # starts on http://localhost:5173
```

---

## Secrets Management

### Local Development
- Copy `backend/.env.example` → `backend/.env`
- Fill in real values. `.env` is in `.gitignore` and will **never** be committed.
- Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### GitHub Actions (CI)
- Go to **Settings → Secrets and variables → Actions** in your GitHub repo
- Add `ANTHROPIC_API_KEY` as a repository secret
- The CI workflow uses a placeholder key for unit tests; integration tests are skipped in CI

### Production Deployment
| Platform | Where to set env vars |
|---|---|
| Railway | Project → Variables tab |
| Render | Service → Environment tab |
| Fly.io | `fly secrets set ANTHROPIC_API_KEY=sk-ant-...` |
| Vercel (frontend) | Project → Settings → Environment Variables |

**Rule of thumb:** The `.env` file is like your house key — it lives in your pocket, never on a hook by the front door.

---

## Branch Strategy

```
main          ← production-ready only. Protected branch. PRs required.
  └── develop ← integration branch. All feature branches merge here first.
        ├── feat/ingredient-detection
        ├── feat/recipe-ui
        └── fix/image-upload-validation
```

### Workflow
```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name

# When done
git push origin feat/your-feature-name
# Open PR → develop (not main)

# When develop is stable and tested
# Open PR → main (requires passing CI)
```

### Commit message format
```
feat: add ingredient confidence scores
fix: handle WebP images in upload validator
chore: update anthropic SDK to 0.35.0
docs: add deployment section to README
```

---

## Running Tests

```bash
cd backend
pytest app/tests/ -v                        # unit tests only (no API key needed)
pytest app/tests/ -v -m integration         # live API tests (needs real key in .env)
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/detect-ingredients` | Upload image → ingredient list |
| `POST` | `/api/generate-recipes` | Ingredient list → 3 recipes |
| `GET` | `/api/health` | Liveness probe |

See `/docs` when running locally for full request/response schemas.
