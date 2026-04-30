# Architecture Research: PostgreSQL Hosting Platform

**Decision:** Host PostgreSQL on Supabase rather than self-hosting or using an alternative managed service  
**Prepared:** April 2026  
**Feeds into:** ADR-003  
**Related:** `/product/research/datastore/datastore-options-analysis.md` (covers DB engine choice: Postgres vs MongoDB vs Firebase)

---

## What we needed from a hosting platform

This document focuses on the **hosting** decision — given that PostgreSQL was chosen as the database engine, which platform should run it. The database engine choice is covered in the datastore analysis.

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Zero cost at MVP | Build week; no infrastructure budget until the product validates |
| H2 | Auth included | We cannot ship user accounts without authentication; building JWT issuance from scratch is a week of work |
| H3 | Object storage included | Pantry scan images must live somewhere; a separate S3 account adds credentials, billing, and CORS configuration |
| H4 | Mobile SDK | The mobile client needs a typed client library for auth and DB queries without writing a custom HTTP wrapper |
| H5 | Managed backups | User allergen profiles and scan history are safety-critical; daily backups must exist without manual setup |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Real-time subscriptions | Future: live ingredient confirmation sync between devices |
| S2 | Row-Level Security (RLS) | Future: enforce that users can only read their own data at the DB layer, not just the application layer |
| S3 | Dashboard UI | Non-engineers on the team (PM, designer) should be able to inspect data without writing SQL |
| S4 | Managed schema migrations via CLI | Alembic handles migrations in code; Supabase CLI should not conflict |
| S5 | pgvector extension | Future: semantic recipe search |

---

## Options evaluated

### 1. Supabase ✅ CHOSEN

**What it is:** An open-source Firebase alternative. Wraps a standard PostgreSQL 15 instance with: a PostgREST auto-generated REST API, GoTrue for auth, a WebSocket-based real-time engine (via logical replication), S3-compatible object storage, and a dashboard UI — all accessible via a single project and set of client SDKs.

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Cost | Free tier: 500 MB DB, 1 GB storage, unlimited API calls, 50k MAU auth |
| H2 Auth | Supabase Auth (GoTrue): email/password, magic link, Google/Apple OAuth |
| H3 Object storage | Supabase Storage: bucket-based, S3-compatible, signed URL generation |
| H4 Mobile SDK | Official Flutter, React Native, Swift, Kotlin SDKs — typed client for auth + storage + DB |
| H5 Backups | Daily backups on free tier; point-in-time recovery on Pro |
| S1 Real-time | Postgres logical replication → WebSocket broadcast; built in |
| S2 RLS | Native PostgreSQL Row-Level Security policies, configurable from dashboard |
| S3 Dashboard | Full table editor, SQL editor, auth user list, storage browser |
| S4 Alembic compatibility | Supabase runs standard Postgres; Alembic connects via `asyncpg` and is unaware of Supabase |
| S5 pgvector | Available on Pro tier |

**Weaknesses:**

- **Free tier project pause:** Projects with no activity for 1 week are paused. Cold-start on resume takes ~30 seconds. Must upgrade to Pro ($25/month) before any real-user testing.
- **PostgREST auto-API conflicts with FastAPI:** Supabase exposes a REST API from Postgres automatically (PostgREST). We do not use this from the backend — our FastAPI routes go directly to Postgres via `asyncpg`. There is a risk of confusion if a team member accidentally writes frontend code that calls the PostgREST endpoint directly, bypassing our validation and safety layers.
- **Supabase Auth vs our own auth:** Supabase Auth issues JWTs. The FastAPI backend must validate these using the Supabase JWT secret — this wiring is not yet implemented. Until it is, the auth layer is incomplete.
- **Vendor-specific features:** Real-time and RLS are implemented using Supabase-specific configuration (Supabase dashboard policies). If we migrate off Supabase, these must be re-implemented.

---

### 2. Railway

**What it is:** A PaaS (Platform as a Service) focused on simplicity. Provisions a managed PostgreSQL instance with one click; includes a dashboard, automatic backups, and environment variable management. No proprietary extensions.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Cost | ❌ Free tier provides $5/month credit; a PostgreSQL service typically consumes this within 2 weeks of active use |
| H2 Auth | ❌ Not included; requires a separate auth service (Auth0, Clerk, or custom JWT) |
| H3 Object storage | ❌ Not included; requires a separate S3 bucket or Cloudinary account |
| H4 Mobile SDK | ❌ Not included; mobile clients connect to the backend API only |
| H5 Backups | ✅ Daily automatic backups included |
| S1 Real-time | ❌ Not included |
| S3 Dashboard | ✅ Clean dashboard with query runner and metrics |

**Where Railway wins:** When you want a clean, no-magic Postgres instance with no framework conventions imposed on the schema. There is no PostgREST, no RLS configuration UI, no auth layer — just a database. This is appealing for a mature team that wants full control. For MVP, the cost and the missing auth/storage services are blockers.

**Verdict:** Ruled out on H1 (cost exceeds free tier quickly) and H2/H3 (no auth or storage — requires two additional vendor accounts at MVP).

---

### 3. Neon

**What it is:** A serverless PostgreSQL platform built for branching and scale-to-zero. Every Neon project gets a main branch; database branches (like git branches) can be created for feature development and testing. The compute scales to zero when idle — no pausing like Supabase, just instant cold-start from sleep.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Cost | ✅ Free tier: 0.5 GB storage, 1 project, compute hours per month — sufficient for MVP |
| H2 Auth | ❌ Not included |
| H3 Object storage | ❌ Not included |
| H4 Mobile SDK | ❌ Not included |
| H5 Backups | ✅ Point-in-time restore available |
| S1 Real-time | ❌ Not included |
| S4 Alembic | ✅ Standard Postgres; `asyncpg` works without modification |
| S5 pgvector | ✅ Supported |

**Where Neon wins:** The branching model is genuinely useful for a team running integration tests — each test run can get its own DB branch, run migrations, test, and be discarded. This is significantly better than Supabase for CI/CD at scale. The `asyncpg` compatibility is identical since it is standard Postgres.

**The gap:** Like Railway, Neon provides only the database. Auth and object storage require separate vendors. For a build week with a small team, adding Auth0 + S3 means three vendor accounts, three sets of secrets, and three integration points instead of one.

**Verdict:** Strong contender for post-MVP. Ruled out at MVP on H2/H3 (no auth or storage).

---

### 4. AWS RDS (PostgreSQL)

**What it is:** Amazon's managed relational database service. Mature, battle-tested, and used at massive scale. Supports PostgreSQL 15, Multi-AZ, read replicas, and automated backups.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Cost | ❌ Cheapest RDS instance (db.t3.micro) costs ~$15/month. Free tier exists but expires after 12 months. |
| H2 Auth | ❌ Not included; requires Cognito ($0.0055/MAU) or a third-party auth service |
| H3 Object storage | ❌ Requires a separate S3 bucket |
| H4 Mobile SDK | ❌ Amplify provides a mobile SDK but it is tightly coupled to AWS services and adds significant complexity |
| H5 Backups | ✅ Automated backups and point-in-time recovery included |
| S1 Real-time | ❌ Not included natively |
| S5 pgvector | ✅ Supported on RDS PostgreSQL 15 |

**Where RDS wins:** Unmatched reliability, SLA, and operational maturity at scale. When PictureToPlate has 100k+ users and needs Multi-AZ, read replicas, and custom parameter groups, RDS is the right answer. At MVP scale it is significantly over-engineered and over-priced.

**Verdict:** Ruled out on H1 (cost) and H2/H3 (no auth or storage without additional AWS services). The right target for post-scale migration.

---

### 5. Self-hosted PostgreSQL (Docker / VPS)

**What it is:** Running PostgreSQL directly on a VPS (DigitalOcean Droplet, EC2 instance) or in a Docker container managed by the team.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Cost | ✅ A $4/month DigitalOcean Droplet can run Postgres for a small app |
| H2 Auth | ❌ Not included; everything from scratch |
| H3 Object storage | ❌ Not included |
| H4 Mobile SDK | ❌ Not included |
| H5 Backups | ❌ Manual `pg_dump` or third-party backup setup required; easy to forget |
| S1 Real-time | ❌ Not included |

**The core problem:** The operational burden of self-hosting PostgreSQL is inappropriate for a build-week MVP. Every hour spent configuring pg_hba.conf, SSL certificates, automated backups, and Postgres version upgrades is an hour not spent building the product. The team does not have a dedicated DevOps engineer.

**Verdict:** Ruled out on H5 (backups require manual setup) and overall operational burden. The correct answer for a team that needs full control and has an SRE — not for MVP.

---

## Side-by-side comparison

| Criterion | Supabase | Railway | Neon | AWS RDS | Self-hosted |
|---|---|---|---|---|---|
| Free tier sufficient for MVP | ✅ | ❌ | ✅ | ❌ | ✅ |
| Auth included | ✅ | ❌ | ❌ | ❌ | ❌ |
| Object storage included | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mobile SDK | ✅ | ❌ | ❌ | ⚠️ Amplify | ❌ |
| Managed backups | ✅ | ✅ | ✅ | ✅ | ❌ |
| Real-time subscriptions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Row-Level Security UI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard / SQL editor | ✅ | ✅ | ✅ | ✅ | ❌ |
| pgvector support | ✅ Pro | ❌ | ✅ | ✅ | ✅ |
| Alembic compatible | ✅ | ✅ | ✅ | ✅ | ✅ |
| DB branching (for CI) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Hard constraints met (of 5) | **5 / 5** | 2 / 5 | 2 / 5 | 1 / 5 | 1 / 5 |

---

## Decision rationale summary

Supabase is the only platform that satisfies all five hard constraints simultaneously. Auth, object storage, and mobile SDK bundled into a single free-tier project eliminates three separate vendor accounts and their associated integration work — a significant saving in a build week.

The key risk is the free-tier pause policy. This is a known and managed trade-off: the team upgrades to Pro ($25/month) before any external user testing. All other platforms require us to solve auth and storage separately — problems that are each individually a multi-day integration task.

---

## Revisit if

- **DAU exceeds 10k:** Migrate to Neon (for branching and serverless scale) or RDS (for Multi-AZ reliability) — both run standard Postgres and Alembic migrations are portable.
- **Team needs DB branching for CI:** Neon's branch-per-test-run model is superior to Supabase for integration test isolation.
- **Supabase Auth causes lock-in concern:** Replace with Clerk or Auth0 and connect their JWTs to the FastAPI middleware layer — Supabase Storage and Postgres can remain.
- **We self-host for data sovereignty:** A dedicated Postgres instance on EC2/GKE with Clerk for auth and S3 for storage replicates the Supabase bundle without the platform dependency.
