# Architecture

This document describes how the Deal Coordinator monorepo is structured at runtime, how tenants are isolated, and how the main product flows (chat ingest, workflows, AI, audit) fit together. **Product direction** is a **text-first AI transaction coordinator for realtors** ([`vision.md`](vision.md)); **web** and **workspace** features support that story and future brokerage scale. It reflects **Phase 1** behavior unless noted as future work.

## System overview

The product is split into four deployable **apps** and five shared **packages**:

| Unit | Role |
| --- | --- |
| **web** (`apps/web`) | Next.js **supporting** UI (deal picture, docs, settings). **Primary** experience is **messaging** to the coordinator; same API and tenancy model. |
| **api** (`apps/api`) | NestJS HTTP API: REST resources, tenant middleware, orchestration, Prisma persistence. |
| **worker** (`apps/worker`) | Reserved for async jobs; Phase 1 logs readiness only (no queue consumer). |
| **gateway** (`apps/gateway`) | Minimal HTTP server: `POST /webhook/chat` forwards payloads to the API’s chat ingest route; `GET /health`. |
| **db** (`packages/db`) | Prisma schema, migrations, generated client, seed script. |
| **shared** (`packages/shared`) | Cross-cutting types, Zod schemas, `AppError`, enums, demo IDs. |
| **ui** (`packages/ui`) | Shared React components consumed by **web**. |
| **workflow** (`packages/workflow`) | Pure deal-stage state machines and transition guard functions (no I/O). |
| **config** (`packages/config`) | `getEnvConfig()` for typed access to `DATABASE_URL`, ports, AI provider, storage, etc. |

Dependencies generally flow **inward**: apps depend on packages; packages avoid depending on apps. **api** is the system of record for HTTP business logic; **gateway** is a thin edge for chat-shaped traffic.

## Multi-tenancy

**Decision in practice:** tenant isolation is enforced in the **application layer**, not with PostgreSQL Row Level Security (RLS).

1. **Workspace context** — Every mutating/list request (except routes excluded in `AppModule`, such as `auth/*`) passes through `TenantContextMiddleware`, which requires:
   - `x-workspace-id`
   - `x-user-id`
2. **Membership** — The middleware loads `WorkspaceMembership` for the pair. Missing headers or membership yields `401` with a stable error shape.
3. **Row scoping** — Services pass `workspaceId` from `TenantContext` into Prisma `where` clauses so queries cannot cross workspaces when implemented consistently. Controllers that accept a workspace id in the path (e.g. `workspaces/:id`) compare it to the tenant’s workspace to prevent cross-tenant access.

The **web** app stores the selected workspace and user in `localStorage` and sends the same headers on API calls.

See [ADR 002: Multi-tenancy](adr/002-multi-tenancy.md).

## API design

- **Style:** REST-style resources under Nest controllers (deals, exceptions, chat ingest, workspaces, etc.).
- **Success envelope** — `ResponseInterceptor` wraps successful handler results as `{ data: ... }` unless the handler already returns an object containing both `data` and `meta` (used for paginated lists).
- **Errors** — `HttpExceptionFilter` returns JSON:

  ```json
  {
    "error": { "code": "SOME_CODE", "message": "Human-readable message" },
    "requestId": "…"
  }
  ```

  Domain errors use `AppError` from **shared** with explicit HTTP status and code. Validation failures surface as `400` with a consolidated message from Zod (via `ZodValidationPipe`).

- **Pagination** — List endpoints that support paging return `{ data, meta }` with page/pageSize (and totals where implemented) so the interceptor does not double-wrap.

- **Request correlation** — `RequestIdMiddleware` assigns a request id available on the request object and included in error payloads for support and log correlation.

## Workflow engine

Deal **stage** transitions are driven by definitions in **workflow**: explicit state machines (e.g. listing lifecycle) and **guards** such as `requireRole`, `agentOrAdminGuard`, and `reviewerOrAdminGuard`. The API evaluates guards synchronously when a transition is requested; there is **no** Temporal or external orchestrator in Phase 1.

**Admin overrides:** admins (per membership role) can satisfy guards that would block agents or reviewers, keeping operations flexible for brokerage staff.

Implications: transitions are **request-scoped and synchronous**; long-running sagas, timers, and compensation are out of scope until a future workflow backend (see below).

See [ADR 003: Workflow engine](adr/003-workflow-engine.md).

## Data flow: chat message → deal updates → audit

1. An external chat system (or a test client) posts to **gateway** `POST /webhook/chat` with JSON body (message, optional `dealId`, `channelId`, `workspaceId`, `senderId`, etc.).
2. **Gateway** forwards to **api** `POST /api/chat/ingest` with `x-workspace-id` and `x-user-id` derived from the payload.
3. **ChatService** invokes the **AI adapter** (`AiParser` implementation) to obtain a structured intent and optional fields.
4. Depending on intent, the service may **create** a deal, **update** fields, create **unresolved items** for missing required data, append **communications**, and call **audit** for each significant change.
5. **AuditService** persists **append-only** `AuditEvent` rows with actor, action, optional before/after snapshots, metadata, and `requestId`.

This path is the primary automation loop for Phase 1; the worker does not participate yet.

## AI adapter pattern

All parsing goes through an **interface** (`AiParser` in the API chat module): `parseMessage(message, context) → ParsedIntent`.

- **Phase 1 implementation:** a **fake** parser returns deterministic, test-friendly structures so development and CI do not require vendor API keys.
- **Swapping providers:** bind a different implementation (e.g. OpenAI-backed) via Nest dependency injection using the same token; configuration uses `AI_PROVIDER` and related env vars from **config**.

See [ADR 004: AI adapter](adr/004-ai-adapter.md).

## Audit policy

- **Append-only:** New rows are inserted for actions (`field_updated`, `unresolved_item_created`, etc.). The schema does not support mutating historical audit rows as part of normal operation.
- **Retention:** `WorkspaceSettings.auditRetentionYears` defaults to **7** years, aligned with common real-estate record-keeping expectations. Actual purge/archival jobs are a future operational concern.
- **Correlation:** `requestId` ties API requests to multiple audit lines; optional `integrityHash` on `AuditEvent` is reserved for future tamper-evidence or export signing.

See [ADR 005: Audit policy](adr/005-audit-policy.md).

## Confidence scoring policy

Structured field updates from AI carry a numeric confidence on `DealField` and a categorical band used in UX and rules:

| Band | Numeric range (default UI/API mapping) | Behavior |
| --- | --- | --- |
| **High** | ≥ **0.85** | Treated as strong signal; `needsConfirmation` is cleared when confidence is high on upsert paths driven by explicit `high` classification. |
| **Medium** | **0.50**–**0.84** | Stored and surfaced; typically requires human confirmation before high-risk actions (see review gate policy JSON on workspace settings). |
| **Low** | Below **0.50** | Treated as weak; often flows to unresolved / confirm flows rather than silent auto-commit. |

Workspace settings expose configurable `confidenceThresholdHigh` and `confidenceThresholdMedium` (defaults 0.85 and 0.50) so brokerages can tune automation aggressiveness.

## Future architecture (not Phase 1)

| Area | Direction |
| --- | --- |
| **Workflow** | [Temporal](https://temporal.io/) or similar for durable timers, retries, and long-running sagas. |
| **Auth** | Real identity provider (OIDC), JWT/session, replacing header stubs. |
| **Storage** | S3-compatible object storage for documents; `STORAGE_DRIVER` already distinguishes `local` vs `s3`. |
| **AI** | Production parser using a hosted LLM with rate limits, caching, and eval hooks. |
| **Worker** | Redis/BullMQ or queue consumer connected to Temporal activities for sends, reminders, and sync. |

These items are intentionally deferred to keep Phase 1 shippable and observable.
