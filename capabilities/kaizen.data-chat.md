---
capability_schema: capability.v1
id: kaizen.data-chat
title: Converse with workroom data in Kaizen with cited answers
tier: internal
persona:
  - Analyst
surface:
  - UI
  - SDK
evidence_plan: ui
requires:
  - workrooms.app-launch
preconditions:
  kaizen_deployed: Kaizen is a per-workroom extension behind its own ingress; every SDK call resolves and targets the extension's base URL, and conversations run in the launching workroom's context.
  agent: A Kaizen agent exists to converse with; building and configuring agents is out of scope here and has no capability document yet, so it is claimed nowhere in the kit.
---

# Converse with workroom data in Kaizen with cited answers

An analyst asks questions in a Kaizen conversation and gets synthesized answers grounded in workroom data — uploaded files, admin-configured Microsoft 365 sources, and MCP tools — with follow-up turns, resumable conversations, and conversation lifecycle managed through the platform SDK. This is the daily-driver analytic question-and-answer experience the workbooks center on, built over the search substrate claimed separately as `context.workroom-document-search`.

## What this capability guarantees

- **Conversations are created, readied, and scoped by the platform SDK.** `ConversationService.create` creates a conversation against a named agent (auto-starting the agent sandbox) with a title, an iteration budget, and stuck detection; `wait_until_ready` polls container status to a serving state and raises typed errors on terminal failure or timeout. Conversations are workroom-scoped via the workroom header, and ephemeral (private) conversations are accepted only in personal or global scope — Kaizen rejects them in shared workrooms.
- **Turn mechanics are explicit: enqueue, run, observe.** `send_message` enqueues a user message (204, returns nothing); `run` has the agent process the queue; `get_events` pages the typed event stream — message events, action events including the terminal finish action, tool events, and agent-error events. The `chat` convenience composes all three: send, run, then poll to a terminal event and return the reply text, with a fire-and-forget mode, a timeout that raises, and agent errors surfaced as terminal typed exceptions rather than retried.
- **Workroom data reaches the conversation.** Per the user guide: launching Kaizen from the Workroom Manager runs the conversation in that workroom's context; files upload from the local device or from Microsoft 365 (OneDrive and SharePoint, once an admin has configured the connector); MCP tools extend reach to web search, APIs, and databases; and a related-data suggestions surface proposes workspace files, skills, and Microsoft 365 results with a score and reason each, degrading to partial results when a source is down.
- **Collaboration and continuity are role-aware.** In shared workrooms, agents, conversations, and uploads are visible by role — owners and contributors continue shared conversations, viewers read without adding turns — with each turn attributed to the acting user, and conversations resumable from where work left off, including across users.
- **Grounded answers can carry citations, deployment permitting.** The user guide's claim, quoted at its own altitude: depending on the deployment and the tools attached to the agent, Kaizen can produce grounded answers that include citations back to source material such as uploaded files, connected document stores, or web results — and it advises asking explicitly for citations and verifying that cited sources support the claim. The structured citation machinery itself (synthesis with bracketed citations and source lists) ships in the context service's unified search, claimed under `context.workroom-document-search`.

## What this answers in customer terms

This capability is the platform's answer to "can our analysts query enterprise data in natural language?" — ask a question in plain language, get a synthesized answer grounded in the team's own documents and connected sources, follow up in the same thread, and hand the thread to a colleague. The citation posture is worth stating precisely in customer conversations: grounded, citation-capable answering is established; an unconditional per-answer citation guarantee, and the workbooks' full admissibility chain behind it, are not — see the coverage notes.

## Conditions and limits

- The SDK conversation surface is intentionally narrow at the pinned revision: no conversation list or delete methods, and no streaming — observation is by polling the event pages. `send_message` alone does not trigger the agent; `run` does.
- No SDK model or event carries a citation field; citation behavior is a property of the deployment's agents and tools, per the user guide, not of the conversation API contract.
- Viewers cannot add turns, upload, or mutate agents; shared visibility does not grant access to other members' private credentials; an agent's security policy can pause a run awaiting confirmation.
- This capability is the conversing half of a split; the authoring half — building agents (models, skills, tools, security policy) — has no capability document yet and is therefore uncharacterized rather than claimed elsewhere.

## How this is exercised

The planned UI arm drives the experience end to end in a browser: launch Kaizen in a workroom, converse with an agent over uploaded workroom documents, ask for a cited answer, follow up in the same conversation, and resume it — emitting `scenario-evidence.v2` records naming this capability. The SDK path (`create`, `wait_until_ready`, `chat`) exercises the same lifecycle beneath the UI where an arm needs it programmatically.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs.
- **This document's sources are the platform SDK and product documentation only.** The Kaizen extension repository was outside the inventory run's four pinned sources, and the inventory records that scope limit; every claim above is what the SDK surface and the user guide establish, not a reading of Kaizen's own code. Claims that need the extension's internals — retrieval wiring, citation generation, sandbox behavior — are deliberately absent.
- **The citation claim is hedged because the sources hedge it.** The user guide frames citations as deployment- and tool-dependent (including a troubleshooting entry for citations not appearing), and the SDK carries no citation surface. The workbooks' granular-citation and admissibility guarantees (marking-aware context assembly, release minimization) have no implementation source and are recorded findings, unestablished rather than denied.
- The behavior-journey corpus has no Kaizen conversation journey — the kaizen-context journeys exercise the context service — so this document lists no `evidence` references; authoring a journey is the path to a UI-arm anchor.
