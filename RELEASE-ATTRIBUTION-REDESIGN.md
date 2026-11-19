# Release verification publication: implementation contract

This contract describes the release verification format and the remaining successor work.

Capability-kit derives a release verification when the complete functional claim passes on artifacts attributable to the named released installer. The observation can predate or follow publication of the release. Equivalent artifacts may use the original evidence. “Verified” and “fully verified” are synonymous. A verified scoped claim is shown with its scope and does not silently become a whole-capability result.

The publication format must distinguish release artifact identity from the setup used for an observation. It must retain the original evidence date, scope, setup, conditions, limitations and relevant additional component identities. Multiple qualifying observations and setups can support one capability for the same release; deduplicate the current capability count. Preserve failed and incomplete results and only supersede a result when the later evidence applies to the same claim and setup.

Each update appends a new immutable publication revision for the existing release and retains previous revisions and bundle bytes. The website, downloadable bundles and agent-readable data must use the same canonical status source. Publication review and human release approval remain distinct from functional verification.

Scoped snapshots keep their v1 bundle format. A new exact-build snapshot can project a pinned Kit whole-claim review with its matching stamp, documented operations, artifact identity and limits. The [site contract](site/README.md#scoped-release-stamps-and-full-release-sign-off) describes the v2 bundle and validation. Artifact-equivalent and multiple-setup observations still need a versioned intake and projection design.
