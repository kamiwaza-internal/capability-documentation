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
