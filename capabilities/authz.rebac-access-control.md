---
capability_schema: capability.v1
id: authz.rebac-access-control
title: Govern access with relationship-based access control and attribute gates
tier: internal
persona:
  - Operator
  - SysAdmin
surface:
  - API
  - SDK
evidence_plan: sdk
preconditions:
  rebac_enabled: The ReBAC master flag (`AUTH_REBAC_ENABLED`) is on. It defaults off, and the check and tuple endpoints answer 404 while it is off; the flag is latched at first read, so a runtime flip is logged critical and ignored rather than silently moving an enforcement boundary.
  identity_attributes: Attribute-gate evaluation reads user attributes from the identity envelope (the edge populates the attributes header from identity-provider user attributes such as clearance, country, and programs); malformed or absent attributes degrade to empty, and the gate then applies its fail-closed or default behavior.
not_supported:
  - Formal compliance-posture claims. The security documentation at the pinned revision makes no FedRAMP, DoD Impact Level, NIST 800-53, DISA STIG, or ATO claim anywhere, and this capability makes none either. The docs position accreditation as the customer's activity that the platform supplies evidence toward (decision logs, policy-validation evidence, external-IdP controls) — cite this entry, not a blanket decline, when a security ask probes for certifications.
  - Platform-wide guard coverage. The docs state the boundary themselves — ReBAC guards cover catalog, models, DDE connectors and documents, and retrieval job access, with additional services adopting coverage over time, and some ingestion workflows still admin-scoped.
  - An audit-only enforcement mode. When ReBAC is on, denies are 403; the shadow-compare flag compares the Postgres and SpiceDB backends for parity and is not a permissive enforcement mode.
---

# Govern access with relationship-based access control and attribute gates

Access to platform resources is decided by relationship tuples, subject and group administration, and attribute gates: administrators manage tuples and subjects, applications ask check-access questions and receive decisions with recorded reasons, datasets carry attribute-gate bindings evaluated per caller, and every decision is logged — the policy layer the security docs ship as ReBAC, deny-by-default over an explicit `subject → relation → object` model.

## What this capability guarantees

- **Decisions are explicit, attributable, and deny-by-default.** `POST /auth/check` answers an allow with a decision id and reason, and a deny as 403 with a machine-readable reason and the decision id in a response header. Non-admin callers may only check themselves (403 on a mismatched subject), namespaces and relations are allowlisted (404/422 outside them), tenant resolution is required, and the endpoint is rate-limited per IP and per tenant. The relation vocabulary is fixed in code — ownership and editor/viewer roles, membership, operator/executor, clearance (`cleared_for`, `can_access`, `includes`), and workroom-sharing relations — over an allowlisted set of object namespaces (models, datasets, secrets, connectors, workrooms, context resources, and peers).
- **Tuple administration is admin-gated and manifest-capable.** Tuple writes and deletes (`POST`/`DELETE /auth/tuples`, 204) require admin identity, as do the manifest-driven operations under `/auth/tuples/`: list with filters, diff a manifest against live state, revoke from a manifest with a dry-run option, and export — the batch surface that makes grants reviewable and revocable in bulk rather than one call at a time.
- **Subjects, groups, grants, and policy are one administered surface.** The subjects API upserts an identity-provider user with attributes and grants as a single typed call (the SDK collapses the two-phase admin recipe); local groups provide ReBAC subject sets with membership management; group mappings bind IdP groups to local groups explicitly; grants manage owner/admin resource grants; and a policy endpoint exposes effective policy and guard classification for introspection. All admin-gated.
- **Datasets carry attribute gates evaluated per caller.** `PUT /catalog/datasets/{urn}/gate` (admin) binds a typed attribute gate to a dataset; at access time the gate evaluates the caller's identity attributes, and the consumers are real enforcement points: retrieval streams filter records through the gate runner with audit metadata, and federated jobs run an execution gate before any compute is spent plus result gates that record-filter gated datasets before release.
- **Clearance is modeled in the same tuple system.** Classification levels form a seeded hierarchy of `includes` tuples (the CAPCO ladder), resources take `cleared_for` assignments, and a subject's system-high resolves from their `can_access` tuples — one mechanism for both role-shaped and clearance-shaped questions.
- **Every decision is logged, and the flags cannot drift silently.** Each decision emits a structured audit log record (result, tenant, subject, object, relation, reason, decision id, correlation id, latency) on a dedicated audit logger, feeds a bounded in-memory history served through the audit export surface, and stamps a span event on telemetry. The enforcement-relevant flags are latched at first read.
- **The backend is pluggable with verifiable parity.** Postgres is the default decision backend, SpiceDB the alternative, and a shadow-compare flag runs both in parallel to verify parity before promotion — a migration posture, not an enforcement mode.

## What this answers in customer terms

This capability is the platform's answer to "is access decided by relationships and attributes, and can we prove it?" — the fine-grained access-control ask (RBAC-plus, ReBAC, ABAC-style gating on clearance, country, and program attributes) with per-decision audit records as the proof. When a security questionnaire asks for certifications or accreditations, the citable answer lives in `not_supported`: no formal compliance-posture claim exists in the sources, and the platform's stated role is producing the access-decision evidence a customer's own accreditation consumes. That is a bounded, honest row — better than a blanket decline and importantly different from a claim.

## Conditions and limits

- The master flag defaults off and the clearance-enforcement flag (`AUTH_CLEARANCE_ENFORCED`) defaults off independently; a deployment has this capability only as configured, and the deployment guide's rollout sequence (auth enabled, IdP claims, flag, backend, session store) is the enabling path.
- Decision history for the export surface is a bounded in-memory buffer (default 2000 events); there is no internal audit database, and retention is the customer's log backend per the admin guide.
- The tuple routes mount under `/auth/tuples/`; the authz administration routers mount under `/authz`; gate bindings under `/catalog`. The inventory's bare `/tuples/` label is the mounted subpath, recorded here for readers wiring clients.
- Docs claims are consistent with code on the load-bearing points read this cycle (deny-by-default, decision logging fields, parity mode, guard-coverage boundary); the validation checklist gives the eight-step manual proof procedure, including the deny path asserting "the request does not silently succeed".

## How this is exercised

The planned SDK arm exercises the policy loop end to end: `upsert_tuple` a viewer relation, `check_access` both the allow and the deny with decision ids asserted, upsert a subject with attributes, `set_gate` on a registered dataset and observe a gated retrieval read filter accordingly, then revoke and re-check — emitting `scenario-evidence.v2` records naming this capability. The decision-log assertion rides the same run by reading the audit export surface.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The workbooks demand a longer chain than this entry claims — classification-chain SCG enforcement, dynamic context-aware policies, per-member visibility rematerialization on revocation. Those have no implementation source and are recorded inventory findings: unestablished, not `not_supported`, because no source draws that boundary — only silence does.
- The compliance-posture negative space in `not_supported` was established by an explicit sweep of the security documentation tree at the pinned revision (FedRAMP, Impact Levels, NIST 800-53, DISA/STIG, ATO, SCG-enforcement terms): zero platform claims exist; the five "accreditation" mentions all describe customer-side accreditation activity. Re-verify at the next docs pin before repeating the claim.
- The behavior-journey corpus has no authorization journey, so this document lists no `evidence` references.
