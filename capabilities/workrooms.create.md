---
capability_schema: capability.v1
id: workrooms.create
title: Create a workroom
tier: internal
persona:
  - Analyst
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  auth: The user is authenticated and holds a role that permits workroom creation; the platform returns 403 otherwise.
  workroom_manager: For the UI path, the Workroom Manager surface is available on the deployment (extension or core-owned, per deployment posture).
evidence:
  - workrooms/J06/SC-01
  - workrooms/J06/SC-02
not_supported:
  - Policy evaluation of SCG references at creation time. The create call accepts `scg_references` as metadata; no out-of-policy rejection is performed during create.
  - Changing a workroom's persistence type after creation. Ephemeral versus persistent is fixed when the workroom is created.
---

# Create a workroom

An analyst creates their own workroom — naming it, describing it, and choosing its persistence posture — without operator involvement. Creation is exposed in the Workroom Manager UI, on the platform API (`POST /workrooms/`), and as a first-class SDK call (`WorkroomService.create`), so both interactive users and automation can provision workrooms.

## What this capability guarantees

- **Self-service creation with the creator as owner.** An authenticated user with room-creation permission creates a workroom via `POST /workrooms/` (201) and is recorded as its owner; ownership assignment happens during persistence, and the owner relation tuple is additionally assigned best-effort after commit. Users without the required role receive 403; the per-user active-workroom limit (operator-configurable, default 50) returns 409 when exceeded.
- **A choice of persistence posture at creation.** `type` is `ephemeral` or `persistent`. Ephemeral (shown as "Temporary" in the UI) workrooms are cleaned up automatically: a session-teardown purge deletes a still-eligible ephemeral workroom when the owning session ends, and a recurring cleanup task auto-purges ephemeral workrooms after an operator-configurable timeout (default 24 hours). Persistent workrooms remain until explicitly deleted. The type cannot be changed after creation.
- **Descriptive metadata on the create call.** Name (1–255 characters), optional description, freeform labels, a classification label, extensible key-value attributes, and SCG reference strings are all accepted on the same `POST /workrooms/` call and through the SDK. UI coverage is narrower and posture-dependent: the extension-owned Workroom Manager collects name, type, description, labels, and classification through a two-step wizard (details, then review); the default core-owned Workroom Manager's create dialog is a single step accepting name, type, and description only. `attributes` and `scg_references` are API/SDK-only — neither Manager exposes them.
- **Workroom-scoped context resources are auto-provisioned after creation.** With the default `eager` provisioning mode, creation dispatches provisioning of the workroom's scoped context resources (vector store, Graphiti, and peers); `lazy` and `disabled` modes are operator-selectable alternatives (`WORKROOM_CONTEXT_AUTO_PROVISION_MODE`). Provisioning is asynchronous and best-effort, not atomic with creation: the workroom is committed and 201 returned once the provisioners are dispatched, and a provisioner failure is logged without rolling back the workroom. A caller that needs a context resource to exist should confirm it rather than infer it from the 201.

## Conditions and limits

- Creation deliberately blocks non-admin writes minted from the Global Workroom context when the operator enables `WORKROOM_RESTRICT_GLOBAL_TO_ADMIN`; the route is otherwise open to any user whose roles pass the room-creation check for the tenant.
- A newly created workroom has only the creator as a member. Sharing it is a separate capability (`workrooms.membership-and-roles`).
- BYO-S3 backing for workroom storage is a deployment-time administrative capability documented separately as `workrooms.s3-object-storage`; the create flow itself does not configure storage backends.
- The extension-owned creation wizard enforces a 500-character description; the API schema accepts up to 1024 characters. The stricter bound is a front-end constraint in that Manager, not the API contract, and it is not a bound the core-owned dialog shares.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs. The SDK path (`WorkroomService.create`) is the routed arm. Because that call issues `POST /workrooms/` and validates the response, the arm does exercise the API endpoint and its request/response contract; what remains unexercised is a direct non-SDK client and both Managers' create surfaces.
- The behavior-journey corpus covers creation under `workrooms/J06` (create and set up a workroom): SC-01 (creator owns new workroom) and SC-02 (owner updates name and description) are the scenarios this document's claims align with.
- The SDK ships `WorkroomService.create`, but the generated SDK docs site has no workrooms service page — an inventory finding, not a gap in the shipped surface.
