import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = path => readFileSync(new URL(path, import.meta.url));
test('Copilot publication adds exactly one accepted capability and preserves historical evidence', () => {
 const old=JSON.parse(read('../../reports/1.3.4-2026-10-21-retirement/results.json'));
 const current=JSON.parse(read('../../reports/1.3.4-2026-10-22/results.json'));
 assert.deepEqual(current.capabilities.filter(r=>r.id!=='platform.admin-copilot'),old.capabilities.filter(r=>r.id!=='platform.admin-copilot'));
 assert.deepEqual(current.historicalPrerelease,old.historicalPrerelease);
 assert.equal(read('../../reports/1.3.4-2026-10-22/results.md').toString().split('## Preserved historical prerelease ledger')[1],read('../../reports/1.3.4-2026-10-21-retirement/results.md').toString().split('## Preserved historical prerelease ledger')[1]);
 assert.equal(current.capabilities.filter(r=>r.status==='accepted-scoped-release').length,65);
 assert.equal(current.capabilities.length,87);
 assert.equal(current.counts.historicalAlsoReleaseAccepted,47);
 const copilot=current.capabilities.find(r=>r.id==='platform.admin-copilot');
 assert.equal(copilot.stampId,'d192198d5820e623fedb5fe16175a60afd6d6d87b0b8b479685a5d734f236cfb');
 assert.equal(copilot.status,'accepted-scoped-release');
 for(const line of read('../../reports/1.3.4-2026-10-22/SHA256SUMS').toString().trim().split('\n')){
  const [hash,name]=line.split('  ');const source=read('../../reports/1.3.4-2026-10-22/'+name);
  assert.equal(createHash('sha256').update(source).digest('hex'),hash);
  assert.deepEqual(source,read('../static/verification-results/1.3.4-2026-10-22/'+name));
 }
});
