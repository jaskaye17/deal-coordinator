# ADR 004: AI adapter (interface + fake implementation)

## Status

Accepted

## Context

Chat ingest must turn unstructured messages into **intents** and **field candidates** (addresses, prices, parties). Development and CI need to run without:

- Paid API keys for every contributor.
- Flaky tests that depend on model nondeterminism or network availability.

At the same time, production will eventually call a **real** model provider with different latency, cost, and safety requirements. Hard-coding OpenAI (or any vendor) inside `ChatService` would complicate testing and swapping providers.

## Decision

Introduce an **`AiParser` interface** in the API chat module and register an implementation via Nest dependency injection:

- **Contract:** `parseMessage(message, context)` returns a structured `ParsedIntent` consumed by `ChatService`.
- **Phase 1 default:** A **fake** implementation returns deterministic outputs suitable for demos and automated tests.
- **Configuration:** `AI_PROVIDER` (and related keys) in `@deal-coordinator/config` selects behavior without changing call sites.

All AI-shaped behavior goes through this adapter; services do not call HTTP clients for LLMs directly.

## Consequences

**Positive**

- Local and CI environments work out of the box with `AI_PROVIDER=fake`.
- Adding OpenAI (or another vendor) is a new class + binding, not a rewrite of ingest logic.
- Tests can inject mocks or the fake parser without network.

**Negative / trade-offs**

- The fake parser may **diverge** from real model output shape over time unless contract tests guard the interface.
- Prompt engineering and safety tooling live **outside** the core adapter file; operational runbooks must still be written for production.
- Latency and token usage are invisible in Phase 1 benchmarks.

**Follow-up**

- Add golden tests on `ParsedIntent` examples for both fake and (later) sandbox provider responses.
- Implement retries, timeouts, and redaction in the real adapter only—keep the interface stable.
