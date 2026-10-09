import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {primaryCapabilities} from '../src/catalog.mjs';
import {validatePublication} from '../scripts/publication.mjs';
const actual = () => JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
function omitLater(publication, capability) {
  const baseline=publication.releases.find(r=>r.id==='1.3.0-prerelease-r3');
  const next=structuredClone(baseline);next.id='synthetic-omission-r4';next.publicationRevision++;
  next.capabilities=next.capabilities.filter(cap=>cap.id!==capability.id);next.omittedCapabilities.push(capability.id);
  next.counts.included--;
  if(capability.status==='prerelease-verified') {next.counts.prereleaseVerified--;next.counts.scenarioVerified--;}
  else next.counts.failedOrMixed--;
  const records=next.capabilities.flatMap(cap=>cap.evidence);
  next.testedBuilds=[...new Set(records.map(record=>record.build))];
  const times=records.map(record=>record.runFinishedAt).sort();
  next.evidenceWindow={earliestRunFinishedAt:times[0],latestRunFinishedAt:times.at(-1)};
  publication.releases.push(next);validatePublication(publication);return next;
}
const legacy = () => ({schema:1,releases:[{
  id:'synthetic-released-r1',version:'0.0.1',channel:'released',approval:{status:'pending',approvedBy:null,approvedAt:null},
  build:'0.0.1',sourceRevision:'a'.repeat(40),publicationRevision:1,publishedAt:'2026-09-01T00:00:00Z',
  reviewReference:'https://github.com/kamiwaza-internal/capability-documentation/pull/1',
  capabilities:[{id:'synthetic.public-prose',title:'Synthetic released title',distribution:'public',summary:'Synthetic bounded released description.',conditions:['Synthetic prerequisite.'],limits:['Synthetic limitation.'],status:'partial',wholeClaim:false,evidence:[]}],
}]});
test('every actual excluded ID retains its explicit later omission event, including four previously declared IDs',()=>{
  const publication=actual(),before=JSON.stringify(publication),baseline=publication.releases.find(r=>r.id==='1.3.0-prerelease-r3');
  const rows=primaryCapabilities(publication);
  const older=new Set(publication.releases.filter(r=>r.publicationRevision<baseline.publicationRevision).flatMap(r=>r.capabilities.map(c=>c.id)));
  assert.equal(baseline.omittedCapabilities.filter(id=>older.has(id)).length,4);
  for(const id of baseline.omittedCapabilities){
    const row=rows.find(row=>row.id===id&&row.version===baseline.version);
    assert.equal(row.omitted,true,id);
    assert.ok(row.history.some(event=>event.snapshotId===baseline.id&&event.omitted),id);
  }
  assert.equal(rows.filter(row=>row.omitted).length,19);assert.equal(rows.length,107);
  assert.equal(rows.filter(row=>row.status==='prerelease-verified').length,50);
  assert.equal(rows.filter(row=>row.status==='failed-or-mixed').length,5);
  assert.equal(JSON.stringify(publication),before);
});
test('later omission preserves earlier accepted status, scope and original evidence',()=>{
  const publication=actual(),baseline=publication.releases.find(r=>r.id==='1.3.0-prerelease-r3');
  const accepted=baseline.capabilities.find(cap=>cap.status==='prerelease-verified'&&cap.evidence.length);
  const next=omitLater(publication,accepted);
  const row=primaryCapabilities(publication).find(row=>row.id===accepted.id);
  assert.equal(row.status,'prerelease-verified');assert.equal(row.omitted,true);assert.equal(row.omissionSnapshotId,next.id);
  assert.equal(row.retainedCapability,accepted);assert.equal(row.evidence,accepted.evidence);
  assert.ok(row.history.some(event=>event.snapshotId===next.id&&event.omitted));
});
test('valid schema1 released prose remains the selected description without a declaration field',()=>{
  const publication=legacy();validatePublication(publication);const before=JSON.stringify(publication);
  const [row]=primaryCapabilities(publication);
  assert.equal(row.title,'Synthetic released title');assert.equal(row.summary,'Synthetic bounded released description.');
  assert.equal(row.description.historical,false);assert.equal(row.description.basis,'public-snapshot-prose');assert.equal(row.description.capability,publication.releases[0].capabilities[0]);
  assert.equal(row.wholeClaim,false);assert.equal(row.status,'partial');assert.equal(JSON.stringify(publication),before);
});
test('valid older schema1 prose remains labelled historical when the accepted row has a text gap',()=>{
  const publication=legacy(),older=publication.releases[0],next=structuredClone(older);
  older.capabilities[0].title='Synthetic historical title';next.id='synthetic-accepted-r2';next.publicationRevision=2;
  next.capabilities[0]={...next.capabilities[0],title:null,summary:null,status:'prerelease-verified',verificationBasis:'historical-scenario',evidence:[{scenario:'synthetic-scope',build:'develop@aaaaaaa',outcome:'passed',runFinishedAt:'2026-09-02T00:00:00Z'}]};
  next.baselineKind='prerelease-evidence';next.omittedCapabilities=[];next.deferredCapabilities=[];publication.releases.push(next);
  const [row]=primaryCapabilities(publication);
  assert.equal(row.status,'prerelease-verified');assert.equal(row.title,'Synthetic historical title');assert.equal(row.description.historical,true);
  assert.equal(row.description.snapshotId,older.id);assert.equal(row.description.basis,'public-snapshot-prose');assert.equal(row.retainedCapability.summary,null);
});
test('uncurated prerelease text does not become a valid current description',()=>{
  const publication=actual(),baseline=publication.releases.find(r=>r.id==='1.3.0-prerelease-r3');
  const cap=baseline.capabilities.find(cap=>cap.declaration===null);cap.title='Synthetic uncurated title';cap.summary='Synthetic uncurated description.';
  const row=primaryCapabilities(publication).find(row=>row.id===cap.id);
  assert.notEqual(row.description?.capability,cap);
});

test('later omission links to its own snapshot while an earlier failed verdict stays selected',()=>{
  const publication=actual(),baseline=publication.releases.find(r=>r.id==='1.3.0-prerelease-r3');
  const failed=baseline.capabilities.find(cap=>cap.status==='failed-or-mixed');
  const next=omitLater(publication,failed);
  const row=primaryCapabilities(publication).find(row=>row.id===failed.id);
  assert.equal(row.status,'failed-or-mixed');assert.equal(row.snapshotId,baseline.id);
  assert.equal(row.omitted,true);assert.equal(row.omissionSnapshotId,next.id);
  assert.equal(row.retainedCapability,failed);
});
