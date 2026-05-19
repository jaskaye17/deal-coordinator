# ADR 006: Web application structure (Phase 1)

## Status

Accepted — records **as-built** behavior for `apps/web` as of Phase 1.

## Context

The **primary** product experience is **text-first** coordination for the **realtor** ([`vision.md`](../vision.md)). The web app is **supporting**: it must run as a multi-page **Next.js 14** app (App Router) deployed separately from the API (e.g. Vercel), carry **workspace and user identity** on API calls ([ADR 002](002-multi-tenancy.md)), and surface **deals, documents, tasks, review, templates, integrations**, and a **dashboard** without entangling domain logic in the UI (server state in the API).

## Decision

1. **Stack** — Next.js 14 App Router, React 18, Tailwind; **`@deal-coordinator/ui`** for shared components; **`@tanstack/react-query`** for server-state caching and loading/error UX.
2. **API access** — Central client in `src/lib/api.ts`:
   - Base URL from **`NEXT_PUBLIC_API_URL`** (must be absolute origin; validated at runtime in production).
   - Requests go to **`{origin}/api/...`** matching the API global prefix.
   - Tenant headers **`x-workspace-id`** and **`x-user-id`** on mutating/tenant-scoped calls (from `WorkspaceProvider`).
3. **Session persistence (browser)** — After login/register, workspace id and user id are stored in **`localStorage`** (keys aligned with `api.ts` constants). **`WorkspaceProvider`** reads/writes them and **resets React Query** when the active workspace/user pair changes. **AppShell** redirects to `/login` when neither id is present.
4. **Layout** — Authenticated routes live under **`app/(app)/`** wrapped in **`AppShell`**: collapsible **sidebar** (primary nav), **top bar** (page title), main content. **Root `/`** redirects to **`/dashboard`**.
5. **Deal detail UX** — **`/deals/[dealId]`** uses **tabs**: Overview, Intake (fields/confidence), Documents, **Deal files** (folders/assets), Offers (comparison, acceptance paths), Tasks, Calendar, Communications, Memory, Exceptions, Audit. Data via hooks in `src/lib/hooks/` calling REST endpoints.
6. **Phone simulator** — **`PhoneSimulatorProvider`** + overlay (labeled “Debug” in nav) simulates **inbound messaging** for demos: exercises chat/messaging flows without real SMS. Direction: **SMS-first** coordinator for the realtor ([`vision.md`](../vision.md)); the simulator is a **dev/demo affordance**, not production ingress.
7. **Onboarding** — **`/onboarding`** for post-registration workspace setup (role-specific); **`/login`** supports login, register, multi-workspace pick.

## Consequences

**Positive**

- Clear separation: UI is thin; business rules stay in API + `packages/workflow`.
- Hooks keep components readable; API shape changes are localized.
- Monorepo packages `@deal-coordinator/shared` and `ui` are transpiled by Next (`transpilePackages`).

**Negative / risks**

- **localStorage** identity is not a hardened session model (XSS steals tenant headers context).
- **No middleware rewrites** to `NEXT_PUBLIC_API_URL` — browser calls API **cross-origin**; CORS must allow the web origin ([API CORS](../architecture.md)).
- Large deal page loads many hooks; acceptable for Phase 1, revisit performance later.

## References

- [Product vision](../vision.md)
- [Architecture](../architecture.md)
- [ADR 002 — Multi-tenancy](002-multi-tenancy.md)
- [ADR 007 — API authentication and modules](007-api-authentication-and-modules-phase1.md)
