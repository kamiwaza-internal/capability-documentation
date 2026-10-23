# Kamiwaza 1.3.4 verification report

Evidence date: 2026-10-23

## Scope

Ingest a source, inspect a registered job, and trigger a managed connector. The complete registered SDK/API journey passed on the corrected release/1.3.0 API build assigned to the 1.3.4 verification cycle. This is not a graphical browser journey or proof of unattended scheduling.

The API image reports source e301cd3db8b4568605e1b5d9d04eb0fb98f199d5. Its complete source tree matches accepted Core merge 145aa094e4816430b418222c8ab8dc53dbee8353. Original Ray, scheduler and Flight components remained on the captured frozen release. This result does not claim the original v1.3.4 tag contains the correction.

## Results

Capability-kit PR #213 accepted ingestion.scheduled-ingest, taking scoped coverage from 70 to 71 of 87. Sixteen remain. The 58 historical prerelease entries and all 70 earlier accepted records stay unchanged; overlapping counts are never summed.

The journey proved real S3 ingestion, exact dataset/source attribution and requester ownership; job registration and repeated pending-status reads; independently authenticated viewer-trigger refusal without mutation; and a manager trigger with advanced timestamps and attributable indexed output.

The generated human recipe and ingredient glossary describe those operations. A registered pending job is not proof that an unattended timer executes it.

## Evidence

Canonical accepted packet: https://github.com/kamiwaza-internal/capability-kit/tree/8e0326453e206895a7f76227aaec2a9e12d26a5c/reports/2026-10-23-ingestion-lifecycle-release130

Acceptance: https://github.com/kamiwaza-internal/capability-kit/pull/213

Native stamp: ef1462fbcd1d9eeedddf0596b3fc1a9cd392baf420f46a1e5a921a984a923904.

SDK producer: d1e32f9ebd47282d946efef2acc2fff0dc2923e6, tests/integration/test_catalog_ingest_retrieval.py::test_run_now_owner_job_and_dde_trigger.

The packet retains the reviewed retry, original 404 failure, plan, matching before/after runtime captures, native evidence and independently reproduced seal. Cleanup and restoration happened after the stable after-capture and have separate timestamps.

## Limits and assumptions

No unattended schedule execution, execution durability, cross-tenant isolation, alternate-plugin matrix, workroom-mismatch denial, ingestion-admins denial or partial owner-grant rollback proof is claimed. Unknown plugin/job/connector, cross-workroom write and undecryptable-configuration error mappings were not exercised. Connector-enabled eligibility is not established.

Native cleanup proved dataset, source object and secret absence. The disposable connector was disabled and its encrypted credentials replaced with an empty configuration. Temporary users/grants and the owned API deployment were removed; original routing and frozen components were restored. One credential-empty connector, indexed metadata and nonsecret pending status remain under recorded retention, including the product's renewable 30-day status TTL. No active source authority remains.

Two setup/verification issues remain visible: a second API replica exceeded available memory, so the bounded journey used one replica; and typed S3 configuration validation rejected the intentionally emptied credential configuration. A separate read-only native decryption check verified empty configuration without repeating mutations or exposing secrets. Neither issue is relabeled as a new product failure or hidden.

This cumulative inventory covers multiple recorded configurations, not one jointly tested installation or human release approval. For an RFI, report the requested requirement, supported scope, status, evidence and remaining gaps. Do not generate a bid response or infer procurement advice, accreditation or untested claims.

## Remaining work

Sixteen active capability IDs remain outside accepted release coverage. Keep existing failures and scoped limits visible. A passing additional journey for an already verified capability does not increase the unique count. Canonical streaming was already accepted in Kit #199 and remains included in the existing 70-capability baseline. The next new coverage target is bounded database registry verification; other residuals remain tracked individually.
