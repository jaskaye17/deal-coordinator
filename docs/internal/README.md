# Internal documentation

Material for **engineering, product, and operations**: how the system is designed, what we committed to build, and how we ship it.

## Contents

| Resource | Description |
| --- | --- |
| [Architecture](../architecture.md) | Runtime layout, tenancy, API patterns, workflows, chat/audit (Phase 1) |
| [Phase 1 scope](../phase1.md) | Deliverables, deferred work, limitations, Phase 2 themes |
| [ADR 006 — Web (Phase 1)](../adr/006-web-application-phase1.md) | Next.js app: workspace context, API client, shells, deal UX |
| [ADR 007 — API auth & modules](../adr/007-api-authentication-and-modules-phase1.md) | Email/Auth0 paths, Nest module inventory |
| [ADRs (001–005, …)](../adr/) | Earlier decisions: monorepo, tenancy, workflow, AI, audit |
| [Environments](../environments.md) | Local, staging, production, env vars |
| [CI/CD](../cicd.md) | GitHub Actions, Render, Vercel, migrations, previews |
| [Product / PRDs](product/README.md) | Product requirements and initiative write-ups |

## When to add or update

- **New initiative or major feature:** add a PRD under [`product/`](product/README.md) (use the template), link it from this README or the product README index.
- **Cross-cutting technical choice:** add an ADR under [`../adr/`](../adr/) (next number in sequence).
- **Shipping / infra:** [`../cicd.md`](../cicd.md), [`../environments.md`](../environments.md).

**Pair with support:** if end users will see the feature, add or update an article under [`../support/`](../support/README.md) (or note “TODO support doc” in the PR).

## AI / messaging product note

Long term, many users may interact primarily via **SMS or chat**, with the coordinator persona—not the browser—as the main surface. Internal docs should still describe **truth** (API, gateway, web); support docs should phrase flows in **coordinator + messaging** terms where it helps future Pendo and SMS onboarding scripts.
