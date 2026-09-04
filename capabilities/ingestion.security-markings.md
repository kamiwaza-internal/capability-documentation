---
capability_schema: capability.v1
id: ingestion.security-markings
title: Parse and apply source security markings during ingestion
tier: internal
persona:
  - Analyst
  - SysAdmin
surface:
  - API
evidence_plan: none-this-cycle
preconditions:
  dde_path: The claims below cover documents entering through the DDE indexing surfaces (the documents API, connector-triggered ingest with seed documents, and the S3 ingestion worker); other entry paths are outside these sources.
evidence:
  - data-connectors/J05/SC-01
---

# Parse and apply source security markings during ingestion

The data engine carries a security-markings parser, a delegating parser client, and a policy evaluator, so classification markings present on ingested documents are parsed, evaluated against the source's system-high, and attached to records rather than dropped at the door.

**This capability is deliberately routed to no evidence arm this cycle** (`evidence_plan: none-this-cycle`). It is documented and explicitly unvalidated, and it will answer **"not established"** to any RFI for the entire cycle, by design. Read the coverage notes before citing it in any customer-facing answer.

## What this capability guarantees

The following describes the implementation as read at the pinned revision:

- **Banner-style markings are parsed structurally.** The parser handles CAPCO/ICISM-style marking strings — classification level, SCI controls (SI, HCS, TK, and peers), control markings (FGI, RD, FRD, NATO, and peers), dissemination controls (NOFORN, ORCON, PROPIN, FISA, RELIDO, and peers), and `REL TO` country lists — with unrecognized tokens preserved as handling caveats rather than dropped, and a length cap on the input.
- **Parsing can delegate to an external ICISM parser, with local fallback.** When an operator configures the external parser URL, marking strings are sent to that service (HTTPS enforced unless explicitly overridden, bounded timeout) and the response normalized; on any failure the local parser answers instead, so parsing does not become an availability dependency.
- **Admission is a policy decision, not annotation only.** At DDE indexing time every document's marking — explicit, or the connector's default marking — is evaluated against the source's declared system-high (defaulting to UNCLASSIFIED). A document marked above system-high is rejected with a typed violation and an audit event recording the rejection; classification comparison deliberately adds timing noise. A marking whose *leading classification token* is unrecognized does not reach that path at all — see the limit recorded below.
- **Markings persist on the record.** Admitted documents carry their parsed security metadata as first-class index-metadata fields — classification, the original marking, handling caveats, control markings, SCI controls, dissemination controls, and releasability — rather than losing the marking at the door.
- **Reads re-evaluate.** Listing and reading indexed documents re-evaluates each record against the more restrictive of the source's system-high and the requesting user's system-high (carried on a request header), so admission is not the only place the comparison happens.
- **The check is always on for this path.** No flag disables the marking evaluation in DDE indexing; the only configuration knobs select the external parser and its transport posture.

## What this answers in customer terms

The customer question this capability exists for is "does the platform understand the classification markings on our documents?" — and this cycle the citable answer to that question is **"not established"**, whatever the code says. What the sources support describing, for internal orientation only: banner markings are parsed into structure, above-system-high content is blocked at DDE admission with an audit trail, and parsed markings travel with the record and gate reads. None of that has an evidence arm this cycle, and no formal accreditation or compliance-posture claim attaches to any of it.

## Conditions and limits

- **An unrecognized leading classification is an unhandled error, not a governed rejection.** When the parser cannot resolve the first token to a known classification it raises `SecurityMarkingError`, which derives from `Exception` rather than `ValueError`, and it raises before the guarded comparison the evaluator performs. The document-create route catches only `ValueError` and `SecurityViolation`, and no other handler for `SecurityMarkingError` exists on this path, so the request surfaces as a 500: no typed violation, and no rejection audit event. The document is not admitted — the failure is closed, not open — but the governed rejection path this capability describes does not cover this input. Unrecognized tokens *after* the classification are a different case and are preserved as handling caveats, as described above.
- The claims cover the DDE indexing path named in the preconditions. These sources do not show the context-service upload pipeline or other entry paths passing through this evaluator; marking-aware behavior elsewhere is unestablished.
- The workbooks demand a longer enforcement chain — marking-aware context assembly and release minimization in downstream surfaces — that has no implementation source and is a recorded inventory finding, owned by no entry.
- The enforcement behavior is documented in the data-engine docs page (system-high validation before indexing and listing, the user system-high header, connector marking fields); the parser itself, its marking-format coverage, and the external ICISM parser option have no docs page — a partially open docs-gap finding.

## Coverage notes

- **`evidence_plan: none-this-cycle` is the routing decision, not an oversight.** The inventory routed this entry to no arm because its support was two-class (code plus non-code sources), its docs coverage partial, and its enforcement depth unpinned at inventory time; until enablement and depth are pinned by a planned arm in a later cycle, this capability answers "not established" all cycle and the kit computes it `intended` throughout, with no planned arm whose completion would change that.
- **Authoring-time source reading partially retires the inventory's depth caveat, and that is recorded here for the next run.** The inventory's findings listed the enforcement chain (system-high comparison, admission blocking) as unconfirmed; opening the cited modules and their call sites shows both implemented and always-on within the DDE indexing path, with persisted marking metadata and read-time re-evaluation. What remains unconfirmed is everything beyond that path — which is a narrower finding than the one the inventory recorded, not a reversal of the routing decision.
- The journey reference above (`data-connectors/J05/SC-01`, create connector with security metadata) is an authored pointer to the nearest covered behavior — connector-level marking fields — not to marking parsing itself, which no journey covers.
