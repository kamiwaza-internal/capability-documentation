# Capability site

## Published 1.3.0 source baseline

Schema 2 adds a source-only development baseline with 43 curated declarations
from kit commit `eff8abf68909ac645c48a3364ea7ef1693ea6f7c`. The remaining 55
kit IDs are explicitly omitted, not declared unsupported or runtime-failed.
The release binding is **not established**: these are pinned component source
snapshots, not an attested shipped 1.3.0 image. Runtime status is untested in this
publication. Existing private historical runtime evidence is not re-scored here.

The same input renders the website and emits `/releases/index.json`, `/llms.txt`,
and `/releases/<id>/bundle.json` plus `bundle.md`. The index hashes exact bundle
bytes. The bundle retains source repo/path/symbol/revision, canonical document
hash, supported operations, prerequisites and complete limitations. It does not
include private run logs, source bodies or customer material. Review every new
projection before pushing it to this public repository; schema validation alone
is not a confidentiality or factual review.

Reproduce the payload with the companion kit exporter, the committed
`publication-selection-1.3.0.json`, the above source commit, PR #3 as review URL,
and `2026-09-25T00:00:00Z` as publication metadata timestamp. That timestamp is
not a test execution date or deployment attestation. Review/merge is approval;
the URL by itself does not prove approval. Full byte regeneration is the check.

Deployment is now automatic after main's build succeeds. PR review is the human
gate; there is no separate environment approval (user decision 2026-09-24).
The environment allows main only and CAPABILITY_SITE_PUBLISH_ENABLED is true.
Keep old publication objects unchanged; corrections use a new revision/ID.

The original scaffold notes below describe schema 1; schema 2 additionally
requires `baselineKind`, `releaseBinding`, omitted IDs and per-capability
declarations. It prohibits runtime verification credit.

Docusaurus presentation for reviewed public capability snapshots. It does not read the repository's legacy `capabilities/`, `tests/`, `synthetic-data/` or `evidence/` trees. Private generation and evidence scoring belong to the capability framework, not this site.

## Local checks

Use Node 22 or later:

```sh
cd site
npm ci --ignore-scripts
npm test
npm run test:integration
npm run build
npm run serve -- --host 127.0.0.1
```

The unit fixtures are synthetic and never imported by the browser page. The catalog input contains reviewed-source declarations proposed for publication. It is not a runtime-verified release.

The integration test requires Linux and a populated npm cache from `npm ci`. It installs dependencies offline into a uniquely named scratch directory, builds a synthetic nonempty catalog, checks HTML escaping and partial-coverage labels, checks that a sibling private canary is not copied, then confirms that invalid verification credit fails the actual build. It never changes production input or deploys the synthetic fixture. Scratch directories are retained for inspection and their paths are printed. This is build-level verification, not a browser interaction test.

## Public projection contract

`data/publication.json` is the only catalog input. Schema 1 contains `releases`. Each snapshot names its version, `development` or `released` channel, exact tested build, full source revision, positive publication revision, UTC publication time, public review PR and capabilities. Each capability contains plain-text title/summary, prerequisites, limits, public distribution, the upstream status, whole-claim assessment and sanitized evidence summaries. See the synthetic unit fixture for the exact shape; never copy its fake evidence into production.

Validation rejects unknown fields, internal distribution, duplicate IDs, cross-build evidence and a verified label without complete clean evidence. It does not compute canonical kit verdicts, verify the reviewer's identity, or prove that prose contains no confidential information. Review metadata is provenance, not an authorization mechanism. Human Customer Delivery review and protected GitHub settings are required before actual publication. A passing node must never be relabeled whole-claim verified here.

Content is rendered as React text, not executable MDX or raw HTML. There is no auto-import of internal documents, even if they already exist in this public repository. Free-text redaction must occur before the payload reaches any public GitHub branch or artifact. The consumer's internal-reference check is defense in depth, not a replacement for upstream review.

## Enable publishing — administrator prerequisite

1. Confirm that every uploaded byte is approved for public distribution. Audit legacy repository content separately; this site does not remove pre-existing exposure or alter Git history.
2. Require reviewed PRs and the `Capability site / build` check on main. Configure actual Customer Delivery approvers and prevent author self-approval/bypass according to organization policy. A URL in JSON does not enforce that review.
3. Configure the `github-pages` environment to allow main only. Approval happens on the PR; no additional deployment reviewer is required.
4. Enable GitHub Pages with **GitHub Actions** as its source. Set its custom domain to `capabilities.kamiwaza.dev`; verify domain ownership, certificate issuance and HTTPS. The site's configured URL/base path already match that domain.
5. The Cloudflare CNAME target is `kamiwaza-internal.github.io`. Check proxy/origin TLS and login-to-origin behavior; never treat custom-domain Access as protection for public source or public origin content.
6. Only after these checks, set repository Actions variable `CAPABILITY_SITE_PUBLISH_ENABLED=true`. Merge reviewed changes to main; deployment follows the successful build automatically.
7. Verify an authorized visitor sees the expected publication/build, an unauthenticated visitor meets the intended Access policy, static assets load, and the deployed page matches the approved commit. No frozen platform API or runtime access is needed.

PRs only test/build. Pushes to main test/build and, when explicitly enabled, deploy. Deployment uses the built `site/build` artifact only, not the repository root. Failures leave the previously deployed site unchanged. The workflow uses read-only source permissions and Pages/OIDC write permissions only in the deployment job.

## Rollback and failure handling

If a build fails, fix the source through review; do not skip validation. For a bad deployment, disable publishing, prepare a reviewed revert to the last known-good site/input commit, rerun all checks, then enable and deploy that approved main revision. This preserves Git history. Confirm the restored page contents through the custom domain and record the incident. True immutable published snapshot revisions and release comparison are subsequent work, not yet enforced by this scaffold.

## Delivery boundaries

Implemented here: Docusaurus catalog, public projection validator, source declarations, download bundles, text search and status filtering, per-snapshot counts, PR build and main deployment. Pending: shipped-release binding, public runtime evidence, comparisons and automated private-kit synchronization. The exporter is an explicit offline preparation step, not an automatic cross-repository publishing service.

## Dependency maintenance

The lockfile overrides `serialize-javascript` to 7.0.5 and the `sockjs` dependency on `uuid` to 11.1.1. These address GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v, and GHSA-w5hq-g745-h8pq. The latter retains the CommonJS `v4` API used by sockjs. Node 22 satisfies the patched serializer's runtime requirement. Re-run `npm ci --ignore-scripts`, tests, production build and `npm audit` when changing these overrides; remove them once the upstream dependency graph resolves patched versions normally. A clean audit is a point-in-time dependency check, not a security certification.


## Project pre-release draft and assessment basis

The new pre-release bundle is schema 4; the containing publication stays schema 2
so previously published source-declaration objects and bundle bytes remain unchanged.
The project baseline separates historical development-build scenarios from accepted
local-contract developer assessments. Only the pinned private lifecycle scorer
decides canonical project credit. A combined project total is never a count of
live runtime passes, and no released-build or human approval credit is added.

Scenario records carry their original execution and kit ingestion dates.
Developer assessments carry assessment dates, observed source revision, conservative curated assumptions and capability
specific limitations. Their kit ingestion date remains null when not established.
Uncurated packet prose, internal URLs, local paths, logs, people, environment values
and evidence-kit names are not exported. Source declarations retain their separate
pinned source citations; an assessment does not establish source curation.

Drafts carry actual generatedAt, publicationState draft, publishedAt null and
reviewReference null. Actual publication and a real reviewed PR require a separately
reviewed transition; neither may be guessed during candidate generation. The site
build has its own timestamp and optional CI commit. Deferred federation IDs remain
included unverified gaps. Unknown fields and contradictory credit, dates or build
binding fail validation. This support does not waive the Customer Delivery review,
protected PR and main build gates described above.

Private accepted-packet identities and raw hashes are never public metadata. They are retained only in a separate private generation receipt, alongside the public-payload hash for audit. Public assessments expose no packet cross-reference or private-input digest.

A new declaration is eligible only when the pinned lifecycle row has current source_curation.tier1 declared. A document projector or an accepted developer assessment does not resolve not-established or re-review-required source curation; those declarations are withheld in full.

## Separate latest scoped observations

Schema 5 adds a strict allowlisted observations array beside the unchanged
historical releases. Releases retain schema-2 validation semantics and exact
existing bundle bytes (source bundles schema 2, pre-release bundle schema 4).
Only an additive 2-to-5 container migration is allowed; previously published
release objects and observations cannot be rewritten or removed.

The new surface exports only typed capability IDs, aggregate and per-capability
scenario counts, original retained run start/finish dates with fractional UTC precision, full kit commit, and bounded local
test-target metadata. It has no raw packet, scenario ID, internal notes, credential,
private source path or raw Linear export fields. The full unobserved catalog is
not published. The declared source catalog size is reviewed privately; included
membership and baseline status are checked against the existing baseline snapshot.

Counts distinguish successful scoped capabilities from capabilities with failing
scenarios. Distinct scenario totals are independently deduplicated upstream and checked exactly against per-capability rows minus typed shared-scenario mappings and the explicit shared-assignment count. A scenario may map to multiple capabilities, so row totals cannot be summed as distinct. A newer
scoped success can coexist with an earlier failed or mixed baseline record.
Neither rewrites history nor grants whole-capability or release credit. New run
counts must never be added to the historical 50/88 baseline or substituted for its
denominator. Preparation, source-commit and site-build dates are separate from
original execution dates.

The website renders observations separately and emits sanitized JSON/plain-text
bundles under /observations/, with an exact-byte SHA-256 index. This consumer
validates structure and consistency; independent source reconciliation and privacy
review remain necessary before publication. Public-site review and deployment
gates are unchanged.


## Scoped release stamps and full release sign-off

Schema 6 adds `releaseStamps` beside unchanged schema-5 `releases` and
`observations`. It does not rewrite historical objects or their bundle bytes.
Every snapshot declares the full reviewed inventory: `included`, `excluded`,
`deferred` and `other-owner` are explicit dispositions. Included capabilities
have `release-stamped`, `failed` or `not-stamped` status. Counts are checked
against unique rows; excluded or deferred rows do not become passes. Scoped
stamps always retain `wholeClaim: false`, reviewed scope, assumptions and limits.

`publishedAt` retains the existing publication-metadata convention: the actual
publication review PR opening time, not deployment or human approval. It may
precede the human decision; `approvedAt` is that separate decision time.

The public projection names the intended release tag or branch/full source
commit, qualified running manifest identity, Core/frontend image digests and
original fresh replay window. A stamp projection binds its canonical ID,
capability, intended release, source, manifest and execution date to that
snapshot. Historical failures remain visible; a stamp can resolve a failure only
with its retained corrective replay ID and a later execution date. Raw evidence
paths, kit names, qualification receipts, private notes and credentials have no
fields here. The synthetic fixture documents the exact allowlist and is never
imported by the product page.

Before publication, compare the complete capability ID set and dispositions
against the pinned canonical Kit cycle/catalog. This consumer checks declared
row consistency, not authenticated catalog completeness; a source reviewer must
reject an omitted row even if the declared counts are self-consistent. Selected
Core/frontend digests are public component projections, not a list of every
image in the full captured manifest (which can include init images).

Canonical stamp intake must reproduce the stamp from original build captures,
qualified intended-source proof, complete scenario evidence, actual runner
receipts and successful cleanup using the Kit lifecycle validator. This consumer
does not execute that validator or authenticate an operator. Do not project an
old observation or an assumed build as a fresh release stamp.

Human release approval is separate. Its scope is `full-inventory`; an approved
decision names the actual approved public role/person and time and binds
`snapshotSha256` to `releaseSnapshotDigest(snapshot)`. That hash is SHA-256 of
UTF-8 `JSON.stringify` of the exact public snapshot with the `approval` property
omitted; property order is retained. Prepare this body before obtaining the
human decision, and use a new immutable revision if it changes. A digest match
only verifies consistency: reviewed intake must establish the genuine human
observations and release-manager decision, including retained failures and
exclusions. Pending approval has null identity, time and digest. Approval does
not require every capability to pass, and never converts failures into passes.

The site renders these snapshots separately and emits `/release-stamps/index.json`
and immutable JSON/plain-text bundles. Adding a schema and passing synthetic
tests grants no production verification, human sign-off, publication or deployment.
Only a reviewed actual publication input update can expose a signed release.


## Current capability precedence

The first view derives one primary row per published version/capability without
changing any snapshot or bundle. Accepted verification takes precedence over
untested, skipped, absent or uncurated records. The `verified` filter includes
whole-claim verified, project pre-release verified and scoped release-stamped
records while retaining their distinct labels and original basis/date. The
`failed` filter includes failed-or-mixed records. A missing description is a
visible documentation gap; older declaration text is labelled historical source
context, never a current curated claim or broader verified scope.

Automatic supersession requires a later failed test bound to the same version,
qualified manifest/environment, exact source and full bounded contract (scope,
assumptions and limits). A later matching passing replay restores precedence.
A narrower stamped claim cannot replace a broader whole-claim accepted contract.
Development channel/build names alone do not prove environment applicability;
those failures remain visible separately. Aggregate local observations lack
scenario/claim bindings and do not revoke accepted historical contracts. A
retained release failure such as News remains a separate visible hold without
inventing its chronology or erasing its accepted pre-release evidence.

Explicit omitted IDs already present in the published baseline remain visible
as excluded documentation/evidence gaps. They do not become failed or unsupported
features. Deferred IDs stay inside their historical included denominator. The
primary view's row/filter counts are presentation counts across versioned public
records, not new verification totals, a replacement release denominator or fresh
1.3.2 credit. Original immutable snapshots and observations remain expandable.

## Current capability status view (derived, not stored)

This compact table sits above the per-capability view described under
"Current capability precedence"; the two are derived independently from the
same published data.

The first section of the catalog page shows one row per capability in the latest
`prerelease-evidence` release. It is computed at render time by
`currentCapabilityView(publication)` in `src/catalog.mjs`. Nothing is written
back to `data/publication.json` or any bundle, and no published record changes.

Precedence rule: an accepted pre-release verification stays current unless a
**later, applicable failed** result supersedes it.

- Applicable means the same version as the acceptance **and** the same contract:
  an observation row marked `scope: 'whole-capability'`, or one naming a
  `scenario` the acceptance rests on. A later applicable pass for that contract
  restores the status; both events stay in the row's history.
- Untested, skipped or absent later results, and missing descriptive text, never
  remove a verification. Missing text is flagged as a documentation gap. Older
  release text is never copied into the current row; the row only points at the
  older release that has it.
- Published observation rows carry per-capability counts for a different target
  (local 1.3.2) and no scenario or scope, so they are not applicable. Their
  failures are shown on the row as "applicability to the accepted contract not
  established" and leave the status unchanged.
- The row keeps its lineage (release id, basis, evidence records or assessment)
  by reference. A 1.3.0 pre-release acceptance is never relabelled as 1.3.2 or
  as release verified. `releaseStatus: failed` is a separate flag.

Capabilities that appear only in older source snapshots have no acceptance
record and no row here; they remain in the historical snapshots below.
