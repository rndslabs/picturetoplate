# Architecture Research: Top-Level Workflow State Management

**Decision:** Model each scan as a persisted `PantrySession` entity  
**Prepared:** April 2026  
**Feeds into:** ADR-007

---

## The problem

A PictureToPlate scan has multiple steps: input (image/voice/keyboard) → ingredient detection → user confirmation → recipe generation → user interaction with recipes. The question is how to model this stateful, multi-step workflow:

1. Should state be persisted in the database as it progresses?
2. If so, what is the unit of persistence — a session object, a bag of events, or denormalised data on the user?
3. What happens if a user abandons mid-flow?

The answer affects history, resumability, AI accuracy measurement, and debugging.

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Link scan inputs to recipe outputs | Every recipe card must be traceable back to the scan that generated it — for history ("last Tuesday's scan"), for debugging, and for AI accuracy measurement |
| H2 | Support all three input methods | Image, voice, and keyboard inputs must flow through the same pipeline with the same state model |
| H3 | Survive mid-flow abandonment | A user who uploads an image and closes the app before confirming ingredients must not leave orphaned data or cause errors on next open |
| H4 | Measure AI detection accuracy | We need to know what fraction of detected ingredients the user confirmed vs removed — a key signal for model quality |
| H5 | Enable scan history screen | Users must be able to see and navigate their previous scans |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Resumable scans | A user interrupted mid-flow should be able to return to their in-progress scan |
| S2 | Per-scan latency metrics | `detection_duration_ms` and `generation_duration_ms` let engineering track p95 AI latency over time |
| S3 | Error state capture | When AI calls fail, the error details should be persisted so support can diagnose without reading server logs |
| S4 | Stateless frontend | The client should be able to re-fetch session state from the API at any point — no client-side state machine |

---

## Options evaluated

### 1. Persisted `PantrySession` entity ✅ CHOSEN

**What it is:** A `pantry_sessions` table with a `status` column that progresses through a defined lifecycle. The session is created at the start of the flow and updated at each step. All related data (ingredients, recipe cards) links back to the session via foreign key.

```
created → ingredients_detecting → ingredients_detected →
confirmed → recipes_generating → recipes_generated → completed | error
```

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Link inputs to outputs | `recipe_cards.session_id FK` → `pantry_sessions.session_id`; one query retrieves the full scan context |
| H2 All input methods | `input_method` column (`image` / `voice` / `keyboard`); method-specific columns nullable by input type |
| H3 Mid-flow abandonment | Session rows with `status: ingredients_detected` and no subsequent `confirmed` status are gracefully handled — the history screen shows "incomplete scan" |
| H4 AI accuracy | `session_ingredients` table stores `state` per ingredient: `confirmed`, `removed`, `added_manually` — ratio is queryable |
| H5 History screen | `SELECT * FROM pantry_sessions WHERE user_id = :uid ORDER BY created_at DESC` |
| S1 Resumable | Frontend fetches `GET /sessions/:id` — status tells it which screen to show |
| S2 Latency metrics | `detection_duration_ms`, `generation_duration_ms` stored per session |
| S3 Error capture | `error JSONB` column stores `{code, message, occurred_at, retriable}` |
| S4 Stateless frontend | Session status drives the UI state machine entirely server-side |

**Weaknesses:**
- A fast-moving build week will leave abandoned sessions in `ingredients_detecting` or `ingredients_detected` status. A cleanup job (TTL-based soft delete at 90 days) is required before launch to prevent table bloat.
- The status state machine has 8 states — a bug that skips a transition (e.g. moving from `ingredients_detected` directly to `recipes_generated`) is not caught at the DB level. Status transition validation must live in the service layer.
- Session rows accumulate. 1,000 users scanning once a week generates 52,000 rows/year — manageable, but the `session_ingredients` table (5–15 rows per session) grows faster.

---

### 2. Stateless request/response (no session persistence)

**What it is:** Each API call is self-contained. The frontend sends the full ingredient list with the recipe generation request. Nothing is persisted between steps. No session table.

```
POST /detect-ingredients → [ingredients]  (stateless, no DB write)
POST /generate-recipes { ingredients: [...] } → [recipes]  (stateless)
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Link inputs to outputs | ❌ No link. A recipe card cannot be traced back to its originating scan. History is impossible. |
| H2 All input methods | ✅ Each endpoint accepts raw input regardless of method |
| H3 Mid-flow abandonment | ✅ Nothing to clean up — no session rows |
| H4 AI accuracy | ❌ We never know which ingredients were detected vs confirmed; no state stored |
| H5 History screen | ❌ Impossible without persistence |
| S1 Resumable | ❌ Nothing to resume |
| S2 Latency metrics | ❌ No per-scan metrics; only server-side request logs |

**This is effectively the current v0 state of the API** — the existing `/detect-ingredients` and `/generate-recipes` endpoints are stateless. The reason we are adding sessions is precisely to unlock history, accuracy measurement, and resumability.

**Verdict:** Acceptable for an absolute MVP with no history requirement. Ruled out for PictureToPlate because H1 (linking) and H5 (history) are explicit product requirements.

---

### 3. Event sourcing (append-only event log)

**What it is:** Rather than a row with a `status` column, store each state transition as an event. `ImageUploaded`, `IngredientsDetected`, `IngredientConfirmed`, `RecipesGenerated`. Current state is derived by replaying events.

```
scan_events:
  (scan_id, event_type, payload JSONB, occurred_at)
  
  abc → ImageUploaded { stored_key: "sessions/abc/original.jpg" }
  abc → IngredientsDetected { raw: ["chicken", "lemon"] }
  abc → IngredientConfirmed { ingredient: "chicken" }
  abc → IngredientRemoved { ingredient: "lemon" }
  abc → RecipesGenerated { recipe_ids: ["r1", "r2", "r3"] }
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Link inputs to outputs | ✅ Full event trace from upload to recipes |
| H2 All input methods | ✅ `ImageUploaded` / `VoiceTranscribed` / `KeyboardSubmitted` events |
| H3 Mid-flow abandonment | ✅ Incomplete event streams are valid; no orphaned state |
| H4 AI accuracy | ✅ `IngredientConfirmed` vs `IngredientRemoved` events give exact accuracy signal |
| H5 History screen | ✅ Derive current state by replaying events; or materialise a `sessions` view |
| S1 Resumable | ✅ Current state always derivable from events |
| S3 Error capture | ✅ `DetectionFailed` event with error payload |

**Why it was not chosen:**

Event sourcing adds significant architectural complexity that is not justified at MVP:

1. **Deriving current state requires replaying all events.** For a scan with 15 ingredient events, replaying 15 events to answer "what is the current status?" is wasteful. Requires a read model (materialised view or separate `sessions` table) — which duplicates the effort of option 1.

2. **No standard Python tooling.** SQLAlchemy + Alembic handles relational models cleanly. Event sourcing in Python requires either a custom implementation or a library like `eventsourcing` (adds a new dependency with its own learning curve).

3. **Ordering and deduplication complexity.** Two concurrent requests that both trigger `IngredientsDetected` must be deduplicated. Out-of-order events (network retries) must be handled. This is non-trivial.

4. **Querying is harder.** "Find all sessions in `ingredients_detected` status" requires either replaying all events or maintaining a materialised view. A simple `WHERE status = 'ingredients_detected'` is not possible on a raw event table.

**Verdict:** Architecturally correct for systems where immutable audit history is a hard requirement (finance, compliance). Over-engineered for a mobile food app at MVP. The `status` column approach gives 90% of the benefit with 10% of the complexity.

---

### 4. Denormalise scan state onto the `users` table

**What it is:** Store the last scan's state as JSONB on the `users` row — `users.last_scan JSONB`. No separate sessions table.

```json
{
  "status": "ingredients_detected",
  "detected": ["chicken", "lemon"],
  "confirmed": ["chicken"],
  "recipes": []
}
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Link inputs to outputs | ❌ Only the most recent scan is stored; history is impossible |
| H2 All input methods | ✅ |
| H3 Mid-flow abandonment | ✅ Row is simply in a partial state |
| H4 AI accuracy | ❌ Only the current scan's data is available; no historical accuracy signal |
| H5 History screen | ❌ One scan per user — history impossible |
| S1 Resumable | ✅ For the current scan only |

**The fatal flaw:** This design assumes one scan at a time, forever. A user who scans their fridge on Monday and wants to view the recipes they found on Monday while starting a new scan on Thursday cannot do both. There is no history, no per-scan audit trail, and no accuracy measurement across scans.

**Verdict:** Appropriate only if we commit to "the app remembers only the most recent scan" as a permanent product decision. Incompatible with the history screen requirement.

---

## Side-by-side comparison

| Criterion | Persisted session | Stateless | Event sourcing | User-level denormalise |
|---|---|---|---|---|
| Link inputs to outputs | ✅ | ❌ | ✅ | ❌ |
| All input methods | ✅ | ✅ | ✅ | ✅ |
| Mid-flow abandonment safe | ✅ | ✅ | ✅ | ✅ |
| AI accuracy measurement | ✅ | ❌ | ✅ | ❌ |
| History screen | ✅ | ❌ | ✅ | ❌ |
| Simple queryable state | ✅ | N/A | ❌ | ✅ |
| Implementation complexity | Low | Lowest | High | Lowest |
| Resumable scans | ✅ | ❌ | ✅ | ✅ (one scan) |
| Hard constraints met (of 5) | **5 / 5** | 2 / 5 | 5 / 5 | 2 / 5 |

---

## Decision rationale summary

The persisted session entity is chosen over stateless and user-level denormalisation because H1 (link inputs to outputs) and H5 (history screen) are explicit product requirements. It is chosen over event sourcing because it delivers the same functional requirements with a fraction of the implementation complexity — a `status` column with 8 states is queryable, indexable, and understandable by any SQL developer without replaying event streams.

The three separated ingredient arrays (`detected`, `confirmed`, `removed`, `added_manually` — stored as `state` on `session_ingredients` rows) are the key signal for AI quality measurement. Knowing the confirmation rate per scan tells us when Claude Vision is underperforming without needing to review individual sessions manually.

---

## Revisit if

- **Compliance requirements emerge** (e.g. GDPR audit trail for allergen data) — switch to event sourcing or add an append-only `scan_events` log alongside the session row.
- **Concurrent multi-device scanning** — two devices scanning simultaneously for one household. The current model assumes one in-progress session per user. Add a `device_id` field and allow multiple active sessions.
- **Session table grows beyond 10M rows** — partition by `created_at` (monthly partitions) and move sessions older than 90 days to a cold storage partition or archive table.
- **The history screen is never built** — reconsider stateless model if history is permanently deprioritised; simplifies the backend significantly.
