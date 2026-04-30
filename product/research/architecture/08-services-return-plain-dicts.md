# Architecture Research: Service Layer Return Type

**Decision:** AI service functions return plain Python dicts/lists, not ORM objects or Pydantic models  
**Prepared:** April 2026

---

## The problem

`anthropic_service.py` calls the Claude API and returns ingredient lists and recipe objects. The question is: what Python type should these functions return? The choice affects how the service layer couples to the rest of the stack and how it can be tested.

The three candidates are:
1. Plain Python `list` and `dict`
2. Pydantic model instances
3. SQLAlchemy ORM model instances

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Testable without DB or schema dependency | The service layer must be unit-testable with mocked Claude API responses; importing ORM or Pydantic models just to run a service function is a coupling that makes tests slow and fragile |
| H2 | No circular imports | `anthropic_service.py` is imported by `routes.py`; if it also imports from `models/` or `schemas/`, the import graph risks a cycle |
| H3 | Caller decides serialisation | The route handler knows whether the response goes to a DB write, an HTTP response, or both; the service should not assume |
| H4 | Minimal dependencies | The service layer must run in an environment where only the Anthropic SDK and stdlib are available (e.g. a Lambda function or a worker process without DB access) |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Readable in isolation | A developer reading `anthropic_service.py` should understand its contract without referencing three other files |
| S2 | Easy to mock in tests | `return [{"title": "...", ...}]` is simpler to construct in a test fixture than `return RecipeCard(title="...", ...)` |

---

## Options evaluated

### 1. Plain Python dicts and lists ✅ CHOSEN

**What it is:** `detect_ingredients()` returns `list[str]`. `generate_recipes()` returns `list[dict]`. No imports from `app.models` or `app.schemas`.

```python
def generate_recipes(ingredients, servings, dietary_notes) -> list[dict]:
    # ... Claude API call ...
    return json.loads(raw)   # [{"title": "...", "steps": [...], ...}]
```

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Testable | `mock_generate_recipes.return_value = [{"title": "Test", ...}]` — no schema or DB import |
| H2 No circular imports | `anthropic_service.py` imports only `anthropic`, `base64`, `json`, and `app.core.config` |
| H3 Caller decides | The route handler calls `generate_recipes()`, receives a dict, passes it to `RecipesResponse(**recipe)` — the schema conversion is explicit in the caller |
| H4 Minimal dependencies | `anthropic_service.py` can run in a worker process with only the Anthropic SDK installed |
| S1 Readable | The function signature and return type are entirely self-contained |
| S2 Easy to mock | A plain dict is the simplest possible fixture |

**Weaknesses:**
- No type safety on the dict structure — `recipe["title"]` is not type-checked by mypy; a typo is a runtime error.
- The caller must know the expected dict shape to pass it to a Pydantic schema. This is implicit coupling — the dict structure must match what the Pydantic schema expects.
- If Claude returns a malformed response (e.g. missing `title`), the error is caught at the Pydantic validation step in the route handler, not at the service boundary.

---

### 2. Pydantic model instances

**What it is:** `generate_recipes()` constructs and returns `list[RecipeCard]` Pydantic instances, validating the Claude response at the service boundary.

```python
from app.schemas.recipe import RecipeCardRead

def generate_recipes(...) -> list[RecipeCardRead]:
    raw = json.loads(message.content[0].text.strip())
    return [RecipeCardRead(**r) for r in raw]
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Testable | ⚠️ Tests must import `RecipeCardRead` — a Pydantic import, not an ORM import. Acceptable, but adds a dependency. |
| H2 No circular imports | ⚠️ `anthropic_service.py` imports from `app.schemas.recipe`, which imports from `app.schemas.ingredient`. Risk of a cycle if schemas import from services. |
| H3 Caller decides | ❌ The caller receives a `RecipeCardRead` — a response schema. If the route also needs to write the recipe to the DB, it must re-map the Pydantic model to an ORM model. This conversion is awkward: `RecipeCard(recipe_id=..., title=schema.title, ...)` |
| H4 Minimal dependencies | ❌ Pydantic is a significant dependency; a worker without Pydantic cannot run this function |
| S1 Readable | ✅ Return type is explicit |
| S2 Easy to mock | ⚠️ Fixtures must construct valid Pydantic instances — more boilerplate than a plain dict |

**The core problem:** `RecipeCardRead` is a response schema — it includes `recipe_id`, `user_id`, `session_id`, and `generated_at`, none of which the service layer knows. The service returns data from Claude; the DB identifiers are assigned by the DB. Using the response schema as the service return type conflates two different concerns.

A separate `ClaudeRecipeOutput` schema could be created just for the service boundary — but that is a third schema (alongside the ORM model and the API response schema) for the same domain object. Three schemas for one concept is a maintenance burden.

**Verdict:** Appealing for type safety; rejected on H3 (caller cannot easily write to DB from a response schema) and H4 (Pydantic dependency in service layer).

---

### 3. SQLAlchemy ORM model instances

**What it is:** `generate_recipes()` constructs `RecipeCard` ORM objects directly, ready to be added to the DB session.

```python
from app.models.recipe import RecipeCard

def generate_recipes(...) -> list[RecipeCard]:
    raw = json.loads(...)
    return [RecipeCard(title=r["title"], steps=r["steps"], ...) for r in raw]
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Testable | ❌ Tests must import `RecipeCard` ORM model, which imports SQLAlchemy, which requires a DB engine to be configured at import time in some configurations |
| H2 No circular imports | ❌ `anthropic_service.py` importing from `app.models` creates a tight coupling to the ORM layer; models import from `base.py` which imports SQLAlchemy — a heavy dependency chain |
| H3 Caller decides | ❌ The route handler receives an ORM object and must add it to the session — serialising it to HTTP response requires `RecipeCardRead.from_orm(recipe)`. The caller has no flexibility. |
| H4 Minimal dependencies | ❌ SQLAlchemy is a large dependency; a worker without a DB connection cannot even import this function |

**The deeper problem:** Constructing ORM objects in the service layer means the service must know the DB identifiers (`user_id`, `session_id`) that only the route handler has. Either the service signature grows to accept these — coupling it further to the request context — or the objects are created with nulls and patched later.

**Verdict:** Ruled out on H1 (ORM import makes testing require DB), H2 (circular import risk), and H4 (heavy dependency chain).

---

## Side-by-side comparison

| Criterion | Plain dicts | Pydantic models | ORM models |
|---|---|---|---|
| Testable without DB | ✅ | ✅ | ❌ |
| No circular import risk | ✅ | ⚠️ | ❌ |
| Caller controls serialisation path | ✅ | ⚠️ | ❌ |
| Minimal dependencies | ✅ | ⚠️ | ❌ |
| Type safety on return value | ❌ | ✅ | ✅ |
| Easy test fixtures | ✅ | ⚠️ | ❌ |
| Hard constraints met (of 4) | **4 / 4** | 2 / 4 | 0 / 4 |

---

## Decision rationale summary

Plain dicts preserve the service layer as a pure I/O boundary: Claude API goes in, structured Python data comes out. Everything that follows — Pydantic validation, DB write, HTTP serialisation — is the caller's responsibility. This is the correct separation of concerns for a layer whose only job is to talk to an external AI API.

The type-safety gap is real. Mitigated by the fact that Claude is prompted to return a strict JSON schema, and the Pydantic validation in the route handler catches malformed responses before they touch the DB or the client. Adding type hints to the dict structure (`TypedDict`) is the upgrade path if mypy coverage becomes a priority.

---

## Revisit if

- We introduce `TypedDict` definitions for the service return types — this gives mypy coverage without importing Pydantic or SQLAlchemy in the service layer.
- The service layer grows to include DB reads (e.g. fetching user preferences before generating recipes) — at that point, importing ORM models becomes unavoidable and the return type decision should be revisited.
- We split the service into a separate microservice or Lambda — plain dicts serialize cleanly over HTTP/SQS/SNS without any ORM or Pydantic dependency.
