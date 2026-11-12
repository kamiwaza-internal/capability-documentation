import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativePublication} from './fixtures/native-publication.mjs';
import {intakePublication} from '../scripts/intake-publication.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {preserveHistory} from '../scripts/preserve-history.mjs';
import {dashboardReleases} from '../src/dashboard-releases.mjs';
import {historicalPublication} from './fixtures/historical-publication.mjs';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url)));
const base = () => ({publication:historicalPublication(), corpora:read('release-corpora.json'),work:read('release-work.json')});
const review = {url:'https://github.com/kamiwaza-internal/capability-documentation/pull/99',createdAt:'2026-11-01T00:00:00Z'};

test('automatic intake accepts the combined native axes without inventing source bindings or runtime approval', () => {
  const candidate = nativePublication();
  assert.equal(validatePublication(candidate), candidate);
  const applied = intakePublication(base(), candidate, review);
  const publication = JSON.parse(applied.files.get('site/data/publication.json'));
  assert.equal(publication.schema,9);
  preserveHistory(base().publication, publication);
  assert.deepEqual(publication.releases.slice(0,-1),base().publication.releases);
  const release=publication.releases.at(-1);
  assert.equal(release.reviewReference,review.url);
  assert.equal(release.approval.status,'pending');
  assert.equal(release.counts.releaseVerified,0);
  assert.equal(release.capabilities[2].assessment.observedSourceRevision,null);
  const dashboards=dashboardReleases({publication,releaseStamps:read('release-stamps-1.3.2.json')});
  assert.equal(dashboards[0].release,'1.4.0');
  assert.equal(dashboards[0].recipes.length,1);
  assert.deepEqual(dashboards[0].capabilities.find(row=>row.id==='synthetic.cap-3').conditions,['The original contract remains applicable.']);
});

test('the real 1.4.0 candidate retains its native 87-capability prerelease axes', () => {
  const published = read('publication.json');
  const release = published.releases.find(row => row.version === '1.4.0');
  const candidate = {schema:9, releases:[release]};
  validatePublication(candidate);
  const applied = intakePublication(base(), candidate, {});
  const result = JSON.parse(applied.files.get('site/data/publication.json'));
  const added = result.releases.find(row => row.id === release.id);
  assert.deepEqual(added.counts, {included:87, prereleaseVerified:66, scenarioVerified:0, developerAssessed:6,
    agentVerified:3, carriedVerified:51, scopedProofVerified:6, failedOrMixed:0, notYetVerified:21,
    releaseVerified:0, releaseFailed:0});
  assert.equal(added.releaseBinding, 'not-established');
  assert.equal(added.publicationState, 'published');
  assert.equal(added.reviewReference, 'https://github.com/kamiwaza-internal/capability-documentation/pull/66');
  assert.equal(added.publishedAt, '2026-11-12T15:11:07Z');
  assert.deepEqual(result.releases.slice(0,-1), base().publication.releases);
});

test('privacy failures stop intake before any target file is returned', () => {
  const candidate=nativePublication();
  candidate.releases[0].capabilities[2].assessment.scope='Bearer PRIVATE_CANARY_SECRET';
  assert.throws(()=>intakePublication(base(),candidate),/Private|Unsafe/);
});

test('intake never reinterprets a frozen tagged release', () => {
  const candidate=nativePublication();
  const version=candidate.releases[0].version;
  const source=base();source.corpora.corpora=[{version,presentation:'original-tagged-release'}];
  assert.throws(()=>intakePublication(source,candidate),/frozen/);
});

test('a replayed candidate is a no-op and conflicting bytes under one identity are refused', () => {
  const candidate=nativePublication();const source=base();
  source.publication=JSON.parse(intakePublication(source,candidate,review).files.get('site/data/publication.json'));
  assert.equal(intakePublication(source,candidate).unchanged,true);
  candidate.releases[0].capabilities[2].assessment.scope='A conflicting scope';
  assert.throws(()=>intakePublication(source,candidate),/cannot change/);
});

test('a target-work update retains the original historical records and writes its bound native projection separately', () => {
  const candidate=nativePublication();const version=candidate.releases[0].version;
  const source=base();const work={...source.work.releases[0],version};source.work.releases=[work];
  const applied=intakePublication(source,candidate,review);
  assert.equal(applied.files.has('site/data/publication.json'),false);
  const next=JSON.parse(applied.files.get('site/data/release-work.json')).releases[0];
  assert.deepEqual({...next,freshProjection:undefined},{...work,freshProjection:undefined});
  assert.equal(next.freshProjection.reviewReference,review.url);
  assert.ok(applied.files.has('site/static/'+next.freshProjection.path));
});

test('native recipes and carry cannot grant unsupported scope or hide required assumptions', () => {
  const candidate=nativePublication();candidate.releases[0].recipeInventory[0].capabilityIds=['synthetic.unknown'];
  assert.throws(()=>validatePublication(candidate),/unknown capability/);
  const carry=nativePublication();carry.releases[0].capabilities[3].carry=null;
  assert.throws(()=>validatePublication(carry),/explicit scope/);
});

test('carry requires an earlier source release and nonempty applicability boundaries', () => {
  for (const sourceRelease of ['1.4.0', '9.9.9']) {
    const candidate=nativePublication();candidate.releases[0].capabilities[3].carry.sourceRelease=sourceRelease;
    assert.throws(()=>validatePublication(candidate),/must precede/);
  }
  for (const field of ['assumptions','limits']) {
    const candidate=nativePublication();candidate.releases[0].capabilities[3].carry[field]=[];
    assert.throws(()=>validatePublication(candidate),/nonempty assumptions and limits/);
  }
  const candidate=nativePublication();candidate.releases[0].capabilities[3].carry.sourceRelease='1.3.10';
  assert.equal(validatePublication(candidate),candidate,'version ordering is numeric');
});

test('out-of-order target-work candidates cannot replace a newer bound projection', () => {
  const candidate=nativePublication(),source=base();
  source.work.releases=[{...source.work.releases[0],version:'1.4.0'}];
  const newer=structuredClone(candidate);newer.releases[0].id='1.4.0-prerelease-r11';newer.releases[0].publicationRevision=11;
  const first=intakePublication(source,newer,review);
  source.work=JSON.parse(first.files.get('site/data/release-work.json'));
  const before=JSON.stringify(source);
  assert.throws(()=>intakePublication(source,candidate,review),/Stale target-work/);
  assert.equal(JSON.stringify(source),before);
  assert.equal(intakePublication(source,newer,review).unchanged,true);
  const newest=structuredClone(candidate);newest.releases[0].id='1.4.0-prerelease-r12';newest.releases[0].publicationRevision=12;
  assert.equal(intakePublication(source,newest,review).unchanged,false);
});

test('a newer version or newer baseline never retargets the historical release stamp download', () => {
  const source=base(),candidate=nativePublication();
  const before=dashboardReleases({publication:source.publication,releaseStamps:read('release-stamps-1.3.2.json')}).find(row=>row.release==='1.3.2');
  const publication=JSON.parse(intakePublication(source,candidate,review).files.get('site/data/publication.json'));
  const after=dashboardReleases({publication,releaseStamps:read('release-stamps-1.3.2.json')}).find(row=>row.release==='1.3.2');
  assert.deepEqual(after,before);
});

test('CLI uses checkout freshness while preserving immutable main history', t => {
  const root=mkdtempSync(join(tmpdir(),'capability-intake-cli-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'site/data'),{recursive:true});
  const write=(name,value)=>writeFileSync(join(root,'site/data',name),JSON.stringify(value));
  const source=base(),candidate=nativePublication();
  source.work.releases=[{...source.work.releases[0],version:'1.4.0'}];
  write('publication.json',source.publication);write('release-corpora.json',source.corpora);write('release-work.json',source.work);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'});
  git('init');git('add','.');
  git('-c','user.name=Drew','-c','user.email=drew@kamiwaza.ai','commit','-m','Fixture');
  git('update-ref','refs/remotes/origin/main','HEAD');
  const newer=structuredClone(candidate);newer.releases[0].id='1.4.0-prerelease-r11';newer.releases[0].publicationRevision=11;
  const applied=intakePublication(source,newer,review);
  for(const [path,content] of applied.files){mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),content);}
  const before=readFileSync(join(root,'site/data/release-work.json'),'utf8');
  const plan=join(root,'candidate.json');
  const run=(payload,...args)=>{
    writeFileSync(plan,JSON.stringify({payload}));
    return spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/intake-publication.mjs',import.meta.url)),plan,...args],{cwd:root,encoding:'utf8'});
  };
  for(const args of [[],[review.url],[review.url,'invalid-date'],[review.url,'2019-01-01T00:00:00Z'],[review.url,'2099-01-01T00:00:00Z']]){
    const rejected=run(newer,...args);
    assert.notEqual(rejected.status,0);
    assert.match(rejected.stderr,/review.*(metadata|timestamp)/i);
    assert.equal(readFileSync(join(root,'site/data/release-work.json'),'utf8'),before);
  }
  for(const args of [['--check-only'],[review.url,review.createdAt]]){
    const stale=run(candidate,...args);
    assert.notEqual(stale.status,0,stale.stdout+stale.stderr);
    assert.match(stale.stderr,/Stale target-work/);
    assert.equal(readFileSync(join(root,'site/data/release-work.json'),'utf8'),before);
  }
  const replay=run(newer,review.url,review.createdAt);
  assert.equal(replay.status,0,replay.stdout+replay.stderr);
  assert.equal(JSON.parse(replay.stdout).unchanged,true);
  source.publication.releases.shift();write('publication.json',source.publication);
  const rewritten=run(newer,'--check-only');
  assert.notEqual(rewritten.status,0);
  assert.match(rewritten.stderr,/Published revision cannot be changed or removed/);
});
