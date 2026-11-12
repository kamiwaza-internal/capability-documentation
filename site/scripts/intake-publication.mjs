// Apply an already privately reviewed candidate; this does not accept private Kit files.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validatePublication} from './publication.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';
import {preserveHistory} from './preserve-history.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const bytes = value => JSON.stringify(value, null, 2) + '\n';
const comparable = value => ({...value, publishedAt:null, reviewReference:null, publicationState:'draft'});

function currentWorkRevision(target) {
  if (!target.freshProjection) return 0;
  const match = target.freshProjection.releaseId.match(/-prerelease-r([1-9]\d*)$/);
  assert.ok(match, 'Cannot establish the current work projection revision');
  assert.equal(target.freshProjection.releaseId, `${target.version}-prerelease-r${match[1]}`);
  const revision = Number(match[1]);
  assert.ok(Number.isSafeInteger(revision), 'Invalid current work projection revision');
  return revision;
}

function projectIntoWork(work, candidate, review) {
  const release = candidate.releases[0];
  const target = work.releases.find(row => row.version === release.version);
  assert.ok(release.publicationRevision >= currentWorkRevision(target), 'Stale target-work projection revision');
  const path = `fresh-projections/${release.version}/native-r${release.publicationRevision}.json`;
  const body = bytes(candidate);
  const files = new Map();
  if (target.freshProjection?.releaseId === release.id) {
    assert.equal(target.freshProjection.sha256, sha(body), 'A fresh projection identity cannot change bytes');
    if (!review.url || target.freshProjection.reviewReference === review.url) return {files, unchanged:true};
  }
  target.freshProjection = {path, sha256:sha(body), sourceKitCommit:release.sourceRevision,
    releaseId:release.id, reviewReference:review.url ?? null};
  files.set('site/static/' + path, body);
  files.set('site/data/release-work.json', bytes(work));
  return {files, unchanged:false};
}

function appendRelease(base, release, review) {
  if (review.url) {
    release.publicationState = 'published'; release.reviewReference = review.url; release.publishedAt = review.createdAt;
  }
  const publication = {...base, schema:9, releases:[...base.releases, release],
    observations:base.observations ?? [], releaseStamps:base.releaseStamps ?? []};
  validatePublication(publication);
  preserveHistory(base, publication);
  return {files:new Map([['site/data/publication.json', bytes(publication)]]), unchanged:false};
}

function validateReview(review, release) {
  if (!review.url) return;
  assert.match(review.url, /^https:\/\/github\.com\/kamiwaza-internal\/capability-documentation\/pull\/[1-9]\d*$/);
  assert.match(review.createdAt ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Invalid review timestamp');
  assert.equal(new Date(review.createdAt).toISOString(), review.createdAt.replace('Z', '.000Z'), 'Invalid review timestamp');
  assert.ok(review.createdAt >= release.generatedAt, 'Review timestamp predates candidate generation');
  assert.ok(Date.parse(review.createdAt) <= Date.now(), 'Future review timestamp');
}

export function intakePublication(base, candidate, review = {}) {
  assert.equal(candidate.schema, 9, 'Expected a native cycle candidate');
  validatePublication(candidate);
  assertPublicOutputSafe(bytes(candidate));
  const release = structuredClone(candidate.releases[0]);
  validateReview(review, release);
  const original = base.publication.releases.find(row => row.id === release.id);
  if (original) {
    assert.deepEqual(comparable(original), comparable(release), 'A publication identity cannot change bytes');
    return {files: new Map(), unchanged:true};
  }
  const sameVersion = base.publication.releases.filter(row => row.version === release.version);
  assert.ok(sameVersion.every(row => row.publicationRevision < release.publicationRevision), 'Stale candidate revision');
  assert.ok(!base.corpora.corpora.some(row => row.version === release.version && row.presentation === 'original-tagged-release'),
    'Original tagged publications are frozen; publish into the active release cycle');
  const work = structuredClone(base.work);
  if (work.releases.some(row => row.version === release.version)) return projectIntoWork(work, candidate, review);
  return appendRelease(base.publication, release, review);
}

function baseJson(path) {
  return JSON.parse(execFileSync('git', ['show', 'origin/main:' + path], {encoding:'utf8'}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const base = {publication:JSON.parse(readFileSync('site/data/publication.json', 'utf8')),
    corpora:baseJson('site/data/release-corpora.json'), work:JSON.parse(readFileSync('site/data/release-work.json', 'utf8'))};
  preserveHistory(baseJson('site/data/publication.json'), base.publication);
  const checkOnly = process.argv[3] === '--check-only';
  if (!checkOnly) {
    assert.ok(process.argv[3] && process.argv[4], 'Review metadata requires a URL and timestamp');
  }
  const result = intakePublication(base, plan.payload, checkOnly ? {} : {url:process.argv[3], createdAt:process.argv[4]});
  for (const content of result.files.values()) assertPublicOutputSafe(content);
  for (const [path, content] of checkOnly ? [] : result.files) {
    mkdirSync(dirname(join(process.cwd(), path)), {recursive:true});
    writeFileSync(path, content);
  }
  console.log(JSON.stringify({unchanged:result.unchanged, files:[...result.files.keys()]}));
}
