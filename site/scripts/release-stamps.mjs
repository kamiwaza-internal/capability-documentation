// Consumer validation for the v1.3.2 release stamp projection. Separate from publication.json.
// A release stamp is the kit seal's output for one capability's registered test; it is not human
// release sign-off. A source-contract stamp is a test on source with mocks and is never a release stamp.
import {count, id, instant, kitPullRequestPattern, list, requireValue, shape, text, unique} from './local-stamps.mjs';
import {stampsApply} from '../src/catalog.mjs';

const hex64 = /^[a-f0-9]{64}$/;
const slug = /^[a-z0-9][a-z0-9-]{0,159}$/;
const kitId = /^[a-z]{2,16}:[a-z0-9][a-z0-9-]{0,159}$/;
const capability = value => requireValue(typeof value === 'string' && id.test(value), 'Invalid capability identifier');

// The file's own checks always run. `publication` is optional. When given and it holds the
// baseline release this projection names, every stamped capability must be a row of the latest
// pre-release evidence release or be named in `outsideCatalog`.
// Returns the data, or null when the projection does not apply to the given publication.
export function validateReleaseStamps(data, publication) {
  shape(data, ['schema', 'targetRelease', 'releaseTag', 'coreSource', 'manifestId', 'environment', 'sourceCommitBasis', 'humanSignOff', 'baselineReleaseId',
    'source', 'limits', 'counts', 'releaseStamps', 'sourceContractStamps', 'sourceContractNotStamped', 'outsideCatalog']);
  requireValue(data.schema === 'release-stamp-projection.v1', 'Unsupported release stamp projection');
  requireValue(data.humanSignOff === false, 'Release stamps are never human release sign-off');
  requireValue(typeof data.targetRelease === 'string' && /^\d+\.\d+\.\d+$/.test(data.targetRelease) && data.releaseTag === 'v' + data.targetRelease, 'Invalid target release');
  requireValue(typeof data.baselineReleaseId === 'string' && id.test(data.baselineReleaseId), 'Release stamps must name the baseline release they were projected against');
  shape(data.coreSource, ['ref', 'commit']);
  requireValue(data.coreSource.ref === data.releaseTag && /^[a-f0-9]{40}$/.test(data.coreSource.commit), 'Core source must be the release tag at a pinned commit');
  requireValue(hex64.test(data.manifestId), 'Invalid manifest identifier');
  requireValue(data.environment === 'local' && data.sourceCommitBasis === 'operator-asserted', 'Environment and source commit basis must be stated as recorded');
  shape(data.source, ['kitRepository', 'kitCommit', 'kitPullRequest', 'reportPath']);
  requireValue(data.source.kitRepository === 'kamiwaza-internal/capability-kit' && /^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Kit source must pin a commit');
  requireValue(typeof data.source.kitPullRequest === 'string' && kitPullRequestPattern.test(data.source.kitPullRequest), 'Invalid kit pull request');
  requireValue(typeof data.source.reportPath === 'string' && /^reports\/[A-Za-z0-9._-]+$/.test(data.source.reportPath), 'Invalid kit report path');
  list(data.limits, 20).forEach(text);
  requireValue(data.limits.length > 0, 'Limits are required');

  const lanes = {api: 0, sdk: 0};
  const released = list(data.releaseStamps, 1000).map(stamp => {
    shape(stamp, ['capability', 'stampId', 'lane', 'finishedAt', 'scenarios', 'supersededKit', ...(Object.hasOwn(stamp, 'selectionBasis') ? ['selectionBasis'] : [])]);
    capability(stamp.capability);
    requireValue(hex64.test(stamp.stampId), 'Invalid stamp identifier');
    requireValue(Object.hasOwn(lanes, stamp.lane), 'Invalid lane');
    lanes[stamp.lane] += 1;
    requireValue(instant(stamp.finishedAt) <= Date.now(), 'Stamp finished in the future');
    requireValue(list(stamp.scenarios, 100).length > 0 && stamp.scenarios.every(s => typeof s === 'string' && slug.test(s)), 'A stamp needs at least one valid scenario');
    unique(stamp.scenarios);
    requireValue(typeof stamp.supersededKit === 'boolean', 'Invalid superseded kit flag');
    if (Object.hasOwn(stamp, 'selectionBasis')) requireValue(typeof stamp.selectionBasis === 'string' && slug.test(stamp.selectionBasis), 'Invalid selection basis');
    return stamp.capability;
  });
  const sourceContract = list(data.sourceContractStamps, 1000).map(stamp => {
    shape(stamp, ['capability', 'stampId', 'kits']);
    capability(stamp.capability);
    requireValue(hex64.test(stamp.stampId), 'Invalid stamp identifier');
    requireValue(list(stamp.kits, 100).length > 0, 'A source-contract stamp needs at least one kit');
    for (const kit of stamp.kits) {
      shape(kit, ['kitId', 'tests']);
      requireValue(typeof kit.kitId === 'string' && kitId.test(kit.kitId), 'Invalid kit identifier');
      shape(kit.tests, ['passed', 'failed', 'skipped', 'errors']);
      Object.values(kit.tests).forEach(count);
      requireValue(kit.tests.passed > 0 && kit.tests.failed === 0 && kit.tests.errors === 0, 'A source-contract stamp cannot contain a kit that did not pass');
    }
    unique(stamp.kits.map(kit => kit.kitId));
    return stamp.capability;
  });
  const notStamped = list(data.sourceContractNotStamped, 1000).map(entry => {
    shape(entry, ['capability', 'reason']);
    capability(entry.capability); text(entry.reason);
    return entry.capability;
  });
  unique(released);
  unique([...sourceContract, ...notStamped]); // unique ids, and never both stamped and not stamped
  // One capability never carries both grades here: a source-contract stamp must not read as a release stamp.
  requireValue(!sourceContract.some(c => released.includes(c)), 'Capability in both the release stamp and source-contract stamp lists');

  shape(data.counts, ['releaseStamps', 'releaseStampsApi', 'releaseStampsSdk', 'sourceContractStamps', 'sourceContractNotStamped']);
  Object.values(data.counts).forEach(count);
  requireValue(data.counts.releaseStamps === released.length && data.counts.releaseStampsApi === lanes.api && data.counts.releaseStampsSdk === lanes.sdk &&
    data.counts.sourceContractStamps === sourceContract.length && data.counts.sourceContractNotStamped === notStamped.length, 'Counts do not reconcile');

  // Private workspace paths, image digests, registry hosts, absolute paths and any URL other than the kit pull request stay out.
  const body = JSON.stringify({...data, source: {...data.source, kitPullRequest: ''}});
  requireValue(!/work\/|sha256:|@sha256|ghcr\.io|https?:|\.patch\b|["\s]\/[\w.~]|[A-Za-z]:\\\\/i.test(body), 'Private content forbidden in release stamp projection');

  const all = [...released, ...sourceContract, ...notStamped];
  list(data.outsideCatalog, 1000).forEach(capability);
  unique(data.outsideCatalog);
  requireValue(data.outsideCatalog.every(c => all.includes(c)), 'outsideCatalog names a capability with no entry here');
  if (publication) {
    if (!stampsApply(data, publication)) return null;
    const baseline = (publication.releases ?? []).filter(r => r.baselineKind === 'prerelease-evidence').sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
    const known = new Set((baseline?.capabilities ?? []).map(c => c.id));
    for (const c of all) requireValue(known.has(c) !== data.outsideCatalog.includes(c), 'Capability must be in the latest pre-release evidence release or, only otherwise, in outsideCatalog: ' + c);
  }
  return data;
}
