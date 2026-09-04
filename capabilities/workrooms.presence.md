---
capability_schema: capability.v1
id: workrooms.presence
title: See who is present in a workroom in real time
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
  feature_flag: Live presence is enabled on the backend (`WORKROOM_PRESENCE_EVENTS`, default off); the presence stream returns 405 when disabled.
  membership: The subscriber is a current member of the workroom; non-members are denied.
  ui_flag: "The UI surface only. The one mounted live presence roster is the core runtime shell's, which sits behind a build-time frontend flag (REACT_APP_ENABLE_WORKROOM_RUNTIME_COLLABORATION / VITE_ENABLE_WORKROOM_RUNTIME_COLLABORATION), default off. Enabling WORKROOM_PRESENCE_EVENTS alone does not make a live roster appear in a stock build. The API surface needs only the backend flag."
evidence:
  - workrooms/J01/SC-01
  - workrooms/J01/SC-02
  - workrooms/J01/SC-05
  - workrooms/J01/SC-06
  - workrooms/J01/SC-07
  - workrooms/J01/SC-08
not_supported:
  - Teammate typing or input-state indicators. The journey corpus reserves `workrooms/J03` for these and explicitly defers them; their absence is a recorded product decision, not a presence failure.
  - "Durable presence event delivery. The documented collaboration stream contract is explicit that it is not a durable queue — a client disconnected across a change sees the current snapshot on reconnect, not a replay of what it missed."
---

# See who is present in a workroom in real time

Members of a workroom see each other's live presence: sessions heartbeat to the platform, and a server-sent presence stream pushes join/leave awareness to workroom UIs, giving analysts shared situational awareness of who is working in the room.

## What this capability guarantees

- **A per-workroom presence stream.** `GET /workrooms/{id}/presence/stream` serves presence snapshots over SSE for the workroom members panel. Access is membership-bound; a subscriber who loses access receives a revocation-coded denial rather than a stale stream.
- **Heartbeats keep presence current, and silence ages a session out of the snapshot.** `POST /workrooms/{id}/sessions/heartbeat` records a runtime heartbeat for the caller's bound session. A session that stops heartbeating past `WORKROOM_RUNTIME_STALE_AFTER_SECONDS` (default 90) is treated as stale and drops out of the presence snapshot. **The two threshold settings that read as the presence state machine — `WORKROOM_SESSION_IDLE_THRESHOLD_SECONDS` (default 30) and `WORKROOM_SESSION_DISCONNECT_THRESHOLD_SECONDS` (default 120) — are declared but never applied.** Nothing outside a config validator reads them. So a client that goes silent does not turn idle at 30 seconds and does not transition to disconnected at 120; it simply disappears from the snapshot at around 90. Do not describe an idle/disconnected state machine to a customer, and do not offer those two settings as tuning knobs.
- **Presence reacts to the events that change it.** The platform records presence refreshes on session enter and leave, heartbeats, and membership changes (member added, role changed, member removed, ownership transferred), so a connected stream picks the change up on its next poll and re-pushes a snapshot — the client does not poll. Two different latencies apply, and an RFI that asks for numbers should get both: events that write a row (enter, leave, membership changes) surface on the next stream poll, about a second; a plain heartbeat writes no row, so heartbeat-driven changes — a session aging out of the snapshot — surface on the periodic snapshot refresh instead, about five seconds. Be precise about the mechanism when capacity comes up: the freshness comes from the server-side stream polling the workroom event log about once a second, not from a push fanout (see Conditions and limits), so each open stream carries a recurring query cost and there is no cap on how many are open.
- **Session-derived counts reach the Manager without the stream.** The Workroom Manager shows per-member active session counts in the membership view and a warning before removing a member with an active session. These come from REST reads, not from the presence stream, and they are populated unconditionally (see Conditions and limits). The documented collaboration stream carries presence events (join, leave, idle) for the same purpose. Note the workroom detail view's "active members" number is *not* one of these: it counts non-removed membership rows, not present users, and does not change when nobody is connected.
- **Stream lifetime is bounded.** A presence stream is authorization-checked per request and capped in duration (`WORKROOM_RUNTIME_EVENT_STREAM_MAX_SECONDS`, default 30 seconds), after which the client reconnects.

## Conditions and limits

- **The feature flag gates the stream only, not the REST counts.** `WORKROOM_PRESENCE_EVENTS` (default off) is read in exactly two places, both on the SSE route: with it off, `GET /workrooms/{id}/presence/stream` answers 405. Nothing else consults it. The per-member active session counts on the member listing, lifecycle summary, and delete-preview are populated regardless, as is the active-session gate on member removal. So a deployment with presence disabled still shows session counts in the Manager — do not tell a customer those disappear.
- **No stock build renders a live presence roster.** The routed core Workroom Manager consumes no presence *stream* at all. The only presence-stream UI is the runtime shell's roster and activity timeline, and that is additionally behind the default-off build-time collaboration flag described in `workrooms.shared-threads`. A members-panel component and card/table active-member counts exist in the frontend but are mounted by no route, so they are not a shipped surface and this document does not claim them.
- **The per-user and per-workroom connection limits are not applied.** `WORKROOM_PRESENCE_MAX_CONNECTIONS_PER_USER` (default 5) and `..._PER_WORKROOM` (default 100) are declared, and the presence broker's `subscribe` would enforce them, but no production code path subscribes — the SSE route polls instead, and the broker's publish fans out to an empty subscriber list. There is currently no cap on concurrent presence streams. Treat these settings as declared-but-unapplied, and do not offer the limits as a capacity or abuse control.
- Delivery is by database polling, not in-process fanout, which matters for a multi-replica answer: the deployed SSE path reads persisted runtime events, so a client connected to one replica still sees changes written by another. (The in-process broker would have been replica-local, but it is not on the delivery path — see the connection-limits note above.) Separately, a snapshot-refresh failure ends the stream with an error event and the client is expected to reconnect and re-fetch. Clients that need authoritative state re-read the REST resources; the stream is a freshness signal, not a source of record.
- The journey corpus's continuity expectation (presence survives a page refresh without a visible leave/rejoin cycle) is a UI-arm behavior stated in `workrooms/J01/SC-07`; nothing in this document claims it is validated.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs. The journey corpus gives the UI arm its scenario set directly: the `workrooms/J01` presence scenarios referenced here cover entry registering presence, the roster with active/idle states, idle transitions and resumption, refresh continuity, and exit removal.
- Several J01 scenarios (SC-09 through SC-12) carry `characterized` provenance in the journey corpus; the focused-thread scenarios among them (SC-09, SC-10) belong to the focus/follow behavior adjacent to this capability and are deliberately not listed in this document's evidence references.
- **SC-11 and SC-12 are deliberately not referenced either.** Both describe an active-member count on the shared workroom *row* in the manager, and that row surface is mounted by no route. The number the routed Manager does render on the detail view counts membership rows rather than present users, so it cannot satisfy "reflects present users" (SC-11) or the empty-presence case (SC-12). Referencing them would claim a scenario no run can execute.
- **The routed `ui` arm must be scoped to what a stock build actually renders.** The remaining J01 roster and idle-transition scenarios describe a live presence roster; on a default deployment the only such roster sits behind the collaboration flag. A UI run must therefore build with that flag enabled and record it in the run's environment identity. This is the same constraint `workrooms.shared-threads` records for its own arm, and it is the honest reason this capability is not yet coverable rather than a corpus gap.
- `workrooms/J01/SC-03` and `SC-04` are not omissions from this document's `evidence[]`: the corpus records them as reserved ids for draft typing-indicator rows that are not v1.0 presence/focus acceptance scenarios, with typing and input-state behavior tracked under `workrooms/J03` instead. There is nothing at those ids to reference. Typing indicators are correspondingly unclaimed by this tranche.
