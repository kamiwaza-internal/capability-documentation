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

test('current views and downloads exclude retirement without changing explicit historical views', async () => {
 const {currentCapabilityView, primaryCapabilities}=await import('../src/catalog.mjs');
 const {evidenceVersions, agentsMd}=await import('../src/evidence.mjs');
 const publication=JSON.parse(read('../data/publication.json'));
 const stamps=JSON.parse(read('../data/release-stamps-1.3.2.json'));
 const original=JSON.stringify(publication);
 assert.ok(!currentCapabilityView(publication).some(r=>r.id==='models.two-node-serving'));
 assert.ok(!primaryCapabilities(publication).some(r=>r.id==='models.two-node-serving'));
 assert.ok(currentCapabilityView(publication,'1.3.0').some(r=>r.id==='models.two-node-serving'));
 assert.match(evidenceVersions(publication,stamps).find(r=>r.version==='1.3.2').headline,/of 87 capabilities/);
 assert.match(agentsMd('1.3.4'),/models.two-node-serving.*unsupported/);
 assert.equal(JSON.stringify(publication),original);
});
