import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadReleaseWork} from '../scripts/release-work.mjs';
import {loadReleaseCorpora} from '../scripts/release-corpora.mjs';
import {evidenceVersions, changesSince, agentsMd} from '../src/evidence.mjs';
import {recipeGuide, releaseWorkView, verificationLabel} from '../src/verification-guide.mjs';

const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
const source = JSON.parse(readFileSync(new URL('../data/release-work.json', import.meta.url)));

test('prerelease work preserves exact prior evidence and cannot retarget its stamps', t => {
  const repo = mkdtempSync(join(tmpdir(), 'release-work-'));
  t.after(() => rmSync(repo, {recursive:true, force:true}));
  mkdirSync(join(repo, 'site/data'), {recursive:true});
  const binding = source.releases[0].retainedVerification;
  mkdirSync(join(repo, 'site/static/current-verification/1.3.4'), {recursive:true});
  const original = readFileSync(new URL('../static/' + binding.path, import.meta.url));
  writeFileSync(join(repo, 'site/static', binding.path), original);
  const load = data => {
    writeFileSync(join(repo, 'site/data/release-work.json'), JSON.stringify(data));
    return loadReleaseWork({repo, publication});
  };
  const [work] = load(source);
  assert.equal(work.version, '1.3.5');
  assert.deepEqual(work.retainedBytes, original);
  assert.equal(work.retained.version, '1.3.4');
  for (const mutate of [
    row => row.version = '1.3.4', row => row.channel = 'released',
    row => row.sourceBranch = 'release/1.4.0', row => row.originalReplayId = 'invented',
    row => row.retainedVerification.sha256 = '0'.repeat(64), row => row.releaseVerified = 73,
  ]) {
    const data = structuredClone(source); mutate(data.releases[0]);
    assert.throws(() => load(data));
  }
});

test('original release and current prerelease work remain separate in cards and recipe statuses', () => {
  const work = loadReleaseWork({publication});
  const entries = evidenceVersions(publication, null, loadReleaseCorpora({publication}), [], work);
  const original = entries.find(row => row.version === '1.3.4');
  const newest = entries.find(row => row.version === '1.3.5');
  assert.equal(original.replay.id, '1.3.4-release-replay-r2');
  assert.equal(original.replay.counts.releaseStamped, 30);
  assert.equal(original.replay.counts.included, 88);
  assert.ok(!original.corpus?.currentVerification);
  assert.match(newest.headline, /Prerelease.*73 capabilities with retained scoped evidence/);
  assert.equal(changesSince(newest, publication, null), null);
  const view = releaseWorkView(newest.work);
  const text = recipeGuide(view).map(block => block.text).join('\n');
  assert.match(text, /Kamiwaza 1\.3\.5: recipes/);
  assert.match(text, /Prior recorded result/);
  assert.match(text, /not a fresh run on this target/);
  assert.match(text, /Ingredient glossary/);
  for (const row of view.capabilities) assert.match(verificationLabel(row), /1\.3\.5 qualification pending/);
  assert.deepEqual(newest.work.retained.capabilities, JSON.parse(newest.work.retainedBytes).capabilities);
  assert.match(agentsMd('1.3.5', {targetWork:true}), /do not rename the original stamps, dates or build identities/);
});
