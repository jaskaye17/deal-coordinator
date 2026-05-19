# ADR 007: API authentication and module map (Phase 1)

## Status

Accepted — records **as-built** behavior for `apps/api` as of Phase 1.

## Context

The NestJS API must authenticate users, enforce workspace tenancy, expose many REST resources, and stay consistent with [ADR 002](002-multi-tenancy.md) (app-layer row scoping).

## Decision — Authentication

1. **Email + password** — **`AuthService`** registers and logs in users with **bcrypt** (`passwordHash` on `User`). JWT/session cookies are **not** the primary Phase 1 pattern for the SPA; the web app stores user/workspace ids and sends **tenant headers** on subsequent requests (see ADR 006).
2. **Optional Auth0** — If **`AUTH0_DOMAIN`** is set, **`JwtAuthGuard`** can validate **`Authorization: Bearer`** JWTs via JWKS, resolve `User` by `auth0Sub` or email, and attach **`tenantContext`** on the request. If Auth0 is not configured, guard allows fall-through to header-based tenancy.
3. **Tenant middleware** — **`TenantContextMiddleware`** applies to all routes except **`auth/*`** and **`webhooks/*`** patterns (regex exclude in `AppModule`). It requires membership for `x-workspace-id` + `x-user-id` (or relies on guard-populated context when Auth0 sets it).

## Decision — HTTP conventions

Documented in [Architecture](../architecture.md): **`ResponseInterceptor`** wraps `{ data }`; **`HttpExceptionFilter`** returns stable JSON errors with **`requestId`**.

## Decision — Module responsibilities (inventory)

| Area | Nest module | Role (summary) |
| --- | --- | --- |
| Persistence | `PrismaModule` | Prisma client, DI |
| Auth | `AuthModule` | Register, login, profile/agent metadata |
| Tenancy | `WorkspacesModule` | Workspace CRUD, settings, memberships |
| Core deal | `DealsModule` | Deal CRUD, stage transitions (uses `packages/workflow`) |
| Read models | `DealQueryModule`, `DashboardModule` | Search/filter deals, aggregates |
| Chat / AI | `ChatModule`, `LLMModule`, `UserAiModule` | Ingest pipeline, orchestrator, user AI prefs |
| Conversational | `ConversationalAi` services | Intent/deal resolution from messages (used by chat) |
| Compliance | `AuditModule` | Append-only audit events |
| Workflow ops | `UnresolvedItemsModule`, `ExceptionsModule`, `ReviewTasksModule`, `TasksModule` | Items needing resolution, exceptions, review queue, tasks |
| Comms / memory | `CommunicationsModule`, `MemoryModule`, `NotificationsModule` | Threads, memory entries, notifications |
| Documents / files | `DocumentsModule`, `FilesModule`, `FileStorageModule`, `PDFModule` | Documents, folders/file assets, storage provider, PDF helpers |
| Offers / contracts | `OffersModule`, `AcceptanceModule`, `OfferComparisonModule`, `OfferExtractionModule` | Offers, acceptance, comparison snapshots |
| Signing | `SignaturesModule` | Envelopes + DocuSign webhook |
| Calendar | `CalendarEventsModule`, `KeyDatesModule`, `CalendarSyncModule` | Events, key dates, sync hooks |
| Templates | `TemplatesModule` | Template library, fields, workflows |
| Integrations | `MessagingModule` | Provider webhooks/debug, message processing |
| Ingress | `gateway` is separate app | `POST /webhook/chat` → API chat ingest |

Worker (`apps/worker`) is a **placeholder** process (no queue consumer) in Phase 1.

## Consequences

**Positive**

- Feature boundaries map cleanly to Nest modules; new surfaces follow the same pattern.
- Optional Auth0 path exists without breaking header-based SPA flow.

**Negative / risks**

- Two auth paths (password + optional JWT) increase test matrix.
- Many modules depend on consistent `workspaceId` scoping—reviews must catch omissions.

## References

- [Architecture](../architecture.md)
- [ADR 002](002-multi-tenancy.md)
- [ADR 003 — Workflow engine](003-workflow-engine.md)
- [ADR 004 — AI adapter](004-ai-adapter.md)
- [ADR 005 — Audit policy](005-audit-policy.md)
