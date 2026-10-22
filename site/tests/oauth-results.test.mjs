import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = path => readFileSync(new URL(path, import.meta.url));
test('OAuth publication adds exactly one accepted capability and preserves historical evidence', () => {
 const old=JSON.parse(read('../../reports/1.3.4-2026-10-22/results.json'));
 const current=JSON.parse(read('../../reports/1.3.4-2026-10-22-oauth/results.json'));
 assert.deepEqual(current.capabilities.filter(r=>r.id!=='connectors.user-oauth-authorization'),old.capabilities.filter(r=>r.id!=='connectors.user-oauth-authorization'));
 assert.deepEqual(current.historicalPrerelease,old.historicalPrerelease);
 assert.equal(read('../../reports/1.3.4-2026-10-22-oauth/results.md').toString().split('## Preserved historical prerelease ledger')[1],read('../../reports/1.3.4-2026-10-22/results.md').toString().split('## Preserved historical prerelease ledger')[1]);
 assert.equal(current.capabilities.filter(r=>r.status==='accepted-scoped-release').length,66);
 assert.equal(current.capabilities.length,87);
 assert.equal(current.counts.historicalAlsoReleaseAccepted,48);
 const oauth=current.capabilities.find(r=>r.id==='connectors.user-oauth-authorization');
 assert.equal(oauth.stampId,'c32a8e36e5ba04c8b1ddb7bb42372f1ad02b68b37029bc4045fcbfcfd075cfda');
 assert.equal(oauth.status,'accepted-scoped-release');
 assert.match(oauth.scopeNote, /earlier prerelease assessment/);
 assert.match(oauth.scopeNote, /Other OAuth controls remain unverified/);
 assert.match(oauth.cleanupNote, /trust remain explicitly retained/);
 assert.match(read('../../reports/1.3.4-2026-10-22-oauth/results.md').toString(), /Scope note: inherited assumptions/);
 assert.match(read('../../reports/1.3.4-2026-10-22-oauth/results.md').toString(), /provider, connector deployment and clone-only trust remain explicitly retained/);
 for(const line of read('../../reports/1.3.4-2026-10-22-oauth/SHA256SUMS').toString().trim().split('\n')){
  const [hash,name]=line.split('  ');const source=read('../../reports/1.3.4-2026-10-22-oauth/'+name);
  assert.equal(createHash('sha256').update(source).digest('hex'),hash);
  assert.deepEqual(source,read('../static/verification-results/1.3.4-2026-10-22-oauth/'+name));
 }
});
