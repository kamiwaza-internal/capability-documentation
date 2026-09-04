---
capability_schema: capability.v1
id: workrooms.archive-and-delete
title: "Retire a workroom: archive, restore, delete with preview"
tier: internal
persona:
  - Analyst
  - SysAdmin
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
requires:
  - workrooms.create
preconditions:
  authority: The acting user holds delete-caliber authority on the workroom (owner-level); admin-side deletion is a separate capability (workrooms.admin-oversight).
evidence:
  - workrooms/J04/SC-01
  - workrooms/J04/SC-02
  - workrooms/J04/SC-04
  - workrooms/J04/SC-05
  - workrooms/J04/SC-06
  - workrooms/J04/SC-08
  - workrooms/J04/SC-09
not_supported:
  - Restoring a deleted workroom. Restore applies to archived workrooms only; delete is documented as irreversible in the product UI.
  - SDK restore. The SDK exposes archive and delete; restore is an API surface only today.
---

# Retire a workroom: archive, restore, delete with preview

A workroom can be retired with a defensible retention story: archive makes it read-only, archived workrooms can be restored, and a delete-preview and lifecycle summary are available before deletion to show what will be destroyed. Those reads are independent GET operations, not an enforced gate — an API or SDK caller can invoke `DELETE` directly without them, and the SDK does not expose the preview at all. The record-then-purge delete behavior supports audit-compliance requirements for "deleted" workrooms.

## What this capability guarantees

- **Archive makes a workroom read-only; restore reverses it.** `POST /workrooms/{id}/archive` transitions an active workroom to `archived` (409 if the state does not allow it); `POST /workrooms/{id}/restore` returns an archived workroom to `active`, records a `workroom.restored` event, and publishes a lifecycle presence refresh; connected clients see the change on the event stream's next poll (see `workrooms.presence` for why the poll, not the publish, is what delivers it). Archived workrooms are excluded from the default listing and included on request (`include_archived`).
- **Retirement decisions are informed before they are destructive.** `GET /workrooms/{id}/lifecycle/summary` reports lifecycle, resource, and retention information — including a live active-session count — and `GET /workrooms/{id}/delete-preview` reports the delete impact: members losing access with their per-member active session counts, and the tagged resource families that will be purged — app deployments, extensions, DDE data sources, and catalog entries. Workroom-scoped context instances are purged but are not reported by the preview, the lifecycle summary, or the export manifest, so the preview understates the destruction by that one family (see `workrooms.export-bundle`). The per-family counts are additionally best-effort: if a backing subsystem is unreachable, that category is silently reported as zero and the response carries no degradation indicator, so a preview taken during an outage can read as "nothing will be destroyed" when the opposite is true. A zero count immediately before a destructive action deserves a second look.
- **Delete records first, then purges.** `DELETE /workrooms/{id}` transitions the row to `deleted` with a `deleted_at` timestamp — the workroom record is retained in that state rather than erased — invalidates runtime state, records a `workroom.deleted` event transactionally with the status change, and emits a sensitive-data-disposal audit event on a best-effort basis. The two differ in strength and the difference matters for compliance: the `workroom.deleted` row commits in the same transaction as the delete, so it cannot be missing from a successful delete; the disposal audit event is emitted after that commit inside a swallowing handler, so an emission failure is logged and the delete still succeeds without it. A service-layer audit decorator provides an independent trail. The cascading purge of the workroom's tagged resources (app deployments, extensions, DDE objects, context instances, catalog objects) runs as a background sweep with bounded retries; exhausted purges are dead-lettered for operator inspection rather than silently dropped. Deleted and purging workrooms remain visible to the admin listing via `include_deleted`, which is the soft/hard distinction the audit stream requires.
- **The lifecycle is scriptable.** The SDK exposes `WorkroomService.archive` and `WorkroomService.delete` (plus `get` / `list` with `include_archived`), with typed errors: 404 mapped to `NotFoundError`, state conflicts on non-archivable states and Global Workroom protection surfaced as API errors.
- **Archive is idempotent; delete is not retry-safe.** Archiving an already-archived workroom returns the existing archived record (200), not a conflict — the 409 is reserved for states that are neither active nor archived. Delete is *not* idempotent: the first delete moves the row out of the owner-visible status set, so a retried `DELETE` returns 404. A client that loses a delete response should not read the retry's 404 as evidence the delete failed — but nor is it proof it succeeded. The same 404 answers a nonexistent or mistyped id, a tenant or ownership mismatch, and a workroom another request deleted. It establishes only that this caller can no longer fetch the workroom. Where the distinction matters, confirm through the admin listing with `include_deleted` rather than inferring from the status code. The Global Workroom cannot be archived or deleted (403).

## Conditions and limits

- UI coverage of the retirement lifecycle is deployment-posture dependent. The core-owned Workroom Manager — the default posture — exposes archive, restore, delete with a confirmation dialog, an export-before-delete download, a dedicated Archived tab, and the lifecycle-and-retention summary. The extension-owned Workroom Manager is delete-first; archive and restore reach that posture through the API and SDK. The Workroom Manager user guide in the platform documentation tree describes the extension posture, and says these capabilities exist in the underlying APIs and that the guide will be updated as they become available in the Manager interface. That statement is stale with respect to the shipped core surface and should be corrected upstream.
- The delete-preview and delete flows require delete-caliber authority; the lifecycle summary requires only view access, so any member can inspect retention posture.
- **`WORKROOM_RETENTION_PERIOD_DAYS` is declared but not applied.** Nothing reads it. The lifecycle summary derives retention detail from the workroom type — ephemeral workrooms report a cleanup window computed from `WORKROOM_EPHEMERAL_TIMEOUT_SECONDS` — and from DDE retention-policy metadata on the workroom's indexed content. A persistent workroom with no DDE policy reports `manual` retention with the detail "retained until explicitly archived or deleted." An operator who sets a retention period expecting it to appear here, or to be enforced, gets neither; the setting's own config description overstates it and should be corrected upstream.
- Ephemeral workrooms are additionally purged automatically (on session teardown and by a recurring cleanup task); that path is documented under `workrooms.create` as part of the persistence posture, not here.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs. The SDK arm can exercise archive and delete directly; restore and delete-preview are API-only and would need API calls from the same runbook to be covered.
- The journey corpus covers this lifecycle under `workrooms/J04` (lifecycle inventory archive export delete): usage and retention visibility (SC-01, SC-02), active and archived listings being distinct (SC-04, which matches this document's `include_archived` claim), archive and restore (SC-05, SC-06), delete impact preview (SC-08), and programmatic lifecycle controls matching product permissions (SC-09). SC-03 (admin reviews workroom inventory) belongs to `workrooms.admin-oversight` and is claimed there, not here. All J04 scenarios carry `intended` provenance in the journey corpus; nothing here inherits validation from them.
