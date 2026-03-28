# ADR 003: Workflow engine (pure state machine, Phase 1)

## Status

Accepted

## Context

Real estate deals move through **stages** (intake, listing, contract, closing, etc.) with rules about **who** may trigger transitions and **from which** states. The team wanted:

- Explicit, testable definitions of allowed transitions rather than ad hoc `if` chains in services.
- Extensibility for new deal types and stages without rewriting the entire API.
- Avoidance of heavy workflow infrastructure (separate clusters, workers, and idempotent activity code) in the first delivery phase.

Off-the-shelf durable workflow engines (e.g. Temporal) add operational and cognitive overhead that Phase 1 does not require for synchronous user-driven transitions.

## Decision

Implement the workflow layer as **pure TypeScript** in `packages/workflow`:

- **State machines** describe valid stages and edges per deal type.
- **Transition guards** are pure functions (e.g. role checks) evaluated from API request context.
- The **API** invokes the workflow package synchronously when a client requests a stage change; no external orchestrator participates in Phase 1.
- **Admin overrides** are modeled by guards that allow elevated roles (e.g. `admin`) where agents would be blocked.

Temporal and async timers are explicitly **out of scope** for Phase 1.

## Consequences

**Positive**

- No extra infrastructure to deploy or monitor for workflow correctness in v1.
- Guards and graphs are unit-testable without databases or queues.
- Clear upgrade path: the same domain concepts can later be driven by activities in Temporal.

**Negative / trade-offs**

- **Synchronous only:** Long-running compensation, wait-for-signal, and scheduled transitions are not supported until a durable engine exists.
- **Scaling:** All transition logic runs in the API process; burst traffic couples with HTTP handlers.
- **Observability:** No built-in workflow history UI; audit events carry the narrative instead.

**Follow-up**

- Document each deal type’s machine in code comments or generated diagrams as complexity grows.
- When adding Temporal, treat `packages/workflow` as the source of truth for **validity** and map activities to external side effects only.
