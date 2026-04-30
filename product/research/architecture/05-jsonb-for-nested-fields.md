# Architecture Research: Storage Strategy for Nested / Variable-Depth Fields

**Decision:** Use PostgreSQL JSONB columns for nested, variable-depth fields  
**Prepared:** April 2026  
**Feeds into:** ADR-004, ADR-006

---

## The problem

Several fields in the PictureToPlate schema are variable-depth nested objects that do not fit cleanly into a flat relational table:

| Field | Why it is variable-depth |
|---|---|
| `recipe_cards.steps` | An ordered array of `{step_number, instruction, duration_minutes}` objects; length varies per recipe (2–20 steps) |
| `recipe_cards.ingredients_used` | An array of `{name, display_name, quantity: {amount, unit}, notes, catalog_ref}` objects |
| `recipe_cards.ingredients_missing` | Same structure as `ingredients_used` |
| `recipe_cards.nutrition_per_serving` | A single `{calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g, sodium_mg, data_completeness}` object |
| `recipe_cards.generation_meta` | `{model, prompt_version, input_ingredient_count, source_session_id}` — will gain new fields as AI pipeline evolves |
| `pantry_sessions.detection_confidence_scores` | `{ingredient_name: confidence_score}` — key count varies by image |
| `pantry_sessions.error` | `{code, message, occurred_at, retriable}` — only present on error rows |
| `user_preferences.nutrition_goals` | `{enabled, daily_calories_kcal, high_protein, low_sodium}` — opt-in, often null |
| `user_preferences.ui_preferences` | `{default_unit_system, language, voice_input_enabled}` |

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Queryable | `recipe_cards` must be filterable by `total_minutes` and `difficulty`; even JSONB fields like `allergen_check_passed` may need to be indexed |
| H2 | Pydantic-validated before write | The DB cannot enforce nested object shape; the application layer must be the sole enforcement boundary |
| H3 | No duplication of nutritional data | Nutritional values for "chicken breast" must not be copied into every recipe card that uses it — they must be sourced from the catalog at serve time |
| H4 | Schema evolution without migration | `generation_meta` will gain new fields (e.g. `tokens_used`, `cache_hit`) as the AI pipeline evolves; adding a key to a JSONB object does not require an Alembic migration |
| H5 | PostgreSQL only | We have committed to PostgreSQL (ADR-003); solutions requiring a document database are not on the table |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | GIN indexing on JSONB | Future: filter recipes by `dietary_tags` array or `ingredients_used[*].name` |
| S2 | Minimal table count | Separate junction tables for steps and ingredients would add 2–3 tables and 6–8 foreign keys to the schema |
| S3 | Readable migration scripts | Alembic scripts are easier to review when the schema is compact |

---

## Options evaluated

### 1. JSONB columns ✅ CHOSEN

**What it is:** PostgreSQL's binary JSON column type. Stored as parsed binary rather than raw text — faster to query, supports operators (`->`, `->>`, `@>`, `?`), and can be GIN-indexed for containment queries.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Queryable | `recipe_cards.total_minutes` is a flat integer column (indexed); JSONB fields are queryable with `->` operators if needed |
| H2 Pydantic-validated | `RecipeCardRead`, `RecipeStep`, `RecipeIngredient` schemas validate before any write |
| H3 No duplication | `ingredients_used` stores the ingredient name and quantity only; nutrition is fetched from `nutrition_catalog` at serve time via join |
| H4 Schema evolution | Adding a key to `generation_meta` JSONB requires no migration — only a Pydantic schema update |
| H5 PostgreSQL only | Native to PostgreSQL; `sqlalchemy.dialects.postgresql.JSONB` provides first-class support |
| S1 GIN indexing | `CREATE INDEX USING GIN (ingredients_used)` — enables `@>` containment queries |
| S2 Minimal table count | 8 tables instead of the 11–12 that separate junction tables would require |
| S3 Readable migrations | `0001_initial_schema.py` is ~180 lines; 3 additional tables would add ~60 more |

**Weaknesses:**
- **No DB-level type enforcement:** PostgreSQL stores any valid JSON in a JSONB column. A `steps` column that should contain `[{step_number: int, instruction: str}]` will happily accept `"hello"` or `null`. Pydantic is the sole guard.
- **Harder to JOIN into:** You cannot join on `recipe_cards.steps[*].catalog_ref` in standard SQL without `jsonb_array_elements()` — a more complex query. This is acceptable because we do not currently need to join on nested ingredient references.
- **`data_completeness` must be kept in sync:** The `nutrition_per_serving.data_completeness` field inside the JSONB blob depends on whether all catalog refs resolved — this logic lives in the service layer and must be tested explicitly.
- **Opaque to non-engineers:** A PM querying the dashboard sees a JSONB blob, not readable columns. Supabase's table editor renders JSONB but it is less convenient than flat columns.

---

### 2. Separate junction tables for each nested entity

**What it is:** Normalising every nested object into its own table. `recipe_steps` table with `(recipe_id FK, step_number, instruction, duration_minutes)`; `recipe_ingredients_used` table with `(recipe_id FK, name, display_name, quantity_amount, quantity_unit, notes, catalog_ref FK)`.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Queryable | ✅ Full SQL query power — JOIN, GROUP BY, aggregate functions |
| H2 Pydantic-validated | ✅ DB constraints (NOT NULL, CHECK) provide a second layer of validation |
| H3 No duplication | ✅ `catalog_ref FK` enforces catalog linkage at the DB level |
| H4 Schema evolution | ❌ Adding a field to `generation_meta` requires an Alembic migration and a new column in a `recipe_generation_meta` table |
| H5 PostgreSQL only | ✅ Standard SQL |
| S1 GIN indexing | N/A — flat columns are B-tree indexed |
| S2 Minimal table count | ❌ Adds `recipe_steps`, `recipe_ingredients_used`, `recipe_ingredients_missing`, `session_errors`, `detection_scores` — 5 additional tables, ~30 additional foreign key columns |

**The practical cost:**

For `recipe_steps`, the junction table approach requires:
- 1 additional table with 4 columns
- 1 Alembic migration script per table
- 1 SQLAlchemy model class per table
- 1 relationship definition on `RecipeCard`
- A `selectinload(RecipeCard.steps)` on every recipe fetch
- An `order_by(RecipeStep.step_number)` to maintain ordering

JSONB handles all of this with one column, one Pydantic schema, and one `json.loads()`.

**Where junction tables win:** When you need to query or aggregate across the nested data. If we needed "show me all recipes that use chicken breast" and `ingredients_used` is JSONB, we need `jsonb_array_elements()`. With a junction table, it is a simple JOIN. This is a future requirement we expect — and when it materialises, we add a GIN index to the JSONB column or migrate that specific field to a junction table.

**Verdict:** Rejected at MVP on H4 (schema evolution) and S2 (table count). The query flexibility of junction tables is not needed today; GIN indexing provides a migration path when it is.

---

### 3. Flat nullable columns (EAV-adjacent)

**What it is:** Flattening every nested field into individual nullable columns. `recipe_cards.nutrition_calories_kcal`, `recipe_cards.nutrition_protein_g`, `recipe_cards.nutrition_carbohydrates_g`, etc.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Queryable | ✅ Flat columns are trivially queryable and indexable |
| H2 Pydantic-validated | ✅ |
| H3 No duplication | ✅ |
| H4 Schema evolution | ❌ Adding `nutrition_fiber_g` requires an Alembic migration to add a column |
| H5 PostgreSQL only | ✅ |
| S2 Minimal table count | ✅ No new tables |

**The problem with `recipe_steps`:** Steps cannot be flat-columned without knowing the maximum number of steps upfront. `step_1_instruction`, `step_2_instruction`, … `step_20_instruction` is the classic EAV anti-pattern. It wastes column space for short recipes, limits long recipes, and makes ordering and iteration painful.

**Nutrition per serving** could work as flat columns — there are exactly 7 macro fields. But adding `vitamin_c_mg` in a future version requires a migration and a new column. JSONB handles this with a Pydantic schema update only.

**Verdict:** Appropriate for truly fixed-structure data (e.g. `nutrition_goals` fields that will never change). Rejected for `steps` and `ingredients_used` where array length is variable. Partially used: flat columns for `total_minutes`, `difficulty`, `allergen_check_passed` where indexing is needed.

---

### 4. Separate document store (MongoDB or DynamoDB)

**What it is:** Storing recipe cards or session data in a document database (MongoDB, DynamoDB) while keeping relational data (users, sessions) in PostgreSQL.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Queryable | ✅ MongoDB aggregation pipeline; DynamoDB querying by partition key |
| H2 Pydantic-validated | ✅ Application-level validation still possible |
| H3 No duplication | ❌ Cross-store joins (Postgres user ↔ Mongo recipe) require application-level coordination — no FK enforcement |
| H4 Schema evolution | ✅ Document stores are schema-less by default |
| H5 PostgreSQL only | ❌ Requires a second database vendor, second set of credentials, second backup configuration |

**The core problem:** This is a polyglot persistence architecture. At MVP scale with a team of 4–6, maintaining two database systems doubles the operational surface area. Every deploy must coordinate schema state across both systems. Debugging a bug that spans a Postgres user record and a Mongo recipe card requires two clients, two query languages, and two mental models.

PostgreSQL with JSONB provides 90% of the document store benefit (variable-depth JSON, schema-less evolution) while remaining a single system with relational integrity, FK enforcement, and Alembic migrations.

**Verdict:** Ruled out on H5 (PostgreSQL-only) and H3 (cross-store referential integrity).

---

## Side-by-side comparison

| Criterion | JSONB columns | Junction tables | Flat nullable columns | Separate document store |
|---|---|---|---|---|
| Schema evolution without migration | ✅ | ❌ | ❌ | ✅ |
| DB-level type enforcement | ❌ | ✅ | ✅ | ❌ |
| Variable-length arrays | ✅ | ✅ | ❌ | ✅ |
| Simple SQL queries on nested data | ⚠️ `jsonb_array_elements` | ✅ JOIN | ✅ | ✅ |
| GIN indexing for containment | ✅ | N/A | N/A | ✅ |
| Minimal additional tables | ✅ 0 | ❌ +5 tables | ✅ 0 | ❌ Second system |
| Single vendor / system | ✅ | ✅ | ✅ | ❌ |
| Hard constraints met (of 5) | **5 / 5** | 4 / 5 | 3 / 5 | 3 / 5 |

---

## Decision rationale summary

JSONB was chosen for variable-depth, schema-evolving fields. Flat columns were retained for fixed fields that need indexing (`total_minutes`, `difficulty`, `allergen_check_passed`). This is a deliberate hybrid — not all-JSONB, not all-flat.

The governing principle: **if a field will be queried or filtered independently, it gets a flat indexed column. If it is read as a unit and its internal structure may evolve, it goes into JSONB.**

The enforcement boundary is explicit: Pydantic schemas validate JSONB content before every write. No code path writes to a JSONB column without passing through a schema. This is tested, not assumed.

---

## Revisit if

- **"Find all recipes using chicken breast" becomes a product requirement** — add a GIN index on `recipe_cards.ingredients_used` and use `@>` containment queries, or migrate `ingredients_used` to a junction table.
- **`generation_meta` grows beyond 5 fields** — consider a dedicated `recipe_generation_audits` table if the data becomes something engineers want to aggregate or group by.
- **Nutrition tracking becomes a core feature** — migrate `nutrition_per_serving` from JSONB to flat columns to enable SQL-level aggregation (e.g. "total calories across saved recipes this week").
