# ADR 002: Multi-tenancy (app-layer row scoping)

## Status

Accepted

## Context

The product is **multi-tenant**: many brokerages (workspaces) share one database deployment. Requirements include:

- Strong logical isolation between tenants’ deals, audit events, and settings.
- Straightforward local development and debugging (no special DB roles per tenant).
- Team familiarity with Prisma and Nest rather than deep PostgreSQL RLS policy authoring.

PostgreSQL **Row Level Security (RLS)** can enforce isolation in the database, but adds migration complexity, policy testing burden, and operational coupling between DB roles and application connections.

## Decision

Enforce tenancy in the **application layer**:

1. Require `x-workspace-id` and `x-user-id` on API routes protected by `TenantContextMiddleware` (with documented exclusions such as auth discovery).
2. Verify **workspace membership** before attaching `TenantContext` to the request.
3. Pass `workspaceId` from that context into all Prisma queries and mutations that touch tenant-owned rows.
4. Reject URL parameters that name another workspace than the authenticated tenant where applicable.

## Consequences

**Positive**

- Policies live in TypeScript next to business logic; code review surfaces tenancy mistakes.
- No RLS policy matrix to maintain in SQL; Prisma remains the single query surface for most code.
- Easier onboarding for contributors who are not PostgreSQL security specialists.

**Negative / trade-offs**

- **Defense in depth is weaker:** A buggy query without `workspaceId` could leak data; reviews and tests must treat tenancy as invariant.
- **Every new service and raw query** must accept and enforce workspace context; skipping middleware or using `prisma.$queryRaw` without filters is high risk.
- Connection pooling is shared across tenants; noisy-neighbor and cache considerations remain at the app level.

**Follow-up**

- Add integration tests that prove cross-tenant access returns `403`/`404` as designed.
- Revisit RLS or database-level isolation if compliance or threat models require it.
