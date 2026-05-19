# Messages, chat, and “Debug” (phone simulator)

## Why messaging comes first

For the **realtor**, the main experience is **texting the transaction coordinator**—same habit as texting a **human TC**. The product should **not** require you to know whether the coordinator is **AI or human**; the thread should feel **continuous and trustworthy**.

Over time, the coordinator should **proactively** text you: **follow-ups**, **reminders**, **missing pieces**, and **deal-specific updates**—the same obligations a human TC takes on.

## How messages tie to deals

**Conversations** are tied to the **right deal** and **workspace** so nothing important lives only in a siloed inbox. Ingestion updates **communications**, **memory**, **tasks**, and **audit** as the pipeline matures.

## Webhook and gateway

A small **gateway** service can receive HTTP webhooks from a **chat/SMS provider** and forward them to the API **ingest** path. You typically don’t “see” the gateway in the web sidebar—it’s **plumbing** your administrator or vendor configures.

## Phone simulator (“Debug” in the app)

In **demo/training**, the **phone simulator** (often under **Debug**) mimics **inbound texts** so you can test flows **without real SMS**.

When **real SMS** is connected, the same coordinator behavior should run from **your phone** as the primary surface; the web app remains **optional depth**.

---

*Internal: pipeline and AI adapter — [ADR 004](../adr/004-ai-adapter.md), [Architecture](../architecture.md).*
