# Product vision

**Deal Coordinator** is first and foremost an **AI transaction coordinator for a realtor**.

## Primary experience: text first

The main experience is **SMS / messaging first**—the same way many realtors already work with a **human transaction coordinator** today. The realtor should **not need to wonder** whether the other side of the thread is **software or a person**; it should feel like **one trusted coordinator**.

Over time the product should handle **(eventually all)** responsibilities a **human TC** would own: **following up**, **communicating with** the agent about each deal, **reminding** them of dates, gaps, and next steps, and keeping the **transaction story** coherent.

## Web and brokerage scale

- **Web UI** is a **supporting** surface: full picture, documents, settings—useful, but not the primary interaction model for the core user story.
- **Brokerages / multi-agent workflows** are a **growth and expansion** path (and the codebase supports **workspaces** and roles for that future). They are **not** the **immediate** product target; the **immediate** target is the **individual realtor** and their **coordinator over text**.

## What we optimize for

1. **Continuity** — Nothing important lives only in a one-off text or ad-hoc note.  
2. **Proactivity** — The coordinator reaches out; the agent is not solely responsible for poking the system.  
3. **Trust and opacity** — Same tone and reliability expectations as a human TC; no “you are talking to a bot” barrier.  
4. **Deal truth** — One structured record per transaction behind the conversation (stages, tasks, audit)—whether the user opens the app or not.

This file is the **canonical positioning** for docs and copy. When engineering choices conflict with legacy “brokerage-first” wording elsewhere, **prefer this document** and update surrounding text.
