# Kamiwaza 1.3.4 verification report

Evidence date: 2026-10-24

## Scope

Organize a dataset registry and enforce Workroom access. Four registered SDK/API scenarios passed on the corrected release/1.3.0 API build assigned to the 1.3.4 cycle: metadata lifecycle and schema; Workroom viewer/outsider controls; nested container reparenting and membership; and two-session conditional metadata writes. This is database-backed catalog evidence, not a browser UI or full Analyst VS2 certification.

The actual BuildKit source was c5132d69170a2361e2ae164916fc0a5d3e96b873; baked/API metadata reported 3b8267dbd88acf811fa9c218d905d02f53c3a99e. Both complete source trees match accepted Core merge 0be2d6556ba479dbcd61efe95e06e8bc25dbe159. Original Ray, scheduler, Flight and frontend components remained separately captured. This does not claim the original v1.3.4 tag contains the correction.

## Results

Capability-kit PR #220 accepted catalog.dataset-registry, adding one distinct capability: 72 of 87 scoped release-verified capabilities, with 15 remaining. All 71 earlier accepted capabilities and 58 historical prerelease entries remain preserved; overlapping counts are never summed. The running value-stream inventory remains 46 parents, with 17 scoped recipes across 8 parents. A new ingredient does not automatically verify its parent value stream.

The user can create dataset metadata, read its schema, group and page through container members, and search within a Workroom. An independent viewer can read the owned registry while prohibited writes and outsider access are refused. Reparenting and detaching preserve membership. One contention round accepts exactly one of two competing conditional metadata updates.

The human guide supplies a recipe with roles, ingredients, setup, steps, expected outcomes and limits. Its ingredient glossary shows the catalog's scoped release status beside separate historical prerelease status.

## Evidence

Canonical accepted packet: https://github.com/kamiwaza-internal/capability-kit/tree/2768989208ac31964131b62b874103d7cdc7e1a0/reports/2026-10-24-catalog-corrective-release130

Acceptance: https://github.com/kamiwaza-internal/capability-kit/pull/220

Native stamp: 937d3d1ff215be46ab664b203d37b90ee87635941d0fa33fa2a30e3e48d3d7f7.

SDK producer: 654f2e35d702426186038c32e57c31ae17cd0271. The four nodes cover dataset lifecycle, viewer/outsider controls, nested container membership and concurrent metadata updates. All four passed without skips or teardown errors; before/after manifests match. Native teardown, independent fixture absence and restoration of original routing and components have separate receipts.

The original viewer-403 failure remains unchanged. The reviewed retry binds that failure and preserves the complete four-scenario obligation. The SDK retries only the closed membership-unavailable 503 signal; genuine 403 refusals and unrelated failures remain failures.

## Limits and assumptions

Database backend only. No external/DataHub backend, cross-tenant, cross-process, multi-replica or stress atomicity proof is claimed. One contention round does not establish general concurrency correctness. UI workflows, physical content purge, registered-source lifecycle, publisher grants, register_from_spec and deleting parents with children are outside this journey.

The immutable stamp includes historical qualifiers from an October 17 two-test retrieval recipe. Those describe that earlier recipe's independent datasets, shared emitter window and absence of a fresh stamp. Its then-unresolved scheduled-ingestion failure was subsequently corrected and accepted in Kit #213. This new four-scenario catalog replay produces a fresh scoped stamp and passes conditional-write checks. The raw historical wording stays intact; the canonical packet README explains each qualifier. No human release sign-off is implied.

This cumulative inventory spans multiple captured configurations rather than one jointly tested installation. The ZIP retains exact scope and source bindings. For an RFI, give informed requirement-by-requirement reporting on Kamiwaza support, evidence and gaps; do not generate a bid response, procurement verdict or accreditation claim.

## Remaining work

Fifteen active capability IDs remain outside accepted release coverage. Broader catalog operations and parent value streams retain their separate requirements. Preserve original failures and historical evidence; additional tests for an already verified capability do not increase the distinct capability count.
