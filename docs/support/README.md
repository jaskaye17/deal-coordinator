# Support & onboarding (customer-facing)

Articles here are written for **people using Deal Coordinator**, not engineers. **Primary user:** the **realtor** working **text-first** with an **AI or human-opaque** transaction coordinator; the web app is **supporting**. See [Product vision](../vision.md).

Tone: clear, short sentences; avoid internal codenames unless necessary. Prefer the **“texting your TC”** metaphor over **brokerage dashboard** language unless the reader is clearly a broker/admin.

These pages are candidates for:

- Help center or in-app help
- **Pendo** (or similar) step content
- **SMS / WhatsApp** onboarding and tip sequences (short chunks map well to messages)

## Articles

| Article | Description |
| --- | --- |
| [Getting started](getting-started.md) | What the product is, signing in, demo accounts |
| [Key concepts](concepts.md) | Workspaces, deals, stages, coordinator mental model |
| [Deals and pipeline](deals-and-pipeline.md) | Deal list, deal tabs, stages, exceptions |
| [Dashboard, files, review queue](dashboard-files-review.md) | Snapshot view, workspace files, review work |
| [Settings and workspace](settings-and-workspace.md) | Profile, workspace prefs, responsible broker |
| [Messages and chat](messages-and-chat.md) | Chat ingest, gateway, phone simulator / future SMS |
| [Templates and integrations](templates-and-integrations.md) | Templates library, integrations, offers overview |

## Writing guidelines

1. **One topic per page** where possible—easier to link from tours and texts.
2. **Action-first titles**: “Sign in to your workspace” not “Authentication overview.”
3. When the **UI** and **future messaging** channels differ, add a short “**Via text**” note for the SMS-first path.
4. Link to internal docs **only** if a public URL exists; otherwise duplicate the minimum facts here.

## Keeping support in sync

When product behavior changes, update the relevant support page in the **same change** as the code (or immediately after). See `.cursor/rules/documentation.mdc`.
