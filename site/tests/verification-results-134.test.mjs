import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import bundlePlugin from '../scripts/published-bundles.mjs';
import {createHash} from 'node:crypto';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
const base=new URL('../../reports/1.3.4-2026-10-21/',import.meta.url);
const data=JSON.parse(readFileSync(new URL('results.json',base)));
test('full results preserve distinct scoped and historical counts',()=>{
 assert.equal(data.capabilities.length,88);
 assert.equal(new Set(data.capabilities.map(r=>r.id)).size,88);
 assert.equal(data.capabilities.filter(r=>r.status==='accepted-scoped-release').length,64);
 assert.equal(data.historicalPrerelease.length,58);
 assert.equal(new Set(data.historicalPrerelease.map(r=>r.id)).size,58);
 const history=new Set(data.historicalPrerelease.map(r=>r.id));
 assert.equal(data.capabilities.filter(r=>history.has(r.id)).length,52);
 assert.equal(data.capabilities.filter(r=>history.has(r.id)&&r.status==='accepted-scoped-release').length,46);
 assert.equal(data.humanReleaseApproval,false);
 for(const row of data.capabilities.filter(r=>r.status==='accepted-scoped-release')){
  assert.match(row.stampId,/^[a-f0-9]{64}$/);
  assert.ok(row.kits.length);
  assert.equal(row.sourceCommit,data.sourceCoreCommit);
  assert.ok(Array.isArray(row.limits));
 }
 assert.match(data.capabilities.find(r=>r.id==='models.two-node-serving').gap,/retired/);
});
test('report checksums and served downloads match reviewed source bytes',()=>{
 for(const line of readFileSync(new URL('SHA256SUMS',base),'utf8').trim().split('\n')){
  const [hash,name]=line.split('  ');
  assert.equal(createHash('sha256').update(readFileSync(new URL(name,base))).digest('hex'),hash);
 }
 for(const name of ['results.json','results.md','results.pdf','kit.zip','SHA256SUMS','README.md','AGENTS.md']){
  const bytes=readFileSync(new URL(name,base));
  assert.deepEqual(bytes,readFileSync(new URL('../static/verification-results/1.3.4-2026-10-21/'+name,import.meta.url)));
  if(name.endsWith('.json')||name.endsWith('.md'))assertPublicOutputSafe(bytes);
 }
});

test('production postBuild emits every linked verification download',async()=>{
 const out=mkdtempSync(join(tmpdir(),'verification-downloads-'));
 try{
  await bundlePlugin().postBuild({outDir:out});
  for(const name of ['results.json','results.md','results.pdf','kit.zip','SHA256SUMS','README.md','AGENTS.md'])
   assert.deepEqual(readFileSync(join(out,'verification-results/1.3.4-2026-10-21',name)),readFileSync(new URL(name,base)));
 }finally{rmSync(out,{recursive:true,force:true});}
});
