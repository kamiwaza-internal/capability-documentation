import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublication} from '../scripts/publication.mjs';
import {prereleaseFixture} from './fixtures/prerelease.mjs';
test('public federation cluster capability and explanatory text remain valid', () => {
 const x=prereleaseFixture(); const r=x.releases[0];
 r.capabilities[2].id='federation.cluster-pairing'; r.deferredCapabilities=['federation.cluster-pairing'];
 r.capabilities[0].limits.push('Cluster pairing is a separate deferred capability.');
 assert.doesNotThrow(()=>validatePublication(x));
 assert.equal(r.capabilities[2].status,'not-yet-verified');
});
for (const [name,mutate,reason] of [
 ['private runtime host metadata',x=>x.releases[0].runtimeHost='cluster-private.invalid',/Unexpected or missing fields/],
 ['host substituted as tested build',x=>x.releases[0].testedBuilds=['cluster-private.invalid'],/Invalid tested builds/],
 ['private configuration object',x=>x.releases[0].runtimeEnvironment={PRIVATE_MODE:true},/Unexpected or missing fields/],
 ['host literal in assessment text',x=>x.releases[0].capabilities[3].assessment.limits.push('10.20.30.40'),/Private assessment content/],
 ['private configuration literal',x=>x.releases[0].capabilities[3].assessment.limits.push('KAMIWAZA_PRIVATE_MODE=1'),/Private assessment content/],
 ['canary in assessment text',x=>x.releases[0].capabilities[3].assessment.limits.push('PRIVATE_CANARY_NOT_FOR_EXPORT'),/Private assessment content/],
]) test('rejects '+name,()=>{
 const x=prereleaseFixture();mutate(x);assert.throws(()=>validatePublication(x),reason);
});
