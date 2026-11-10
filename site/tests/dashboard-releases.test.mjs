import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dashboardReleases} from '../src/dashboard-releases.mjs';
import {evidenceVersions} from '../src/evidence.mjs';
import {loadReleaseCorpora} from '../scripts/release-corpora.mjs';
import {loadReleaseWork, releaseWorkSiteData} from '../scripts/release-work.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {validateStreams} from '../scripts/value-streams.mjs';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url)));
const publication = read('publication.json');
const sources = {publication, releaseStamps: read('release-stamps-1.3.2.json'), corpora: loadReleaseCorpora(),
  releaseWork: loadReleaseWork({publication}).map(releaseWorkSiteData), currentVerification: [],
  streams: validateStreams(read('value-streams.json'), publication)};
const dashboards = dashboardReleases(sources);

function newRelease(version) {
  const release = structuredClone(publication.releases.find(row => row.baselineKind === undefined));
  return {...release, version, id: `${version}-tested-r1`, publicationRevision: 1, build: `${version}; synthetic build`,
    capabilities: [{id: 'synthetic.new-release', title: 'New release capability', summary: 'Synthetic release intake.',
      conditions: ['Synthetic condition'], limits: ['Synthetic limit'], distribution: 'public', status: 'untested', wholeClaim: false, evidence: []}]};
}

test('dashboard discovery matches every homepage/download release and defaults to the newest', () => {
  const expected = evidenceVersions(publication, sources.releaseStamps, sources.corpora, [], sources.releaseWork);
  assert.deepEqual(dashboards.map(row => row.release), expected.map(row => row.version));
  assert.equal(dashboards[0].release, '1.3.5');
  assert.deepEqual(dashboards.map(row => row.capabilities.length), [87, 107, 87, 88, 8]);
});

test('a new published release appears with its own capabilities without any dashboard or corpus registration', () => {
  const next = structuredClone(publication);
  next.releases.push(newRelease('1.10.0'), newRelease('1.9.0'));
  validatePublication(next);
  const rows = dashboardReleases({...sources, publication: next});
  assert.deepEqual(rows.slice(0, 2).map(row => row.release), ['1.10.0', '1.9.0']);
  assert.equal(rows[0].capabilities[0].id, 'synthetic.new-release');
  assert.deepEqual(rows[0].capabilities[0].limits, ['Synthetic limit']);
  assert.deepEqual(rows[0].recipes, []);
  assert.deepEqual(rows[0].establishedScopedProofs, []);
});

test('replay-only releases are discovered and select the newest evidence revision without losing exclusions or failures', () => {
  const next = structuredClone(publication);
  const original = next.releaseStamps.at(-1);
  const capability = {...original.capabilities[0], id: 'synthetic.new-release', status: 'not-stamped', scope: 'New release scoped gap.', failures: [{finishedAt: '2026-10-20T00:00:00Z', summary: 'Synthetic retained failure', resolvedByStampId: null}]};
  next.releaseStamps.push({...original, version: '1.10.0', id: 'synthetic-replay-r1', publicationRevision: 1, capabilities: [capability]});
  next.releaseStamps.push({...original, version: '1.10.0', id: 'synthetic-replay-r2', publicationRevision: 2,
    capabilities: [{...capability, disposition: 'excluded', scope: 'Revised exclusion.'}]});
  const row = dashboardReleases({...sources, publication: next})[0];
  assert.equal(row.release, '1.10.0');
  assert.equal(row.capabilities.length, 1);
  assert.equal(row.capabilities[0].disposition, 'excluded');
  assert.ok(row.capabilities[0].details.some(item => item.value === 'Revised exclusion.'));
  assert.ok(row.capabilities[0].details.some(item => item.value.includes('Synthetic retained failure')));
  assert.deepEqual(row.recipes, []);
});

test('target-work evidence retains the original version and qualification wording instead of inheriting recipe proofs', () => {
  const work = dashboards[0];
  assert.equal(work.release, '1.3.5');
  assert.deepEqual(work.recipes, []);
  const cap = work.capabilities.find(row => row.id === 'apps.app-garden');
  assert.ok(cap.details.some(item => item.value === '1.3.4'));
  assert.ok(cap.details.some(item => /carried into 1.3.5/.test(item.value)));
  assert.ok(cap.limits.length > 0);
  assert.equal(dashboards.find(row => row.release === '1.3.4').recipes.length, 32);
});

test('recipe ingredients from an accepted sidecar stay distinct from proof and never attach to another release', () => {
  const streams = {streams: [{id: 'Synthetic:Recipe', title: 'Synthetic recipe', recipe: {source_version: '1.3.5',
    revision: 1, steps: [{capability_ids: ['apps.app-garden']}], limits: ['Synthetic recipe limit']}}]};
  const rows = dashboardReleases({...sources, streams});
  assert.deepEqual(rows[0].recipes[0].capabilityIds, ['apps.app-garden']);
  assert.deepEqual(rows[0].recipes[0].reviewedVerifies, []);
  assert.equal(rows[0].recipes[0].scopedSdkProof, 'none');
  assert.equal(rows.find(row => row.release === '1.3.0').recipes.length, 0);
  assert.equal(sources.streams, null, 'the existing stale sidecar must remain disabled');
});

test('discovery is a presentation projection and never mutates canonical evidence', () => {
  const before = JSON.stringify(sources);
  dashboardReleases(sources);
  assert.equal(JSON.stringify(sources), before);
});


test('a revised publication refreshes the same release without retaining stale capability rows', () => {
  const older = newRelease('1.10.0');
  const updated = {...newRelease('1.10.0'), id: '1.10.0-tested-r2', publicationRevision: 2};
  updated.capabilities[0].title = 'Updated release capability';
  updated.capabilities[0].limits = ['Updated limit'];
  const next = {...publication, releases: [...publication.releases, older, updated]};
  const rows = dashboardReleases({...sources, publication: next});
  assert.equal(rows.filter(row => row.release === '1.10.0').length, 1);
  assert.equal(rows[0].capabilities[0].title, 'Updated release capability');
  assert.deepEqual(rows[0].capabilities[0].limits, ['Updated limit']);
});


test('a corpus current-verification update is read automatically without changing its original snapshot statuses', () => {
  const corpora = structuredClone(sources.corpora).map(({presentation, originalReplayId, ...row}) => row);
  const updated = corpora[0].currentVerification.capabilities.find(row => row.status === 'accepted-scoped-release');
  updated.scopeNote = 'Synthetic scope interpretation retained on update.';
  const entry = dashboardReleases({...sources, corpora}).find(row => row.release === '1.3.4');
  const accepted = corpora[0].currentVerification.capabilities.find(row => row.status === 'accepted-scoped-release');
  const cap = entry.capabilities.find(row => row.id === accepted.id);
  assert.ok(cap.details.some(item => item.value === 'accepted-scoped-release'));
  assert.ok(cap.details.some(item => item.value === 'Synthetic scope interpretation retained on update.'));
  assert.ok(cap.details.some(item => item.label === 'Snapshot prerelease status'));
  assert.equal(cap.details.find(item => item.label === 'Observation finished').value, accepted.finishedAt);
  assert.equal(entry.capabilities.length, corpora[0].catalog.capabilities.length);
});
