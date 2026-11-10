# Release verification publication: implementation contract

This is the proposed successor contract; the existing publication and schema remain in force until its implementation lands.

Capability-kit derives a release verification when the complete functional claim passes on artifacts attributable to the named released installer. The observation can predate or follow publication of the release. Equivalent artifacts may use the original evidence. “Verified” and “fully verified” are synonymous. A verified scoped claim is shown with its scope and does not silently become a whole-capability result.

The publication format must distinguish release artifact identity from the setup used for an observation. It must retain the original evidence date, scope, setup, conditions, limitations and relevant additional component identities. Multiple qualifying observations and setups can support one capability for the same release; deduplicate the current capability count. Preserve failed and incomplete results and only supersede a result when the later evidence applies to the same claim and setup.

Each update appends a new immutable publication revision for the existing release and retains previous revisions and bundle bytes. The website, downloadable bundles and agent-readable data must use the same canonical status source. Publication review and human release approval remain distinct from functional verification.

Schema 6 currently limits release stamps to `wholeClaim: false` and binds a snapshot to one replay manifest and window. Implement a versioned successor that supports whole-capability and scoped release evidence, artifact equivalence and multiple setups without changing existing schema 6 snapshots. Validate release and evidence bindings, unique capability counts, observation dates, failure resolution, public-safe projection and immutable history. Update every renderer and download together, with tests for old and new revisions. Do not present this contract as implemented until the consumer and kit exporter actually support it.
