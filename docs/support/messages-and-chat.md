# Messages, chat, and “Debug” (phone simulator)

## How messages tie to deals

Deal Coordinator is built so **conversations**—from chat tools or, later, **SMS**—can feed the same **audit trail** and **deal context** as the website. When a message is ingested, the system tries to attach it to the right **deal** and **workspace** so nothing important lives only in someone’s inbox.

## Webhook and gateway

In a typical setup, a small **gateway** service receives HTTP webhooks from a chat provider and forwards them to the main API **ingest** path. You won’t see the gateway in the sidebar; operators configure it with your IT or vendor.

## Phone simulator (“Debug” in the app)

In **training and demo** environments, the app may include a **phone simulator** (often under **Debug** in the navigation). It mimics sending messages into the coordinator **without real SMS**.

**Via text (future):** when your brokerage turns on real SMS, many of the same flows will happen from your phone—the coordinator persona replies and updates the deal story **without opening the full website**.

---

*Internal: chat pipeline and AI adapter are documented in [ADR 004](../adr/004-ai-adapter.md) and [Architecture](../architecture.md).*
