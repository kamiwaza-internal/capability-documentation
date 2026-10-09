// Sanitized public projection of the kit's local scoped verification stamp set.
// Usage: node scripts/project-local-stamps.mjs <path-to-kit-local-verification-stamps.json>
// Writes data/local-stamps.json. Deterministic: same kit bytes, same output bytes.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateLocalStamps} from './local-stamps.mjs';

// ponytail: provenance of the one stamp set published so far is pinned here, not derived from
// the kit checkout, so regeneration stays byte-identical. Move to arguments when a second set exists.
const KIT_COMMIT = '2084f77bf00fb8f7924aa08fc50fbf43ecb1163a';
const KIT_PULL_REQUEST = 'https://github.com/kamiwaza-internal/capability-kit/pull/82';
const STAMP_SET_PATH = 'reports/2026-10-09-1.3.2-local-verification-stamps/local-verification-stamps.json';

const utc = value => value.replace(/\+00:00$/, 'Z');

export function projectLocalStamps(bytes) {
  const kit = JSON.parse(bytes);
  if (kit.schema !== 'local-verification-stamp-set.v1') throw new Error('Unsupported kit stamp set schema');
  if (!String(kit.environment).startsWith('local')) throw new Error('Not a local run');
  const core = kit.build_identity.source_ref_recheck.repositories.core;
  const coreSource = {ref: core.remote_ref.replace(/^refs\/heads\//, ''), commit: core.head};
  // The recorded build strings must name the same core ref and commit; only that part is published.
  const builds = [...kit.build_identity.record_build_strings, ...kit.stamps.flatMap(s => s.scenarios.map(x => x.build))];
  if (!builds.every(build => build.includes(coreSource.ref + '@' + coreSource.commit))) throw new Error('Core source does not match the recorded builds');
  // Deliberately dropped: record file paths, full build strings, image digests, registry hosts,
  // local patch names, capture error text and every other build_identity field.
  return validateLocalStamps({
    schema: 'local-stamp-projection.v1',
    kind: kit.kind,
    releaseVerified: kit.release_verified,
    notAReleaseStamp: kit.not_a_release_stamp,
    targetVersion: kit.target_version,
    environment: 'local', // same label as the published observations; the cluster flavour is not published
    runWindow: {earliestStartedAt: utc(kit.run_window.earliest_started_at), latestFinishedAt: utc(kit.run_window.latest_finished_at)},
    source: {
      kitRepository: 'kamiwaza-internal/capability-kit', kitCommit: KIT_COMMIT, kitPullRequest: KIT_PULL_REQUEST,
      stampSetPath: STAMP_SET_PATH, packetPath: kit.source_packet.path,
      stampSetSha256: createHash('sha256').update(bytes).digest('hex'),
    },
    coreSource,
    limits: kit.limits,
    counts: {
      capabilitiesInPacket: kit.counts.capabilities_in_packet,
      capabilitiesWithoutFreshRecord: kit.counts.capabilities_without_fresh_record,
      stamps: kit.counts.stamps,
      notStampedFailed: kit.counts.not_stamped_failed,
      stampedScenarioEntries: kit.counts.stamped_scenario_entries,
    },
    stamps: kit.stamps.map(stamp => ({
      capability: stamp.capability, stampSha256: stamp.stamp_sha256,
      scenarios: stamp.scenarios.map(s => ({scenarioId: s.scenario_id, lane: s.lane, status: s.status,
        startedAt: utc(s.started_at), finishedAt: utc(s.finished_at), recordSha256: s.record_sha256})),
    })),
    notStampedFailed: kit.not_stamped_failed.map(entry => ({capability: entry.capability, failedScenarios: entry.failed_scenarios})),
  });
}

export const serialize = data => JSON.stringify(data, null, 2) + '\n';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/project-local-stamps.mjs <path-to-kit-json>');
  writeFileSync(new URL('../data/local-stamps.json', import.meta.url), serialize(projectLocalStamps(readFileSync(process.argv[2]))));
}
