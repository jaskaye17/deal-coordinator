# ADR 005: Audit policy (append-only, seven-year retention)

## Status

Accepted

## Context

Real estate transaction platforms face **compliance and dispute** expectations: who changed what, when, and under which request. Regulators and brokerages often expect records to be retained for **multiple years** (commonly cited planning horizon: seven years).

Mutable audit rows or silent deletes undermine trust and can conflict with internal policy or external obligations. The team also wants a path toward **integrity verification** (hash chains or signed exports) without blocking Phase 1 delivery.

## Decision

1. **Append-only events** — Persist audit rows as inserts only under normal operation. `AuditEvent` captures action, object type/id, actor, optional `before`/`after` JSON, metadata, and `requestId`. Application code does not update or delete audit history as part of standard flows.
2. **Retention metadata** — `WorkspaceSettings.auditRetentionYears` defaults to **7**, documenting the business expectation; automated purge/archive is deferred to operations/tooling.
3. **Future integrity** — The schema includes an optional `integrityHash` column on `AuditEvent` reserved for hash chaining, Merkle batch roots, or export signatures when implemented.

## Consequences

**Positive**

- A clear, explainable story for compliance stakeholders: events are additive and correlated by `requestId`.
- Schema supports future cryptographic integrity without another breaking migration.
- Settings allow per-workspace retention **intent** even before automated enforcement exists.

**Negative / trade-offs**

- **Storage growth** is monotonic; hot tables may need partitioning or cold storage strategies later.
- **Right to erasure** (GDPR-style) conflicts with immutable audit; product and legal must define redaction vs delete policies explicitly—this ADR does not prescribe GDPR outcomes.
- Without automated purge, **retention is policy-on-paper** until jobs are built.

**Follow-up**

- Implement scheduled archival to object storage and optional row-level anonymization for PII fields in snapshots.
- Populate `integrityHash` once the hashing scheme and key management story are defined.
- Add admin export APIs with signed manifests for e-discovery.
