import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {loadReleaseWork, releaseWorkSiteData} from '../scripts/release-work.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {releaseWorkView, recipeGuide, verificationLabel} from '../src/verification-guide.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';
import {zipMembers} from '../scripts/check-release-corpus.mjs';
const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
const source = JSON.parse(readFileSync(new URL('../data/release-work.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Synthetic software fixture only. Shape matches Kit229's native exporter; no product proof.
function projection() {
  const assessment = {basis:'agent-verification', verdict:'verified', assessedAt:'2026-10-20T00:00:00Z', ingestedAt:null,
    observedSourceRevision:'b'.repeat(40), sourceBinding:'scoped-agent-observation', targetRelease:'1.3.5',
    testedVersion:'Synthetic development build', scope:'Synthetic operation fixture', operations:[{operation:'Create and inspect a fixture', status:'passed'}],
    limits:['Synthetic test only; no product evidence or final-release certification.']};
  const cap = {id:'apps.app-garden', title:null, distribution:'public', summary:null, conditions:[], limits:[],
    status:'prerelease-verified', verificationBasis:'agent-verification', assessment, wholeClaim:false, releaseStatus:'not-stamped', evidence:[], declaration:null};
  const prior = JSON.parse(readFileSync(new URL('../static/' + source.releases[0].retainedVerification.path, import.meta.url)));
  const capabilities = prior.capabilities.map(row => row.id === cap.id ? cap : {...cap, id:row.id, assessment:null,
    verificationBasis:source.releases[0].prereleaseCarry.capabilityIds.includes(row.id) ? 'historical-carry' : 'none',
    status:source.releases[0].prereleaseCarry.capabilityIds.includes(row.id) ? 'prerelease-verified' : 'not-yet-verified'});
  return {schema:2, releases:[{id:'1.3.5-prerelease-r999', version:'1.3.5', channel:'development', approval:{status:'pending', approvedBy:null, approvedAt:null},
    build:'1.3.5; scoped pre-release agent observations and retained historical evidence; tested versions are recorded per assessment; no final release certification',
    sourceRevision:'a'.repeat(40), sourceCommittedAt:'2026-10-21T00:00:00Z', publicationRevision:999, publishedAt:null, reviewReference:null,
    publicationState:'draft', generatedAt:'2026-10-22T00:00:00Z', assessmentWindow:{earliestAssessedAt:assessment.assessedAt, latestAssessedAt:assessment.assessedAt},
    baselineKind:'prerelease-evidence', releaseBinding:'not-established', testedBuilds:[], evidenceWindow:{earliestRunFinishedAt:null, latestRunFinishedAt:null},
    counts:{included:87, prereleaseVerified:58, scenarioVerified:0, developerAssessed:0, failedOrMixed:0, notYetVerified:29, releaseVerified:0, releaseFailed:0, agentVerified:1, carriedVerified:57},
    omittedCapabilities:[], deferredCapabilities:[], capabilities}]};
}
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'synthetic-agent-projection-'));
  t.after(() => rmSync(repo, {recursive:true, force:true}));
  const data = structuredClone(source), row = data.releases[0];
  const prior = readFileSync(new URL('../static/' + row.retainedVerification.path, import.meta.url));
  const retained = join(repo, 'site/static', row.retainedVerification.path);
  mkdirSync(dirname(retained), {recursive:true}); writeFileSync(retained, prior);
  mkdirSync(join(repo, 'site/data'), {recursive:true});
  row.freshProjection = {path:'fresh-projections/synthetic.json', sha256:'', sourceKitCommit:'a'.repeat(40), releaseId:'1.3.5-prerelease-r999', reviewReference:'https://github.com/kamiwaza-internal/capability-documentation/pull/999'};
  const load = (payload = projection(), mutate = () => {}) => {
    const bytes = Buffer.from(JSON.stringify(payload));
    row.freshProjection.sha256 = hash(bytes); mutate(row);
    const file = join(repo, 'site/static', 'fresh-projections/synthetic.json'); mkdirSync(dirname(file), {recursive:true}); writeFileSync(file, bytes);
    writeFileSync(join(repo, 'site/data/release-work.json'), JSON.stringify(data));
    return {work:loadReleaseWork({repo, publication})[0], bytes};
  };
  return {repo, data, row, prior, load};
}

test('fresh agent projection is optional, pinned, separately counted, and cannot qualify a recipe', t => {
  const f = fixture(t), {work} = f.load(), view = releaseWorkView(work);
  assert.equal(view.freshVerified, 1); assert.equal(view.effectiveCarry, 57);
  assert.equal(work.prereleaseCarry.capabilityIds.length, 58);
  assert.equal(verificationLabel(view.capabilities.find(row => row.id === 'apps.app-garden')), 'Prerelease verified — freshly tested for 1.3.5');
  assert.deepEqual(work.retainedBytes, f.prior);
  const text = recipeGuide(view).map(block => block.text).join('\n');
  assert.match(text, /1 capabilities have fresh scoped prerelease verification/);
  assert.match(text, /Synthetic operation fixture/);
  assert.match(text, /Prior recorded result/); assert.match(text, /not a fresh run on this target/);
  assert.throws(() => validatePublication(projection()), /aggregate tested build|Invalid tested builds|Invalid verification basis/);
});

test('bad binding, target, source, duplicates and private/contradictory agent fields fail closed', t => {
  for (const mutate of [
    p => p.releases[0].version = '1.4.0', p => p.releases[0].sourceRevision = 'c'.repeat(40),
    p => p.releases.push(structuredClone(p.releases[0])),
    p => p.releases.push({...structuredClone(p.releases[0]), id:'unreviewed.history', secret:'must not escape'}),
    p => p.releases[0].capabilities.push(structuredClone(p.releases[0].capabilities[0])),
    p => p.releases[0].capabilities[0].assessment.targetRelease = '1.3.4',
    p => p.releases[0].capabilities[0].assessment.scope = 'https://private.invalid/secret',
    p => p.releases[0].capabilities[0].assessment.scope = 'Authorization: Bearer synthetic-secret',
    p => p.releases[0].capabilities[0].assessment.scope = '/Users/synthetic/private-receipt.json',
    p => p.releases[0].capabilities[0].assessment.operations[0].status = 'failed',
    p => p.releases[0].capabilities[0].assessment.secret = 'forbidden',
    p => p.releases[0].capabilities[0].verificationBasis = 'developer-assessment',
    p => p.releases[0].counts.agentVerified = 2,
    p => p.releases[0].counts.carriedVerified = 58,
    p => p.releases[0].capabilities.pop(),
  ]) { const f = fixture(t), payload = projection(); mutate(payload); assert.throws(() => f.load(payload)); }
  for (const mutate of [r => r.freshProjection.sha256 = '0'.repeat(64), r => r.freshProjection.releaseId = 'missing',
    r => r.freshProjection.path = '../outside.json', r => r.freshProjection.reviewReference = null]) {
    const f = fixture(t); assert.throws(() => f.load(projection(), mutate));
  }
});

test('native failed and partial outcomes override carry without rewriting retained history', t => {
  for (const [verdict, status, key] of [['failed','failed-or-mixed','failedOrMixed'], ['partial','not-yet-verified','notYetVerified']]) {
    const f = fixture(t), payload = projection(), release = payload.releases[0], cap = release.capabilities[0];
    cap.assessment.verdict = verdict; cap.status = status;
    // Cleanup can fail or remain incomplete even when every operation passed.
    release.counts.agentVerified = 0; release.counts.prereleaseVerified = 57; release.counts[key] += 1;
    const {work} = f.load(payload), view = releaseWorkView(work), row = view.capabilities.find(row => row.id === cap.id);
    assert.equal(view.freshVerified, 0); assert.equal(view.effectiveCarry, 57); assert.equal(row.prereleaseCarried, false);
    assert.match(verificationLabel(row), /failed or mixed|incomplete/); assert.deepEqual(work.retainedBytes, f.prior);
  }
});

test('a current native gap cannot borrow an older carry label', t => {
  const f = fixture(t), payload = projection(), release = payload.releases[0];
  const row = release.capabilities.find(cap => cap.verificationBasis === 'historical-carry');
  row.verificationBasis = 'none'; row.status = 'not-yet-verified';
  release.counts.carriedVerified--; release.counts.prereleaseVerified--; release.counts.notYetVerified++;
  const {work} = f.load(payload), view = releaseWorkView(work);
  assert.equal(view.effectiveCarry, 56);
  assert.equal(view.capabilities.find(cap => cap.id === row.id).prereleaseCarried, false);
  assert.match(verificationLabel(view.capabilities.find(cap => cap.id === row.id)), /qualification pending/);
});

test('known failing scenario overrides carry even when no agent assessment survives', t => {
  const f = fixture(t), payload = projection(), release = payload.releases[0], cap = release.capabilities[0];
  cap.assessment = null; cap.verificationBasis = 'historical-scenario'; cap.status = 'failed-or-mixed';
  cap.evidence = [{scenario:'SYNTHETIC/01', build:'develop@' + 'b'.repeat(40), outcome:'failed', runFinishedAt:'2026-10-19T00:00:00Z', ingestedAt:'2026-10-20T00:00:00Z', recordSha256:'c'.repeat(64)}];
  delete release.counts.agentVerified; release.counts.prereleaseVerified = 57; release.counts.failedOrMixed = 1;
  release.build = '1.3.5; project pre-release baseline: historical development-build scenarios and local-contract assessments; not a released 1.3.5 artifact; release unverified';
  release.testedBuilds = [cap.evidence[0].build]; release.evidenceWindow = {earliestRunFinishedAt:cap.evidence[0].runFinishedAt, latestRunFinishedAt:cap.evidence[0].runFinishedAt};
  release.assessmentWindow = {earliestAssessedAt:null, latestAssessedAt:null};
  const {work} = f.load(payload), view = releaseWorkView(work);
  assert.equal(view.effectiveCarry, 57); assert.equal(view.freshVerified, 0);
  assert.match(verificationLabel(view.capabilities.find(row => row.id === cap.id)), /failed or mixed/);
  assert.equal(work.fresh.release.capabilities[0].evidence[0].outcome, 'failed');
});

test('PDF Markdown and ZIP reuse one scoped view and preserve exact retained and fresh bytes', t => {
  const f = fixture(t), {work, bytes} = f.load(), out = join(f.repo, 'out'); mkdirSync(out);
  emitBundles(publication, out); emitEvidence(publication, null, out, {}, null, null, [], [], [work]);
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json'))), entry = index.versions.find(row => row.version === '1.3.5');
  const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
  assert.deepEqual(members.get('machine-readable/retained-prior-verification.json'), f.prior);
  assert.deepEqual(members.get('machine-readable/fresh-agent-projection.json'), bytes);
  const instructions = members.get('AGENTS.md').toString();
  assert.match(instructions, /superseded for current status/);
  assert.ok(!instructions.includes('${'));
  assert.ok(!instructions.includes('carry for corrections not listed in prereleaseCarry remains pending'));
  assert.match(instructions, /Never fall back to the older target-work/);
  const target = JSON.parse(members.get('machine-readable/target-work.json'));
  assert.ok(!Object.hasOwn(target, 'fresh')); assert.deepEqual(target.prereleaseCarry, source.releases[0].prereleaseCarry);
  for (const key of ['md','pdf','summaryMd','summaryPdf','salesMd','salesPdf']) {
    const file = entry.files[key]; assert.deepEqual(members.get('human-readable/' + file.path.split('/').at(-1)), readFileSync(join(out, file.path)));
  }
  for (const key of ['md','salesMd']) assert.match(readFileSync(join(out, entry.files[key].path), 'utf8'), /freshly tested for 1\.3\.5/);
  assert.match(members.get('AGENTS.md').toString(), /Deduplicate fresh and carried/);
  assert.match(members.get('AGENTS.md').toString(), /requirement table/i);
  assert.match(members.get('README.md').toString(), /failed or incomplete current results/);
});

test('browser configuration excludes archive bytes but preserves the current view', t => {
  const {work} = fixture(t).load();
  const data = releaseWorkSiteData(work);
  assert.equal(data.retainedBytes, undefined);
  assert.deepEqual(Object.keys(data.fresh), ['release']);
  assert.deepEqual(releaseWorkView(data), releaseWorkView(work));
  assert.ok(!JSON.stringify(data).includes('"type":"Buffer"'));
});

test('decoded JSON prose cannot hide an absolute private path', t => {
  const f = fixture(t), payload = projection();
  payload.releases[0].capabilities[0].assessment.scope = '/Users/synthetic/private-receipt.json';
  const raw = JSON.stringify(payload).replace('/Users/', '/\\u0055sers/');
  const binding = f.row.freshProjection; binding.sha256 = hash(Buffer.from(raw));
  const file = join(f.repo, 'site/static', binding.path); mkdirSync(dirname(file), {recursive:true}); writeFileSync(file, raw);
  writeFileSync(join(f.repo, 'site/data/release-work.json'), JSON.stringify(f.data));
  assert.throws(() => loadReleaseWork({repo:f.repo, publication}), /Private/);
});

test('actual catalog section counts current carry and includes fresh rows in verified filter', async t => {
  const {default: babel} = await import('@babel/core');
  const {createElement} = await import('react');
  const {renderToStaticMarkup} = await import('react-dom/server');
  const f = fixture(t), {work} = f.load();
  const page = readFileSync(new URL('../src/pages/catalog.jsx', import.meta.url), 'utf8');
  const section = page.slice(page.indexOf('{reports.map(report =>'), page.indexOf('      <PrimaryCapabilities capabilities={primary}'));
  const component = `import React from ${JSON.stringify(import.meta.resolve('react'))};
    import {verificationLabel, prereleaseHistoryText} from ${JSON.stringify(new URL('../src/verification-guide.mjs', import.meta.url).href)};
    function TextList({title,items}) {return <div>{title}{items.map((item,i)=><p key={i}>{item}</p>)}</div>}
    export default function Section({reports,status}) {const query=''; return <>${section}</>}`;
  const {code} = babel.transformSync(component, {babelrc:false, configFile:false, presets:[import.meta.resolve('@babel/preset-react').replace('file://','')]});
  const file = join(f.repo, 'catalog-test.mjs'); writeFileSync(file, code);
  const render = (view, status) => renderToStaticMarkup(createElement(Section, {reports:[view], status}));
  const Section = (await import(file)).default;
  const html = render(releaseWorkView(releaseWorkSiteData(work)), 'verified');
  assert.match(html, /1 freshly tested and 57 carried/);
  assert.match(html, /apps\.app-garden/);
  assert.match(html, /Synthetic operation fixture/);
  assert.match(html, /Actual tested version: Synthetic development build/);
  const payload = projection(); payload.releases[0].capabilities[0].assessment.verdict='failed'; payload.releases[0].capabilities[0].status='failed-or-mixed';
  Object.assign(payload.releases[0].counts, {agentVerified:0, prereleaseVerified:57, failedOrMixed:1});
  const failed = releaseWorkView(f.load(payload).work);
  assert.match(render(failed,'all'), /0 freshly tested and 57 carried/);
  assert.ok(!render(failed,'verified').includes('<code>apps.app-garden</code>'));
});

test('projection symlinks cannot escape the static projection directory', t => {
  const f = fixture(t), {bytes} = f.load();
  const file = join(f.repo, 'site/static', f.row.freshProjection.path);
  const outside = join(f.repo, 'outside.json'); writeFileSync(outside, bytes);
  rmSync(file); symlinkSync(outside, file);
  assert.throws(() => loadReleaseWork({repo:f.repo, publication}), /regular file|remain in/);
});
