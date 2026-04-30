# Architecture Research: Python Web Framework

**Decision:** Use FastAPI as the Python web framework  
**Prepared:** April 2026  
**Feeds into:** ADR-002

---

## What we needed from a web framework

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Async-native request handling | Anthropic API calls are I/O-bound; blocking the thread while waiting for Claude wastes server capacity and increases latency for concurrent users |
| H2 | Automatic request/response validation | Ingredient and recipe payloads are structured JSON; we cannot ship without enforced types at the API boundary |
| H3 | File upload support | `/detect-ingredients` receives multipart image uploads up to 5 MB |
| H4 | JSON-first REST | Both web and mobile clients consume REST JSON; no server-side rendering needed |
| H5 | Python 3.9+ | Rest of the stack (Anthropic SDK, SQLAlchemy 2.x) requires modern Python |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Auto-generated API docs | The full team — PM, designers, mobile engineers — needed to inspect and test endpoints without writing any frontend code first |
| S2 | Low boilerplate for typed models | We have four domain schemas (user, ingredient, session, recipe); hand-writing validation for each is error-prone |
| S3 | Large ecosystem | Rate limiting, CORS, auth middleware should be available as drop-in libraries |
| S4 | OpenAPI / JSON Schema generation | Enables contract-first development and future SDK generation |

---

## Options evaluated

### 1. FastAPI ✅ CHOSEN

**What it is:** A modern Python web framework built on Starlette (ASGI) and Pydantic. Annotating a function with Python type hints is enough to get request parsing, validation, serialisation, and OpenAPI documentation automatically.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Async | Built on ASGI / Starlette; route handlers declared `async def` natively |
| H2 Validation | Pydantic v2 models declared once, used for both request parsing and response serialisation |
| H3 File uploads | `UploadFile` + `python-multipart` built in |
| H4 JSON REST | Default response format is JSON; no template engine needed |
| H5 Python 3.9+ | Full support |
| S1 Auto-docs | `/docs` (Swagger UI) and `/redoc` generated automatically from Pydantic models |
| S2 Low boilerplate | A single Pydantic class serves as request model, response model, and DB schema input |
| S3 Ecosystem | `slowapi` (rate limiting), `python-jose` (JWT), `httpx` (async client) all integrate cleanly |
| S4 OpenAPI | Full OpenAPI 3.1 schema emitted automatically |

**Weaknesses:**
- Steeper learning curve than Flask for developers new to type annotations and async Python.
- Pydantic v2 is a significant rewrite from v1; documentation inconsistencies exist between versions.
- ASGI stack (Starlette internals) adds a layer of abstraction that can be opaque when debugging middleware.

---

### 2. Flask

**What it is:** The most widely used Python micro-framework. WSGI-based, synchronous by default. Has a large ecosystem and extensive documentation.

**Why it was not chosen:**

| Requirement | Assessment |
|---|---|
| H1 Async | ❌ WSGI is synchronous. Flask 2.x added limited async support via `asyncio` but it runs async handlers in a thread pool — not true non-blocking I/O. Each Anthropic API call blocks a thread. |
| H2 Validation | ❌ No built-in validation. Requires `marshmallow`, `flask-pydantic`, or `webargs` — additional dependencies with their own version conflicts. |
| H3 File uploads | ✅ `request.files` works well |
| H4 JSON REST | ✅ `jsonify()` is simple and battle-tested |
| H5 Python 3.9+ | ✅ Full support |
| S1 Auto-docs | ❌ Requires `flask-restx` or `flasgger`; schemas defined separately from route code |
| S2 Low boilerplate | ❌ Every route needs manual validation logic or a separate schema library |
| S4 OpenAPI | ⚠️ Available via third-party extensions; not first-class |

**The core problem for PictureToPlate:** Flask's synchronous model means that while the backend waits for Claude Vision to return (~1–2 seconds), the thread is blocked and cannot serve other requests. Under even moderate concurrent load, this becomes a bottleneck. A `gevent` monkey-patch can work around this but introduces subtle bugs with libraries that are not gevent-compatible.

**Verdict:** Ruled out on H1 (async) and H2 (validation). Would be appropriate for a simple CRUD API with no external I/O — not for an AI pipeline.

---

### 3. Django + Django REST Framework (DRF)

**What it is:** A "batteries-included" full-stack Python framework. DRF adds serialisers and class-based API views on top of Django's ORM and admin.

**Why it was not chosen:**

| Requirement | Assessment |
|---|---|
| H1 Async | ⚠️ Django 4.1+ has async view support, but Django ORM remains synchronous. Using `sync_to_async` wrappers is verbose and error-prone. |
| H2 Validation | ✅ DRF serialisers provide request validation |
| H3 File uploads | ✅ `request.FILES` and `FileField` work well |
| H4 JSON REST | ✅ DRF was designed for this |
| H5 Python 3.9+ | ✅ Full support |
| S1 Auto-docs | ⚠️ Requires `drf-spectacular` or `drf-yasg`; not zero-config |
| S2 Low boilerplate | ❌ Significant boilerplate: models, serialisers, viewsets, routers, URL conf all separate |

**The core problem for PictureToPlate:** Django is designed for apps that own a large amount of their stack (ORM, admin, auth, templates). We are using Supabase for auth and PostgreSQL via SQLAlchemy — Django's ORM would be redundant, and its admin panel would conflict with our custom data model. The async story is a duct-tape retrofit, not a first-class feature. Total framework weight for what is essentially a two-endpoint AI proxy is excessive.

**Verdict:** Ruled out on H1 (async ORM not native) and overall framework weight mismatch.

---

### 4. Starlette (raw)

**What it is:** The ASGI toolkit that FastAPI is built on. Provides routing, middleware, WebSocket support, and request/response primitives — but no validation or schema layer.

**Why it was not chosen:**

| Requirement | Assessment |
|---|---|
| H1 Async | ✅ Pure ASGI, fully async |
| H2 Validation | ❌ No built-in validation. Every request requires manual parsing and error handling. |
| H3 File uploads | ✅ `UploadFile` available (same as FastAPI, since FastAPI re-exports it) |
| H4 JSON REST | ✅ `JSONResponse` built in |
| S1 Auto-docs | ❌ None |
| S2 Low boilerplate | ❌ More boilerplate than FastAPI; every endpoint manually handles type coercion |

**When Starlette makes sense:** When you need maximum control over the ASGI stack and are building your own framework conventions. For PictureToPlate, FastAPI is essentially Starlette with Pydantic bolted on — there is no reason to use the lower-level tool.

**Verdict:** Ruled out on H2 (validation) and S1 (auto-docs). FastAPI gives everything Starlette provides plus the features we need, with no overhead.

---

### 5. Sanic

**What it is:** An async Python web framework with performance as its primary focus. Pre-dates FastAPI. Uses a custom router and its own request handling primitives.

**Why it was not chosen:**

| Requirement | Assessment |
|---|---|
| H1 Async | ✅ Built for async from the ground up |
| H2 Validation | ❌ No built-in Pydantic integration; requires `sanic-ext` |
| H3 File uploads | ✅ Supported |
| S1 Auto-docs | ⚠️ Available via `sanic-ext` but not zero-config |
| S3 Ecosystem | ❌ Smaller ecosystem; many third-party FastAPI libraries (rate limiting, JWT) are not available for Sanic |

**Verdict:** Ruled out on ecosystem size (S3) and validation boilerplate (H2). Performance advantage over FastAPI is negligible at MVP scale.

---

## Side-by-side comparison

| Criterion | FastAPI | Flask | Django + DRF | Starlette | Sanic |
|---|---|---|---|---|---|
| True async (ASGI) | ✅ | ❌ | ⚠️ | ✅ | ✅ |
| Built-in request validation | ✅ Pydantic | ❌ | ✅ DRF serialisers | ❌ | ❌ |
| File uploads | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-generated API docs | ✅ Zero-config | ❌ Extension | ⚠️ Extension | ❌ | ⚠️ Extension |
| OpenAPI 3.1 schema | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| SQLAlchemy async compatible | ✅ | ⚠️ Thread pool | ❌ Own ORM | ✅ | ✅ |
| Rate limiting library | ✅ slowapi | ✅ flask-limiter | ✅ | ✅ slowapi | ⚠️ |
| Learning curve | Medium | Low | High | High | Medium |
| Hard constraints met (of 5) | **5 / 5** | 3 / 5 | 3 / 5 | 4 / 5 | 4 / 5 |

---

## Decision rationale summary

FastAPI is the only option that satisfies all five hard constraints without additional libraries or workarounds. The Pydantic integration is the decisive factor: declaring a `RecipeRequest` class once gives us request validation, OpenAPI documentation, response serialisation, and type-safe access to fields — all from a single source of truth. In a fast-moving build week with four domain schemas to define, this eliminates a category of bugs entirely.

The async model is equally important. Every recipe generation call takes 1–3 seconds of Anthropic API latency. With Flask's synchronous model, 10 concurrent users would require 10 blocked threads. With FastAPI's ASGI model, those 10 requests share an event loop and one thread handles all I/O waiting.

---

## Revisit if

- The team expands and new engineers are more comfortable with Flask — the migration cost is low since the service layer is decoupled.
- We need background task queues (e.g. async recipe generation triggered by webhook) — consider adding `Celery` or `arq` as a task runner alongside FastAPI, rather than switching frameworks.
- We move to a serverless/Lambda deployment — FastAPI's ASGI startup overhead can cause cold-start latency; a lighter handler (Mangum adapter) mitigates this without a framework change.
