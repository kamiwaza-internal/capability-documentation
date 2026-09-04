---
capability_schema: capability.v1
id: workrooms.admin-oversight
title: Administer workrooms across the platform
tier: internal
persona:
  - SysAdmin
surface:
  - UI:admin
  - API
  - SDK
evidence_plan: sdk
preconditions:
  admin_role: The caller holds platform administrator privileges; the admin routes enforce the admin dependency and are invisible to other users.
  manager_posture: The Admin View is an extension-posture surface only. On the default core-owned Workroom Manager there is no Admin View and no admin-route calls from the UI; on that posture this capability is API/SDK-only. The API and SDK halves hold on both postures.
evidence:
  - workrooms/J04/SC-03
not_supported:
  - Deleting the Global Workroom. It is protected on the admin path exactly as on the owner path (403), and the extension-posture Admin View documents that it cannot be deleted.
  - An admin view on the default core-owned Workroom Manager. That Manager has no Admin View and does not call the admin routes; administrators on the core posture reach this capability through the API or SDK only.
---

# Administer workrooms across the platform

Platform administrators list every workroom regardless of membership and can delete any workroom through a dedicated admin surface. This is the oversight half of the workroom story — governance and cleanup across all users' rooms, distinct from what owners can do inside their own. The API and SDK halves ship on every posture; the Admin View that surfaces them interactively ships only on the extension-owned Workroom Manager, not on the default core-owned one.

## What this capability guarantees

- **A platform-wide inventory with resolved ownership.** `GET /admin/workrooms/` lists all workrooms across all users with resolved owner identity, paginated (`skip`/`limit`, limit capped at 1000). `include_deleted` extends the listing to deleted and purging workrooms — the visibility that lets an administrator account for retired rooms, which is the soft/hard-delete distinction the audit-compliance stream requires.
- **Admin delete reaches any workroom.** `DELETE /admin/workrooms/{id}` purges a workroom regardless of owner and refuses the Global Workroom with 403. It emits a sensitive-data-disposal audit event on success, but that emission is best-effort: a failure is logged and does not fail the delete, so the named event can be absent from a successful admin delete. The `workroom.deleted` event is recorded transactionally and does not share that weakness, and a service-layer audit decorator provides an independent trail. For an audit-compliance answer, do not present the disposal event as a guarantee.
- **The same oversight is scriptable.** The SDK mirrors both operations as `WorkroomService.admin_list` (with `include_deleted` and pagination, validating the limit range client-side) and `WorkroomService.admin_delete`.
- **An admin view in the extension-posture product.** Where a deployment runs the extension-owned Workroom Manager, administrators see an Admin View showing all workrooms across all users with owner information, including the Global Workroom, with delete capability for any workroom except the Global Workroom; it is visible only to users with administrator privileges. This does **not** hold on the default core-owned Workroom Manager, which has no Admin View and never calls the admin routes — on that posture the guarantee is the API and SDK halves above.

## Conditions and limits

- Admin authority is enforced by the route dependency (admin role), not by workroom membership: the admin listing is exactly the bypass of membership scoping that ordinary listing denies, which is why it lives on a separate router.
- Which Workroom Manager a deployment runs is a posture decision, and the core-owned Manager is the default when the operator has not deliberately enabled the extension. An RFI answer about *interactive* admin oversight must therefore name the posture; answered unqualified, it is wrong for the default deployment. The `UI:admin` surface in this document's front matter is the extension posture's surface.
- Admin delete shares the owner-side delete's semantics past the authority check: the row transitions to `deleted` and the background resource purge takes over (see `workrooms.archive-and-delete` for the record-then-purge behavior). Admin oversight adds who may invoke it, not a different destruction mechanism.
- The SysAdmin workbook grounds the oversight *need* — usage timelines across workrooms, audit of deleted workrooms — rather than naming the admin list/delete surface; this document claims the surface that serves that need, and does not claim a usage-analytics or timeline feature, which no source here implements.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs. An SDK runbook with an admin credential can exercise `admin_list` (including `include_deleted` after a delete) and `admin_delete` end to end.
- The journey corpus touches admin oversight at `workrooms/J04/SC-03` (admin reviews workroom inventory), which carries `intended` provenance in the corpus itself. The Admin View click path (`UI:admin` surface) is not exercised by the planned SDK arm; it would need a UI journey run of its own to be covered.
