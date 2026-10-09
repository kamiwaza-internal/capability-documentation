// Sanitized public projection of the kit's v1.3.2 release replay: release stamps and source-contract stamps.
// Usage: node scripts/project-release-stamps.mjs <path-to-kit-report-dir>
// Writes data/release-stamps-1.3.2.json. Deterministic: same kit bytes, same output bytes.
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateReleaseStamps} from './release-stamps.mjs';

// ponytail: provenance of the one replay published so far is pinned here, not derived from
// the kit checkout, so regeneration stays byte-identical. Move to arguments when a second replay exists.
const KIT_COMMIT = 'a7bf42ab4e432af673555b33107c99c2a83f9c37';
const KIT_PULL_REQUEST = 'https://github.com/kamiwaza-internal/capability-kit/pull/83';
const REPORT_PATH = 'reports/2026-10-09-1.3.2-release-replay';
const TARGET = '1.3.2';
// The kit README's limits, in plain words. The kit's own per-stamp limit lists are empty.
const LIMITS = [
  'A release stamp covers the scenarios of the capability\'s registered kit, not every operation of the capability.',
  'The source commit of the tested build is operator-asserted from a CI image-digest match; the image carries no source-revision label.',
  'The replay ran on a local cluster.',
  'A release stamp is not human release sign-off.',
  'A source-contract stamp records tests on exported source with mocks or fixtures. It is not runtime evidence and is never a release stamp.',
];

const need = (ok, message) => { if (!ok) throw new Error(message); };
const utc = value => value.replace(/\+00:00$/, 'Z');
const byCapability = (a, b) => a.capability < b.capability ? -1 : 1;
const one = (values, what) => { need(new Set(values).size === 1, 'Stamps disagree on ' + what); return values[0]; };
const json = path => JSON.parse(readFileSync(path, 'utf8'));

export function projectReleaseStamps(dir, publication) {
  const kit = readdirSync(dir).sort().map(batch => join(dir, batch, 'release-stamps.json')).filter(existsSync).flatMap(json);
  for (const stamp of kit) {
    need(stamp.schema === 'capability-release-stamp.v1' && stamp.basis === 'fresh-release-replay' && stamp.target_release === TARGET, 'Not a fresh ' + TARGET + ' release stamp');
    // Nothing per-stamp is dropped silently: publish these before a stamp may carry them.
    need(stamp.limits.length === 0 && stamp.assumptions.length === 0, 'Stamp carries limits or assumptions this projection does not publish: ' + stamp.capability);
  }
  const sourceBasis = one(kit.map(s => s.release_source.source_commit_basis), 'source commit basis');
  need(sourceBasis === 'operator-asserted', 'Unexpected source commit basis');
  const contracts = json(join(dir, 'source-contract', 'source-contract-stamps.json'));
  need(contracts.schema === 'capability-source-contract-stamp-set.v1' && contracts.target_release === TARGET && contracts.release_verified === false, 'Not a ' + TARGET + ' source-contract stamp set');
  need(contracts.stamps.every(s => s.schema === 'capability-source-contract-stamp.v1' && s.release_verified === false && s.runtime_evidence === false), 'A source-contract stamp claims release or runtime evidence');

  const releaseStamps = kit.map(stamp => {
    const lane = one(stamp.replayed_kits.map(k => k.split(':')[0]), 'lane for ' + stamp.capability);
    return {capability: stamp.capability, stampId: stamp.id, lane, finishedAt: utc(stamp.finished_at),
      scenarios: stamp.replayed_kits.map(k => k.slice(lane.length + 1)),
      ...(stamp.selection_basis ? {selectionBasis: stamp.selection_basis} : {}),
      supersededKit: (stamp.superseded_kits ?? []).length > 0};
  }).sort(byCapability);
  const sourceContractStamps = contracts.stamps.map(stamp => ({capability: stamp.capability, stampId: stamp.id,
    kits: stamp.kits.map(k => ({kitId: k.kit_id, tests: {passed: k.tests.passed, failed: k.tests.failed, skipped: k.tests.skipped, errors: k.tests.errors}}))})).sort(byCapability);
  // The reason keeps the kit's count and drops its command names.
  const sourceContractNotStamped = contracts.not_stamped.map(entry => ({capability: entry.capability,
    reason: entry.kits.map(k => k.reason.split(':')[0]).join('; ')})).sort(byCapability);
  const baseline = publication.releases.filter(r => r.baselineKind === 'prerelease-evidence').sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
  const known = new Set(baseline.capabilities.map(c => c.id));

  // Deliberately dropped: record paths and hashes, plan id, image digests, registry hosts, test identity
  // (SDK commit, test node ids, probe hashes), superseded kit ids, per-repository source refs and rules,
  // aggregate paths and hashes, runner names, and everything in the batch receipts and captures.
  return validateReleaseStamps({
    schema: 'release-stamp-projection.v1',
    targetRelease: TARGET,
    releaseTag: 'v' + TARGET,
    coreSource: {ref: one(kit.map(s => s.release_source.ref), 'core ref'), commit: one(kit.map(s => s.release_source.source_commit), 'core commit')},
    manifestId: one(kit.map(s => s.manifest_id), 'manifest').replace(/^sha256:/, ''),
    environment: 'local', // same label as the published observations; the cluster flavour is not published
    sourceCommitBasis: sourceBasis,
    humanSignOff: false,
    source: {kitRepository: 'kamiwaza-internal/capability-kit', kitCommit: KIT_COMMIT, kitPullRequest: KIT_PULL_REQUEST, reportPath: REPORT_PATH},
    limits: LIMITS,
    counts: {
      releaseStamps: releaseStamps.length,
      releaseStampsApi: releaseStamps.filter(s => s.lane === 'api').length,
      releaseStampsSdk: releaseStamps.filter(s => s.lane === 'sdk').length,
      sourceContractStamps: sourceContractStamps.length,
      sourceContractNotStamped: sourceContractNotStamped.length,
    },
    releaseStamps, sourceContractStamps, sourceContractNotStamped,
    outsideCatalog: [...releaseStamps, ...sourceContractStamps, ...sourceContractNotStamped].map(s => s.capability).filter(c => !known.has(c)).sort(),
  }, publication);
}

export const serialize = data => JSON.stringify(data, null, 2) + '\n';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/project-release-stamps.mjs <path-to-kit-report-dir>');
  const publication = json(new URL('../data/publication.json', import.meta.url));
  writeFileSync(new URL('../data/release-stamps-1.3.2.json', import.meta.url), serialize(projectReleaseStamps(process.argv[2], publication)));
}
