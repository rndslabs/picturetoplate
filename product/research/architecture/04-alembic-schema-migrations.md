# Architecture Research: Schema Migration Tooling

**Decision:** Use Alembic for database schema migrations  
**Prepared:** April 2026  
**Feeds into:** ADR-003

---

## What we needed from a migration tool

Schema migrations are the mechanism by which a database evolves in step with code changes. Every time a column is added, a table renamed, or an index created, a migration script captures that change so it can be applied reproducibly across every environment — local, staging, and production.

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | SQLAlchemy 2.x integration | We chose SQLAlchemy as our ORM; the migration tool must read its metadata to autogenerate scripts |
| H2 | Async PostgreSQL compatible | `env.py` must run migrations using the async engine without blocking the event loop |
| H3 | Reversible migrations | Every `upgrade()` must have a corresponding `downgrade()` — roll-back to any prior state without data loss |
| H4 | Version history | Each migration is a numbered, named file tracked in git — the team can see exactly when a column was added and why |
| H5 | Autogenerate from model diffs | When a model changes, the tool should detect the diff and generate the SQL automatically rather than requiring hand-written `ALTER TABLE` statements |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | CLI tooling | Run migrations from the terminal as part of deploy scripts |
| S2 | Offline mode (SQL script generation) | Generate a `.sql` file for review before running against a live DB |
| S3 | Branch-aware | In a team with feature branches, two branches adding different columns should not conflict |
| S4 | Python-native scripts | Migration scripts in Python rather than raw SQL — reuse of SQLAlchemy types, enums, and constraints |

---

## Options evaluated

### 1. Alembic ✅ CHOSEN

**What it is:** The official migration tool for SQLAlchemy, maintained by the same team (Zzzeek / SQLAlchemy core contributors). Migration scripts are Python files with `upgrade()` and `downgrade()` functions that use `alembic.op` for DDL operations.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 SQLAlchemy integration | `target_metadata = Base.metadata` — Alembic reads ORM model definitions directly |
| H2 Async | `async_engine_from_config` + `asyncio.run(run_async_migrations())` in `env.py` |
| H3 Reversible | Every generated script has both `upgrade()` and `downgrade()` |
| H4 Version history | Each file is named `{revision_id}_{description}.py`; `down_revision` field chains them into a linear (or branched) history |
| H5 Autogenerate | `alembic revision --autogenerate -m "..."` compares live DB schema to `Base.metadata` and generates the diff |
| S1 CLI | `alembic upgrade head`, `alembic downgrade -1`, `alembic current`, `alembic history` |
| S2 Offline mode | `alembic upgrade head --sql` prints SQL to stdout instead of running it |
| S3 Branch-aware | Alembic supports multiple revision heads for parallel branches; `alembic merge heads` resolves them |
| S4 Python-native | `op.create_table()`, `op.add_column()`, `op.create_index()` — Python API over DDL |

**Weaknesses:**
- **Autogenerate has blind spots:** Alembic cannot detect changes to server-side defaults, PostgreSQL enums, custom CHECK constraints, or Postgres triggers. These must be added manually to generated scripts.
- **`env.py` is non-trivial for async:** The async migration setup (`async_engine_from_config`, `asyncio.run()`) is not in the default Alembic template — it requires custom `env.py` configuration that is easy to get wrong.
- **No data migrations:** Alembic handles DDL (schema changes) cleanly but has no special support for data migrations (e.g. backfilling a new column). These are written as raw SQL or SQLAlchemy `text()` calls inside `upgrade()` — functional but not ergonomic.
- **Revision file clutter:** A fast-moving sprint can generate 10–20 migration files quickly. Convention required: meaningful message strings, one logical change per revision.

---

### 2. Aerich (Tortoise ORM migrations)

**What it is:** The migration tool designed for Tortoise ORM. Aerich reads Tortoise model definitions, generates migration scripts, and applies them — analogous to Alembic but for the Tortoise ecosystem.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 SQLAlchemy integration | ❌ Aerich reads Tortoise ORM models only. Incompatible with SQLAlchemy. |
| H2 Async | ✅ Tortoise ORM is async-native; Aerich inherits this |
| H3 Reversible | ✅ Generates `upgrade()` and `downgrade()` |
| H4 Version history | ✅ Numbered revision files |
| H5 Autogenerate | ✅ Detects model diffs automatically |

**Verdict:** Ruled out immediately on H1. We use SQLAlchemy; Aerich only works with Tortoise ORM. This is not a trade-off — it is an incompatibility.

---

### 3. Yoyo Migrations

**What it is:** A lightweight, database-agnostic migration tool. Migrations are written as raw SQL files (`.sql`) or Python scripts that use a database connection directly. No ORM integration.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 SQLAlchemy integration | ❌ Yoyo does not read SQLAlchemy metadata; no autogenerate |
| H2 Async | ⚠️ Uses synchronous `psycopg2`/`pg8000` drivers; not async-native |
| H3 Reversible | ✅ Every migration file can include a `rollback` function |
| H4 Version history | ✅ Files named by timestamp or sequence number |
| H5 Autogenerate | ❌ No autogenerate; every migration is hand-written SQL |
| S4 Python-native | ⚠️ Python scripts supported but without SQLAlchemy type system |

**Where Yoyo wins:** Polyglot teams where migrations need to be database-agnostic and not coupled to any specific Python ORM. A team that writes migrations in raw SQL and has a DBA reviewing them before apply would prefer Yoyo.

**The problem for us:** Without autogenerate (H5), every change to a SQLAlchemy model requires manually translating the diff into a SQL `ALTER TABLE` statement. With eight tables and a fast-moving sprint, this is error-prone and slow. We have already seen this pattern fail in other projects — a model gets updated, the migration is forgotten, and the next deploy breaks production.

**Verdict:** Ruled out on H1 (no SQLAlchemy integration) and H5 (no autogenerate).

---

### 4. Django Migrations (conceptual reference)

Not applicable — we are not using Django. Included as a reference point since many engineers know this tool.

Django migrations (`makemigrations` / `migrate`) are the closest analogue to Alembic. Key differences:
- Tightly coupled to Django's ORM; cannot be used with SQLAlchemy
- Store migration state in a `django_migrations` DB table rather than a revision chain file
- No Python `upgrade()` / `downgrade()` pattern — `forwards()` only by default (reversible with `--fake`)

The conceptual workflow (edit model → generate migration → apply) is identical to Alembic. The implementation is not portable.

---

### 5. Manual SQL scripts

**What it is:** Writing `ALTER TABLE` and `CREATE TABLE` SQL files by hand, applying them manually or via a simple shell script.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 SQLAlchemy integration | ❌ No integration; the developer must manually translate ORM model changes to SQL |
| H2 Async | N/A — run via `psql` CLI before the app starts |
| H3 Reversible | ❌ No built-in rollback; developer must manually write inverse SQL |
| H4 Version history | ⚠️ Only if the team enforces a naming convention — not enforced by tooling |
| H5 Autogenerate | ❌ None |

**The failure mode:** In a build week moving fast, a developer updates a SQLAlchemy model, forgets to write the corresponding SQL, and the first deploy breaks with `column does not exist`. Without tooling to detect the drift, this is caught only at runtime — on production. With Alembic, `alembic current` shows the applied revision, `alembic upgrade head` applies the missing change, and the diff can be reviewed before deploy.

**Verdict:** Not viable for a team environment. Manual scripts are appropriate for one-off fixes on a database the developer fully owns — not for a shared schema evolving across a team.

---

## Side-by-side comparison

| Criterion | Alembic | Aerich | Yoyo | Manual SQL |
|---|---|---|---|---|
| SQLAlchemy integration | ✅ Native | ❌ | ❌ | ❌ |
| Async PostgreSQL | ✅ Custom env.py | ✅ | ❌ | N/A |
| Reversible (downgrade) | ✅ | ✅ | ✅ | ❌ |
| Version history in git | ✅ | ✅ | ✅ | ⚠️ Convention only |
| Autogenerate from model | ✅ | ✅ | ❌ | ❌ |
| CLI tooling | ✅ | ✅ | ✅ | ❌ |
| Offline SQL generation | ✅ `--sql` flag | ❌ | ✅ | N/A |
| Branch-aware merging | ✅ `merge heads` | ❌ | ❌ | ❌ |
| Hard constraints met (of 5) | **5 / 5** | 1 / 5 | 2 / 5 | 0 / 5 |

---

## Decision rationale summary

Alembic is the only migration tool compatible with our chosen ORM (SQLAlchemy 2.x). All other options fail H1. The autogenerate capability (H5) is critical during a build week — it means a developer can add a column to a model and run a single command to get a correct, reversible migration script, rather than hand-writing `ALTER TABLE` SQL and hoping it matches the ORM.

The async `env.py` setup was the main friction point. Once configured correctly (using `async_engine_from_config` and `asyncio.run()`), it is invisible to everyday use.

---

## Revisit if

- **Schema changes become very frequent:** Consider keeping migration scripts small (one logical change each) and adding a linting step to CI that runs `alembic check` to fail builds where models and DB are out of sync.
- **We add a staging environment:** Run `alembic upgrade head` as part of the staging deploy pipeline before the production deploy — migrations are tested on staging data before touching production.
- **Data migrations become complex:** Evaluate `alembic-utils` for stored procedures and views, or write data migrations as separate one-off scripts that run after `alembic upgrade head`.
