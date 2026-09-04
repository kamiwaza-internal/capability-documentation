---
capability_schema: capability.v1
id: workrooms.shared-credentials
title: Register shared credentials in a workroom with member consent
tier: internal
persona:
  - Analyst
  - Operator
surface:
  - API
evidence_plan: none-this-cycle
requires:
  - workrooms.create
preconditions:
  feature_flag: Shared credentials are enabled on the backend (`WORKROOM_SHARED_CREDENTIALS`, default off). Every route in this capability returns 403 with a feature-disabled detail when the flag is off.
---

# Register shared credentials in a workroom with member consent

A workroom can carry visible credential registrations that members explicitly consent to, and thread-scoped credential resolution decides which registration applies to an agent's work. This lets a team share connector access inside a workroom without passing secrets around, with consent and visibility as the governance surface.

**This capability is feature-gated off by default and is deliberately routed to no evidence arm this cycle.** Read the coverage notes before citing it in any customer-facing answer.

## What this capability guarantees

The following describes the API surface as implemented, contingent on the feature gate being enabled:

- **Visible registrations, not shared secrets.** `GET`/`POST /workrooms/{id}/credentials/registrations` list and register (or update) a visible workroom credential posture; `DELETE .../registrations/{registration_id}` revokes one. Registration and revocation emit sensitive-data audit events naming the workroom and the credential target, so the governance surface is recorded in the ordinary case rather than implicit. Emission is best-effort: a failure is logged and does not fail the call, so a named event can be absent. A service-layer audit decorator provides an independent trail.
- **Consent is an explicit, revocable act.** `GET`/`POST /workrooms/{id}/credentials/consents` list and grant credential fallback consent; `DELETE .../consents/{consent_id}` revokes it, again with a best-effort audit event on disposal. Membership alone does not constitute consent. Note an asymmetry worth closing before this feature is enabled anywhere: revocation emits a named sensitive-data event, but the consent *grant* path emits none, so grants are covered only by the service-layer decorator.
- **Thread-scoped resolution.** `GET /workrooms/{id}/threads/{thread_key}/credentials/resolve?connector_key=...` resolves the credential posture for the acting user inside a shared thread — which registration, if any, applies to that connector for that actor in that conversation.
- **Conflicts are structured.** Settings conflicts return 409 with a machine-readable `conflict_code` and the current `credential_resolution` payload, so a client can present the actual conflicting state rather than a generic error.
- **All management routes are membership- and role-guarded** (view access for reads, manage-caliber authority for writes) on top of the feature gate.

## Conditions and limits

- **Feature-gated, default off.** With `WORKROOM_SHARED_CREDENTIALS` unset, every route above answers 403 (`WorkroomFeatureDisabledException`). A deployment that has not deliberately enabled the flag does not have this capability in any observable sense.
- **The non-code support for this capability is thin, and that is a recorded finding.** No documentation page describes shared credentials, and no workbook step names credential consent explicitly. The claims above rest on the platform code alone: the endpoint cluster, its dedicated credential-binding model module, and its dedicated feature gate.
- This capability governs registration, consent, and resolution posture. It does not claim any specific connector's execution path honors the resolved posture; connector-side enforcement is outside this document's sources.

## Coverage notes

- **`evidence_plan: none-this-cycle` is the routing decision, not an oversight.** This capability is documented and explicitly unvalidated, and it will answer **"not established"** to any RFI for the entire cycle, by design. The feature gate is the reason: honest validation is contingent on enablement, and no cycle-1 environment enables it.
- **No evidence record names this capability**, so the kit computes it `intended` (documented, not validated) — and, unlike its siblings, there is no planned arm whose completion would change that this cycle.
- No journey scenario covers shared credentials, so this document lists no `evidence` references.
