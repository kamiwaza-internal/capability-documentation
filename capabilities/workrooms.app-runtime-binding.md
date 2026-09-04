---
capability_schema: capability.v1
id: workrooms.app-runtime-binding
title: Run workroom-bound apps under the workroom runtime contract
tier: internal
persona:
  - Analyst
  - Operator
surface:
  - UI
  - API
evidence_plan: ui
requires:
  - workrooms.app-launch
preconditions:
  launched_app: A runtime application has been launched inside a workroom (see workrooms.app-launch for the launch flow itself).
  membership: Callers reaching the app are evaluated against their own workroom membership and role.
---

# Run workroom-bound apps under the workroom runtime contract

Extension apps launched from a workroom (Kaizen and other App Garden apps) run inside that workroom's context: the runtime contract gives an app its workroom binding, runtime context, and membership-aware behavior, so agent conversations, uploads, and outputs stay aligned to the mission the workroom represents.

## What this capability guarantees

- **A documented public contract, not incidental behavior.** The Workroom Runtime Contract is published platform documentation that extension authors and operators can rely on. While an app runs in a workroom: its lifecycle (start, stop, restart) is scoped to the workroom; its identity headers carry the workroom via `X-Workroom-Id`; API calls it makes on behalf of a caller are evaluated against the *caller's* workroom membership and role, not the launcher's; and, **where shared credentials are enabled** (`WORKROOM_SHARED_CREDENTIALS`, default off — see `workrooms.shared-credentials`), shared workroom credentials are exposed to the runtime only when the caller is a member. On a deployment that has not enabled that flag no shared workroom credential is resolved to a runtime by any path, and the runtime falls back to acting-user or app-owner credentials — so read the membership gating as a restriction that binds when the feature is on, not as an affirmative claim that credential sharing is available.
- **Bootstrap and context endpoints anchor the binding.** `GET /workrooms/{id}/runtime/bootstrap` returns the shell bootstrap state for the collaborative workroom runtime, and `GET /workrooms/{id}/runtime/context` returns the authoritative runtime context contract for the shell — both resolved against the caller's bound session. The two differ in error shape, and a client must not generalize one to the other: `runtime/context` returns structured 404/409 responses carrying `access_revoked`, `session_terminated`, and `session_conflict` codes when the binding is no longer valid, while `runtime/bootstrap` returns a plain 404 for an inaccessible workroom and has no structured mappings for session termination or state conflict.
- **Departure drops access on a bounded clock.** When a user leaves a workroom, the platform refreshes bound runtime sessions so the departing user's access is dropped; the outgoing user's launch token is not renewed, so in-flight access survives at most until the current token expires (minutes, not hours).
- **Behavior apps can rely on, stated as invariants.** The contract commits to workroom context isolation (a runtime cannot read another workroom's data, even for a user who is a member of both), credential gating to current members *where shared credentials are enabled*, and fail-closed reads (ambiguous workroom reads are denied rather than silently broadened).
- **Kaizen is the reference consumer.** Launching Kaizen from Workroom Manager runs the conversation inside that workroom's context, with shared visibility by role — the documented product behavior that exercises this contract end to end.

## Conditions and limits

- This capability is distinct from `workrooms.session-scoping` (a user's or SDK client's requests under a session binding) and from `workrooms.app-launch` (the launch flow injecting workroom identity). Runtime binding is about a deployed app's identity, context, and membership-aware behavior while it runs; the three fail independently.
- Whether Workroom Manager itself is a deployable extension or a core-owned surface is deployment posture: the platform gates deployable Workroom Manager extension visibility on `KAMIWAZA_WORKROOM_MANAGER_EXTENSION_ENABLED`, and the capability gate hides the extension surface when core owns the `/workrooms` UI. The runtime contract holds in both postures; where the manager UI lives differs.
- The `requires` entry on `workrooms.app-launch` is a real prerequisite — a runtime must be launched before it can be bound — but note that document currently states an extension-posture precondition ("Workroom Manager extension is deployed and feature-enabled"), narrower than this contract's both-posture claim. The runtime contract does not itself depend on the extension; the launch document's posture scoping is what needs widening. Recorded here so the enablement chain is not read as silently extension-only; correcting `workrooms.app-launch` is out of this tranche's scope.
- Operator workflows reach this contract from the operations side (validating the analyst/workroom inference flow, profile-driven workroom deployment defaults); this document claims the contract those flows depend on, not the operator tooling itself.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs.
- **No journey scenario names runtime binding directly**, so this document lists no `evidence` references. The nearest evidenced neighbor is `workrooms.app-launch`, whose SDK runbook (S2) exercises workroom-scoped identity reaching an app; that evidence names the launch capability's id, not this one, and is deliberately not claimed here. A runtime-contract journey (bootstrap/context resolution, membership-aware behavior inside a running app, departure dropping access) is a candidate addition to the journey corpus.
