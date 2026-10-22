# Release verification and carry-forward

Verify the release delta. Unchanged capabilities do not need a full replay when accepted prior release evidence remains applicable after a reviewed change-impact assessment.

## Status language

| Label | Meaning | Counts toward release coverage? |
| --- | --- | --- |
| **Release verified — tested this release** | Accepted execution evidence covers the named scenarios on this release. | Yes |
| **Release verified — carried forward** | Accepted prior release evidence remains applicable to this release after a recorded change-impact review. | Yes |
| **Prerelease verified** | Accepted historical prerelease evidence exists, but release-baseline acceptance is not established. | No; report separately |
| **Release verification pending** | Neither accepted fresh evidence nor an applicable carry-forward decision establishes release coverage. | No |

Use **release verified**, not **release certified**. Verification describes the recorded scope; it is not certification, accreditation, every possible operation, or human whole-release approval.

## Carry-forward decision

Retain the capability ID, original evidence reference and test date, source and target releases, verified scope, assumptions and limits. Record the reviewed changes, relevant dependencies and configuration/environment impact, reviewer, decision date and rationale in the canonical evidence ledger. These are contents of the existing review, not a requirement for a separate approval ceremony or test per capability.

One review may cover a batch of capabilities with the same relevant change surface. Reuse the existing runtime and evidence setup for the affected tests. A version bump or unrelated change does not require replay. An image, configuration or environment change requires an impact decision; it does not automatically require retesting every capability.

Test new capabilities and changed behavior, affected dependencies, applicable failures and unresolved impact. Missing change mapping is unresolved impact, not proof that nothing changed. If only part of a capability's scope changed, test that part and retain applicable evidence for the rest; the displayed claim must stay within the accepted combined scope.

Prerelease-only evidence is preserved as **Prerelease verified** until an explicit release-baseline acceptance establishes its applicability. A label change alone is not acceptance. This does not require blindly rerunning every historical test; assess the evidence and test the remaining gaps.

## Counting and publication

Release coverage is the union of distinct capability IDs with accepted fresh evidence or applicable carried evidence. Count an ID once when both exist. Report tested and carried scopes separately where useful, without adding overlapping counts. Keep historical prerelease counts separate and preserve their original versions.

A carry-forward decision contributes to the target release's coverage, but is not a new execution or newly discovered capability. Report genuinely new coverage separately from refreshed tests, carried coverage and additional scenarios for an existing ID.

For example, if a release has 12 freshly tested IDs and 40 carried IDs, with two IDs in both sets, release coverage is 50 distinct IDs, not 52. These are illustrative numbers, not Kamiwaza release results.

Catalogs, PDFs, Markdown, ZIP records and agent reports must use the same accepted status source and labels. Never replace a carried or prerelease verdict with “not verified” merely because no fresh test ran. Preserve superseded snapshots as history; current applicable failures and retirement still control current claims.

This policy does not itself approve carry-forward for any capability, change existing evidence or increase a release count. Use the [Capability Kit weekly verification contract](https://github.com/kamiwaza-internal/capability-kit/blob/main/docs/weekly-verification.md) for producer mechanics and the canonical ledger for actual decisions. Where automation is incomplete, record a reviewed decision through the existing evidence workflow; do not infer success from an absent run.
