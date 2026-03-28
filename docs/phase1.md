# Phase 1

This document summarizes what Phase 1 of Deal Coordinator is meant to deliver, what exists in the repository today, what was explicitly deferred, known limitations, and a high-level Phase 2 roadmap.

## Scope and deliverables

Phase 1 targets a **coherent vertical slice** for a multi-tenant real estate brokerage:

1. **Workspace model** — Workspaces, memberships, roles, and workspace-scoped settings (confidence thresholds, review gate policy, audit retention metadata).
2. **Deal operations** — Create and list deals, maintain deal fields with provenance and confidence, transition stages via an in-code workflow engine with role guards.
3. **Chat ingestion** — Gateway webhook → API ingest → AI parse (fake adapter) → deal create/update → unresolved items → communications → audit trail.
4. **Exception and resolution flows** — Create and update deal exceptions with audit.
5. **Memory and communications** — Persist and list memory entries and communications tied to workspace/deal context.
6. **Dashboard** — Aggregate counts for deals and exceptions for the active workspace.
7. **Web UI** — Next.js app for login selection (stub), workspace context, deals, deal detail (including intake/confidence UX), settings, dashboard.
8. **Auditability** — Append-only audit events with actor, action, snapshots, and request correlation.
9. **Developer experience** — Monorepo with Turborepo, Prisma migrations, seed data, Docker Compose, documented env and architecture.

## What was built

- **Apps:** `web`, `api`, `gateway`, and a **worker shell** that starts and logs readiness (no job consumption).
- **Packages:** `db` (full Prisma schema and migrations), `shared` (schemas/types), `workflow` (machines + guards), `ui`, `config`.
- **Tenancy:** Middleware-enforced `x-workspace-id` + `x-user-id` with membership checks; services scope Prisma queries by `workspaceId`.
- **API:** Nest modules for auth stub, workspaces, deals, chat, audit, unresolved items, communications, memory, exceptions, deal query, dashboard; global exception filter and response envelope.
- **CI:** GitHub Actions workflow for install, Prisma generate, lint, typecheck, test, build against Postgres 16.

## Deferred to Phase 2

- **Real authentication** — OIDC/OAuth2 or similar; removal of trust-on-headers for non-demo environments.
- **Temporal (or equivalent)** — Durable workflows, retries, and scheduled activities for reminders and outbound sends.
- **Worker queue** — Redis/BullMQ (or Temporal workers) for async processing; today’s worker is intentional placeholder.
- **Production AI** — Live LLM integration with monitoring, prompt versioning, and cost controls (interface exists; default is `fake`).
- **S3 document pipeline** — Full object lifecycle, virus scan, presigned uploads beyond config stubs.
- **Gateway hardening** — Webhook signature verification, provider-specific adapters (e.g. OpenClaw), rate limiting, idempotency keys.
- **Advanced search / reporting** — Full-text search, exports, BI integrations.
- **Email/SMS sends** — Review-gate enforcement on outbound channels with provider integrations.

## Known limitations

- **Security:** Header-based identity is suitable **only** for local demo and controlled tests; it must not be exposed to the public internet without a terminating auth layer.
- **Synchronous workflow:** Stage transitions and chat handling run in the API process; heavy load or long LLM calls will block request threads until async infrastructure exists.
- **Single region / no HA story in repo** — Deployment topology, failover, and multi-region replication are operator concerns not encoded in Phase 1.
- **Audit retention:** Policy fields exist; automated archival/purge is not implemented.
- **Test coverage:** Vitest is wired in selected packages; coverage is not yet comprehensive across all modules.
- **e2e:** API defines e2e test script; full automated e2e in CI may require additional setup (DB migrate + supertest flows).

## Phase 2 roadmap (themes)

1. **Identity and access** — SSO, RBAC refinements, audit of admin overrides.
2. **Async platform** — Queue + worker implementations; optional Temporal for long-running sagas.
3. **AI productionization** — Real provider adapter, evaluation harness, redaction, and PII handling.
4. **Integrations** — CRM, MLS, calendar, e-sign; webhook reliability and replay.
5. **Compliance operations** — Audit export, integrity hashing, retention jobs, legal hold flags.
6. **Observability** — Structured logging, metrics, tracing across gateway → API → DB.

For structural rationale behind Phase 1 choices, see `docs/adr/`.
