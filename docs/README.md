# Documentation hub

Documentation is split by **audience** so engineers, product, and support can find the right material—and so we can reuse articles for in-app tours (e.g. Pendo) and **SMS onboarding**. **Product positioning** is **text-first AI transaction coordinator for realtors**; see [`vision.md`](vision.md).

| Track | Folder | Audience | Purpose |
| --- | --- | --- | --- |
| **Internal** | [`internal/`](internal/README.md) | Engineering, product, ops | Architecture, ADRs, Phase scope, PRDs, CI/CD, environments |
| **Support / onboarding** | [`support/`](support/README.md) | End users, CS, sales, future tooling | Plain-language how-it-works, getting started, feature explanations |
| **Shared reference** | This directory (root) | Both | Long-form [`architecture.md`](architecture.md), [`phase1.md`](phase1.md), [`environments.md`](environments.md), [`cicd.md`](cicd.md), ADRs under [`adr/`](adr/), setup guides |

**Convention:** When you change behavior visible to users or operators, update **support** docs in the same PR when practical. When you change structure, contracts, or major tradeoffs, update **internal** docs and add or amend an **ADR** when it is a durable decision.

See the Cursor rule **“Documentation maintenance”** (`.cursor/rules/documentation.mdc`) for agent expectations.

## Quick links

- [**Product vision (text-first realtor TC)**](vision.md)
- [What we built (Phase 1)](phase1.md)
- [System architecture](architecture.md)
- [All ADRs](adr/) (001–007 and beyond)
- [ADR 006 — Web app (Phase 1)](adr/006-web-application-phase1.md)
- [ADR 007 — API auth & modules (Phase 1)](adr/007-api-authentication-and-modules-phase1.md)
- [Internal / PRDs](internal/README.md)
- [Support / customer-facing](support/README.md)
