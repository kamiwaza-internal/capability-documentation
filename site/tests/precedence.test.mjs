import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {primaryCapabilities, filterCapabilities} from '../src/catalog.mjs';
import {releaseStampsFixture} from './fixtures/release-stamps.mjs';
import {releaseSnapshotDigest, validatePublication} from '../scripts/publication.mjs';
const actual = () => JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
const find = p => primaryCapabilities(p).find(row => row.id === 'synthetic.stamped' && row.version === '1.3.2');
function timeline(finish = '2026-10-01T11:00:00.000003Z') {
  const p = releaseStampsFixture(), next = structuredClone(p.releaseStamps[0]);
  next.id = 'synthetic-132-release-r2'; next.publicationRevision++;
  const cap = next.capabilities[0]; cap.status = 'failed'; cap.stamp = null;
  cap.failures = [{finishedAt: finish, summary: 'Synthetic later bounded failure.', resolvedByStampId: null}];
  next.counts.releaseStamped--; next.counts.failed++; next.evidenceWindow.latestFinishedAt = finish;
  next.approval = {status: 'pending', scope: 'full-inventory', approvedBy: null, approvedAt: null, snapshotSha256: null};
  p.releaseStamps.push(next); return p;
}
test('actual primary view retains 50 accepted proofs, explicit gaps, exclusions and News release hold', () => {
  const p = actual(), before = JSON.stringify(p), rows = primaryCapabilities(p);
  const verified = filterCapabilities(rows, '', 'verified');
  assert.equal(rows.length,107); assert.equal(verified.length,50);
  assert.equal(verified.filter(cap=>cap.verificationBasis==='historical-scenario').length,33);
  assert.equal(verified.filter(cap=>cap.verificationBasis==='developer-assessment').length,17);
  assert.equal(verified.filter(cap=>cap.description?.historical).length,22);
  assert.equal(verified.filter(cap=>cap.description===null).length,15);
  assert.equal(rows.filter(cap=>cap.includedInBaseline===false).length,19);
  assert.equal(rows.filter(cap=>cap.deferred).length,4);
  assert.equal(filterCapabilities(rows,'','failed').length,5);
  assert.ok(verified.every(cap=>cap.version==='1.3.0' && cap.wholeClaim===false));
  assert.equal(JSON.stringify(p),before);
  assert.ok(rows.slice(0,50).every(row=>row.status==='prerelease-verified'));
  const news=rows.find(row=>row.id==='platform.news-feed');
  assert.equal(news.status,'prerelease-verified'); assert.ok(news.failures.some(f=>f.axis==='release' && f.at===null));
});
test('verified filter includes each accepted scope and never an untested row', () => {
  const caps=['verified','prerelease-verified','release-stamped','untested'].map((status,i)=>({status,id:'synthetic.'+i,title:'Synthetic',summary:'',conditions:[],limits:[]}));
  assert.equal(filterCapabilities(caps,'','verified').length,3);
});
test('newer untested/skipped, absent or uncurated sources never erase accepted verification', () => {
  const p=actual(), baseline=p.releases.at(-1), pass=baseline.capabilities.find(cap=>cap.status==='prerelease-verified');
  const source=structuredClone(p.releases[0]); source.id='synthetic-new-source';source.publicationRevision=99;
  source.capabilities=[{...source.capabilities[0],id:pass.id,status:'untested',evidence:[{build:source.build,outcome:'skipped',summary:'Synthetic skipped test.'}]}];
  p.releases.push(source,{...source,id:'synthetic-absent',publicationRevision:100,capabilities:[]});
  const current=primaryCapabilities(p).find(cap=>cap.id===pass.id);
  assert.equal(current.status,'prerelease-verified');assert.equal(current.snapshotId,baseline.id);
});
test('qualified later failure of the same environment and complete bounded contract supersedes', () => {
  const p=timeline();validatePublication(p);const current=find(p);
  assert.equal(current.status,'failed');assert.equal(current.retainedStatus,'release-stamped');
  assert.ok(current.failures.some(failure=>failure.applicable&&!failure.superseded));
});
test('source key order and precise chronology remain stable, and later qualifying pass restores', () => {
  const p=timeline();p.releaseStamps[1].source={sourceRevision:p.releaseStamps[1].source.sourceRevision,ref:p.releaseStamps[1].source.ref};
  assert.equal(find(p).status,'failed');
  const next=structuredClone(p.releaseStamps[0]);next.id='synthetic-132-release-r3';next.publicationRevision=3;
  next.capabilities[0].stamp.finishedAt='2026-10-01T11:00:00.000004Z';next.capabilities[0].stamp.id='f'.repeat(64);next.capabilities[0].failures=[];
  next.evidenceWindow.latestFinishedAt=next.capabilities[0].stamp.finishedAt;next.approval.snapshotSha256=releaseSnapshotDigest(next);
  p.releaseStamps.push(next);validatePublication(p);const current=find(p);
  assert.equal(current.status,'release-stamped');assert.ok(current.failures.some(failure=>failure.superseded));
});
test('whole-second earlier failure cannot outrank a later fractional pass', () => {
  const p=timeline('2026-10-01T11:00:00Z');validatePublication(p);
  assert.equal(find(p).status,'release-stamped');assert.ok(find(p).failures.some(failure=>failure.superseded));
});
for(const [name,mutate] of [
  ['different version',r=>r.version='1.3.3'],
  ['different environment',r=>r.manifestId='f'.repeat(64)],
  ['different source',r=>r.source.sourceRevision='f'.repeat(40)],
  ['different scope',r=>r.capabilities[0].scope='Another bounded scope.'],
  ['different assumptions',r=>r.capabilities[0].assumptions=['Different prepared fixture.']],
  ['different limits',r=>r.capabilities[0].limits=['Different test condition.']],
]) test('unrelated '+name+' cannot downgrade prior verification',()=>{
  const p=timeline();mutate(p.releaseStamps[1]);assert.equal(find(p).status,'release-stamped');
  if(name!=='different version')assert.ok(find(p).failures.some(failure=>failure.applicable===false));
});
test('development labels do not prove environment applicability for a later scenario failure',()=>{
  const p=actual(), baseline=p.releases.at(-1), cap=baseline.capabilities.find(c=>c.verificationBasis==='historical-scenario'&&c.status==='prerelease-verified');
  const next=structuredClone(baseline);next.id='synthetic-later-scenario';next.publicationRevision=99;next.capabilities=[structuredClone(cap)];
  next.capabilities[0].status='failed-or-mixed';next.capabilities[0].evidence=[{...cap.evidence[0],outcome:'failed',runFinishedAt:'2026-10-08T23:00:00Z'}];p.releases.push(next);
  const row=primaryCapabilities(p).find(c=>c.id===cap.id);
  assert.equal(row.status,'prerelease-verified');assert.ok(row.failures.some(f=>!f.applicable&&f.axis==='scenario'));
});
test('bounded stamp cannot replace a broader whole-claim verified contract',()=>{
  const p=releaseStampsFixture();p.releases.push({id:'synthetic-whole-claim',version:'1.3.2',publicationRevision:1,capabilities:[{id:'synthetic.stamped',title:'Broad synthetic claim',summary:'Synthetic whole claim',conditions:[],limits:[],status:'verified',wholeClaim:true,evidence:[{build:'1.3.2',outcome:'passed',summary:'Synthetic complete evidence'}]}]});
  const row=find(p);assert.equal(row.status,'verified');assert.equal(row.wholeClaim,true);
  assert.ok(row.history.some(item=>item.status==='release-stamped'&&item.scope==='Synthetic bounded scenario scope.'));
});
test('stable lineage does not depend on source array order',()=>{
  const p=timeline(), before=primaryCapabilities(p);p.releases.reverse();p.releaseStamps.reverse();
  assert.deepEqual(primaryCapabilities(p),before);
});

test('the fully-qualified spelling of the same tag does not hide an applicable failure',()=>{
  const p=timeline();p.releaseStamps[1].source.ref='refs/tags/v1.3.2';validatePublication(p);
  assert.equal(find(p).status,'failed');
  assert.equal(p.releaseStamps[0].source.ref,'v1.3.2');
  assert.equal(p.releaseStamps[1].source.ref,'refs/tags/v1.3.2');
});

test('equal-time matched failure retains acceptance and an explicit chronology-ambiguous hold',()=>{
  const p=timeline('2026-10-01T11:00:00.000002Z');validatePublication(p);
  const row=find(p);assert.equal(row.status,'release-stamped');
  const failure=row.failures.find(f=>f.snapshotId==='synthetic-132-release-r2');
  assert.equal(failure.ambiguous,true);assert.equal(failure.supersedes,false);
});
