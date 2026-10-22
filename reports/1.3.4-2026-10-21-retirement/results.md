# Kamiwaza 1.3.4: full verification results

Retired workflow: models.two-node-serving (legacy Docker/SSH paired-node serving) is unsupported and excluded from current capability claims and verification targets. Product docs PR #233 removed its installation guide on September 2, 2026 (ENG-2761); Alex confirmed retirement in ENG-14154 and Drew authorized scope removal on October 21. Historical records below retain their original evidence and counts; they do not establish current support. Single-node tensor parallel serving and GPU placement are unaffected.

Scope correction source: capability-kit c5f34ec84d7d76aa686e337447c29746e8ad1f4c.

Scope correction only: 64 accepted scoped results, 87 active capabilities, 23 remaining. The previous 64/88 snapshot and all 58 historical prerelease entries remain preserved.

Evidence cutoff: October 21, 2026. Publication review pending; human release approval not established.

## Read this first

**64 of 87 included capabilities have accepted scoped release evidence.** This is +34 from the earlier 30-stamp publication. The remaining 23 are not release verified. **58 historical prerelease verifications are preserved separately: 52 overlap this 87-capability inventory (46 accepted and 6 remaining), while 6 lie outside its scope. Do not add these counts.**

This is a cumulative evidence report across multiple captured runtime configurations and test generations, all citing Core v1.3.4 source 5f5f64656802eb497167f6eae6021093cfcdccf2. It is not proof that all 64 passed together on one immutable deployment, every operation works, or a human approved the release. Core source attribution is operator-asserted where stated in each stamp.

The prior publication, its 30-stamp snapshot and the recipe-readiness corpus remain historical artifacts. Their recipe counts are not capability counts. This scope-corrected report excludes the retired paired-node workflow. The original 88-capability denominator remains in the unchanged historical report.

## What the kit contains

The PDF and Markdown contain all 87 capability outcomes, recorded limits and assumptions, and all 58 historical prerelease entries. results.json provides the same machine-readable data and immutable stamp identifiers. SHA256SUMS binds every delivered file. This is a public, portable evidence projection; it omits private raw captures, credentials and execution fixtures. It is not an executable test harness. Canonical source kit commit: 6797ac996818805071c300ae6ce4201cf1dc9620.

## Findings and unfinished work

- Catalog lifecycle correction passed isolated candidate qualification, but normal merge is blocked. It receives no accepted release credit.
- Ingestion polling correction is source-reviewed; candidate build and full live qualification remain pending. No accepted release credit.
- Delegation quota correction is deferred at operator request; no merge-policy bypass.
- Agent package authoring and routing retain known failures. Source corrections do not replace the full browser replay.
- GPU, tenant, federation, airgap, mesh and rollout-dependent capabilities need their actual supported prerequisites. Refusal checks and skipped tests are not full journeys.
- Legacy two-node Docker/SSH deployment was explicitly retired by documentation change #233 in September 2026. The capability source already excludes Kubernetes. Treat this as a support-scope disposition, not a reason to provision two GPU hosts. Keep Kubernetes distributed serving as a distinct claim. Do not silently remove the row to improve the percentage.

## Reading inherited limits

Stamp assumptions and limits are preserved below; one private temporary-directory location is replaced with a descriptive label. Some describe earlier prerelease assessments with mocked tests or say “not release verified.” These remain historical qualifications inherited by the seal; they do not describe fresh browser/API execution. Later scope statements are retained alongside them. Never discard an inherited limitation or infer an untested operation from the accepted status. When wording conflicts, use the narrowest established scope and consult the canonical scenario before making a customer claim.

## All 87 capability outcomes

### apps.app-garden - Deploy curated applications from the App Garden

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T20:44:43.534552+00:00. Source basis: operator-asserted.

Stamp: 06f2865569f0d9613a52d96f3bf6b08d7edc9f7906770ebfc0f5337bdc87dc50

Registered scope: sdk:app-garden-deploy-lifecycle-and-reserved-environment-key-boundary, ui:appgarden-attached-chrome-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- SDK lifecycle on one disposable template only; browser App Garden flows, every template and whole Operator VS3 are not verified.
- No human release sign-off or fresh release stamp is created by this retained recipe proof.
- Attached Chrome read-only DOM observation; no isolated-context or network-interception claim.

### apps.deployment-baseline - Verify and retain the shipped app baseline a deployment was built from

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T05:21:28.231182+00:00. Source basis: operator-asserted.

Stamp: 4993641537e21c173fdd99edcd27dfedf7bb266eec4a4a724db170c3809caac2

Registered scope: sdk:shipped-baseline-live-existing-retention-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Load configured shipped baseline, prove digest rejection before parsing, reject malformed structure, retain one immutable release per name, reject duplicates and incompatible Core constraints, and verify exact shipped identities/hashes already existed and no persisted release or kind-binding changes.
- Runs deployed validator and retention functions in a fresh process with the real database; does not restart installer or scheduler, test upgrade/rollback history, or change the global baseline.
- Uses existing shipped members, not an added production release. Database writes are bounded to a rolled-back transaction; captures attest deployed Core images.

### apps.release-digest-pinning - Require digest-pinned images on newly published app releases

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T11:36:27.955696+00:00. Source basis: operator-asserted.

Stamp: 849535b236247089ff3a13e087da644fda4f312f199c5068dc7b277da8650c89

Registered scope: sdk:enforced-catalog-publication134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: With digest policy enabled, accept owned pinned publication metadata, reject new unpinned metadata and immutable changes, enforce reader/admin boundaries, and withdraw retained legacy metadata without reactivation; preserve unrelated catalog state.
- Metadata-only API journey. No canonical validation/baseline exemption, unrecognized-flag logging, image-pull or workload-deployment proof. Disabled seed is preparation, not credited runtime scope.
- Dedicated clone temporarily configured with digest policy enabled before capture; before/after capture bind enabled runtime. Original operator configuration restored and independently checked after the replay before publication.
- Owned rows are withdrawn and disposable account removed; immutable retired catalog history remains, not physical deletion.

### apps.sandbox-workload-provider - Select the workload backend for an extension's code sandbox

Status: not-release-verified. Historical prerelease entry: no.

Gap: controller prerequisite absent.

### auth.enterprise-sso - Sign in through enterprise identity: SAML/OIDC brokering, CAC/PKI, sessions

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T23:19:05.447513+00:00. Source basis: operator-asserted.

Stamp: 10872e51fe5f2e000e2a6e69362ff9d0d760658002b29abb6602092f810705d6

Registered scope: sdk:scoped-keycloak-session-134-v3.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Programmatic Keycloak password session issuance, authenticated identity, refresh continuity, malformed refresh rejection and anonymous identity rejection.
- No enterprise IdP round trip, browser sign-in, SAML, CAC, provider registration, logout or revocation claim.
- Existing operator account and trusted TLS; issued sessions follow normal expiration. One indivisible test requires the positive lifecycle and both negative controls.

### auth.local-user-administration - Administer local user accounts

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:52:01.982585+00:00. Source basis: operator-asserted.

Stamp: 6ad8daca511e81a74b2c4135c25927354bc6a5595e29b576bb949d3629aee8d4

Registered scope: sdk:local-user-identifier-resolution.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### auth.personal-access-tokens - Authenticate automation with personal access tokens

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:52:01.982585+00:00. Source basis: operator-asserted.

Stamp: 7de1eb1a5df964fb853fcddceaf92597f8d18adb5617962ad78cfa570100bd49

Registered scope: sdk:personal-access-token-authentication-and-revocation, sdk:pat-policy-and-inventory-contract.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### auth.session-revocation - End sessions by logout and remove tracked sessions as an administrator

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:52:01.982585+00:00. Source basis: operator-asserted.

Stamp: 0a3bdac557971a596a2ba650460023f8919f21f6338717f055ece8c0ea68551b

Registered scope: sdk:logout-and-administrator-session-revocation-lifecycle.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### authz.rebac-access-control - Govern access with relationship-based access control and attribute gates

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:52:01.982585+00:00. Source basis: operator-asserted.

Stamp: 8d1e88e6d2db3b123f3fde201ecb970ab77287f87606fb710fed7e5967d8c93d

Registered scope: sdk:rebac-denial-decision-ids.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### catalog.dataset-registry - Register and search datasets and containers in the data catalog

Status: not-release-verified. Historical prerelease entry: yes.

Gap: metadata ETag fix absent from frozen release.

### catalog.registered-sources - Register S3 and PostgreSQL sources, then scan into the governed catalog

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: a3fa4f070c206bc76451916bda98bab84dc68316b83ef7075f7ed2b3ee971701

Registered scope: api:catalog-registered-sources-listing.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### catalog.secrets-management - Store connector and service credentials as governed catalog secrets

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T16:14:16.697259+00:00. Source basis: operator-asserted.

Stamp: 16ee8ebe634e5bee4b5209e8de4000b72aa3b04f0635896406ff0f5356f566bf

Registered scope: sdk:catalog-governed-secret-lifecycle.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### catalog.writable-datasets - Manage file content inside platform-managed datasets

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:51:18.459829+00:00. Source basis: operator-asserted.

Stamp: afc7f697d887bef44db1667a6499a18a37a9da048795cf2c9ce2396551a17ee3

Registered scope: api:catalog-dataset-listing.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### connectors.ai-assisted-connector-setup - Model-assisted connector setup and repair

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T10:30:03.483401+00:00. Source basis: operator-asserted.

Stamp: 11699552cd46c6212a53a0741729a3a52c54de13801f959a11d94019711f2024

Registered scope: sdk:connector-model-plan134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Real deployed model proposes a bounded eligible GET connector plan with retained source/auth identity and no persisted project change.
- Synthetic preprovisioned project. No external source call, live source validation, saved repair, deployment, credential handling, UI or OAuth proof.
- Owned Builder/member/workroom retained for subsequent tests. Model is an existing serving input; model weights are not attested as release artifacts.

### connectors.connector-builder - Build and deploy data connectors from API descriptions

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T20:55:45.133550+00:00. Source basis: operator-asserted.

Stamp: 03e6898921a52546dbc69f58cd1a5737541da29955324faa9871e4a6b835126d

Registered scope: api:connector-builder-owned-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### connectors.managed-data-sources - Configure and manage governed data-source connectors

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T22:48:33.877956+00:00. Source basis: operator-asserted.

Stamp: 0f8d8a5aae7c5a40fe1a495fe093106c04723639133b8ce2b1215527bcd3c24a

Registered scope: sdk:scoped-connector-catalog-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Admin-only owned connector catalog type registration, validation, update, readback and removal with an isolated control type.
- Catalog metadata only; no connector workload, data-source connection or ingestion.
- Instance configuration and deployment, remote sync, self-registration, member availability and live connection verification remain unverified.

### connectors.oauth-tool-policies - Per-tool OAuth operation policies

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 6fc127fd932bfcbe00d7c8729750c9917ed96660e9a403750f3d646eef9f1a1c

Registered scope: api:oauth-tool-policy-listing-and-write-surface.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### connectors.user-oauth-authorization - Authorize personal data-source access with OAuth/OIDC brokering

Status: not-release-verified. Historical prerelease entry: yes.

Gap: OAuth fixture prerequisite.

### context.dataset-indexing - Bind a catalog dataset to a searchable semantic/lexical index

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 62ea55b8bdddbacf6f34a557dc1cdeb1cd4a880444686f30d8557e268d3f29a7

Registered scope: api:dataset-index-binding-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### delegation.brokered-resource-access - Let a delegated workload reach data and models through a broker instead of holding credentials

Status: not-release-verified. Historical prerelease entry: no.

Gap: fixture and corrected-release prerequisite.

### delegation.capability-grants - Bound what a delegated workload may do with explicit, inspectable grants

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T01:10:36.549806+00:00. Source basis: operator-asserted.

Stamp: e4a62ae4b84af19de56d97d546f71cce834beabb064300495dd05f31f4feea85

Registered scope: sdk:attested-member-grant-lifecycle-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: A real attested workload discovers its capability catalog, proposes an explicit bounded automation, and a separate member consents; the resulting grant can be inspected, listed, and revoked.
- Grant-only control-plane workflow; no executor runs, effects, brokered resource access, UI, cost enforcement, concurrency or quota enforcement.
- Empty resource/destination/credential ceilings and explicit zero-cost limit; no model/data access exercised.
- No DELETE registration governance claim; operator fixture uses supported registration PUT lifecycle for revocation.

### delegation.consent-and-approval-gates - Require human consent and approval before a delegated workload acts

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T06:15:54.344065+00:00. Source basis: operator-asserted.

Stamp: 6b74bd7d366f3f7212cb577f7e26ab646157f88b2d75379b712c096c372cc87e

Registered scope: sdk:scoped-member-consent-cleanup-qualified-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: An attested workload creates an intent, a disposable authenticated member reads its same-origin consent view and submits approval with nonce/CSRF token, and workload readback observes CONSUMED, APPROVE and a grant ID; teardown accepts an already missing grant or requests revocation and requires HTTP204.
- Member-consent happy path only; no effect-approval queue, negative CSRF/nonce tests, denial path, resource execution or IT approval enforcement claim.
- Requires a task-owned workload registration and disposable member. Revoke the grant, remove the member, retire the registration and confirm pod/serviceaccount absence before sealing.
- Cleanup accepts a grant pre-read404 without DELETE; otherwise it requires DELETE204. Persisted revocation state is not reread, and this journey does not claim revocation enforcement.

### delegation.pending-approval-queue - Pending-approval queue for delegated actions

Status: not-release-verified. Historical prerelease entry: no.

Gap: corrected-release prerequisite.

### delegation.run-claims-lifecycle - Track delegated work as claimed runs with explicit, recorded state transitions

Status: not-release-verified. Historical prerelease entry: yes.

Gap: corrected-release prerequisite.

### delegation.workload-identity-and-attestation - Give a delegated workload its own attested identity instead of borrowing a user's credential

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T05:59:02.914467+00:00. Source basis: operator-asserted.

Stamp: 3ebd96cf088dd681f762e0afc2790c4ecb388dd3e7733a63a73373c727e5bc83

Registered scope: sdk:scoped-projected-workload-identity-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: A registered Kubernetes pod uses its real projected assertion and SDK DPoP proof to discover a ready attestation profile and observed role; anonymous discovery is explicitly rejected and public JWKS contains key identifiers/types.
- Discovery and anonymous refusal only; no bootstrap, capability issuance/signature verification, rotation, replay resistance, revocation enforcement or other attestation provider claim.
- Requires an enabled deployment and a disposable registered workload. Retire the owned registration and delete its pod/service account with UID checks before sealing.

### extensions.developer-path - Build, deploy, and publish custom extensions with the kz-ext toolchain

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T08:12:43.278696+00:00. Source basis: operator-asserted.

Stamp: 6c58c847504b93dafa7941da7176a3a9003778ad347bcb8beda68c7aab46b9c0

Registered scope: sdk:generated-app-online-path-134-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Scaffold and validate an app, serve backend/frontend locally, build/push/deploy through kz-ext, read remote readiness and app content, remove deployment and local fixture.
- App scaffold on ARM64 only; not tool/service generation, production registry configuration, tenant isolation or every runtime-library contract.
- Disposable loopback registry with normal Kubernetes port forwards; no third-party registry credentials or global TLS changes.
- Online test configuration: extension offline relocation disabled on owned clone during replay and restored afterward. The retained offline-mirror attempt produced invalid custom image names; this pass does not resolve that behavior.

### federation.cluster-pairing - Pair Kamiwaza clusters into a governed federation

Status: not-release-verified. Historical prerelease entry: no.

Gap: multi-cluster prerequisite.

### federation.execution-gates - Enforce receiver-side policy on federated work with execution gates

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T05:48:56.474145+00:00. Source basis: operator-asserted.

Stamp: a8521d93ceda639d6f256edf6cb651fc45b4510e7368ffb79daaf6482336adb8

Registered scope: sdk:scoped-owned-execution-gate-binding-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: On an exclusively owned unconfigured cluster, set an API execution-gate binding, read back its type/source, clear it and confirm the original unconfigured state.
- Configuration lifecycle only; no federated remote-job ALLOW/DENY/UNKNOWN enforcement, peer cluster, gate package, lower-layer override or 409 protection claim.
- Refuses an existing gate and requires exclusive ownership. Cleanup refuses to overwrite a changed gate; any restoration failure blocks verification.

### federation.federated-retrieval - Discover and retrieve data from federated clusters, query-in-place

Status: not-release-verified. Historical prerelease entry: no.

Gap: multi-cluster prerequisite.

### federation.remote-jobs - Submit and monitor jobs on federated clusters

Status: not-release-verified. Historical prerelease entry: no.

Gap: multi-cluster prerequisite.

### ingestion.document-translation - Translate parsed documents through OmniParse

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T19:02:05.662265+00:00. Source basis: operator-asserted.

Stamp: aa32ea12b2d085da7fa034ce6cb0fd3c6d719c0347a21f172629ee27ba6fc0f8

Registered scope: sdk:omniparse-document-translation134.

Recorded assumptions:

- A configured OpenAI-compatible translation endpoint returns translated text in choices[0].message.content; no translation model was called (TranslationAdapter replaced, canned "hola mundo").
- The request the adapter sends (model name, prompt, target/source language) is acceptable to that endpoint; adapter tests assert only the Authorization / forwarded headers against a fake HTTP client.
- Parsed Markdown export is available for the document (get_export stubbed; Docling not run).
- Kamiwaza auth on the routes works as elsewhere (tests ran with KAMIWAZA_USE_AUTH=false).

Recorded limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Reviewer re-read receipts, tests and source; reviewer did not re-execute any test.
- No statement about translation quality, language coverage or source-language auto-detection.
- List and retrieve over REST rest on one test authored by F2 (new-tests/test_f2_translation_rest.py), not yet in the product repo.
- Receipts --1 and --2 are preserved environment failures of the first venv (missing kamiwaza_extensions_lib, pytest-asyncio); --3 and --4-new are the evidence. Interpreter was the sibling checkout venv, source verified from the exported tree.
- Tested source is release/1.3.0 @0cf063a; the contract was read at ac1b245. App Garden deployed instance not exercised.
- Verified journey: Translate an owned parsed English Markdown document into Spanish, list its stored language, retrieve translated Markdown with the unique source marker and synthetic facts, preserve source Markdown, then confirm document and translation are no longer retrievable.
- OmniParse REST only; no Core ingestion pipeline or UI proof.
- One synthetic English-to-Spanish document; no general language accuracy, detection, throughput or other language-pair claim.
- Exclusive empty ordinary account and qualified model route; explicit private model credentials and optional reasoning control when needed. A transport or server error retains the fixture until terminal recovery; cleanup must pass before release credit.

### ingestion.multimedia-extraction - Extract text and transcripts from images, audio, and video during ingestion

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T19:46:14.609516+00:00. Source basis: operator-asserted.

Stamp: 4da5c479adb267a0d9ed949fe14f59cdbd0c08372873b084e7cf2456cc64f9b6

Registered scope: sdk:core-multimedia-ingestion-search134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Ingest synthetic PNG, WAV and MP4 through Core, index extracted visual and spoken facts, retrieve those facts from the invocation-owned collection using fresh source identities, and verify owned parser document/job/collection cleanup.
- Core REST only; no browser UI, arbitrary media quality, other formats/languages or permission-isolation claim.
- Reuses a prequalified task-owned Workroom, parser, embedding service, vision model and transcription service. Long-lived fixtures remain. A temporary one-hour administrator PAT is used and revoked; model credentials are separately supplied for an operator-qualified endpoint.
- Fresh format-native metadata changes content hashes to avoid parser cache reuse. Source-file hits alone cannot satisfy extraction; audio has transcript metadata rather than a persistent parser document.
- API absence is not physical storage-erasure proof. Uncertain submission, incomplete artifact discovery/readback, or active writers retain owned resources for recovery and cannot earn successful cleanup credit.

### ingestion.parse-from-url - Parse a document fetched from a public URL

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T14:54:43.755279+00:00. Source basis: operator-asserted.

Stamp: 03d677abdb602648dbad228bc080124d45ad9916ec55e8d8977b5b87d36edb77

Registered scope: sdk:omniparse-public-url-outputs134.

Recorded assumptions:

- ASSUMED, not executed: a deployed 1.3.0 OmniParse image is built from this commit and behaves the same.
- ASSUMED: real public DNS and outbound egress from the OmniParse container work; here DNS answers were faked and the TCP connection to the validated public IP was redirected to an owned loopback fixture server.
- ASSUMED: HTTPS fetch with TLS verification behaves as the http path does; only http was executed end to end (TLS name pinning is asserted only by a shipped test with a faked transport).
- ASSUMED: Kamiwaza authentication in front of the routes works; tests ran with KAMIWAZA_USE_AUTH=false.
- ASSUMED: document types other than HTML (PDF, DOCX, PPTX, images) convert after a URL fetch as they do for uploads; only an HTML fixture went through real Docling.

Recorded limits:

- Local in-process execution with owned loopback fixtures only; no deployed 1.3.0 runtime, image, endpoint or public URL was exercised. Not runtime verified, not release verified.
- Source is the release/1.3.0 commit exported by git archive on this host; image-to-source binding is not attested.
- URL_MAX_SIZE_MB and URL_MAX_REDIRECTS limits, content-type refusal and BLOCKED_DOMAINS are covered only by shipped tests that replace httpx.Client or the inner transport.
- Interpreter was the sibling kamiwaza-extensions-omniparse venv (Python 3.14.6, docling 2.94.0); the project venv has no docling.
- End-to-end evidence rests on a test written in this pass; an earlier run of it with auth left on (401s) is retained as a superseded receipt.
- Scope is exactly the 4 authored REST operations. Only plain http on port 80 through one same-address redirect hop with an HTML fixture was executed end to end; the redirect policy case executed end to end is refusal of a hop that resolves to a private address.
- MCP: the authored document states (as a condition, not an operation) that an MCP tool exists in a separately launched process independent of OMNIPARSE_MODE. Reviewer source comparison at 0cf063aa agrees: facades/mcp/server.py:444 defines tool parse_document_from_url (not literally the REST route name) calling the same service method as the REST route; its __main__ selects only on MCP_TRANSPORT; main.py create_app is the only OMNIPARSE_MODE reader and combined mode only advertises the MCP process; the image CMD starts the REST app only. The MCP tool was read, not executed, and is not part of this Tier 2 verdict.
- Source curation is separate and unchanged: the 1.3.0 cycle row still records tier1 not-established (reason: document said MCP runs only in combined mode). The document at kit bff2776 (changed in 77b0008) no longer says that and matches source, so the recorded mismatch no longer exists in the document, but the cycle row was not edited or re-adjudicated by this import.
- Reviewer reran the registered command (analyst test plus 4 shipped files, 121 cases, exit 0) on an independent git-archive export of 0cf063aa in a loopback-only network namespace; this is local contract evidence and not a runtime or release pass.
- Verified journey: Fetch an approved public HTTPS document, verify owner metadata and Markdown/HTML contents, reject a loopback URL, and confirm owned cleanup.
- Excludes authenticated sources, redirect policy, non-loopback address classes, multimedia and Core ingestion jobs.
- Dedicated exclusive ordinary account with empty document list, qualified workroom/tool image and trusted HTTPS. Candidate diagnostics do not certify release selection.

### ingestion.scheduled-ingest - Run and schedule ingestion jobs against connected sources

Status: not-release-verified. Historical prerelease entry: no.

Gap: known release failure.

### ingestion.security-markings - Parse and apply source security markings during ingestion

Status: not-release-verified. Historical prerelease entry: yes.

Gap: marking provider and owned fixture prerequisites.

### ingestion.structured-document-outputs - Extract document tables, figures and chunks

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T14:54:43.755279+00:00. Source basis: operator-asserted.

Stamp: 688bcd6c51acd1ae3a176d84729cc3c2d4909ed09cf4c93957abf40c76a94b5f

Registered scope: sdk:omniparse-structured-outputs134.

Recorded assumptions:

- ASSUMED, not executed: a deployed 1.3.0 OmniParse image is built from this commit (or a later one containing 3c5b28f) and behaves the same.
- ASSUMED: documents converted by the PDF/layout pipeline yield tables and pictures with provenance that the same adapter mapping carries through. No PDF or other paginated document was converted by the author or the reviewer; only HTML went through real Docling.
- ASSUMED: Kamiwaza authentication in front of the routes works; every run had KAMIWAZA_USE_AUTH=false.
- ASSUMED: the local origin/release/1.3.0 ref (equal to origin/develop, as fetched by the author on 2026-10-06) is the 1.3.0 development line. 0cf063aa is not an ancestor of it (merge base f5296bfe).
- ASSUMED: commit 3c5b28f is the merge of OmniParse PR #151. The reviewer read this from the local commit subject and ancestry and did not query GitHub.

Recorded limits:

- Local in-process execution with owned fixtures only; no deployed 1.3.0 runtime, image or endpoint was exercised. Not runtime verified, not release verified, no release stamp.
- figures: for a real HTML conversion the record carries identity only. The reviewer asserted this for both pictures: page is the default 1, bbox is {}, image_path is '' and meta is {}; the figcaption text does not appear in the record. Docling gives HTML pictures no provenance and no image (reviewer printed prov length 0 and image None for both). This proves one record per picture in document order, not populated figure metadata.
- tables: cell text and row/column structure are real conversion output; geometry is likewise the default (page 1, bbox {}) for HTML.
- Populated page, bbox and image path are shown only on hand-built real docling-core items, through the adapter and the service export, not over the REST route and not from a converted document.
- CSV table output was exercised only in the shipped contract test, not over REST.
- Extraction quality, format preservation, full Docling/layout JSON and annotated PDFs are outside the authored operations and were not asserted.
- This assessment is for 2ff1fb79 only. The failed finding for 0cf063aa stands (analyst H receipts h-new-structured-outputs-e2e.log sha256 4476be1ba54d3d8d9ab60937d011660201a72f349f87192a346bd18ccb2c6e00 and h-diag-docling-figure-shape.log sha256 04e4d9f7a5f89c0dda7d51fe854e2745cb3f15c0cb364b841f4932ddda6e9401, both re-hashed by the reviewer) and is reproduced by the reviewer.
- The 1.3.0 cycle records source curation tier1 not-established for this capability, citing this adapter mapping; that row already names docling_adapter.py at 2ff1fb79 with the sha256 the reviewer measured. The row was not re-adjudicated.
- Source is a git archive from local objects on this host; image-to-source binding is not attested.
- Interpreter was the existing kamiwaza-extensions-omniparse venv; nothing was installed.
- The author's REST figures assertion is only 'at least 1'; the exact-count and empty-field assertions are the reviewer's. The reviewer's test is reviewer-authored and has not itself been independently reviewed.
- The kit id is the one the author proposed, but the registration here is the reviewer's (reviewer test added, reviewer and author receipts).
- Verified journey: Parse synthetic HTML and verify exact table values, figure identity records, content-bearing chunks, Markdown/HTML and owned cleanup.
- HTML only; excludes figure image pixels, OCR, multimedia, annotated PDF and Docling JSON.
- Dedicated exclusive ordinary account with empty document list, qualified workroom/tool image and trusted HTTPS. Candidate diagnostics do not certify release selection.
- Figure records are checked for count, id and document id only; captions, bounding boxes and pages are not asserted.

### ingestion.video-frame-analysis - Describe video keyframes with a vision model

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T17:04:27.480237+00:00. Source basis: operator-asserted.

Stamp: b4d04dab8efc7ef58a58e1ff9dad0458532267791eb787bc6b293a716d2efde8

Registered scope: sdk:omniparse-video-explicit-auth134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Submit and poll owned MP4 video jobs using both I-frame/simple and interval/structured modes; verify distinct visual and spoken content, transcript JSON/Markdown, combined analysis, descriptions, retrieved image bytes, and owned cleanup. Assert the two-frame cap truncates an available third interval sample.
- Synthetic approximately 4.7-second English MP4 only; no accuracy, throughput, language or other container-format claim.
- OmniParse REST API only; excludes Core ingestion, indexing, search and UI.
- Qualified vision and transcription services using supported explicit private model credentials when required; no automatic credential-discovery or delegated-identity claim; exclusive ordinary account initially empty. Both parameter cases must pass.

### kaizen.admin-settings-console - Admin settings console

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 93d52d6c59ffc6bbb6c1088afd44ab007092d23f5583af414c94277574e94213

Registered scope: api:kaizen-admin-settings-catalogue.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.agent-auto-routing - Automatic specialist help in chat, with member pin and exclude policy

Status: not-release-verified. Historical prerelease entry: yes.

Gap: known release failure.

### kaizen.agent-packages - Vendor and grant admin-vetted agent capability packages

Status: not-release-verified. Historical prerelease entry: no.

Gap: known release failure.

### kaizen.agent-publication-approval - Admin approval for member-proposed agents and packages

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 15574cca087be3699884aafec6e2ffd4991615340c7d6b367363d011161d2332

Registered scope: api:kaizen-agent-publication-approval-queue.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.answer-feedback - Rate chat answers with thumbs up or down

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 5176f638a24fd89beb2e5fff1a573380e9a27eab04833293f298a164c0a5b69b

Registered scope: api:kaizen-answer-feedback-contract.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.artifacts - Versioned artifacts

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 4807e60e68556ecfd8bf6f757fff4819b4752a56c9a5b684a6d667fa0e1f63c5

Registered scope: api:kaizen-artifact-listing-and-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.context-compression - Member chat compression controls

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: dc121167546eb56c907b16b05e8b728e8c3b44d0d50d25c5272bd00aa4ba2136

Registered scope: api:kaizen-compression-configuration-and-stats.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.conversation-event-streaming - Stream Kaizen conversation events

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T15:54:05.175711+00:00. Source basis: operator-asserted.

Stamp: a48d27199fda0746bc8911db50898f8067860b09581b7128f3af85af3bbcb95e

Registered scope: sdk:canonical-conversation-streams-a-replayed-marked-reply.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.conversation-search - Conversation and content search

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 540e340499fda9dc6818764153673177f01d85ad04f6dd111ea85b17af20bccb

Registered scope: api:kaizen-conversation-search-contract.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.custom-agents - Create and configure custom agents in Kaizen

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T10:06:58.952384+00:00. Source basis: operator-asserted.

Stamp: c63f80ba17660950e63d02d6c178e1e9e673ad4918d0fc3593e79a21e91798f9

Registered scope: sdk:legacy-agent-config134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Legacy API custom-agent configuration lifecycle: create named model configuration and instructions, list/read, edit and delete.
- Configuration-only model endpoint is never called. No UI, skill binding, model connectivity, agent execution, cross-user isolation or running sandbox cleanup proof.
- Published skills catalog empty; shared skills write hold remains intact. Owned deployment/member retained for subsequent tests.

### kaizen.data-chat - Converse with workroom data in Kaizen with cited answers

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T10:53:55.755546+00:00. Source basis: operator-asserted.

Stamp: a7a685b62898f89261061ec1b318fd14284e86d3ab68dff9d143a570f668dc26

Registered scope: sdk:legacy-cited-file-chat134-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Read an uploaded synthetic workroom file through a real agent tool, return a cited correct answer, and answer a follow-up in the same retained conversation.
- API-only, preprovisioned owned conversation and synthetic upload. No UI, cross-user sharing/resume, external connector, arbitrary-document accuracy or unconditional citation guarantee.
- Only exact synthetic-file view actions may be approved through normal policy. Existing serving model is an input, not a release-attested weight artifact.
- Owned app, member, agent, sandbox, raw file and conversation history intentionally retained in the cleanup journal; successful replay leaves the conversation finished. No deletion claim.
- Every executed tool action is checked; only exact synthetic-file views and finish actions are accepted. Scenario provenance is cycle-authored.

### kaizen.document-canvas-export - Open documents in an editable canvas; export to Word or PDF through the API

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 3cf70473119f519dcc6288461ff701326577a8cacd1a6641ca433cc4b2c3c8bf

Registered scope: api:kaizen-canvas-and-export-contract.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.document-collections - Document collections / working sets

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 9c46195cb6a6d0d03daea168172bf33bb29d8c80f6eedb4acb23c286357b2b26

Registered scope: api:kaizen-document-collection-listing-and-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.member-token-budget - Daily model-token budget per member

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T09:07:40.089070+00:00. Source basis: operator-asserted.

Stamp: 1984a860e8850c96463b714f7e81ac8535fbab3391114e8b5ed694bbfb399f7e

Registered scope: sdk:kaizen-member-budget-134-v4.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: A fresh member completes a real model turn, a positive daily cap refuses the next turn with budget_exceeded without additional tokens, original setting is restored and model use succeeds again.
- One fresh member and canonical agent model path; no UTC rollover, concurrent reservations, category limits, system embedding bypass, other call paths or browser rendering proof.
- Instance-wide setting changed only during the bounded refusal check on the operator-owned verification instance, with optimistic concurrency and recovery journal.
- Budget-specific reason comes from read-only, fresh-subject durable audit observations. Member stream emits generic runtime_failed; no specific user-facing budget message proved.

### kaizen.metrics-dashboard - Primary Kaizen administrator metrics and usage

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 6b0d3dc35ad51f42ec64e82033d2d966410d5124a63aa38b7edf6ec5e3a11c82

Registered scope: api:kaizen-ops-metrics-window.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.multi-agent-orchestration - Governed multi-agent delegation

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: ee302a258610b218ad142b32054f3d82644bc5cb41404014ab58bcd0156b5ea3

Registered scope: api:kaizen-a2a-orchestration-posture.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.notifications-inbox - Durable notification inbox

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 01ae18cadf53d9be0cfb5e11dcbbd9b9763ca7a8405a38fb43f7e147eebebb0c

Registered scope: api:kaizen-notification-inbox-shape.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.platform-operator-tools - Governed platform inspection and demo actions

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T11:10:45.702057+00:00. Source basis: operator-asserted.

Stamp: 51d4a292559f1b0253bf2cba278c1c1a0c435bf4ad642a42625559f2742b7d85

Registered scope: sdk:canonical-operator-inspection134-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Canonical Kaizen real-model read-only inspection returns actual deployment IDs, model IDs and statuses matching Core before and after, and the answer contains all returned IDs. Owned conversation cleanup is verified.
- API-only under supplied administrator password-session identity. No cross-user authorization, least privilege, UI, preview/apply, approval prompt or other inspection-operation claim.
- Existing serving model is an input; no model-weight release attestation. Only list_deployments with limit5 is exercised. No deployment or global policy is changed.

### kaizen.prebuilt-agents - Prebuilt specialist agents

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T15:54:05.175711+00:00. Source basis: operator-asserted.

Stamp: 632c83a96ca0e07e0b8ab3350155e207930c8100a7ea42ad3333ac046acd2e84

Registered scope: sdk:bundled-specialist-agents-are-listed-and-selectable-for-chat.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.privacy-guard - Warn about or redact sensitive text before a chat message is sent

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T22:04:15.286372+00:00. Source basis: operator-asserted.

Stamp: 45a9df8eccb16fb2dafeed85a71468aa08d65616cac17acf4615513750bc358a

Registered scope: ui:legacy-privacy-attached-chrome-134-v5.

Recorded assumptions:

- ASSUMED, not executed: real authentication. Tests inject a fake owner identity (example.invalid) by overriding require_auth, get_user_uuid and get_workroom_uuid; no token, header or Kamiwaza auth path ran.
- ASSUMED, not executed: live persistence. The DB session is a fake returning one in-memory conversation+agent row with a commit recorder; no SQL, scope filter or JSONB round-trip ran. Persistence across commit in a real database is assumed.
- ASSUMED, not executed: the agent create route stores the wizard's agent_context.privacy_filter unchanged; the wizard payload and the backend read agree on the key but the route between them did not run.
- ASSUMED, not executed: a real browser behaves as jsdom does, and the browser's API client reaches the settings routes as the mocked client is called.
- ASSUMED: Kaizen Legacy develop 82a7bb3c stands for the 1.3.0 project source (commit is on origin/develop and is the capability document pin). No release branch, image or deployment was inspected, and no image-to-source binding is claimed.

Recorded limits:

- Project-scoped pre-release assessment for the named 1.3.0 cycle only. Not runtime verified, not release verified, no release stamp.
- Local in-process execution only: pytest ASGI TestClient and vitest jsdom. No deployed runtime, endpoint, image, browser or database was exercised; no end-to-end run joins browser, API and database.
- The capability document's evidence plan is ui (browser-driven). This assessment does not satisfy that plan; the kaizen-legacy browser producer is still missing.
- UI mode selection was exercised for warn only (settings panel and wizard); off and redact selection in the UI, and the wizard omitting the key for off, are not asserted. All three modes are asserted on the backend route.
- The chat page defaulting to warn while settings load or fail to load (page.tsx:486-488) is not asserted by any cited case.
- Shared-workroom role branches are out of scope: only the owner role and the non-owner refusal ran. Viewer, missing-role, auth-disabled and legacy-header branches did not run.
- Detection is the fixed regex list; coverage beyond the 8 library cases is not claimed. Attached images are not scanned.
- The backend stores and returns the mode and does not apply it to message text; a direct API client is not checked (read from source, not tested).
- A null mode in PATCH leaves an empty override so the agent default applies again (observed; not an authored operation).
- evidence_kits names a local kit that is proposed only (privacy-followup/proposed-kit-registrations.json); it is not registered in verification/evidence-kits/1.3.0.json, so the lifecycle view may show a mapping gap.
- The backend test file is analyst-authored for this assessment and is not in the product repository.
- Analyst I's earlier partial record (5 of 6) and its failed receipts privacy-1-frontend, privacy-2-frontend and legacy-1-backend-unit are retained unchanged; the first two failed on a read-only cache write (EROFS) with their tests passing, per analyst I's record.
- The 1.3.0 cycle records source_curation tier1 not-established for this capability (authored claim or condition mismatch recorded at the earlier pin f0fe4dcd). This assessment does not change or resolve that record.
- Verified journey: Ordinary-editor Chrome Legacy typed-text privacy: conversation Off/Warn/Redact, Keep editing with no submitted event, send-redacted and send-original choices, Redact persistence after reload, and inherited agent default; six complete synthetic model turns with independent persisted-message checks and owned agent/conversation cleanup.
- Attached Chrome Legacy typed-text privacy controls with synthetic fixtures; no comprehensive DLP, attachment scanning, direct-API enforcement, cross-user isolation or isolated-browser-context claim.
- Reuses the qualified task-owned app, ordinary user and model; only the two new agents and conversations are removed. No other pattern variants or permission-isolation claim.

### kaizen.product-identity - Tell the two Kaizen products apart under a shared catalog name

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T19:59:48.279301+00:00. Source basis: operator-asserted.

Stamp: 5c62cdb1aef9763b76d0f8d3b7f662b8878c481b9c156793e210e0497877a19f

Registered scope: api:kaizen-product-line-classification-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.projects - Shared project workspaces

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 9b34063dec70c3785baddf3d7f188499f4ad23bacd5cccfcb2cbdb07ff92e240

Registered scope: api:kaizen-project-listing-and-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.prompt-library-and-chains - Prompt library and multi-step workflows

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: ed02e8f0fc55acf41fe0958b493159d658f575c9be5b7a16a24244997ae9eabd

Registered scope: api:kaizen-prompt-library-listing-and-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### kaizen.recipes - Save tool calls as recipes that agents can look up

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T09:58:08.428812+00:00. Source basis: operator-asserted.

Stamp: a974d30109dc4571f25ac9c652aa8c5db725f8abff6dcd78af8b0816faaac52b

Registered scope: sdk:legacy-recipes-api134-v4.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Legacy recipe API save, list, read arguments/results, credential-key redaction, rename, edit/clear notes and deletion.
- API-only synthetic tool-call payload; no Search UI save, actual agent lookup/invocation, payload-size limit or cross-user isolation proof.
- Owned preprovisioned Legacy instance and member; test deletes only uniquely named recipe fixtures.

### kaizen.scheduled-tasks - Scheduled and background agent tasks

Status: not-release-verified. Historical prerelease entry: no.

Gap: rollout readiness prerequisite.

### kaizen.shared-chat-typing-indicators - Typing indicators in shared chats

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T22:24:17.741408+00:00. Source basis: operator-asserted.

Stamp: c006eeb9450fcf2c2a91021c6931e6efbaa807933afc3f1487775d8a5593b434

Registered scope: sdk:two-member-shared-typing-134-v4-scoped.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Two members join an owned chat, observe peer typing and self-exclusion, clear typing, and observe explicit leave through API/SSE.
- No browser rendering, TTL-expiry, store-outage or cross-room isolation claim.
- Presence store is healthy; observed empty typing is not an outage-injection test.
- Leave observation uses a peer typing-clear wakeup; autonomous leave-notification latency is untested.
- Administrator owner and disposable ordinary collaborator; not two ordinary members.

### models.discover-and-download - Discover and download models from model hubs

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T23:30:33.336263+00:00. Source basis: operator-asserted.

Stamp: 9767318f452ac49bfb58e6a32f9ed07b26d6ade75bbf1e331ebb96ea73766505

Registered scope: sdk:scoped-cold-model-acquisition-134-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- One configured GGUF repository and quantization only; no cancel-all, every model family, physical deletion or cryptographic weight-content integrity claim.
- The original downloaded weight is deliberately retained. No cache deletion or new download was performed during this reconciliation.
- Original emitter batch start/finish and measured individual test duration are retained without retimestamping.
- Unrelated diffusion and inference-operation-set failures remain retained and unresolved by this recipe.
- No human release sign-off or fresh release stamp is created by this retained recipe proof.
- Verified journey: Search an explicitly selected uncached quantized model, request its download, wait for stored state and read back the acquired nonempty file metadata.
- Only the registered unsloth/Qwen3-0.6B-GGUF q5_k_m target; no other formats or providers.
- Does not verify bulk cancellation, model deletion, deployment, inference, UI, memory estimates or concurrent download behavior.
- Acquired weights are retained to avoid deleting shared model files.

### models.external-endpoints - Register external model endpoints behind the same catalog and controls

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T06:42:55.034341+00:00. Source basis: operator-asserted.

Stamp: 3993c64caa45ca33e99f0c34ac154605a2a06205e31fc68a161f25a2153b98df

Registered scope: sdk:scoped-existing-external-chat-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Read an explicitly selected existing external_chat deployment, discover its served model, obtain nonempty chat completion through the same-origin trusted Kamiwaza endpoint, and confirm the deployment remains active.
- Existing configured provider only; no provider discovery or registration, credential lifecycle, model deployment creation or retirement, UI, streaming, embeddings, commercial-provider breadth or upstream TLS qualification.
- One inference request capped at16tokens with no retries; no platform fixtures are created or deleted. Provider may retain its ordinary inference logs.

### models.gpu-placement - Control model placement across hardware classes, including fractional GPU serving

Status: not-release-verified. Historical prerelease entry: no.

Gap: hardware prerequisite.

### models.local-deployment - Deploy and manage local models on cluster hardware

Status: not-release-verified. Historical prerelease entry: no.

Gap: supported diffusion hardware prerequisite.

### models.openai-compatible-inference - Serve every model behind an OpenAI-compatible inference API

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T05:34:04.298947+00:00. Source basis: operator-asserted.

Stamp: e44ba75f98ed3ea44ff92a4569de36e4ff0ddfa341b77890ecd3705adb0ba7f7

Registered scope: sdk:scoped-cpu-gguf-text-inference-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- CPU llama.cpp and non-streaming text chat on one existing GGUF only; no GPU placement, every engine, embeddings, transcription, image generation or streamed inference claim.
- The original full inference-operation-set record and diffusion failures remain intact. This scoped passing journey does not resolve those broader modality failures or the failed local-deployment release checks.
- The source test deliberately declines whole-operation-set capability credit under the older per-capability policy. The reviewed scoped recipe uses the current many-to-many verifies policy; the broader canonical contract and its unmet operations remain unchanged.
- The test calls no model download method; acquired weights are retained. No new model, deployment, auth or shared-workroom operation occurs during this reconciliation.
- Original emitter batch times and individual duration remain unchanged. No fresh release stamp or human release sign-off is asserted.
- Verified journey: Prepare a GGUF model, deploy one llama.cpp instance, obtain nonempty text from the OpenAI chat-completions client, and confirm the owned deployment stops.
- CPU text chat on one model only; no streaming, embeddings, transcription, images, GPU engines, tenant profiles, or external-provider breadth.
- Existing broad operation-set and local-deployment failures remain visible and unresolved; this separately selected journey does not supersede those kits or claim local-deployment coverage.
- Prepared model weights may remain for reuse; the test retires its own deployment and asserts STOPPED. Unavailable setup produces a skip and cannot earn a stamp.

### models.tenant-mode-inference - Serve CPU and NVIDIA GPU models on a restricted tenant install from owner-signed compute profiles

Status: not-release-verified. Historical prerelease entry: no.

Gap: tenant runtime prerequisite.

### models.tensor-parallel-serving - Serve one model replica across several GPUs on one node (tensor parallelism)

Status: not-release-verified. Historical prerelease entry: no.

Gap: hardware prerequisite.


### platform.access-requests - Request resource access and record grantor approval/denial

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 8532eb962a416b24f9edbdac945306f1e5e1bb5cf8eed349e8020cdd9e08bfe5

Registered scope: api:access-request-submission-contract.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### platform.admin-copilot - Ask an operations copilot grounded questions about the platform

Status: not-release-verified. Historical prerelease entry: yes.

Gap: scripted HTTPS fixture and API configuration prerequisite.

### platform.airgapped-install - Install offline from verified bundle artifacts (air-gapped)

Status: not-release-verified. Historical prerelease entry: no.

Gap: disconnected runtime prerequisite.

### platform.api-reference - Serve machine-readable OpenAPI and offline interactive reference

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 58eb731296e2936259c4ad6cd70bd361eb3654f9e065ef1b200db3325cb93f00

Registered scope: api:api-reference-openapi-schema.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### platform.app-generation-path - Generate, develop, and deploy an application with kz-ext and the SDK runtime contract

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-21T08:12:43.278696+00:00. Source basis: operator-asserted.

Stamp: 18ee9e8d0a676af63e500c9f0e8f272b66a40f7b6ec061dc62f31378a1047a18

Registered scope: sdk:generated-app-online-path-134-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Scaffold and validate an app, serve backend/frontend locally, build/push/deploy through kz-ext, read remote readiness and app content, remove deployment and local fixture.
- App scaffold on ARM64 only; not tool/service generation, production registry configuration, tenant isolation or every runtime-library contract.
- Disposable loopback registry with normal Kubernetes port forwards; no third-party registry credentials or global TLS changes.
- Online test configuration: extension offline relocation disabled on owned clone during replay and restored afterward. The retained offline-mirror attempt produced invalid custom image names; this pass does not resolve that behavior.

### platform.greymatter-mesh-integration - Run Kamiwaza inside a customer-operated Grey Matter service mesh

Status: not-release-verified. Historical prerelease entry: no.

Gap: mesh target prerequisite.

### platform.kubernetes-install - Install Kamiwaza on supported platforms, including multi-node clusters

Status: not-release-verified. Historical prerelease entry: no.

Gap: supported architecture prerequisite.

### platform.licensing-and-eula - Validate signed license files and surface commercial-term status

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T05:05:10.891910+00:00. Source basis: operator-asserted.

Stamp: e1c71f7f7e7e9cb91b2405ee41146399d17914f2d32edd93d95b7b4cbece7f34

Registered scope: sdk:license-live-signature-refusal-bounded-134.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Validate the deployed startup gate with the real signed license and a signature-corrupted copy, observe actual Ray Serve health refusal, restore the exact license and verify healthy API responses and license status headers. The signature control preserves file formatting and the HTTPS endpoint must refuse requests during the live failure.
- Startup validation calls the deployed compiled gate in a fresh process; it does not perform a whole installer or scheduler restart.
- Expiry/freshness boundaries, expired commercial-term UI banners, EULA chart guard and multi-machine limits are not exercised. A valid license state and expiry header are checked; normal TLS stays enabled.

### platform.news-feed - Display configured vendor news with offline fallback

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: f8352ac27d29bf56f2fd90a6f7693ba3a0d15f679abe4426c2f449dde02ab5d5

Registered scope: api:news-feed-quadrants-and-latest.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### platform.observability - Observe the platform: log viewer, service logs, OpenTelemetry

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T22:40:45.374286+00:00. Source basis: operator-asserted.

Stamp: 3713dfae4097832529ad7b79465526dd8fe6d3be8490bf857d27ceb6faa65e66

Registered scope: sdk:platform-resource-counts-134-scoped-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Authenticated resource-count snapshots track one owned undeployed connector registration and return to baseline after cleanup.
- API resource-count journey only; not service health.
- Logs, OTLP delivery, failed-probe recovery, retention and volume are unverified.
- Compute, provider, model and app counts lack independent corroboration.
- The broader observability scenario retains its skipped required operations and failed evidence; this journey does not resolve it.
- Core retains a deleted connector-type tombstone; no connector workload was deployed.
- This registered replay selection replaces the earlier broad readiness mapping; it does not erase its retained failed record or establish whole-observability coverage.

### platform.operations-and-notifications - Read persistent per-user operations and notification feeds

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:44:48.756991+00:00. Source basis: operator-asserted.

Stamp: 3b81f9c8b7050e7740b88d1c4463ead84343476ebdcde3649f24ad27bb13dd5a

Registered scope: api:operations-tray-and-notification-lookup.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### platform.tenant-namespace-install - Install Kamiwaza with Helm into a namespace of a customer-owned Kubernetes cluster (reference target Red Hat OpenShift)

Status: not-release-verified. Historical prerelease entry: no.

Gap: qualified tenant target prerequisite.

### platform.usage-and-audit - Record and query user activity and audit events

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T00:28:16.624834+00:00. Source basis: operator-asserted.

Stamp: 806f30a9c6cc526cb62cc856a117b7069f6bc381ad8f05fd18f2fccb9bdb1748

Registered scope: sdk:attributable-activity-and-decision-export.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### retrieval.async-retrieval-jobs - Run asynchronous retrieval jobs with streaming results

Status: accepted-scoped-release. Historical prerelease entry: no.

Recorded completion: 2026-10-20T16:57:31.065376+00:00. Source basis: operator-asserted.

Stamp: 294d75d76f42a4e0215aed67c6073eecb63ebb715c0fc6af094f034ac0bc33b9

Registered scope: sdk:multi-source-inline-and-sse-retrieval, sdk:catalog-inline-and-flight-current.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- The two native tests use independent owned datasets; no same-dataset or cross-test identifier chain is asserted.
- The emitter records their common batch time window. Original times and individual durations remain unchanged; no per-test timing was invented.
- This SDK-only scope excludes full Analyst VS2, every catalog operation, authorization permutations, scale and transport performance.
- The separate scheduled-ingest status failure remains unresolved; this proof covers completed retrieval jobs, not scheduled ingestion.
- No human release sign-off or fresh release stamp is created by this retained recipe proof.

### security.consent-and-banners - Configure consent gates and classification banners across every surface

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-21T04:22:39.394451+00:00. Source basis: operator-asserted.

Stamp: 6b19bdbd961c902f8c9e8834970d8a28840fc979e2e7389f71104a72ddd28e70

Registered scope: sdk:security-display-api-chrome-134-canonical-v2.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- Verified journey: Read and update admin configuration, read public configuration, explicitly accept consent and serve/use the real embed script; verify real Chrome legacy pre-login and embedded gates, banners, sessions and controlled embed transport failures.
- API and deployed legacy pre-login/embedded flows are exercised. Audit durability/client identity, rate-limit thresholds, concurrent administration, resource-marking integration and authenticated frontend remain unverified.

### skills.skills-library - Curate and share reusable agent skills in a platform skills library

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T15:56:40.870679+00:00. Source basis: operator-asserted.

Stamp: 97df7da9b2a6bbc25f017b8494a48a72cb3ec3f8eda42714edef843329783f7b

Registered scope: sdk:skills-library-reader-visibility-and-multi-export.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

### tools.mcp-tool-shed - Deploy and manage MCP tools from the Tool Shed

Status: accepted-scoped-release. Historical prerelease entry: yes.

Recorded completion: 2026-10-20T20:05:58.205728+00:00. Source basis: operator-asserted.

Stamp: d9f7d0a5a9418f233ddadde52ef5c4c9e1e9b5ba78936e5fad196dba2a8082d4

Registered scope: sdk:tool-shed-deploy-mcp-protocol-handshake-discovery-and-stop.

Recorded assumptions:

- None recorded; the general scoped-evidence limits still apply.

Recorded limits:

- None recorded; the general scoped-evidence limits still apply.

## Preserved historical prerelease ledger

These 58 entries come from the retained October 14 reconciliation ledger. Its target was 1.4.0, with earlier origin cycles retained where present. This is historical evidence, not fresh 1.3.4 release execution, and it does not establish support for a retired workflow. The original source ledger is retained unchanged in the canonical kit.

### apps.app-garden

Deploy curated applications from the App Garden. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The carried 1.3.0 deploy, stop and reserved-key results still hold for 1.4.0; they were not re-run.
- The manual checks are the observer's report; execution start, finish, browser, build and image identity are unknown and are not inferred from report times.

Historical limits:

- Manual evidence covers browse and read of existing state only. No catalog refresh, deploy, image pull, stop, purge, ephemeral purge, reserved-key drop or cleanup was performed or reported.
- The deployment identifier and route for the status check were not recorded.
- No fresh canonical scenario record, no release stamp.

### apps.deployment-baseline

Verify and retain the shipped app baseline a deployment was built from. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The running Core version is faked: get_kamiwaza_version is patched to 1.3.1 (1.4.0 in the transition and unconstrained-row tests). No 1.3.0 Core process reported its own version.
- In-memory SQLite stands in for the production PostgreSQL catalog for retention, nested-transaction rollback and immutability; the PostgreSQL advisory-lock branch was not executed.
- The observed release/1.3.0 commit is what ships as 1.3.0; no release tag, image digest or deployed build was bound.
- A deployed 1.3.0 Core receives KAMIWAZA_EXTENSION_BASELINE_PATH and KAMIWAZA_EXTENSION_BASELINE_SHA256 from its chart and runs the reviewed bootstrap path at startup; chart wiring and the mounted file were not exercised.

Historical limits:

- Local unit and source basis only; no live claim. No deployed Core, HTTP route, chart, image, PostgreSQL or network was exercised.
- The kit emits no scenario-evidence record and cannot by itself produce a release stamp. Pre-release assessment for 1.3.0 only; not release verified.
- Tests ran in an existing Core development virtualenv (Python 3.12.13), not a release image dependency set.
- Assessed by an AI validator reporting to the Kit manager. Not a human release sign-off and not an assertion by the cycle owner.
- Baseline files are temporary fakes with synthetic rows; the packaged 1.3.0 baseline and its SHA256 were not loaded.
- The live probe shipped-baseline-verified-and-retained (probes/api-arm-batch3-core.yaml) was not run and is not part of this kit.
- As authored: covers the baseline a deployment was built from, not a deployment change history or rollback.

### apps.release-digest-pinning

Require digest-pinned images on newly published app releases. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The running Core version is faked: get_kamiwaza_version is patched to 1.3.1 (1.4.0 in the transition and unconstrained-row tests). No 1.3.0 Core process reported its own version.
- In-memory SQLite stands in for the production PostgreSQL catalog for retention, nested-transaction rollback and immutability; the PostgreSQL advisory-lock branch was not executed.
- The observed release/1.3.0 commit is what ships as 1.3.0; no release tag, image digest or deployed build was bound.
- A deployed 1.3.0 Core reads KAMIWAZA_EXTENSION_REQUIRE_DIGEST_PINS from its environment and routes real publication listings and imports through retain_release / merge_availability as the reviewed source does; no operator set the flag on a deployment.

Historical limits:

- Local unit and source basis only; no live claim. No deployed Core, HTTP route, chart, image, PostgreSQL or network was exercised.
- The kit emits no scenario-evidence record and cannot by itself produce a release stamp. Pre-release assessment for 1.3.0 only; not release verified.
- Tests ran in an existing Core development virtualenv (Python 3.12.13), not a release image dependency set.
- Assessed by an AI validator reporting to the Kit manager. Not a human release sign-off and not an assertion by the cycle owner.
- The refusal was exercised at retain_release and merge_availability, not through an HTTP publish request or a real publication listing.
- Reporting whether the requirement is enabled is the in-process digest_pins_required() result plus a one-time warning for an unrecognized value; no operator-facing status endpoint was observed or exercised.
- As authored: pinning only. No rollback or mixed-fleet behavior is assessed, and the shipped baseline and already-retained releases are exempt.

### auth.enterprise-sso

Sign in through enterprise identity: SAML/OIDC brokering, CAC/PKI, sessions. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### auth.local-user-administration

Administer local user accounts. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### auth.personal-access-tokens

Authenticate automation with personal access tokens. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### auth.session-revocation

End sessions by logout and remove tracked sessions as an administrator. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### authz.rebac-access-control

Govern access with relationship-based access control and attribute gates. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### catalog.dataset-registry

Register and search datasets and containers in the data catalog. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Curated source and existing reusable SDK kits remain the basis for alternate catalog backends, independent per-caller ReBAC filtering and other declared addressing styles; those paths were not executed here.

Historical limits:

- Existing admin in two owned selected rooms; no independent-user or tenant isolation or ReBAC on/off claim.
- Query-parameter API addressing only; no UI, SDK, federation, publisher, secret, connector, or attribute-gate execution.
- Synthetic metadata and schema only; no source-data ingestion, physical-data-purge or alternate-backend certification.

### catalog.registered-sources

Register S3 and PostgreSQL sources, then scan into the governed catalog. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### catalog.secrets-management

Store connector and service credentials as governed catalog secrets. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### catalog.writable-datasets

Manage file content inside platform-managed datasets. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### connectors.ai-assisted-connector-setup

Model-assisted connector setup and repair. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The selected platform/gateway model returns a parseable proposal in the OpenAI chat-completions shape; call_model_chat was replaced by a canned answer and no model was contacted.
- Model resolution and verified platform access succeed (both patched out in every test).
- Live preview of the target API and runtime deploy/preview behave as their fakes do (run_live_project_preview, api_deploy_project, api_preview_runtime_connector all patched); no target API or credentials were used.

Historical limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Re-executed by an automated analyst on 2026-10-06 from a private byte-identical copy of the release/1.3.0 @969539e source archive (plain directory, no git metadata); the commit is as recorded by analyst-F sources.json.
- Proves the setup/repair orchestration, bounds, rollback and revision checks; does not prove any real API can be set up or repaired.
- Condition "requires a platform-served or configured gateway model plus credentials" is unexecuted.
- "Without saving" and the setup success path over REST rest on one F2-authored test file (test_f2_cb_setup_plan.py sha256 97e240dbd34a0ce8d0a227454dd2b489a697b7162a5a745c4bece72eadf9bb5f), not yet in the product repo.
- Isolation is a test-harness pytest plugin (f2_isolation.py sha256 3fdee365f485e93ce29e6e8c97c1f6b57550763b00c7e11a992c09db74f70eda) that sets CONNECTOR_BUILDER_ARTIFACT_DIR before import and blocks writes under the shared connector-builder temporary directory with an audit hook; product source is unchanged and still defaults to the shared directory when run without it.
- Cleanup verified for this rerun: shared path inventory (55804 entries) identical before/after, guard log holds only its self-check, owned run dir removed. Residue from the original F2 run remains in the shared directory, untouched, as a separate incident.
- Guard covers Python-level file operations in the pytest process only (not subprocesses or C extensions); none of the selected tests spawn either as far as the unchanged inventory shows.
- Tested source is release/1.3.0 @969539e; the contract was read at b6dc4da.

### connectors.connector-builder

Build and deploy data connectors from API descriptions. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### connectors.managed-data-sources

Configure and manage governed data-source connectors. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: on a cluster a created connector moves not_deployed to deploying to ready on its own. Only the scheduling of the background deploy and the derivation of each status label from a supplied workload state ran.
- ASSUMED, not executed: verify performs a real read through the platform proxy against a deployed connector. Probe results were supplied by the tests; classification and persistence ran on them.
- ASSUMED, not executed: forwarded-auth headers or Keycloak tokens resolve to the roles the admin gate checks. The real dependency ran on its auth-disabled branch with an injected identity; in an isolated app the full resolver answers 401 forward_auth_secret_missing or 500 Auth not initialized, and no secret was configured to go further.
- ASSUMED, not executed: the planned SDK arm (register_type, create, list catalog, list available, clean up) works against a platform. SDK request shaping and the routes were tested separately, each against a fake of the other.
- ASSUMED, not executed: create persists encrypted configuration in PostgreSQL end to end. Encryption unit tests, service tests on mock sessions and the response builder ran.
- ASSUMED, not executed: the hosted HTTPS catalog fetch and the GET {endpoint}/manifest call to a running connector behave as their faked HTTP responses.
- ASSUMED: the source curator accepts that the changed deploy catalog (image digest and tag, revision, version only) does not alter this record's claims.

Historical limits:

- Local in-process execution in an empty network namespace on reviewer-owned git-archive exports; no deployed platform, cluster, PostgreSQL, admin or analyst UI, browser, identity provider or connector workload. Not runtime verified, not release verified; no release stamp.
- Source: kamiwaza release/1.3.0 at 6ebae9a (local origin ref, no fetch); the author tested af6f4bf, 32 commits earlier, and the connectors service, OAuth broker and their unit tests are identical between the two. Against the record pin f991d3e the connectors service and oauth_broker/api/tokens.py are unchanged; only oauth_broker/api/proxy.py, exceptions.py and proxy/service.py differ, none cited by the record.
- Deploy catalog: commit 77face0 is in no local clone and nothing was fetched; connectors.json (sha256 5c4e344c...) and values.yaml (a2fbc839...) come from the kit-release-validation-20261005 copy, the same content the author used. Reviewer diff against the record pin 98bf315 (local): only deployment image digest and tag, revision and version changed for m365 and google (catalog-drift.json).
- The cycle marks this record's source curation re-review-required (changed_source_review_required). The reviewer's catalog diff is input to that review, not the curator's acceptance.
- The author (connector-guarantee-resume) reported both capabilities as partial and proposed no packet. This packet is the reviewer's, on the author's tests rerun unchanged plus reviewer tests.
- Test runs pass --no-cov. Two earlier reviewer runs (rv-01, rv-01b) timed out with all 47 tests already passed, while the repository's default XML coverage report was being written; one run (rv-02) stopped on a truncated node ID in the author's list (test_classify_failure_kind[403-access); the first reviewer stitched run (rv-05) failed 2 of 14 on harness setup (no platform external URL; string UUIDs on sqlite). All four logs are kept.
- Admin UI (Settings, Data Connectors) not exercised.
- Record corrections for the curator, from the author and confirmed by the reviewer where checked: the body says ConnectorsService but the class is ConnectorService; list_catalog exists at SDK c08b707 but not at the record pin 971ed14; the route citation omits POST /connectors/subscriptions and POST /connectors/{id}/deploy; the release catalog carries develop for image_tag and revision (images digest-pinned).

### connectors.oauth-tool-policies

Per-tool OAuth operation policies. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### connectors.user-oauth-authorization

Authorize personal data-source access with OAuth/OIDC brokering. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed and not permitted in this run: Microsoft identity platform and Google accept the authorization, device-authorization, token and refresh requests the platform builds from the release catalog manifests, and answer in the shape the fakes return.
- ASSUMED, not executed: the browser popup behaves as its HTML implies (posts to the opener, closes) and the UI drives these routes. The planned UI arm, data-connectors/J02 SC-02, SC-03 and SC-04, did not run.
- ASSUMED, not executed: the catalog secret store persists and protects the token payload. A fake store recorded the name, owner and payload.
- ASSUMED, not executed: PostgreSQL stores these rows as sqlite did. The harness coerces string UUIDs before binding, which PostgreSQL accepts natively.
- ASSUMED, not executed: verify performs a real read through a deployed connector with the caller's token; probe results were supplied by the tests.
- ASSUMED, not executed: a broker mint releases a real provider access token to a real workload, refreshes it against the provider, and lease revocation reaches the provider. The record itself limits provider-side revocation.
- ASSUMED, not executed: platform authentication resolves the calling user; the caller identity was injected.
- ASSUMED: the source curator accepts that the changed deploy catalog leaves auth_model.kind, OAuth flow, endpoints and scopes for m365 and google unchanged, as the reviewer's diff shows.

Historical limits:

- Local in-process execution in an empty network namespace on reviewer-owned git-archive exports; no deployed platform, cluster, PostgreSQL, admin or analyst UI, browser, identity provider or connector workload. Not runtime verified, not release verified; no release stamp.
- Source: kamiwaza release/1.3.0 at 6ebae9a (local origin ref, no fetch); the author tested af6f4bf, 32 commits earlier, and the connectors service, OAuth broker and their unit tests are identical between the two. Against the record pin f991d3e the connectors service and oauth_broker/api/tokens.py are unchanged; only oauth_broker/api/proxy.py, exceptions.py and proxy/service.py differ, none cited by the record.
- Deploy catalog: commit 77face0 is in no local clone and nothing was fetched; connectors.json (sha256 5c4e344c...) and values.yaml (a2fbc839...) come from the kit-release-validation-20261005 copy, the same content the author used. Reviewer diff against the record pin 98bf315 (local): only deployment image digest and tag, revision and version changed for m365 and google (catalog-drift.json).
- The cycle marks this record's source curation re-review-required (changed_source_review_required). The reviewer's catalog diff is input to that review, not the curator's acceptance.
- The author (connector-guarantee-resume) reported both capabilities as partial and proposed no packet. This packet is the reviewer's, on the author's tests rerun unchanged plus reviewer tests.
- Test runs pass --no-cov. Two earlier reviewer runs (rv-01, rv-01b) timed out with all 47 tests already passed, while the repository's default XML coverage report was being written; one run (rv-02) stopped on a truncated node ID in the author's list (test_classify_failure_kind[403-access); the first reviewer stitched run (rv-05) failed 2 of 14 on harness setup (no platform external URL; string UUIDs on sqlite). All four logs are kept.
- In the stitched tests the Connector row, config decryption, account-email lookup, lease revocation call and token-secret deletion are fakes at the edge of connect.py; broker lease revocation itself is covered separately by shipped tests on mocks.
- M365 manifest scopes are read-write (Files.ReadWrite.All, Mail.ReadWrite and others); the record claims read-only only for Google.
- Depends on connectors.managed-data-sources, accepted in this same packet on the same kind of evidence.

### context.dataset-indexing

Bind a catalog dataset to a searchable semantic/lexical index. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### context.workroom-raw-file-store

Store, list, read and update workroom raw files. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Existing curated source and reusable SDK producer remain the basis for independent reader/nonmember permission enforcement and decoded-size boundary behavior; those conditions were not executed here and are not claimed as live observations.
- GET metadata and server-reported checksum/size are the observed read scope; exact downloaded object bytes remain untested.

Historical limits:

- Authenticated existing admin in two new owned rooms only; no independent user or tenant isolation verdict.
- No at-cap/over-cap run, direct object download, marking-enforcement proof or physical object-purge observation.
- No canonical scenario-evidence record or release stamp emitted. Original failed setup receipt preserved.
- Reusable SDK kit is registered for later execution; this assessment did not run that kit.

### delegation.run-claims-lifecycle

Track delegated work as claimed runs with explicit, recorded state transitions. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- Route layer and service layer behave the same when joined: every route test uses a recording fake execution API and a fake authenticator, every service test calls the real service directly; no test drives HTTP through to the real service.
- Postgres transaction, locking and lease behaviour matches the sqlite tmp database used by the service tests.
- The claiming workload is really attested and holds capability material (precondition); route tests use a fake authenticator and attestation is evidenced under delegation.workload-identity-and-attestation, not here.
- The SDK clients work against a real Core; SDK tests use StubSession/StubResponse recorded HTTP and no server.
- The delegated-workloads router is mounted and the runtime is built in a real install (keys, issuer, return prefix); not exercised.
- The SDK journey evidence depends on a patched test harness that is not merged and not in any release (kamiwaza-sdk PR499 commit 2732f8f6b8dd2266bd09888b2f40dbe276b2a1ab, draft). Unmodified release c08b707 still ships the stale harness and its journey test fails as shipped; release SDK and Core product source are unmodified.
- Core's requirement for the workload assertion on effect reservation is taken from reading Core af6f4bf source; no Core process was run against the SDK. The journey harness is an in-process stub session, so the absent and wrong-workload deny controls show the patched harness refusing (a test-harness AssertionError), not Core returning a denial.
- Stub authentication throughout: no real DPoP proof verification, capability verification, replay protection, attestation or TokenReview API. The offline and TokenReview journey variants differ only in SDK-side profile selection.

Historical limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Unexecuted conditions: not_supported statements (federation, input-required state, dashboard/stream, not a scheduler) are absence claims; only RunStatus closure is asserted.
- Heartbeat expiry detection is asserted; no failover or recovery claim is made or evidenced, matching the contract.
- Tested source is kamiwaza release/1.3.0 @af6f4bf and kamiwaza-sdk @c08b707; the contract was read at f991d3e (core) and 971ed14 (sdk). The packet source field carries the core commit only.
- F1 cites test_run_claim_concurrency.py as 19 tests; the file defines 18 and the receipt shows 18 PASSED. Citation miscount only; the receipt total (198 passed) is unaffected.
- Cleanup caveat: cache/garden/72428a62dba7/connectors.json appeared in the shared source export at 04:30:39Z while receipt --1 was running. Origin not attributed (export shared with sibling workers) and it was left in place. The kit therefore requires a task-owned source copy.
- No live TokenReview, DPoP, Core or deployment claim. Not executed live, not release verified, no release stamp.
- This reviewer re-ran only the SDK delegated_workloads suites (before and after the patch). The 198 Core tests were not re-run; their F1 receipt was re-hashed and re-read.
- The corrected journey exercises reserve, claim, transitions (start/finish), run read and effect reservation through the SDK. Cancellation and run-capability resolution (successor) are evidenced by the Core route and service tests only; the SDK executor client has no HTTP call for capability resolution.
- Release replay: the SDK journey is reproducible only with PR499 applied. Replayed on unmodified c08b707 it fails on the stale harness line. The two F1 kits do not include the journey and are unaffected.
- The original failure receipts under analyst-g/ and the held validate-f1 packet are retained unmodified; this packet supersedes the proposal by later assessed_at and does not erase them.
- F1's SDK receipt was a -q summary; the reviewer's verbose re-run shows per-test PASSED lines for the five cited SDK contract tests.

### ingestion.document-translation

Translate parsed documents through OmniParse. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- A configured OpenAI-compatible translation endpoint returns translated text in choices[0].message.content; no translation model was called (TranslationAdapter replaced, canned "hola mundo").
- The request the adapter sends (model name, prompt, target/source language) is acceptable to that endpoint; adapter tests assert only the Authorization / forwarded headers against a fake HTTP client.
- Parsed Markdown export is available for the document (get_export stubbed; Docling not run).
- Kamiwaza auth on the routes works as elsewhere (tests ran with KAMIWAZA_USE_AUTH=false).

Historical limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Reviewer re-read receipts, tests and source; reviewer did not re-execute any test.
- No statement about translation quality, language coverage or source-language auto-detection.
- List and retrieve over REST rest on one test authored by F2 (new-tests/test_f2_translation_rest.py), not yet in the product repo.
- Receipts --1 and --2 are preserved environment failures of the first venv (missing kamiwaza_extensions_lib, pytest-asyncio); --3 and --4-new are the evidence. Interpreter was the sibling checkout venv, source verified from the exported tree.
- Tested source is release/1.3.0 @0cf063a; the contract was read at ac1b245. App Garden deployed instance not exercised.

### ingestion.parse-from-url

Parse a document fetched from a public URL. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: a deployed 1.3.0 OmniParse image is built from this commit and behaves the same.
- ASSUMED: real public DNS and outbound egress from the OmniParse container work; here DNS answers were faked and the TCP connection to the validated public IP was redirected to an owned loopback fixture server.
- ASSUMED: HTTPS fetch with TLS verification behaves as the http path does; only http was executed end to end (TLS name pinning is asserted only by a shipped test with a faked transport).
- ASSUMED: Kamiwaza authentication in front of the routes works; tests ran with KAMIWAZA_USE_AUTH=false.
- ASSUMED: document types other than HTML (PDF, DOCX, PPTX, images) convert after a URL fetch as they do for uploads; only an HTML fixture went through real Docling.

Historical limits:

- Local in-process execution with owned loopback fixtures only; no deployed 1.3.0 runtime, image, endpoint or public URL was exercised. Not runtime verified, not release verified.
- Source is the release/1.3.0 commit exported by git archive on this host; image-to-source binding is not attested.
- URL_MAX_SIZE_MB and URL_MAX_REDIRECTS limits, content-type refusal and BLOCKED_DOMAINS are covered only by shipped tests that replace httpx.Client or the inner transport.
- Interpreter was the sibling kamiwaza-extensions-omniparse venv (Python 3.14.6, docling 2.94.0); the project venv has no docling.
- End-to-end evidence rests on a test written in this pass; an earlier run of it with auth left on (401s) is retained as a superseded receipt.
- Scope is exactly the 4 authored REST operations. Only plain http on port 80 through one same-address redirect hop with an HTML fixture was executed end to end; the redirect policy case executed end to end is refusal of a hop that resolves to a private address.
- MCP: the authored document states (as a condition, not an operation) that an MCP tool exists in a separately launched process independent of OMNIPARSE_MODE. Reviewer source comparison at 0cf063aa agrees: facades/mcp/server.py:444 defines tool parse_document_from_url (not literally the REST route name) calling the same service method as the REST route; its __main__ selects only on MCP_TRANSPORT; main.py create_app is the only OMNIPARSE_MODE reader and combined mode only advertises the MCP process; the image CMD starts the REST app only. The MCP tool was read, not executed, and is not part of this Tier 2 verdict.
- Source curation is separate and unchanged: the 1.3.0 cycle row still records tier1 not-established (reason: document said MCP runs only in combined mode). The document at kit bff2776 (changed in 77b0008) no longer says that and matches source, so the recorded mismatch no longer exists in the document, but the cycle row was not edited or re-adjudicated by this import.
- Reviewer reran the registered command (analyst test plus 4 shipped files, 121 cases, exit 0) on an independent git-archive export of 0cf063aa in a loopback-only network namespace; this is local contract evidence and not a runtime or release pass.

### ingestion.security-markings

Parse and apply source security markings during ingestion. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### ingestion.structured-document-outputs

Extract document tables, figures and chunks. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: a deployed 1.3.0 OmniParse image is built from this commit (or a later one containing 3c5b28f) and behaves the same.
- ASSUMED: documents converted by the PDF/layout pipeline yield tables and pictures with provenance that the same adapter mapping carries through. No PDF or other paginated document was converted by the author or the reviewer; only HTML went through real Docling.
- ASSUMED: Kamiwaza authentication in front of the routes works; every run had KAMIWAZA_USE_AUTH=false.
- ASSUMED: the local origin/release/1.3.0 ref (equal to origin/develop, as fetched by the author on 2026-10-06) is the 1.3.0 development line. 0cf063aa is not an ancestor of it (merge base f5296bfe).
- ASSUMED: commit 3c5b28f is the merge of OmniParse PR #151. The reviewer read this from the local commit subject and ancestry and did not query GitHub.

Historical limits:

- Local in-process execution with owned fixtures only; no deployed 1.3.0 runtime, image or endpoint was exercised. Not runtime verified, not release verified, no release stamp.
- figures: for a real HTML conversion the record carries identity only. The reviewer asserted this for both pictures: page is the default 1, bbox is {}, image_path is '' and meta is {}; the figcaption text does not appear in the record. Docling gives HTML pictures no provenance and no image (reviewer printed prov length 0 and image None for both). This proves one record per picture in document order, not populated figure metadata.
- tables: cell text and row/column structure are real conversion output; geometry is likewise the default (page 1, bbox {}) for HTML.
- Populated page, bbox and image path are shown only on hand-built real docling-core items, through the adapter and the service export, not over the REST route and not from a converted document.
- CSV table output was exercised only in the shipped contract test, not over REST.
- Extraction quality, format preservation, full Docling/layout JSON and annotated PDFs are outside the authored operations and were not asserted.
- This assessment is for 2ff1fb79 only. The failed finding for 0cf063aa stands (analyst H receipts h-new-structured-outputs-e2e.log sha256 4476be1ba54d3d8d9ab60937d011660201a72f349f87192a346bd18ccb2c6e00 and h-diag-docling-figure-shape.log sha256 04e4d9f7a5f89c0dda7d51fe854e2745cb3f15c0cb364b841f4932ddda6e9401, both re-hashed by the reviewer) and is reproduced by the reviewer.
- The 1.3.0 cycle records source curation tier1 not-established for this capability, citing this adapter mapping; that row already names docling_adapter.py at 2ff1fb79 with the sha256 the reviewer measured. The row was not re-adjudicated.
- Source is a git archive from local objects on this host; image-to-source binding is not attested.
- Interpreter was the existing kamiwaza-extensions-omniparse venv; nothing was installed.
- The author's REST figures assertion is only 'at least 1'; the exact-count and empty-field assertions are the reviewer's. The reviewer's test is reviewer-authored and has not itself been independently reviewed.
- The kit id is the one the author proposed, but the registration here is the reviewer's (reviewer test added, reviewer and author receipts).

### kaizen.admin-settings-console

Admin settings console. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.agent-auto-routing

Automatic specialist help in chat, with member pin and exclude policy. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- Postgres persistence of the routing policy and sub-agent selection behaves like the in-memory repository / fake session used; the one real-Postgres round-trip test was skipped (Docker made unreachable).
- The serving agent runtime honours the grant it is handed; no agent runtime or model ran and no specialist was actually consulted.
- Member authentication behaves like the test-client principal.
- AGENT_ROUTING_ENABLED ships True (read at config.py, not asserted by a selected test).

Historical limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Reviewer re-read receipts, tests and source; reviewer did not re-execute any test.
- Grant is asserted at decision level (_resolve_auto_delegation, _resolve_pinned_delegation, resolve_durable_chat_route) and as a kwarg threaded into a stubbed orchestration stream; not through a real chat turn or the chat.agent.routed audit record.
- Not covered: admin live toggle, routing-policy route 404 when disabled, Default-consult ignoring exclusions, web UI Use/Assist (vitest not run; contract surface includes UI:analyst).
- Tested source is release/1.3.0 @29c742f; the contract was read at 260e50d.

### kaizen.agent-publication-approval

Admin approval for member-proposed agents and packages. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.answer-feedback

Rate chat answers with thumbs up or down. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.artifacts

Versioned artifacts. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.context-compression

Member chat compression controls. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.conversation-search

Conversation and content search. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The carried 1.3.0 search contract probe result still holds for 1.4.0; it was not re-run.
- The manual checks are the observer's report; execution time, browser, build, conversation identifiers and the search phrase for check 3 are unknown.

Historical limits:

- The observed app's family, version and deployment binding are not recorded. The display name is not treated as proof of the declared primary Kaizen (Tomo) and is not mapped to Kaizen Legacy.
- No authorization control was observed: the no-match and filter checks do not show that another owner's non-shared conversation is hidden from query, filter or direct open.
- No fresh canonical scenario record, no release stamp.

### kaizen.custom-agents

Create and configure custom agents in Kaizen. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- Each operation passed locally at the named source revisions; it is ASSUMED, not executed, that the kaizen-legacy 2.1.4 images the catalog pins by digest under revision 'develop' were built from 82a7bb3c and behave the same on a Kamiwaza 1.3.0 deployment.
- Gateway ForwardAuth supplies the caller's user, workroom id and workroom role truthfully (x-user-workroom-id / x-user-workroom-role as read by the in-tree kamiwaza_auth). require_auth was replaced by an explicit fake identity in every run; token validation, header signing and how a real PAT maps to a workroom role were not exercised.
- The Skills Library answers the skill lookup with the payload shape and 'status' field used by the in-test dict, and reports only genuinely published skills as published. The library service (skills.skills-library, Gage-owned source) was not run or modified; that capability is evidenced separately.
- Postgres behaves like SQLite for these statements. JSONB was compiled as JSON, and SELECT ... FOR UPDATE is not emitted by SQLite, so row locking was not exercised; it is assumed that concurrent attaches of the same skill are serialised by that lock in production.
- Through the deployed ingress the SDK's slashless GET api/agents reaches the list route with the workroom header intact (locally the app answered it directly or via a same-origin redirect). The SDK comment that slashless POSTs lose the workroom binding at ingress was not tested.
- The executed kamiwaza-sdk files (services/kaizen.py, client.py, authentication.py, schemas/kaizen.py, services/base_service.py) are the 1.3.0 SDK: they are byte-identical between 6e987067 and local origin/release/1.3.0 (c08b7071), checked by git diff without fetching.

Historical limits:

- Local execution with fakes in a loopback-only network namespace; no deployed Kaizen Legacy, gateway, identity provider, Postgres, Skills Library or model endpoint. Not runtime verified, not release verified; no release stamp.
- Source scope is developer-named 1.3: kamiwaza-extensions-kaizen has no release branch in the local clone; 82a7bb3c is on origin/develop and declares kamiwaza_version >=1.3.0. The deploy catalog was read at aa51ca9a on deploy origin/develop; no local deploy release/1.3.0 ref exists to compare. Image-to-source binding is not attested (the kit plan's stated prerequisite).
- UI surface not executed: the agent wizard and the user-guide workflow were matched by source read only (headings and step titles). The user guide does not name which Kaizen it describes.
- Optional create fields llm_api_key and mcp_headers were never supplied (only the absence of stored secrets was asserted); description was not asserted. Secret encryption used an ephemeral test-only Fernet key.
- Concurrency, row locking, asyncpg and connection pooling were not exercised (sync SQLite session behind a thin async adapter). Application lifespan/startup was not run.
- The `kaizen` sandbox-runtime package is replaced by the repository's own tests/_stubs/kaizen; it is imported by conversation code, not by the three routes.
- Run-time agent behaviour (how instructions, the model and a bound skill are used), create_canonical and the app named `kaizen`, execution placement, publication approval and remote delegation are not claimed, as authored. The bounded text search for skill-bindings in kamiwaza-extensions-tomo was not repeated.
- The SDK-path evidence (rv-02) is reviewer-authored and has not itself been independently reviewed. The author's packet (finalised during this review; same verdict, source commit, passing receipt and test-file hash as used here) leaves the SDK seam as an assumption: it reuses by hash analyst I's SDK request-shape tests against a stub session and 24 shipped Legacy unit cases. Those reused analyst-I receipts are not relied on in this acceptance and were not rerun; of the 21 hashed entries in the author's receipts-index.json the reviewer re-hashed 21 as matching, 0 mismatching, 0 not resolvable to a file from here.
- Retained failed attempts, none erased: author ca-routes-1 (exit 2, collection: `kaizen` runtime package absent; corrected by appending the repo's tests/_stubs), ca-routes-2 (exit 1, 18 errors: async fixtures without an asyncio mode; corrected with -o asyncio_mode=auto), ca-routes-3 (exit 1, 4 bind tests: the product answered 400 Invalid skill ID to the test's skill ids; corrected with UUID-shaped test ids). All three are harness/fixture defects; the corrective executions for the same file are ca-routes-4 (author) and rv-01 (reviewer). Only the final test file is preserved; the earlier revisions used by ca-routes-1..3 and the author's mutant copy (described in outcome-matrix.json, no diff kept) were not retained, so those corrections are read from the logs and the author's statement. The author's two failed validate-project attempts (wrong --cycle argument) are retained in the author's folder.
- Reviewer receipt rv-03 (exit 0, 23 passed) is NOT a negative control: the mutation script aborted before writing, so it ran on an unmutated copy. It is retained with its empty diff; rv-04 is the corrected run.
- The cycle inventory title for this row still reads 'in Kaizen' rather than 'in Kaizen Legacy'; not changed here.
- An earlier reviewer packet, written while the author's result.json was still empty, is retained under superseded/ with its intake id bcbc97e6...; it differs only in kit ids, the two limits above and the timestamp. The private kit copy was rebuilt from bff2776 so that only this packet is imported.

### kaizen.document-canvas-export

Open documents in an editable canvas; export to Word or PDF through the API. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.document-collections

Document collections / working sets. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.metrics-dashboard

Primary Kaizen administrator metrics and usage. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.multi-agent-orchestration

Governed multi-agent delegation. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.notifications-inbox

Durable notification inbox. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.platform-operator-tools

Governed platform inspection and demo actions. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: a deployed 1.3.0 Kaizen build is built from this commit and behaves the same.
- ASSUMED: the real Kamiwaza SDK and platform behave as the shipped fake client does. Every inspect, preview and apply call ended at that fake; no SDK request was sent.
- ASSUMED: in a real chat turn the runtime sets the confirmation mark only from the member's resolved approval mode. The tool tests set the mark by hand. The shipped unit tests of the runtime projection (test_pi_tool_execution.py, including the Never ask case) pass at this commit in the reviewer's run, but they use fakes and no chat turn was driven.
- ASSUMED: an agent granted these tools (such as Demo Builder) and a member turn carrying the forwarded platform identity exist in the deployment.

Historical limits:

- Local in-process execution with isolated fake fixtures in a loopback-only network namespace; no deployed 1.3.0 runtime, image, endpoint, model or member session was exercised. Not runtime verified, not release verified.
- The Kamiwaza platform is a fake client: no platform resource was inspected or changed. The verdict covers the tools' own contract, not a platform effect.
- The document's evidence plan (a chat turn through send_input_canonical and stream_events_canonical) and the approval card UI were not exercised.
- Apply was committed end to end only for the catalog dataset action. The other demo actions (workroom, catalog extension, model download, model deployment, agent) were not each applied end to end in the runs reviewed.
- Generic Core/MCP exact-tool opt-in and empty-allowlist fail-closed were not separately mapped beyond the shipped grant and ceiling tests.
- Five conditions (not_required receipt, schema rejection of an unbound apply, apply-only confirmation, approval_unavailable on apply, requester refusal) rest on tests written in the analyst pass.
- Source is the release/1.3.0 commit exported by git archive; image-to-source binding is not attested. The document pins 13c72eb1: four cited files (kamiwaza_sdk_tools.py, kamiwaza_sdk_contract.py, approval_permissions.py, protocol.py) are identical at 29c742f7, while config.py differs and its two cited lines sit at 1178 and 1706 instead of 1177 and 1702 with the same defaults.
- One earlier analyst run (pot-01, exit 2) failed at collection because the tokenizer cache was unreachable offline. It is retained and was corrected by supplying a local cache, not by changing a test.
- Source curation is separate and unchanged: the 1.3.0 cycle row still records tier1 not-established (reason: the earlier unqualified confirmation requirement omitted the never_ask default). The document at kit bff2776 now states that policy and matches the source read here, but the cycle row was not edited or re-adjudicated by this import.
- Reviewer rerun is local contract evidence on the reviewer's own export, not a runtime or release pass.

### kaizen.privacy-guard

Warn about or redact sensitive text before a chat message is sent. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: real authentication. Tests inject a fake owner identity (example.invalid) by overriding require_auth, get_user_uuid and get_workroom_uuid; no token, header or Kamiwaza auth path ran.
- ASSUMED, not executed: live persistence. The DB session is a fake returning one in-memory conversation+agent row with a commit recorder; no SQL, scope filter or JSONB round-trip ran. Persistence across commit in a real database is assumed.
- ASSUMED, not executed: the agent create route stores the wizard's agent_context.privacy_filter unchanged; the wizard payload and the backend read agree on the key but the route between them did not run.
- ASSUMED, not executed: a real browser behaves as jsdom does, and the browser's API client reaches the settings routes as the mocked client is called.
- ASSUMED: Kaizen Legacy develop 82a7bb3c stands for the 1.3.0 project source (commit is on origin/develop and is the capability document pin). No release branch, image or deployment was inspected, and no image-to-source binding is claimed.

Historical limits:

- Project-scoped pre-release assessment for the named 1.3.0 cycle only. Not runtime verified, not release verified, no release stamp.
- Local in-process execution only: pytest ASGI TestClient and vitest jsdom. No deployed runtime, endpoint, image, browser or database was exercised; no end-to-end run joins browser, API and database.
- The capability document's evidence plan is ui (browser-driven). This assessment does not satisfy that plan; the kaizen-legacy browser producer is still missing.
- UI mode selection was exercised for warn only (settings panel and wizard); off and redact selection in the UI, and the wizard omitting the key for off, are not asserted. All three modes are asserted on the backend route.
- The chat page defaulting to warn while settings load or fail to load (page.tsx:486-488) is not asserted by any cited case.
- Shared-workroom role branches are out of scope: only the owner role and the non-owner refusal ran. Viewer, missing-role, auth-disabled and legacy-header branches did not run.
- Detection is the fixed regex list; coverage beyond the 8 library cases is not claimed. Attached images are not scanned.
- The backend stores and returns the mode and does not apply it to message text; a direct API client is not checked (read from source, not tested).
- A null mode in PATCH leaves an empty override so the agent default applies again (observed; not an authored operation).
- evidence_kits names a local kit that is proposed only (privacy-followup/proposed-kit-registrations.json); it is not registered in verification/evidence-kits/1.3.0.json, so the lifecycle view may show a mapping gap.
- The backend test file is analyst-authored for this assessment and is not in the product repository.
- Analyst I's earlier partial record (5 of 6) and its failed receipts privacy-1-frontend, privacy-2-frontend and legacy-1-backend-unit are retained unchanged; the first two failed on a read-only cache write (EROFS) with their tests passing, per analyst I's record.
- The 1.3.0 cycle records source_curation tier1 not-established for this capability (authored claim or condition mismatch recorded at the earlier pin f0fe4dcd). This assessment does not change or resolve that record.

### kaizen.product-identity

Tell the two Kaizen products apart under a shared catalog name. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.projects

Shared project workspaces. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.prompt-library-and-chains

Prompt library and multi-step workflows. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### kaizen.recipes

Save tool calls as recipes that agents can look up. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- ASSUMED, not executed: a deployed kaizen-legacy 2.1.4 build behaves the same.
- ASSUMED: the kaizen-legacy 2.1.4 image that the Kamiwaza 1.3.0 catalog pins by digest under revision label develop was built from this source commit; nothing read shows that binding.
- ASSUMED: the Search page's Save as Recipe button posts the extracted tool-call payload to the tested save route. The button was not clicked. Reviewer read only: the frontend client posts to /api/recipes/, where the route is mounted.
- ASSUMED: an agent in a chat turn calls the injected lookup tool and reaches the tested lookup route. The route was called directly with a hand-built conversation; the tool's client and executor were tested against a monkeypatched transport. Reviewer read only: the client's path and parameter names match the mounted route.
- ASSUMED: Postgres JSONB and ILIKE behave as sqlite JSON and LIKE did for the scope, keyword and ordering filters.
- ASSUMED: ForwardAuth supplies the workroom id and role that the tests supplied by hand, and the agent-auth dependency on the lookup route resolves the conversation; neither dependency was driven.

Historical limits:

- Local in-process execution with isolated fake fixtures in a loopback-only network namespace; no deployed 1.3.0 runtime, image, endpoint, model or member session was exercised. Not runtime verified, not release verified.
- Not a release/1.3.0 source ref: Kaizen Legacy has no release/1.3.0 branch in the local clone. The commit is the capability document's pin on develop, exported by git archive.
- No HTTP layer, no agent sandbox and no chat turn: route functions were called directly, so request parsing, dependency injection and authentication were bypassed.
- No browser: the Save as Recipe button and Recipes tab were not rendered. The 'from search results' part of the save operation rests on unit tests of payload extraction and the API client, not on a click.
- sqlite stood in for Postgres behind a sync-session adapter.
- List, view, rename, delete, role and scope behaviour, the 413 route path, keyword fields, the 20 cap and the 500-character cut rest on tests written in the analyst pass.
- Two earlier analyst runs (rec-01 exit 4, rec-03 exit 2) failed at collection for missing test settings. They are retained and were corrected by supplying the repository's own test environment values, not by changing a test.
- Frontend tests ran in the analyst pass with node_modules symlinked read-only from the stack checkout, whose installed versions are not pinned to this commit; the reviewer did not rerun them.
- Source curation is separate and unchanged: the 1.3.0 cycle row still records tier1 not-established with reason code authored_claim_or_condition_mismatch. It was not edited or re-adjudicated by this import.
- Reviewer rerun is local contract evidence on the reviewer's own export, not a runtime or release pass.

### platform.access-requests

Request resource access and record grantor approval/denial. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### platform.admin-copilot

Ask an operations copilot grounded questions about the platform. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- An operator-configured Kamiwaza-hosted OpenAI-compatible deployment returns exactly one parseable tool call per turn; no model was contacted (FakeGateway scripted calls in runner tests, httpx.MockTransport in the gateway tests).
- Registered actions really do their platform work: the runner tests use FakeExecutor, and the four real-executor tests only assert actor roles / tenant are passed on.
- Audit events reach the platform audit sink (stdout/OTLP/file); emit_audit_event was captured in-process and no sink was read.
- The thread/run HTTP routes hand the service what the tests hand it directly: only GET /actions and the confirm handler are touched at the route level; the rest of the 10 routes are covered by a static requires-auth check.
- The caller Authorization header reaches the gateway unchanged: api.py:55-56,117,151,174 -> runner -> loop.py:62 was read in source, the gateway half is tested, the join is not.
- Postgres persistence of runs/actions behaves like the in-memory sqlite repository.

Historical limits:

- Local in-process pytest with fakes only; not executed live, not release verified, no release stamp.
- Reviewer re-read receipts, tests and source and recomputed hashes; reviewer did not re-execute any test.
- No claim about answer quality or the interim inner loop; only the protocol around it.
- Two guarantees rest on tests authored by F1 (test_f1_copilot_gaps.py, not in the product repo): the copilot.* policy id and caller-authorization forwarding. Repo tests alone assert actor type/id/result but not the policy id.
- That request schemas reject a credential field is source-read only (schemas.py models use extra="forbid"); no test posts one.
- Budgets: only turn-budget exhaustion and the question counter are asserted, not every budget.
- Unexecuted conditions: ownership checks on runs/results (no cross-user denial test selected); no-SDK / no-docs absence statements.
- Tested source is kamiwaza release/1.3.0 @af6f4bf; the contract was read at f991d3e. The contract routes this capability to an api-arm probe with an audit read path; that producer is still missing and this assessment does not replace it.

### platform.api-reference

Serve machine-readable OpenAPI and offline interactive reference. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- The carried 1.3.0 OpenAPI schema probe result still holds for 1.4.0; it was not re-run.
- The manual checks are the observer's report after sign-in; execution time, browser, HTTP status codes and build identity are unknown.

Historical limits:

- Three of the four declared operations were observed manually (OpenAPI schema, Swagger UI, ReDoc). The auth-annotations operation was not observed.
- Signed-in access only; no anonymous access is claimed.
- Schema contents, same-origin vendored assets and the absence of Google fonts were not attested.
- The receipt notes that historical failures are retained; this assessment resolves none of them.
- No fresh canonical scenario record, no release stamp.

### platform.licensing-and-eula

Validate signed license files and surface commercial-term status. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- Each operation passed locally at the named source revisions; it is ASSUMED, not executed, that a deployed 1.3.0 build and its images behave the same. Image-to-source binding is not attested.
- ASSUMED that the build-compiled signing authority and a real installed license file behave as the ephemeral test key and test-built license files did. No real license, compiled authority or installed file was used.
- ASSUMED that analyst F's receipt is a faithful run of the startup-validation tests: it is a single receipt that the reviewer checked by hash, test ids and source comparison but did not re-execute for the key-minting files.
- ASSUMED that the deploy develop chart at 98bf3150 is the chart 1.3.0 ships. No deploy release/1.3.0 ref exists locally; _eula.tpl is the same blob (b9994cb2) at the commit the capability document cites (1661cb64).
- ASSUMED that the gateway passes the two license headers to the browser unchanged and that App mounts LicenseProvider and the banner as its source shows. Header names, state values and date format were matched between backend and frontend by the author's source comparison only.
- ASSUMED that helm install refuses exactly as helm template does, and that the real kamiwaza umbrella chart propagates global.eula.accepted as the fake parent chart did.

Historical limits:

- Local in-process execution with fakes in a loopback-only network namespace. No deployed runtime, image, cluster, gateway or endpoint. Not runtime verified, not release verified; no release stamp.
- The capability document's evidence plan is manual: a disposable install started with valid, stale and badly signed license files. That arm was NOT run. The registered kits are local substitutes and do not satisfy it.
- Startup signature/file validation was not re-executed by the reviewer for test_gate.py, test_certificate.py, test_claims.py and test_license_expiry_states.py (103 of analyst F's 203 tests), because those tests mint a signing key and the reviewer was told not to generate keys. That operation rests on one receipt from analyst F.
- Chart source is deploy develop, not a 1.3.0 ref. helm template only: no helm install, no cluster, no real umbrella chart, no installer --accept-eula flag.
- Banner ran in jsdom, not a browser. The full App was not rendered and no license header crossed a real HTTP connection.
- The author's scheduler-off refusal (eula-n7) was raised from scheduler/deployment.yaml, not eula-guard.yaml. The reviewer's guard-only fixture shows eula-guard.yaml refusing on its own, but that fixture deletes the other templates and is a reviewer construction, not the shipped chart.
- Retained non-passing receipts, none erased: author ui-01-authored.attempt1-harness (global axios mock), author validate-project attempts 1 and 2 (interpreter) and the validate-project refusal for the missing evidence kit; reviewer rv-backend-01-nokey-subset.attempt1-harness (exit 2, export omitted licenses/verify_keys). All are harness defects. rv-mut-ui-01-headers-ignored exits 1 by design.
- The author's receipt-hashes.sha256 has 26 entries: 25 re-hash correctly; the 26th is a composite over 32 helm output files that sha256sum cannot check as written. The reviewer compared those files with its own outputs instead.
- The reviewer's additions (key-free backend subset choice, guard-only fixture, two mutant controls, the three kit registrations) are reviewer-authored and have not been independently reviewed. run.sh in the kit is tied to the reviewer folder layout.
- Every accepted helm render makes the chart generate throwaway TLS keys, CA certificates and passwords (genCA, randAlphaNum). They were never installed anywhere and are not license or signing material. The reviewer found them in its own 6 accepted-render outputs after the run and reduced those files to object shape and EULA annotation lines, keeping the sha256 of each full output (rv-helm-pass-outputs.original-sha256.txt). The author's 5 accepted-render outputs still contain such values, so the author's statement that no key or secret was created is not accurate for render output.
- Commercial-term expiry warnings and signed-file validity are distinct, as authored; no license-server dependency is claimed or tested.

### platform.news-feed

Display configured vendor news with offline fallback. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### platform.operations-and-notifications

Read persistent per-user operations and notification feeds. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### platform.usage-and-audit

Record and query user activity and audit events. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- Each authored operation passed locally at the named source; it is ASSUMED, not executed, that a deployed 1.3.0 build behaves the same.
- The activity middleware persists rows to the real database as the mocked session tests imply; no database was used.
- The real JWTValidator (signature, issuer, audience, expiry, PAT revocation) correctly decides which tokens yield which claims. It was replaced by an explicit fake that maps locally built unsigned fake tokens to real TokenClaims; token cryptography was not exercised.
- Deployed startup runs init_auth(app) so app.state.jwt_validator exists; asserted from app.py/bootstrap.py source text, the full application factory was not instantiated.
- The deployed identity provider issues the exact role name 'admin' (roles, realm_access or resource_access) to administrators, which is what the gate checks.
- The real JWTValidator never accepts a bearer string that is not three-segment JWT-shaped. If it did, the shipped identity build would re-read the raw token as a JWT and the request would end 500 (seen only through the fake boundary in retained receipts ar-01 and ar-03); not examined against the real validator.

Historical limits:

- Local in-process execution with fakes in a loopback-only network namespace; no deployed runtime, database, identity provider, gateway or SDK-to-server call. Not release verified; no release stamp.
- Source is a git archive subset of the release/1.3.0 commits; image-to-source binding is not attested.
- Gate coverage is the bearer-token path. The signed ForwardAuth positive path (gateway HMAC headers granting admin), the cookie token path and the ext_authz signature-bypass routing mode were not executed for this route; only refusal of unsigned ForwardAuth headers was.
- With AuthContextMiddleware the gate may be satisfied from the middleware's cached requester context rather than its own token resolution; the two were not distinguished. In that variant the middleware's best-effort Global Workroom seeding attempted a database connection, was refused inside the isolated namespace, logged an error and auth continued. The users-table claim sync was stubbed.
- With KAMIWAZA_USE_AUTH=false in a non-production-like environment the gate returns a stub identity that includes admin (read from source, not executed); 'administrator only' holds for auth-enabled deployments.
- analyst-k receipt ua-05 (500 on a bare app) is retained. ar-04 shows it is the uninitialised-auth-state response ('Auth not initialized', nothing disclosed), a harness setup condition and not a product defect; an app that genuinely skipped init_auth would answer 500 instead of 401.
- Decision history is per-process and lost on restart, as authored; durable copies (log record, OTel event) were not observed.
- Authored not_supported items (reporting CLI, redaction, authentication/session audit, durable history) are not claimed.
- The capability document cites line numbers from revision 4d007464; at af6f4bf9 the same symbols sit at different lines. Not corrected here.
- Administrator-only for the activity feed: analyst-k's ua-01 activity route tests replace require_admin with a dependency override. The real gate on that route was executed only in the reviewer's supplementary rv-03 (bearer path, fake validation boundary, ActivityService patched, no AuthContextMiddleware); that test file is reviewer-held and is not part of the registered kit command.
- Retained failed attempts, none erased: analyst-k ua-03 and ua-04 (exit 2, collection), ua-05 (exit 1, 500 on a bare app with no auth state), audit-resume ar-01, ar-02, ar-03 (exit 1, fixture defects: opaque fake tokens and a fake boundary lacking validate_token_sync). The corrective executions for the same scenario are ar-04 (author) and rv-01 (reviewer).
- Authored conditions not executed: turning activity recording off with KAMIWAZA_SKIP_ACTIVITY_LOGGING on a running server, activity retention, per-replica export behaviour across more than one API process, and the SDK method against a real server.
- ua-01 and ua-02 (activity, decision logging, SDK contract) were reused by hash and not rerun by the reviewer; the reviewer reran only the gate and export files.

### security.consent-and-banners

Configure consent gates and classification banners across every surface. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Curated admin configuration implementation is the basis for unexecuted admin PUT persistence, validation and audited acting-admin update; this run issued no PUT.
- Curated deployment integration is the basis for deployment-managed enablement; current shared consent/banner flags stayed false.
- Curated main-client integration and requirement for each extension/app to include the script remain unexecuted implementation assumptions. No claim that every deployed surface includes or behaves like this embed.
- Authenticated non-admin refusal and server-side public HTML sanitization remain curated implementation assumptions, not observed runtime claims.

Historical limits:

- Embedded client and the selected synthetic hostile inputs only; no universal XSS guarantee, main-frontend/client-variant qualification or enabled production rollout.
- Public/admin fields differed in the disabled state. Each surface was stable independently; projection intent, full parity and sanitizer behavior were not inferred.
- One successful acceptance response does not prove audit emission or persistence. Documented admission despite a locally failed recording request remains a limitation, not a repaired complete acknowledgment guarantee. No host audit presence/absence observation.
- No actual rate-limit load, forwarded-header/proxy trust, client-IP attribution, per-user durable ledger, new credentials/grants or shared deployment/configuration changes.
- Supporting observations only: no canonical scenario record, canonical fresh-live acceptance, source-image cryptographic attestation, release stamp or full release sign-off.

### skills.skills-library

Curate and share reusable agent skills in a platform skills library. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### tools.mcp-tool-shed

Deploy and manage MCP tools from the Tool Shed. Ledger target: 1.4.0. Origin target: 1.3.0.

Historical assumptions:

- None recorded.

Historical limits:

- None recorded.

### workrooms.admin-oversight

Administer workrooms across the platform. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- The curated admin-route implementation remains the basis for cross-owner deletion and membership bypass; this single approved identity acted as owner, so neither property was executed.
- The curated SDK admin_list/admin_delete wrappers and client-side pagination validation remain the basis for SDK coverage; no SDK invocation occurred.
- Independent authenticated non-admin refusal and Global protection remain supported by curated implementation, without a live claim or destructive Global attempt. No observed failure is assumed repaired.

Historical limits:

- Admin API only; no supported interactive Admin View exists, and none is asserted.
- No cross-owner mutation, new account/grant/credential, shared configuration, app/model deployment or unknown worker/resource change.
- Owner subject IDs checked; resolved directory display names/email, complete global inventory enumeration and concurrent-pagination consistency were not established.
- Metadata retirement and retained ledger only; no audit-event emission, best-effort sensitive-disposal delivery, background purge, physical erasure or worker-termination claim.
- Producer emits supporting observations. No canonical scenario record, automatic live replay, fresh-live acceptance, source-to-image cryptographic attestation or release stamp.

### workrooms.archive-and-delete

Retire a workroom: archive, restore, delete with preview. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Existing curated implementation remains the basis for unexecuted resource-family impact counts and permission cases; these are not declared live-passing by this assessment.
- The best-effort disposal audit, background cascade retries and physical resource purge were not observed or inferred from404.

Historical limits:

- Admin acting as owner; no independent-user refusal or cross-owner admin-delete proof.
- Only nonzero session/member impact counts verified; app/extension/DDE/catalog/context resource-family preview counts remain not established.
- UI, SDK, audit emission and physical purge not executed.
- The registered reusable Python observer emits supporting observations, not canonical scenario-evidence; a compatible producer is still needed for release stamping.

### workrooms.create

Create a workroom. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- The curated implementation and existing SDK kit remain the basis for ordinary permitted-user creation, permission/active-room-limit refusals, automatic ephemeral expiry and optional asynchronous context provisioning; those conditions were not executed here.
- UI creation requires an enabled Workroom Manager; this deployment explicitly reports the manager disabled, so the UI path is untested rather than assumed live-passing.

Historical limits:

- Existing admin API session only; no UI clicks or SDK calls in this observation.
- No claim of background cleanup, provisioning readiness, physical purge, permission-isolation completeness, or release certification.
- Reusable registered SDK kit is a later execution path, not the producer of these API observations.

### workrooms.export-bundle

Export a workroom's contents as a bundle. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Curated implementation and registered SDK kit remain the basis for nonempty DDE descriptors, independent reader/editor authority cases, other resource-family exclusions and degraded-backend enumeration behavior; none is claimed executed here.

Historical limits:

- API only; stricter UI candidate and its nonempty DDE/catalog fixture requirements are unchanged and still held.
- Empty DDE index is observed; completeness of a nonempty DDE inventory is not established.
- One seeded payload exclusion and a listed-key check do not establish universal secret redaction, arbitrary data portability or audit emission.
- Buffered Playwright response followed bounded ZIP validation; no streaming-memory guarantee or physical-purge observation.
- Catalog summary catalog_entries1→0 is supporting only, not a separate ingestion-summary capability verdict.

### workrooms.session-scoping

Enter a workroom and scope platform operations to it. Ledger target: 1.4.0. Origin target: not separately recorded.

Historical assumptions:

- Independent-user membership/refusal and SDK explicit-header automation behavior remain supported by the curated implementation and reusable registered SDK kits; they were not executed here.
- Token refresh persistence and forced runtime-revive rollback were not tested; no failure of those operations is assumed repaired.

Historical limits:

- Same admin identity in two genuinely separate browser sessions; session independence is not independent-user or cross-tenant authorization proof.
- No UI or SDK execution, PAT creation, token parsing/copying, auth bridge, or full-release stamp.
- Raw consumer checks use server-reported checksum and metadata; no direct object download or physical-purge proof.
