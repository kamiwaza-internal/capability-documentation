---
capability_schema: capability.v1
id: workrooms.shared-threads
title: Collaborate in shared workroom threads with agent turn-taking
tier: internal
persona:
  - Analyst
surface:
  - UI
  - API
evidence_plan: ui
requires:
  - workrooms.create
  - workrooms.session-scoping
preconditions:
  membership: Participants are members of the shared workroom; reads require view access and thread writes require manage-caliber authority.
  session: Turn claims and queued turns require a resolvable runtime session for the acting user; without one the platform answers 409.
  ui_flag: "The UI surface only. The thread, conversation, claim, handoff, and turn panels in the core runtime shell are behind a build-time frontend flag (REACT_APP_ENABLE_WORKROOM_RUNTIME_COLLABORATION / VITE_ENABLE_WORKROOM_RUNTIME_COLLABORATION), default off — a stock build renders none of them. The API surface is not gated and works by default."
---

# Collaborate in shared workroom threads with agent turn-taking

Members of a shared workroom converse in common threads: messages are visible to authorized members by role, agent turns are coordinated through claims so concurrent actors do not collide, and a thread can be handed off between actors. This is what makes a workroom a shared analytic conversation rather than a set of private chats.

**The two surfaces differ in availability.** The API substrate below is ungated for connectorless work and functions on a stock deployment — with one exception: a turn carrying a `connector_key` returns 200 with a `disabled` credential resolution, `interaction_mode: "blocked"`, and no queued turn unless `WORKROOM_SHARED_CREDENTIALS` is enabled. The refusal is structured rather than an error status, so a client must inspect the resolution rather than the status code. The UI is not: every thread, claim, handoff, and turn panel in the core runtime shell sits behind a default-off build-time frontend flag, so a stock build shows none of this. Answer availability questions per surface, not for the capability as a whole.

## What this capability guarantees

- **Shared threads are a platform substrate, not an app feature.** `GET`/`POST /workrooms/{id}/threads` list and create shared collaboration threads; `GET`/`POST .../threads/{key}/messages` read and post messages. Every route is membership-guarded per workroom, so thread content is scoped to the room and gated by role — the documented behavior in Kaizen (conversations visible to members by role; Owners and Contributors continue shared conversations, Viewers read-only) rides on this substrate.
- **Serialized control through claims.** `POST`/`DELETE .../threads/{key}/claims` acquire and release serialized control of a thread. Claim acquisition is bound to the caller's resolved runtime session, so control belongs to a live session, not just a user id; an unresolvable session is refused with 409 rather than granted ambiguously.
- **Agent turns queue rather than collide.** `POST .../threads/{key}/turns` enqueues an agent-capable turn, `GET .../turns` lists queued and active turns, and `POST .../turns/{turn_id}/complete` completes the active turn and promotes the next queued collaborator. Concurrent actors get an ordered queue instead of interleaved writes.
- **Threads can change hands explicitly.** `POST .../threads/{key}/handoff` requests handoff of a shared thread to another collaborator, making transfer of an in-progress conversation a first-class, auditable act.
- **Lifecycle conflicts are typed, not silent.** Read-only workroom states and state conflicts surface as 409 on every mutating thread route, so a client can distinguish "the room is archived" from a failure.

## Conditions and limits

- The UI surface is behind a default-off build-time flag. `WorkroomRuntimeShell` gates the thread list, conversation panel, claim and handoff controls, turn queue, and the presence and activity timeline on `REACT_APP_ENABLE_WORKROOM_RUNTIME_COLLABORATION` / `VITE_ENABLE_WORKROOM_RUNTIME_COLLABORATION`; the flag is documented in the frontend as a release-cut escape hatch, is set by no shipped `.env`, container, or chart default, and thread state is not even fetched when it is off. This is one more gate alongside the backend settings this tranche discloses — `WORKROOM_PRESENCE_EVENTS`, `WORKROOM_SHARED_CREDENTIALS`, and `KAMIWAZA_WORKROOM_MANAGER_EXTENSION_ENABLED` (see `workrooms.app-runtime-binding`) — and unlike any of them it is a build-time frontend constant rather than a backend setting, which is why a settings-oriented sweep misses it. Note that `WORKROOM_MEMBERSHIP_VISIBILITY`, which this tranche also discloses, is not a capability switch of this kind: it is a ReBAC staging control on the authorization path, as `workrooms.membership-and-roles` records.
- Thread visibility follows workroom membership and role; this document does not claim any finer-grained per-thread ACL — there is none in the substrate.
- Turn claims and queued turns coordinate cooperating clients; they serialize actors that use the contract. The claim is collision avoidance for participating apps and shells, not a lock the platform imposes on every conceivable writer.
- This capability's real-world grounding is the analyst Q&A flow in a shared workroom (pose a question, follow up) rather than a direct specification of thread mechanics; the mechanics documented here are how that flow is safe with more than one actor.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs.
- **The routed `ui` arm cannot pass against a stock build.** Even given a scenario to run, the panels it would drive are absent unless the frontend collaboration flag is enabled at build time, so a UI run must either build with the flag on and record that in its environment identity, or the capability must be rerouted to an API-shaped arm. Rerouting would deviate from the inventory's `ui` routing and is left as an explicit decision rather than made here.
- **No journey scenario covers thread mechanics directly**, which is why this document lists no `evidence` references: `workrooms/J01` and `workrooms/J02` touch shared threads only as presence attributes (focused-thread display, follow-focus), and no journey exercises messaging, claims, queued turns, or handoff. A thread-collaboration journey is a candidate addition to the journey corpus; until one exists, the UI arm has nothing scenario-shaped to run for this capability and it will read as uncovered in the gap report. That is a statement about the corpus, not a defect in this document.
