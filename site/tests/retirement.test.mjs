import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = path => readFileSync(new URL(path, import.meta.url));
test('retirement removes only the unsupported target and preserves every accepted and historical row', () => {
 const old=JSON.parse(read('../../reports/1.3.4-2026-10-21/results.json'));
 const current=JSON.parse(read('../../reports/1.3.4-2026-10-21-retirement/results.json'));
 assert.deepEqual(current.capabilities,old.capabilities.filter(r=>r.id!=='models.two-node-serving'));
 assert.deepEqual(current.historicalPrerelease,old.historicalPrerelease);
 assert.deepEqual(current.counts,{...old.counts,included:87,remaining:23});
 assert.equal(current.scopeCorrection.newVerificationCredits,0);
 const md=read('../../reports/1.3.4-2026-10-21-retirement/results.md').toString();
 assert.ok(!md.includes('### models.two-node-serving'));
 assert.ok(md.includes('retired'));
 for(const line of read('../../reports/1.3.4-2026-10-21-retirement/SHA256SUMS').toString().trim().split('\n')){
  const [hash,name]=line.split('  ');
  const source=read('../../reports/1.3.4-2026-10-21-retirement/'+name);
  assert.equal(createHash('sha256').update(source).digest('hex'),hash);
  assert.deepEqual(source,read('../static/verification-results/1.3.4-2026-10-21-retirement/'+name));
 }
});
