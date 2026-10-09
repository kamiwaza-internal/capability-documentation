import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
test('public relative plugin and versioned bundle references are safe', () => {
  const publicConfig = JSON.stringify({plugins:['./scripts/published-bundles.mjs'],bundle:'/releases/1.3.0-prerelease-r3/bundle.json'});
  assert.doesNotThrow(()=>assertPublicOutputSafe(publicConfig));
});
test('immutable generic product partition prerequisite does not identify a private task path', () => {
 assert.doesNotThrow(()=>assertPublicOutputSafe('Partitions backing /, /tmp and /var/lib must be sized.'));
});
for (const path of [
  '/home/ec2-user/tmp/arbitrary-snapshot/site/scripts/published-bundles.mjs',
  '/Users/reviewer/private-snapshot/site/scripts/published-bundles.mjs',
  '/tmp/arbitrary-snapshot/site/scripts/published-bundles.mjs',
  '/var/private/site/plugin.mjs', '/etc/private/plugin.mjs',
  String.raw`\/home\/ec2-user\/private\/plugin.mjs`,
  String.raw`\u002fhome\u002fec2-user\u002fprivate\u002fplugin.mjs`,
  'file:///home/ec2-user/private/plugin.mjs',
  String.raw`C:\Users\reviewer\private\plugin.mjs`,
]) test('rejects serialized filesystem path '+path.slice(0,20),()=>{
  assert.throws(()=>assertPublicOutputSafe('siteConfig.plugins=["'+path+'"]'), /Private absolute filesystem path/);
});
test('rejects an arbitrary snapshot marker independently of known home prefixes', () => {
  assert.throws(()=>assertPublicOutputSafe('siteConfig.privateRoot="PRIVATE_SITE_ROOT_NOT_FOR_EXPORT"',['PRIVATE_SITE_ROOT_NOT_FOR_EXPORT']),/Private value/);
});
