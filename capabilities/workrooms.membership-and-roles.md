---
capability_schema: capability.v1
id: workrooms.membership-and-roles
title: Share a workroom with role-based membership
tier: internal
persona:
  - Analyst
surface:
  - UI
  - API
evidence_plan: ui
requires:
  - workrooms.create
preconditions:
  workroom: An active workroom exists and the acting user holds membership-management authority on it (owner-level).
evidence:
  - workrooms/J06/SC-03
  - workrooms/J06/SC-04
  - workrooms/J06/SC-05
  - workrooms/J06/SC-06
  - workrooms/J05/SC-01
  - workrooms/J05/SC-07
not_supported:
  - SDK member management. The SDK's WorkroomService has no membership methods; invite, role change, removal, ownership transfer, and role history are UI/API surfaces only.
  - ReBAC lineage evaluation of invitees and per-member visibility rematerialization. These have no implementation source and are not claimed.
---

# Share a workroom with role-based membership

A workroom owner invites members, assigns collaboration roles, changes or removes memberships, transfers ownership, and can review the role-change history. Role checks govern what each member can do inside the workroom and in workroom-bound applications.

## What this capability guarantees

- **Invite by directory lookup, with an explicit role.** The invite flow resolves a platform user by email (`GET /workrooms/{id}/members/lookup`) before granting access, then adds or re-activates the member (`POST /workrooms/{id}/members`, 201). The UI adds an attestation checkbox that must be confirmed before the add completes.
- **Three collaboration roles with documented capabilities.** The product labels are posture-dependent: the default core-owned Workroom Manager displays **Editor** in its member role selectors, while Contributor is the extension-guide and product-documentation label for that same role. The API enum on member add and role change is `owner` / `editor` / `viewer` — **`editor` is the wire value behind the Contributor label**, and a client that submits `contributor` is rejected. (A legacy `contributor` value exists at the storage layer and projects to the editor relation, because the release-line ReBAC schema has no distinct contributor relation; it is not an accepted request value.) Owners hold full control (settings, membership, ownership transfer, delete); Contributors participate in the workroom and its applications; Viewers get read-only access to the workroom and its contents. In shared non-global workrooms, membership is the sharing boundary — authorized members see shared workroom history according to role without per-item sharing configuration.
- **Adding a member can be blocked outright by connector content, on a stock deployment.** If the workroom already holds Google Drive or Microsoft 365 connector content, a new invite or a reactivation fails with 409 ("Workroom already contains … connector content without a room-shared service-account fallback") unless a room-shared service-account registration exists for that connector family. Creating that registration requires `WORKROOM_SHARED_CREDENTIALS`, which is off by default and answers 403 when off — so on a default deployment this is a dead end, clearable only by enabling the flag or removing the connector content. The check does not consult the flag, so it is not inert when the flag is off. It also fails closed *before* connector content is identified: if the connector inventories cannot be queried, every new invite 409s ("content compatibility could not be verified right now"), including in workrooms with no connector content at all. Treat a 409 on invite as this condition, not as a bug.
- **Role changes and removals are owner-controlled and guarded.** `PATCH /workrooms/{id}/members/{member_user_id}` updates a member's role; `DELETE` removes a member. All membership-management routes require delete-caliber authority on the workroom, so non-owners can view the roster but cannot change it.
- **Removing an active member is a deliberate two-step.** If the target member has active workroom sessions, the first `DELETE` returns 409 (`active_sessions_confirmation_required`) and changes nothing; retrying with `?confirm_active_sessions=true` removes the membership and best-effort terminates the member's bound runtime sessions in the same request — no second call is needed, but termination is not verified before the success response (see Conditions and limits). This handshake is the documented public contract.
- **Ownership transfers to another active member.** `POST /workrooms/{id}/ownership/transfer` reassigns primary ownership; the Members panel exposes the same operation in the UI.
- **Role changes leave a durable history.** `GET /workrooms/{id}/role-history` returns the workroom's role history for audit and turnover review.
- **Membership changes propagate to live views.** Member add, role change, removal, and ownership transfer each record a membership event and publish a presence refresh, and a connected workroom UI picks the change up on the event stream's next poll — no reload, and no client-side polling. The freshness comes from the server-side stream polling the event log rather than from the broker fanout (see `workrooms.presence` for the mechanism).

## Conditions and limits

- **`WORKROOM_MEMBERSHIP_VISIBILITY` does not gate library visibility.** An invitee with an active membership row sees the shared workroom in `GET /workrooms/` regardless of this flag: the list query joins active member rows unconditionally. The flag is a ReBAC-rollout staging control read on the authorization path — with ReBAC enabled, it decides whether a membership row on its own is accepted as proof of access by the workroom guard (with ReBAC off, member rows are honored either way). Do not offer it to an operator as a switch for whether invitees see shared workrooms, and do not treat it as inert: it has real authorization effect.
- The Global Workroom is protected: membership-management operations against it return 403.
- Read-only lifecycle states (archived, deleting) block member changes with 409 until the state clears.
- Removal terminates sessions best-effort after the membership row is removed. The platform logs rather than fails in all three outcomes: when termination itself errors, when residual sessions are confirmed still active, and when the residual count cannot be confirmed. A caller that needs revocation confirmed must verify it separately.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs. The journey corpus gives that arm concrete scenarios: `workrooms/J06` SC-03 through SC-06 (add member with role, change role, active-removal warning, remove member) and `workrooms/J05` SC-01 and SC-07 (share a workroom; membership loss revokes access).
- The active-removal warning (J06/SC-05) and member removal (J06/SC-06) carry `intended` provenance in the journey corpus itself; the sharing and revocation scenarios (J05) are marked `characterized` there. Neither status transfers to this kit until a run here names this capability id.
