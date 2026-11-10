import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativePublication} from './fixtures/native-publication.mjs';
import {intakePublication} from '../scripts/intake-publication.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {preserveHistory} from '../scripts/preserve-history.mjs';
import {dashboardReleases} from '../src/dashboard-releases.mjs';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url)));
const base = () => ({publication:read('publication.json'), corpora:read('release-corpora.json'),work:read('release-work.json')});
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

test('a newer version or newer baseline never retargets the historical release stamp download', () => {
  const source=base(),candidate=nativePublication();
  const before=dashboardReleases({publication:source.publication,releaseStamps:read('release-stamps-1.3.2.json')}).find(row=>row.release==='1.3.2');
  const publication=JSON.parse(intakePublication(source,candidate,review).files.get('site/data/publication.json'));
  const after=dashboardReleases({publication,releaseStamps:read('release-stamps-1.3.2.json')}).find(row=>row.release==='1.3.2');
  assert.deepEqual(after,before);
});
