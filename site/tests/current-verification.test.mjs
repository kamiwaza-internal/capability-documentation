import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadCurrentVerification, publishCurrentVerification, publishVerificationHistory, projectReleaseLineStamp} from '../scripts/current-verification.mjs';
import {recipeGuide, verificationLabel, verificationDocument} from '../src/verification-guide.mjs';
import {agentsMd} from '../src/evidence.mjs';
const source = JSON.parse(readFileSync(new URL('../static/verification-results/1.3.4-2026-10-22-markings/results.json', import.meta.url)));

test('current release status preserves historical evidence and rejects inconsistent credit', t => {
  const root = mkdtempSync(join(tmpdir(), 'current-verification-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const path = 'verification-results/1.3.4-2026-10-22-test/results.json';
  mkdirSync(join(root, 'site/static/verification-results/1.3.4-2026-10-22-test'), {recursive:true});
  const load = report => {
    const bytes = JSON.stringify(report);
    writeFileSync(join(root, 'site/static', path), bytes);
    return loadCurrentVerification(root, {path, sha256:createHash('sha256').update(bytes).digest('hex')});
  };
  const report = load(source);
  assert.equal(report.counts.acceptedScoped, 67);
  assert.equal(report.historicalPrerelease.length, 58);
  for (const mutate of [r => r.counts.acceptedScoped++, r => r.capabilities.push(r.capabilities[0]),
    r => r.capabilities[0].historicalPrerelease = false, r => r.capabilities[0].stampId = 'invented',
    r => r.capabilities[0].sourceCommit = '0'.repeat(40)]) {
    const bad = structuredClone(source); mutate(bad); assert.throws(() => load(bad));
  }
  assert.throws(() => loadCurrentVerification(root, {path, sha256:'0'.repeat(64)}), /digest mismatch/);
});

test('human guide links each recipe ingredient to current scoped status without promoting prerelease', () => {
  const blocks = recipeGuide(source);
  const text = blocks.map(b => b.text).join('\n');
  for (const heading of ['Recipe 1:', 'Ingredient glossary', 'tested scope and limits', 'Expected result']) assert.ok(text.includes(heading));
  for (const row of source.capabilities) assert.ok(text.includes(`Ingredient: ${row.id}`));
  assert.equal(verificationLabel({status:'not-release-verified', historicalPrerelease:true}), 'Prerelease verified — release acceptance pending');
  assert.ok(text.includes('not a completed release UI verification'));
  assert.ok(text.includes('67 of 87'));
  const agent = agentsMd('1.3.4');
  for (const phrase of ['Do not generate a vendor response', 'Release verified — carried forward', 'current-verification.json']) assert.ok(agent.includes(phrase));
});


test('detailed report preserves the explanation separating current OAuth proof from inherited limitations', () => {
  const row = source.capabilities.find(row => row.id === 'connectors.user-oauth-authorization');
  const text = verificationDocument(source).map(b => b.text).join('\n');
  assert.ok(text.includes(row.scopeNote));
  assert.ok(text.includes('Historical statements about missing release proof do not override'));
});

test('immutable current snapshots publish exact reviewed bytes independently of report pairs', t => {
  const root = mkdtempSync(join(tmpdir(), 'current-snapshot-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const path = 'current-verification/1.3.4/2026-10-23-reviewed.json';
  const folder = join(root, 'site/static/current-verification/1.3.4');
  mkdirSync(folder, {recursive:true});
  const bytes = JSON.stringify(source);
  writeFileSync(join(root, 'site/static', path), bytes);
  const binding = {path, sha256:createHash('sha256').update(bytes).digest('hex')};
  const out = join(root, 'build');
  assert.equal(loadCurrentVerification(root, binding).counts.acceptedScoped, 67);
  publishCurrentVerification(root, binding, out);
  assert.equal(readFileSync(join(out, path), 'utf8'), bytes);
  const old = 'current-verification/1.3.4/2026-10-22-reviewed.json';
  writeFileSync(join(root, 'site/static', old), bytes);
  publishVerificationHistory(root, out);
  assert.equal(readFileSync(join(out, old), 'utf8'), bytes);
  for (const path of ['current-verification/1.3.4/../../private.json', '/current-verification/1.3.4/2026-10-23-reviewed.json', 'unreviewed/1.3.4/2026-10-23-reviewed.json']) {
    assert.throws(() => publishCurrentVerification(root, {...binding, path}, out));
  }
  assert.throws(() => publishCurrentVerification(root, {...binding, sha256:'0'.repeat(64)}, out), /digest mismatch/);
  const wrongVersion = 'current-verification/1.4.0/2026-10-23-reviewed.json';
  mkdirSync(join(root, 'site/static/current-verification/1.4.0'), {recursive:true});
  writeFileSync(join(root, 'site/static', wrongVersion), bytes);
  assert.throws(() => publishCurrentVerification(root, {...binding, path:wrongVersion}, out), /path\/version mismatch/);
});


test('human glossary uses curated current scope while detailed evidence retains historical assumptions', () => {
  const report = structuredClone(source);
  const row = report.capabilities.find(row => row.id === 'kaizen.agent-packages');
  row.scopeNote = 'Live package journey passed; generic automatic routing is not verified.';
  row.assumptions = ['Historical unit tests did not execute a model.'];
  const human = recipeGuide(report).map(b => b.text).join('\n');
  assert.ok(human.includes(row.scopeNote));
  assert.ok(!human.includes(row.assumptions[0]));
  const detail = verificationDocument(report).map(b => b.text).join('\n');
  assert.ok(detail.includes(row.scopeNote));
  assert.ok(detail.includes(row.assumptions[0]));
});

test('accepted package publication adds exactly two IDs and retains historical rows and scope', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const bytes = readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-package-delegation.json'));
  const current = loadCurrentVerification(root, {path:'current-verification/1.3.4/2026-10-23-package-delegation.json',sha256:createHash('sha256').update(bytes).digest('hex')});
  const prior = new Set(source.capabilities.filter(row => row.status === 'accepted-scoped-release').map(row => row.id));
  const newlyAccepted = current.capabilities.filter(row => row.status === 'accepted-scoped-release' && !prior.has(row.id));
  assert.deepEqual(newlyAccepted.map(row => row.id).sort(), ['kaizen.agent-auto-routing', 'kaizen.agent-packages']);
  assert.equal(current.counts.acceptedScoped, 69);
  assert.equal(current.counts.remaining, 18);
  assert.deepEqual(current.historicalPrerelease, source.historicalPrerelease);
  for (const row of source.capabilities.filter(row => prior.has(row.id))) {
    assert.deepEqual(current.capabilities.find(item => item.id === row.id), row);
  }
  const guide = recipeGuide(current).map(row => row.text).join('\n');
  const detail = verificationDocument(current).map(row => row.text).join('\n');
  for (const row of newlyAccepted) {
    assert.ok(guide.includes(row.scopeNote));
    for (const assumption of row.assumptions) assert.ok(detail.includes(assumption));
  }
  assert.ok(guide.includes('69 of 87'));
  assert.ok(guide.includes('Explicitly delegate to a member-selected agent'));
  assert.ok(guide.includes('Create and use an approved guidance-only package'));
  assert.ok(!guide.includes('Automatic specialist help in chat, with member pin and exclude policy'));
  assert.ok(detail.includes('Automatic specialist help in chat, with member pin and exclude policy'));
  assert.ok(guide.includes('authenticated administrative API calls'));
});


test('sandbox acceptance adds one ID without changing prior evidence or historical entries', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const path = 'current-verification/1.3.4/2026-10-23-sandbox.json';
  const current = loadCurrentVerification(root, {path, sha256:createHash('sha256').update(readFileSync(join(root, 'site/static', path))).digest('hex')});
  const prior = JSON.parse(readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-package-delegation.json')));
  assert.equal(current.counts.acceptedScoped, 70);
  assert.equal(current.counts.remaining, 17);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  for (const row of prior.capabilities.filter(row => row.id !== 'apps.sandbox-workload-provider'))
    assert.deepEqual(current.capabilities.find(item => item.id === row.id), row);
  const sandbox = current.capabilities.find(row => row.id === 'apps.sandbox-workload-provider');
  assert.equal(sandbox.status, 'accepted-scoped-release');
  assert.equal(current.sourceKitCommit, 'd16f17521f8d7ad9a824c99c7e903f0a35938bcb');
  const guide = recipeGuide(current).map(row => row.text).join('\n');
  assert.ok(guide.includes('Run disposable workers with ready capacity'));
  assert.ok(guide.includes('standard shared-kernel containers'));
});


test('recipes start on new pages and end with scope, while every glossary status is explicit', () => {
  const blocks = recipeGuide(source);
  const starts = blocks.filter(b => b.type === 'h' && /^Recipe \d+:/.test(b.text));
  assert.ok(starts.length > 0);
  for (const [index, start] of starts.entries()) {
    assert.equal(start.pageBreakBefore, true);
    const end = blocks.findIndex(b => b.text === `End of recipe ${index + 1}: tested scope and limits`);
    assert.ok(end > blocks.indexOf(start));
    assert.ok(blocks[end + 1].text.length > 0);
  }
  const glossary = blocks.slice(blocks.findIndex(b => b.text === 'Ingredient glossary'));
  const statuses = glossary.filter(b => b.callout);
  assert.equal(statuses.length, source.capabilities.length);
  for (const [index, status] of statuses.entries()) {
    assert.equal(status.text, `**${verificationLabel(source.capabilities[index])}**`);
    assert.equal(status.tone, source.capabilities[index].status === 'accepted-scoped-release' ? 'green' : 'amber');
  }
});

test('mixed release-line evidence requires a matching reviewed source and intact stamp', t => {
  const root = mkdtempSync(join(tmpdir(), 'release-line-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const path = 'current-verification/1.3.4/2026-10-23-release-line.json';
  mkdirSync(join(root, 'site/static/current-verification/1.3.4'), {recursive:true});
  const report = structuredClone(source), row = report.capabilities.find(row => row.stampId);
  const hash = value => createHash('sha256').update(JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)).digest('hex');
  row.sourceCommit = '1'.repeat(40);
  const stamp = {schema:'capability-release-stamp.v1', target_release:report.version, capability:row.id,
    release_source:{repository:'kamiwaza-internal/kamiwaza', ref:'release/1.3.0', source_commit:row.sourceCommit, source_commit_basis:row.sourceBasis},
    manifest_id:'sha256:' + row.manifestId, finished_at:row.finishedAt, replayed_kits:row.kits, assumptions:row.assumptions, limits:row.limits};
  stamp.id = hash(stamp);
  row.stampId = stamp.id;
  row.sourceStampSha256 = hash(stamp);
  row.releaseLine = {ref:'release/1.3.0', sourceKitCommit:report.sourceKitCommit,
    reviewReference:'https://github.com/kamiwaza-internal/capability-kit/pull/1', stampProjection:projectReleaseLineStamp(stamp)};
  row.releaseLine.projectionSha256 = hash(row.releaseLine.stampProjection);
  const load = value => {
    const bytes = JSON.stringify(value);
    writeFileSync(join(root, 'site/static', path), bytes);
    return loadCurrentVerification(root, {path, sha256:createHash('sha256').update(bytes).digest('hex')});
  };
  assert.equal(load(report).capabilities.find(item => item.id === row.id).sourceCommit, row.sourceCommit);
  for (const mutate of [r => delete r.releaseLine, r => delete r.releaseLine.reviewReference,
    r => r.releaseLine.sourceKitCommit = '2'.repeat(40), r => r.releaseLine.ref = 'main',
    r => r.sourceCommit = source.sourceCoreCommit, r => r.manifestId = '3'.repeat(64),
    r => r.limits.push('Unproven claim'), r => r.releaseLine.stampProjection.finished_at = 'changed',
    r => r.sourceStampSha256 = '4'.repeat(64),
    r => r.releaseLine.stampProjection.release_source.images = {private:'registry.example/image'},
    r => r.releaseLine.stampProjection.evidence = [{path:'private-record.json'}]]) {
    const invalid = structuredClone(report);
    mutate(invalid.capabilities.find(item => item.id === row.id));
    assert.throws(() => load(invalid));
  }
  for (const ref of ['release/9.9.9', 'release/1.4.0', 'release/1.3.5']) {
    const invalid = structuredClone(report), changed = invalid.capabilities.find(item => item.id === row.id);
    changed.releaseLine.ref = ref;
    changed.releaseLine.stampProjection.release_source.ref = ref;
    changed.releaseLine.projectionSha256 = hash(changed.releaseLine.stampProjection);
    assert.throws(() => load(invalid), /Release branch must match/);
  }
  assert.equal(load(source).sourceCoreCommit, source.sourceCoreCommit);
});


test('accepted ingestion adds one scoped release-line result while retaining the complete baseline', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const current = JSON.parse(readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-ingestion.json')));
  const prior = JSON.parse(readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-sandbox.json')));
  assert.equal(current.counts.acceptedScoped, prior.counts.acceptedScoped + 1);
  assert.equal(current.counts.remaining, prior.counts.remaining - 1);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  assert.equal(current.sourceCoreCommit, prior.sourceCoreCommit);
  for (const row of prior.capabilities.filter(row => row.id !== 'ingestion.scheduled-ingest'))
    assert.deepEqual(current.capabilities.find(item => item.id === row.id), row);
  const row = current.capabilities.find(row => row.id === 'ingestion.scheduled-ingest');
  assert.equal(row.stampId, 'ef1462fbcd1d9eeedddf0596b3fc1a9cd392baf420f46a1e5a921a984a923904');
  assert.equal(row.releaseLine.sourceKitCommit, '8e0326453e206895a7f76227aaec2a9e12d26a5c');
  assert.notEqual(row.sourceCommit, current.sourceCoreCommit);
  const guide = recipeGuide(current).map(row => row.text).join('\n');
  assert.ok(guide.includes('Ingest a source, inspect a registered job, and trigger a managed connector'));
  assert.ok(guide.includes('Unattended schedule execution, execution durability and cross-tenant isolation were not exercised'));
  assert.ok(verificationDocument(current).some(block => block.text.includes('release/1.3.0@' + row.sourceCommit)));
});


test('private stamp intake checks the native ID and omits deployment inventory and raw evidence', () => {
  const hash = value => createHash('sha256').update(JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)).digest('hex');
  const stamp = {schema:'capability-release-stamp.v1', release_source:{repository:'kamiwaza-internal/kamiwaza', ref:'release/1.3.0', source_commit:'1'.repeat(40), source_commit_basis:'operator-asserted', images:{private:'ghcr.io/private/image'}}, evidence:[{path:'private-record.json'}]};
  stamp.id = hash(stamp);
  const projection = projectReleaseLineStamp(stamp);
  assert.equal(projection.sourceStampSha256, hash(stamp));
  assert.ok(!JSON.stringify(projection).includes('ghcr.io'));
  assert.ok(!JSON.stringify(projection).includes('private-record'));
  stamp.evidence[0].path = 'changed';
  assert.throws(() => projectReleaseLineStamp(stamp), /stamp ID mismatch/);
});


test('catalog adds exactly one result while preserving prior native stamps and historical scope', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const bytes = readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-24-catalog.json'));
  const current = loadCurrentVerification(root, {path: 'current-verification/1.3.4/2026-10-24-catalog.json', sha256: '9d818d810793a1a87fb79a1dbceb2a24585241f05b0a0596413d0928c3183d0c'});
  const prior = JSON.parse(readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-ingestion.json')));
  assert.equal(current.counts.acceptedScoped, 72);
  assert.equal(current.counts.remaining, 15);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  for (const old of prior.capabilities.filter(r => r.id !== 'catalog.dataset-registry')) {
    const expected = structuredClone(old);
    if (expected.releaseLine) expected.releaseLine.sourceKitCommit = current.sourceKitCommit;
    assert.deepEqual(current.capabilities.find(r => r.id === old.id), expected);
  }
  const row = current.capabilities.find(r => r.id === 'catalog.dataset-registry');
  assert.equal(row.stampId, '937d3d1ff215be46ab664b203d37b90ee87635941d0fa33fa2a30e3e48d3d7f7');
  assert.deepEqual(row.limits, row.releaseLine.stampProjection.limits);
  assert.ok(row.limits.some(x => x.includes('scheduled-ingest status failure remains unresolved')));
  assert.ok(row.scopeNote.includes('dated catalog report in the ZIP for historical evidence context'));
  const guide = recipeGuide(current).map(b => b.text).join('\n');
  assert.ok(guide.includes('Organize a dataset registry and enforce Workroom access'));
  assert.ok(guide.includes(row.scopeNote));
  assert.ok(verificationDocument(current).some(b => b.text.includes(row.scopeNote)));
});


test('CPU tenant proof adds one scoped ingredient and preserves all prior evidence', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const path = 'current-verification/1.3.4/2026-10-26-tenant-cpu.json';
  const bytes = readFileSync(join(root, 'site/static', path));
  const current = loadCurrentVerification(root, {path, sha256:createHash('sha256').update(bytes).digest('hex')});
  const priorBytes = readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-24-catalog.json'));
  assert.equal(createHash('sha256').update(priorBytes).digest('hex'), '9d818d810793a1a87fb79a1dbceb2a24585241f05b0a0596413d0928c3183d0c');
  const prior = JSON.parse(priorBytes);
  assert.equal(current.counts.acceptedScoped, 73);
  assert.equal(current.counts.remaining, 14);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  for (const old of prior.capabilities.filter(r => r.id !== 'models.tenant-mode-inference')) {
    const expected = structuredClone(old);
    if (expected.releaseLine) expected.releaseLine.sourceKitCommit = current.sourceKitCommit;
    assert.deepEqual(current.capabilities.find(r => r.id === old.id), expected);
  }
  const row = current.capabilities.find(r => r.id === 'models.tenant-mode-inference');
  assert.equal(row.status, 'accepted-scoped-release');
  assert.deepEqual(row.kits, ['sdk:tenant-cpu-arm64-async-profile-refusals']);
  assert.ok(row.limits.some(x => x.includes('CPU/ARM64/llama.cpp only')));
  assert.ok(row.limits.some(x => x.includes('complete implicit-negative matrix is not claimed')));
  const guide = recipeGuide(current).map(b => b.text).join('\n');
  assert.ok(guide.includes('Serve a model in a restricted CPU tenant'));
  assert.ok(guide.includes(row.scopeNote));
  assert.ok(guide.includes('2 CPU and 1 GiB'));
  assert.ok(guide.includes('restricted CPU tenant (ARM64 / llama.cpp)'));
  assert.ok(!guide.includes('Serve CPU and NVIDIA GPU models on a restricted tenant install'));
  const summary = verificationDocument(current, true).map(b => b.text).join('\n');
  assert.ok(summary.includes('restricted CPU tenant (ARM64 / llama.cpp)'));
  assert.ok(summary.includes(row.scopeNote));
  assert.ok(!summary.includes('Serve CPU and NVIDIA GPU models on a restricted tenant install'));
});


test('cumulative proof summaries do not certify a frozen bill of materials', () => {
  const report = JSON.parse(readFileSync(new URL('../static/current-verification/1.3.4/2026-10-26-version-attribution.json', import.meta.url)));
  const human = recipeGuide(report).map(b => b.text).join('\n');
  const detail = verificationDocument(report).map(b => b.text).join('\n');
  for (const text of [human, detail]) {
    assert.match(text, /73 of 87 capabilities have accepted scoped proofs/);
    assert.doesNotMatch(text, /73 of 87 capabilities (?:are release verified|have release verification)/);
  }
  assert.match(human, /now designated 1\.3\.5 prerelease/);
  assert.match(human, /combines corrected API and tagged 1\.3\.4 platform components/);
  assert.match(detail, /tagged Core reference does not establish/);
  assert.match(agentsMd('1.3.4'), /A cumulative accepted-proof count is not a frozen-release count/);
  assert.equal(report.historicalPrerelease.length, 58);
});


test('dated attribution correction preserves all native proofs and historical bytes', () => {
  const prior = JSON.parse(readFileSync(new URL('../static/current-verification/1.3.4/2026-10-26-tenant-cpu.json', import.meta.url)));
  const current = JSON.parse(readFileSync(new URL('../static/current-verification/1.3.4/2026-10-26-version-attribution.json', import.meta.url)));
  assert.deepEqual(current.counts, prior.counts);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  const corrected = new Set(['catalog.dataset-registry', 'ingestion.scheduled-ingest']);
  for (const [i, row] of current.capabilities.entries()) {
    if (!corrected.has(row.id)) assert.deepEqual(row, prior.capabilities[i]);
    else {
      assert.match(row.scopeNote, /^Current designation: 1\.3\.5 prerelease evidence on a mixed corrective build/);
      assert.deepEqual({...row, scopeNote:prior.capabilities[i].scopeNote}, prior.capabilities[i]);
    }
  }
  assert.equal(verificationLabel(current.capabilities.find(r => r.status === 'accepted-scoped-release')), 'Scoped proof — verified on the recorded build');
});


test('catalog summary uses the same cumulative proof wording as the downloads', () => {
  const catalog = readFileSync(new URL('../src/pages/catalog.jsx', import.meta.url), 'utf8');
  assert.match(catalog, /capabilities with accepted scoped proofs across recorded builds/);
  assert.doesNotMatch(catalog, /release verified for recorded scenarios/);
});
