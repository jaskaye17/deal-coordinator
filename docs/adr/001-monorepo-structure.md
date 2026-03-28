# ADR 001: Monorepo structure (pnpm + Turborepo)

## Status

Accepted

## Context

Deal Coordinator spans multiple deployables (web, API, gateway, worker) and shared libraries (database schema, domain types, UI kit, workflow definitions, configuration). Teams need to:

- Share TypeScript types and Zod schemas between the API and web without publishing internal packages.
- Change API contracts and consumers in **one** atomic commit.
- Run consistent lint, typecheck, test, and build pipelines across the tree.

Copy-pasting types or maintaining several loosely coupled repositories would slow iteration and increase drift risk.

## Decision

Use a **single repository** organized as a **pnpm workspace** monorepo with **Turborepo** orchestrating tasks.

- **pnpm** manages workspace protocol dependencies (`workspace:*`) and a single lockfile.
- **Turborepo** declares task dependencies (e.g. `build` and `lint` depending on upstream builds) and caches outputs where appropriate.
- Applications live under `apps/`; reusable code under `packages/`.

## Consequences

**Positive**

- One clone yields the full system; refactors across API and web stay type-safe.
- CI can run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from the root with predictable ordering.
- Version skew between “client types” and server is largely eliminated.

**Negative / trade-offs**

- Repository size and checkout time grow with the whole codebase; partial clone strategies are limited.
- Deployments must define which artifacts to promote (web vs api vs gateway vs worker); “deploy the repo” is not automatic without pipeline design.
- All contributors need familiarity with workspace boundaries to avoid improper cross-layer imports (e.g. UI importing Nest code).

**Follow-up**

- Keep package boundaries strict; prefer `shared` and `config` for cross-app imports over reaching into app internals.
- Document apps and packages in the root README and [architecture.md](../architecture.md).
