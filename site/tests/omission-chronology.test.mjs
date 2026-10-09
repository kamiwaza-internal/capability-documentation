import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryCapabilities} from '../src/catalog.mjs';
import {validatePublication,releaseSnapshotDigest} from '../scripts/publication.mjs';
import {releaseStampsFixture} from './fixtures/release-stamps.mjs';
function fixture(publishedAt='2026-10-08T17:30:00Z') {
  const publication=releaseStampsFixture(),baseline=publication.releases[0],snapshot=publication.releaseStamps[0];
  baseline.omittedCapabilities.push('synthetic.stamped');
  snapshot.version=baseline.version;snapshot.source.ref='v'+baseline.version;
  snapshot.generatedAt='2026-10-08T16:40:00Z';snapshot.publishedAt=publishedAt;
  snapshot.approval.approvedAt='2026-10-08T16:45:00Z';
  snapshot.capabilities[0].stamp.targetRelease=baseline.version;snapshot.capabilities[0].stamp.releaseSource.ref=snapshot.source.ref;
  snapshot.approval.snapshotSha256=releaseSnapshotDigest(snapshot);
  validatePublication(publication);return publication;
}
const row = publication => primaryCapabilities(publication).find(cap=>cap.id==='synthetic.stamped');
test('later canonical inclusion rev1 clears older baseline omission rev3 without altering evidence',()=>{
  const publication=fixture(),before=JSON.stringify(publication),current=row(publication),snapshot=publication.releaseStamps[0];
  assert.equal(current.status,'release-stamped');assert.equal(current.omitted,false);assert.equal(current.omissionSnapshotId,null);
  assert.equal(current.snapshotId,snapshot.id);assert.equal(current.verifiedAt,snapshot.capabilities[0].stamp.finishedAt);
  assert.equal(current.includedInBaseline,false);assert.ok(current.history.some(event=>event.omitted));
  assert.equal(JSON.stringify(publication),before);
});
test('older stamp inclusion cannot clear a newer omission even with a higher independent revision',()=>{
  const publication=fixture('2026-10-08T16:49:59Z');
  publication.releaseStamps[0].publicationRevision=99;publication.releaseStamps[0].approval.snapshotSha256=releaseSnapshotDigest(publication.releaseStamps[0]);
  validatePublication(publication);const current=row(publication);
  assert.equal(current.status,'release-stamped');assert.equal(current.omitted,true);
  assert.equal(current.omissionSnapshotId,publication.releases[0].id);
});
test('equal scope times with differing precision retain omission conservatively',()=>{
  const publication=fixture('2026-10-08T16:50:00.000000Z'),current=row(publication);
  assert.equal(current.status,'release-stamped');assert.equal(current.omitted,true);
  assert.equal(current.omissionSnapshotId,publication.releases[0].id);
});
test('a strictly later fractional scope timestamp clears omission',()=>{
  const publication=fixture('2026-10-08T16:50:00.000001Z');assert.equal(row(publication).omitted,false);
});
test('scope chronology remains stable when collections or capability rows are reordered',()=>{
  const publication=fixture(),before=primaryCapabilities(publication);
  publication.releases.reverse();publication.releaseStamps.reverse();publication.releaseStamps[0].capabilities.reverse();
  assert.deepEqual(primaryCapabilities(publication),before);
});
