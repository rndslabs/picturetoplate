# Architecture Research: Schema Forward-Compatibility for Safety Upgrade

**Decision:** Reserve `allergen_confidence_level` as a null field in the v1 schema  
**Prepared:** April 2026  
**Feeds into:** ADR-001, ADR-006

---

## The problem

We know v1 uses a string-match allergen check that will be upgraded to a Claude API-powered check in v2. The upgrade will emit a confidence score (0.0–1.0) that string-match cannot. The question is: how do we design the v1 schema so that the v2 upgrade does not require a breaking schema change — in the DB, in the API response, or in the frontend?

This is a class of problem called **schema forward-compatibility**: designing today's data model to absorb tomorrow's known change without a migration, API version bump, or client update.

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | No breaking API change on v2 upgrade | The mobile client and web frontend must not need an update when we switch from string-match to Claude API safety |
| H2 | Clear null semantics | A null `confidence_level` must unambiguously mean "not yet computed" — not "0% confidence" or "check failed" |
| H3 | Auditable safety method | The check method used for each recipe card must be queryable after the fact — for debugging, for the batch re-check job, for support |
| H4 | No extra DB migration on v2 upgrade | Switching the safety implementation should require only code changes, not a schema change |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Minimal schema surface area | Reserved fields add complexity; limit to fields we are highly confident we will need |
| S2 | Self-documenting | A developer reading the schema should understand what the reserved field is for without consulting documentation |

---

## Options evaluated

### 1. Reserve the field as null in v1 ✅ CHOSEN

**What it is:** Include `allergen_confidence_level NUMERIC(4,3)` as a nullable column in `recipe_cards` from day one, populated as `null` for all string-match v1 records, and populated with a float (0.0–1.0) by the Claude API v2 check.

Similarly, include `allergen_check_method VARCHAR(30)` as a non-nullable string, defaulting to `"string-match-v1"` and switching to `"claude-api-v2"` when the v2 check runs.

```sql
allergen_confidence_level NUMERIC(4,3) NULL,
allergen_check_method VARCHAR(30) NOT NULL DEFAULT 'string-match-v1',
```

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 No breaking API change | `allergen_confidence_level: null` in v1 API responses; `allergen_confidence_level: 0.92` in v2 — same field, same JSON key, clients already handle `null` |
| H2 Clear null semantics | `null` = "string-match was used, confidence not applicable"; documented in ADR-001 and the Pydantic schema docstring |
| H3 Auditable | `SELECT recipe_id, allergen_check_method FROM recipe_cards WHERE allergen_check_method = 'string-match-v1'` returns every card that needs re-checking |
| H4 No extra migration | The column exists already; v2 switches from writing `null` to writing a float — no DDL change |
| S1 Minimal surface area | Two fields added (confidence level + method string); both have a clear future use case |
| S2 Self-documenting | `allergen_check_method = "string-match-v1"` reads as self-explanatory in any query |

**Weaknesses:**
- Every v1 recipe card row carries a null column. At 1M rows, this is ~4 MB of null storage — negligible.
- A developer who does not read the ADR may be confused by a null confidence field on recipe cards that appear to have passed the safety check. Mitigated by the explicit `allergen_check_method` column — "it's null because string-match-v1 doesn't produce a confidence score."

---

### 2. Add the field in a v2 migration

**What it is:** Do not reserve the field in v1. When v2 launches the Claude API safety check, run an Alembic migration to add `allergen_confidence_level` as a new nullable column.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 No breaking API change | ⚠️ A new field in the API response is additive and technically non-breaking for most clients. But clients that validate response shapes strictly (e.g. Pydantic on the frontend) will fail if they do not expect the new field. |
| H2 Clear null semantics | ✅ On v2 migration: rows before the migration have null (pre-check era); rows after have a float |
| H3 Auditable | ✅ The absence of the field in v1 rows is itself auditable — it simply did not exist |
| H4 No extra migration | ❌ Adding the column requires a migration: `ALTER TABLE recipe_cards ADD COLUMN allergen_confidence_level NUMERIC(4,3)` |

**The practical problem:** The v2 safety upgrade is a code change + API change + migration all at once. Coordinating a DB migration, a backend code deploy, and a frontend client update simultaneously is a deployment risk. The migration adds the column with `ALTER TABLE`, which takes a brief table lock on Postgres. For a table with 100k+ rows, this may cause a brief write pause.

By reserving the column in v1, the v2 upgrade is only a code change. The column is already there; only the application logic changes.

**Verdict:** Valid approach, but strictly worse than option 1. The only benefit is a marginally cleaner v1 schema — not worth the deployment coordination cost.

---

### 3. Use a separate `safety_audits` table

**What it is:** Do not store confidence level on `recipe_cards` at all. Create a `safety_audits` table: `(audit_id, recipe_id FK, check_method, confidence_level, checked_at)`. v1 rows have no `safety_audits` entry; v2 rows have one per recipe.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 No breaking API change | ✅ API continues to read from `recipe_cards`; safety audit data is joined and merged at the service layer |
| H2 Clear null semantics | ✅ Absence of a row = no AI-powered check performed |
| H3 Auditable | ✅ `SELECT * FROM safety_audits WHERE check_method = 'string-match-v1'` — but this table doesn't exist yet for v1, so the query returns nothing for all historical records |
| H4 No extra migration | ❌ Requires creating the `safety_audits` table in a v2 migration |

**Where this approach wins:** If we expect many safety checks per recipe (e.g. re-checking when allergen taxonomy updates), a separate table with one row per check is the correct normalised design. It supports a full audit history: "this recipe was checked by string-match on Day 1, re-checked by Claude API on Day 30, and passed both times."

**The cost at MVP:** A separate table adds a JOIN to every recipe fetch — `LEFT JOIN safety_audits ON recipe_cards.recipe_id = safety_audits.recipe_id`. If re-checking is a real requirement, this is worth it. If the upgrade is a one-time switch from v1 to v2 with no need for historical re-check records, the reserved null approach is simpler.

**Verdict:** Over-engineered for current requirements. Revisit if we build a batch re-check job that creates one audit row per check.

---

### 4. Separate the safety result into a JSONB blob

**What it is:** Replace individual safety columns with a single `safety JSONB` column on `recipe_cards` that stores the full safety result: `{allergen_check_passed, allergen_check_method, confidence_level, flagged_allergens, disclaimer_shown}`.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 No breaking API change | ✅ The JSONB blob evolves without column changes |
| H2 Clear null semantics | ⚠️ `confidence_level: null` inside a JSONB blob is less visible than a dedicated column |
| H3 Auditable | ❌ `SELECT * FROM recipe_cards WHERE safety->>'allergen_check_method' = 'string-match-v1'` — requires JSONB operator instead of simple column equality; harder for non-engineers to write |
| H4 No extra migration | ✅ Adding a key to the JSONB blob requires no migration |

**The core problem:** `allergen_check_passed` is a boolean that must be indexed — it is the primary filter for the UI "do not show this recipe" decision. An indexed boolean flat column (`CREATE INDEX ON recipe_cards (allergen_check_passed)`) is significantly faster than a GIN-indexed JSONB containment query (`WHERE safety @> '{"allergen_check_passed": false}'`). Storing the filter-critical fields in JSONB trades queryability for schema flexibility.

**Verdict:** Rejected because `allergen_check_passed` needs a flat indexed column. The safety block is too important to the query path to put in JSONB.

---

## Side-by-side comparison

| Criterion | Reserved null (v1) | Add in v2 migration | Separate audit table | JSONB safety blob |
|---|---|---|---|---|
| No breaking API change on upgrade | ✅ | ⚠️ | ✅ | ✅ |
| Clear null semantics | ✅ | ✅ | ✅ | ⚠️ |
| Auditable check method | ✅ | ✅ | ✅ | ⚠️ |
| No extra migration on v2 upgrade | ✅ | ❌ | ❌ | ✅ |
| Index `allergen_check_passed` | ✅ | ✅ | ✅ | ❌ |
| Historical re-check support | ❌ | ❌ | ✅ | ❌ |
| Hard constraints met (of 4) | **4 / 4** | 3 / 4 | 3 / 4 | 3 / 4 |

---

## Decision rationale summary

Reserving the field as null is the minimum-cost forward-compatibility mechanism. Two columns (`allergen_confidence_level` null, `allergen_check_method` string) carry the full context of which safety implementation was used for each recipe card, enable the v2 upgrade to be a code-only change, and require no client updates. The safety audit table is the correct future design if batch re-checking is productised — it can be added as an Alembic migration at that point without touching the existing columns.

---

## Revisit if

- We build a batch nightly re-check job — switch to the `safety_audits` table model so each check has its own row
- We add household member profiles with individual allergen lists — the current single `allergen_check_passed` boolean may need to become per-member
- `allergen_check_method` values proliferate (3+ methods) — consider a `safety_check_methods` enum table rather than a free-form string column
