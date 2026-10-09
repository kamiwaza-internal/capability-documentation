import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {countStatuses, currentCapabilityView, summarizeCurrentView} from '../src/catalog.mjs';

const deepFreeze = value => {
  if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};
const evidence = (scenario, runFinishedAt) => ({scenario, build: 'develop@' + 'a'.repeat(12), outcome: 'passed', runFinishedAt, ingestedAt: '2026-01-03T00:00:00Z', recordSha256: 'f'.repeat(64)});
const cap = (id, extra = {}) => ({
  id, title: 'Title ' + id, distribution: 'public', summary: 'Current text ' + id, conditions: [], limits: [],
  status: 'prerelease-verified', verificationBasis: 'historical-scenario', assessment: null, wholeClaim: false,
  releaseStatus: 'not-stamped', evidence: [evidence('S-1', '2026-01-01T00:00:00Z'), evidence('S-2', '2026-01-02T00:00:00Z')], declaration: null, ...extra,
});
const observation = (day, rows, version = '9.9.0') => ({
  id: 'obs-' + day, target: {version, environment: 'local'},
  evidenceWindow: {earliestStartedAt: `2026-02-${day}T00:00:00Z`, latestFinishedAt: `2026-02-${day}T01:00:00Z`},
  capabilities: rows,
});
const result = (id, passedScenarios, failedScenarios, extra = {}) => ({id, passedScenarios, passedWithNotesScenarios: 0, failedScenarios, ...extra});
const publication = (capabilities, observations = []) => deepFreeze({
  schema: 5,
  releases: [
    {id: 'old-r1', version: '9.9.0', publicationRevision: 1, baselineKind: 'source-declaration',
      capabilities: [cap('synthetic.gap', {status: 'untested', summary: 'OLD TEXT MUST NOT LEAK', evidence: []})]},
    {id: 'pre-r2', version: '9.9.0', publicationRevision: 2, baselineKind: 'prerelease-evidence', capabilities},
  ],
  observations,
});
const view = (capabilities, observations) => currentCapabilityView(publication(capabilities, observations));
const whole = {scope: 'whole-capability'};

test('CUR-A untested, skipped, absent later results and missing text never erase verification', () => {
  const rows = view([cap('synthetic.untested'), cap('synthetic.skipped'), cap('synthetic.absent'), cap('synthetic.gap', {title: null, summary: null})], [
    observation('01', [result('synthetic.untested', 0, 0, whole), result('synthetic.skipped', 0, 0, {...whole, skippedScenarios: 3})]),
  ]);
  assert.deepEqual(rows.map(row => row.status), ['verified', 'verified', 'verified', 'verified']);
  assert.deepEqual(rows.map(row => row.documentationGap), [false, false, false, true]);
  assert.deepEqual(rows.map(row => row.history.length), [1, 1, 1, 1]);
  const gap = rows[3];
  assert.equal(gap.summary, null);
  assert.equal(gap.olderDescriptionIn, 'old-r1');
  assert.ok(!JSON.stringify(gap).includes('OLD TEXT MUST NOT LEAK'));
  assert.equal(rows[0].olderDescriptionIn, null);
});

test('CUR-B later applicable failure supersedes and keeps the original acceptance as history', () => {
  for (const contract of [whole, {scenario: 'S-1'}]) {
    const [row] = view([cap('synthetic.a')], [observation('01', [result('synthetic.a', 0, 1, contract)])]);
    assert.equal(row.status, 'superseded');
    assert.equal(row.acceptedAt, '2026-01-02T00:00:00Z');
    assert.deepEqual(row.history.map(h => [h.event, h.source]), [['accepted', 'pre-r2'], ['failed', 'obs-01']]);
    assert.equal(row.lineage.evidence.length, 2);
    assert.equal(row.laterNonApplicableFailure, false);
  }
});

test('CUR-C later qualifying pass after the failure verifies again and keeps the failure in history', () => {
  // Observations are supplied out of order: dates, not array position, decide what is later.
  const [row] = view([cap('synthetic.a')], [
    observation('02', [result('synthetic.a', 1, 0, {scenario: 'S-1'})]),
    observation('01', [result('synthetic.a', 0, 1, {scenario: 'S-1'})]),
  ]);
  assert.equal(row.status, 'verified');
  assert.deepEqual(row.history.map(h => h.event), ['accepted', 'failed', 'passed']);
  // A pass on a different accepted scenario does not clear the failure; a whole-capability pass does.
  const other = [observation('01', [result('synthetic.a', 0, 1, {scenario: 'S-1'})]), observation('02', [result('synthetic.a', 1, 0, {scenario: 'S-2'})])];
  assert.equal(view([cap('synthetic.a')], other)[0].status, 'superseded');
  assert.equal(view([cap('synthetic.a')], [...other, observation('03', [result('synthetic.a', 1, 0, whole)])])[0].status, 'verified');
});

test('CUR-D later failure on an unrelated version or scope is surfaced but changes nothing', () => {
  const cases = [
    observation('01', [result('synthetic.a', 0, 1, whole)], '9.9.2'), // other version
    observation('01', [result('synthetic.a', 0, 1, {scenario: 'S-UNRELATED'})]), // other scenario
    observation('01', [result('synthetic.a', 0, 1)]), // scope not stated, as in the published observations
  ];
  for (const later of cases) {
    const [row] = view([cap('synthetic.a')], [later]);
    assert.equal(row.status, 'verified');
    assert.equal(row.laterNonApplicableFailure, true);
    assert.equal(row.history.length, 1);
    assert.deepEqual(row.later, [{observationId: 'obs-01', version: later.target.version, environment: 'local',
      startedAt: '2026-02-01T00:00:00Z', finishedAt: '2026-02-01T01:00:00Z',
      passedScenarios: 0, passedWithNotesScenarios: 0, failedScenarios: 1, applicable: false, contract: later === cases[0] ? 'whole-capability' : null}]);
  }
  // A failure that predates the acceptance is not later.
  const earlier = {...observation('01', [result('synthetic.a', 0, 1, whole)]), evidenceWindow: {earliestStartedAt: '2025-12-01T00:00:00Z', latestFinishedAt: '2025-12-01T01:00:00Z'}};
  assert.deepEqual(view([cap('synthetic.a')], [earlier])[0].later, []);
});

test('CUR-E evidence lineage passes through unmodified, in order, without mutating the input', () => {
  const assessment = {basis: 'developer-assessment', assessedAt: '2026-01-05T00:00:00Z', observedSourceRevision: 'b'.repeat(40)};
  const input = publication([
    cap('synthetic.gap-status', {status: 'not-yet-verified', verificationBasis: 'none', evidence: []}),
    cap('synthetic.scenario', {releaseStatus: 'failed'}),
    cap('synthetic.assessed', {verificationBasis: 'developer-assessment', assessment, evidence: []}),
  ], [observation('01', [result('synthetic.scenario', 0, 1, whole)])]);
  const before = JSON.stringify(input);
  const rows = currentCapabilityView(input); // input is deeply frozen: any write throws
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(rows.map(row => row.id), ['synthetic.assessed', 'synthetic.scenario', 'synthetic.gap-status']); // verified, superseded, gap
  const source = id => input.releases[1].capabilities.find(c => c.id === id);
  const [assessed, scenario, unverified] = rows;
  assert.equal(scenario.lineage.evidence, source('synthetic.scenario').evidence); // same records, same order
  assert.deepEqual(scenario.lineage, {releaseId: 'pre-r2', version: '9.9.0', verificationBasis: 'historical-scenario', evidence: source('synthetic.scenario').evidence, assessment: null, wholeClaim: false});
  assert.equal(scenario.lineage.evidence[1].recordSha256, 'f'.repeat(64));
  assert.equal(scenario.lineage.evidence[1].build, 'develop@' + 'a'.repeat(12));
  assert.equal(scenario.acceptedAt, '2026-01-02T00:00:00Z'); // latest run, not the first
  // A failed release check is a separate flag; supersession came from the applicable failure only.
  assert.deepEqual([scenario.releaseCheckFailed, scenario.releaseStatus, assessed.releaseCheckFailed], [true, 'failed', false]);
  assert.equal(assessed.lineage.assessment, assessment);
  assert.equal(assessed.acceptedAt, '2026-01-05T00:00:00Z');
  assert.deepEqual([unverified.status, unverified.acceptedAt, unverified.history.length], ['not-yet-verified', null, 0]);
  assert.deepEqual(currentCapabilityView({releases: input.releases.slice(0, 1)}), []); // no acceptance record, no rows
});

test('CUR-F published data: 50 verifications retained, 4 later non-applicable failures, 37 documentation gaps', () => {
  const published = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
  const rows = currentCapabilityView(deepFreeze(published));
  assert.deepEqual(summarizeCurrentView(rows), {
    capabilities: 88, verified: 50, scenarioBacked: 33, developerAssessed: 17, superseded: 0, laterNonApplicableFailure: 4,
    documentationGap: 37, failedOrMixed: 5, notYetVerified: 33, releaseVerified: 0, releaseCheckFailed: 1,
  });
  assert.equal(new Set(rows.map(row => row.id)).size, 88);
  assert.ok(rows.slice(0, 50).every(row => row.status === 'verified'), 'verified rows come first');
  assert.deepEqual(rows.filter(row => row.laterNonApplicableFailure).map(row => row.id).sort(),
    ['catalog.writable-datasets', 'connectors.connector-builder', 'kaizen.notifications-inbox', 'kaizen.product-identity']);
  for (const row of rows.filter(r => r.laterNonApplicableFailure)) {
    assert.deepEqual(row.later.map(l => [l.version, l.environment, l.passedScenarios, l.failedScenarios, l.applicable]), [['1.3.2', 'local', 0, 1, false]]);
  }
  // Never relabelled as 1.3.2 or as release verified.
  assert.ok(rows.every(row => row.lineage.version === '1.3.0' && row.lineage.releaseId === '1.3.0-prerelease-r3' && row.releaseStatus !== 'verified' && row.lineage.wholeClaim === false));
  assert.equal(rows.find(row => row.id === 'platform.news-feed').status, 'verified');
  assert.equal(rows.find(row => row.id === 'platform.news-feed').releaseCheckFailed, true);
  // No older release text in a current row: every summary is the r3 value, gaps stay null.
  const [r1, r2, r3] = published.releases;
  const current = new Map(r3.capabilities.map(c => [c.id, c]));
  for (const row of rows) {
    assert.equal(row.summary, current.get(row.id).summary);
    assert.equal(row.documentationGap, row.summary === null);
    for (const old of [r1, r2]) {
      const text = old.capabilities.find(c => c.id === row.id)?.summary;
      if (row.documentationGap && text) assert.ok(!JSON.stringify(row).includes(JSON.stringify(text)), row.id);
    }
  }
  assert.equal(rows.filter(row => row.status === 'verified' && row.olderDescriptionIn === '1.3.0-declared-r2').length, 22);
});

test('CAT-5 statuses outside the original four are counted, never NaN', () => {
  assert.deepEqual(countStatuses([{status: 'prerelease-verified'}, {status: 'prerelease-verified'}, {status: 'untested'}]),
    {verified: 0, partial: 0, failed: 0, untested: 1, 'prerelease-verified': 2});
});

// ponytail: compiles the one component with the Babel that Docusaurus installs (a transitive
// dependency). Move to a declared devDependency if a Docusaurus upgrade stops hoisting it.
async function renderCurrentView(props) {
  const {default: babel} = await import('@babel/core');
  const {createElement} = await import('react');
  const {renderToStaticMarkup} = await import('react-dom/server');
  const {code} = babel.transformSync(readFileSync(new URL('../src/CurrentView.jsx', import.meta.url), 'utf8'),
    {babelrc: false, configFile: false, presets: [fileURLToPath(import.meta.resolve('@babel/preset-react'))]});
  const file = join(mkdtempSync(join(tmpdir(), 'current-view-')), 'CurrentView.mjs');
  writeFileSync(file, code.replace("'./catalog.mjs'", JSON.stringify(new URL('../src/catalog.mjs', import.meta.url).href)).replace("from 'react'", 'from ' + JSON.stringify(import.meta.resolve('react'))));
  return renderToStaticMarkup(createElement((await import(file)).default, props));
}
const occurrences = (html, text) => html.split(text).length - 1;

test('CUR-G rendered page: stamp badges, counts and paragraphs appear only for the publication the stamps were projected against', async () => {
  const published = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
  const localStamps = JSON.parse(readFileSync(new URL('../data/local-stamps.json', import.meta.url), 'utf8'));
  const releaseStamps = JSON.parse(readFileSync(new URL('../data/release-stamps-1.3.2.json', import.meta.url), 'utf8'));
  const badge = text => '<span class="status">' + text + '</span>';
  const counts = html => [badge('Release stamped · v1.3.2'), badge('Source-contract verified · v1.3.2 · not runtime evidence'), badge('Local 1.3.2 scoped stamp')].map(text => occurrences(html, text));

  const real = await renderCurrentView({publication: published, localStamps, releaseStamps});
  assert.deepEqual(counts(real), [29, 16, 30]);
  assert.ok(real.includes('/local-stamps.json') && real.includes('/release-stamps-1.3.2.json'));

  // v1.3.2 leads: computed headline and its limits first, the 1.3.0 counts only under the "Earlier" sub-heading.
  const text = real.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'");
  const at = needle => { const index = text.indexOf(needle); assert.notEqual(index, -1, needle); return index; };
  const lead = text.slice(at('Current capability status'), at('Earlier: 1.3.0 pre-release baseline'));
  assert.ok(lead.startsWith('Current capability status45 of 88 capabilities stamped for v1.3.2: 29 release stamped (live run on the v1.3.2 build) · 16 source-contract verified (tests on v1.3.2 source, not runtime evidence) · 43 not stampedNot human release sign-off.'), lead.slice(0, 300));
  for (const limit of ["registered test scenarios, not every operation", 'operator-asserted from a CI image-digest match', 'local cluster', 'the capability kit pull request']) assert.ok(lead.includes(limit), limit);
  assert.ok(!lead.includes('release verified') && !/certified/i.test(real));
  assert.ok(at('0 of 88 release verified') > at('Earlier: 1.3.0 pre-release baseline'));
  // Rows: release stamped, then source-contract, then the rest, each in the unstamped order; history stays on a second line.
  const ids = html => [...html.matchAll(/href="#current--1\.3\.0--([^"]+)"/g)].map(match => match[1]);
  const stamped = list => new Set(list.map(stamp => stamp.capability));
  const released = stamped(releaseStamps.releaseStamps), contracts = stamped(releaseStamps.sourceContractStamps);
  const baseOrder = currentCapabilityView(published).map(row => row.id);
  assert.deepEqual(ids(real), [...baseOrder.filter(id => released.has(id)), ...baseOrder.filter(id => contracts.has(id)), ...baseOrder.filter(id => !released.has(id) && !contracts.has(id))]);
  assert.ok(released.has(ids(real)[0]));
  for (const heading of ['Release stamped for v1.3.2 (29)', 'Source-contract verified for v1.3.2 (16)', 'Not stamped for v1.3.2 (43)']) assert.equal(occurrences(real, '<th colSpan="5" scope="colgroup">' + heading + '</th>'), 1, heading);
  assert.deepEqual([occurrences(real, '<br/>1.3.0 pre-release: '), occurrences(real, '<br/>No v1.3.2 stamp</td>')], [45, 43]);

  // Same rows under another baseline id: every stamped capability is still on the page, and none is badged.
  const other = structuredClone(published);
  other.releases.find(r => r.id === localStamps.baselineReleaseId).id = 'other-prerelease-r3';
  const none = await renderCurrentView({publication: other, localStamps, releaseStamps});
  assert.ok(none.includes('Current capability status') && none.includes('auth.session-revocation'));
  for (const absent of ['Release stamped', 'release stamped', 'Source-contract verified', 'source-contract verified', 'scoped stamp', 'stamps.json', 'v1.3.2', 'capability-kit/pull', 'Earlier:', 'colgroup', 'Not stamped', 'pre-release: ']) {
    assert.ok(!none.includes(absent), absent);
  }
  assert.deepEqual(ids(none), baseOrder); // order and statuses as before the stamps existed
  assert.ok(none.includes('<caption>Current status per capability, verified first</caption>'));
  assert.equal(occurrences(none, '<td>Pre-release verified · not release verified</td>'), 50);

  // Baseline present, named observation absent: the local stamps do not apply, the release stamps still do.
  const noObservation = {...published, observations: []};
  const releaseOnly = await renderCurrentView({publication: noObservation, localStamps, releaseStamps});
  assert.deepEqual(counts(releaseOnly), [29, 16, 0]);
  assert.ok(!releaseOnly.includes('scoped stamp') && !releaseOnly.includes('/local-stamps.json'));
});
