import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const origin = 'https://capabilities.kamiwaza.dev';
const expected = JSON.parse(readFileSync(new URL('../build/evidence/index.json', import.meta.url)));
const clientId = process.env.CAPABILITY_SITE_ACCESS_CLIENT_ID;
const clientSecret = process.env.CAPABILITY_SITE_ACCESS_CLIENT_SECRET;
assert.equal(Boolean(clientId), Boolean(clientSecret), 'Configure both site access credentials together');
const headers = clientId ? {'CF-Access-Client-Id': clientId, 'CF-Access-Client-Secret': clientSecret} : {};
const revision = process.env.GITHUB_SHA;
assert.match(revision ?? '', /^[a-f0-9]{40}$/, 'Use the deployed commit to bypass stale cache entries');

async function fetchDeployment(path) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin, 'Download path escapes the capability site');
  assert.ok(url.pathname.startsWith('/evidence/'), 'Download path escapes release evidence');
  url.searchParams.set('deploy', revision);
  return fetch(url, {headers, redirect: 'manual', signal: AbortSignal.timeout(15000)});
}

const response = await fetchDeployment('/evidence/index.json');
const location = response.headers.get('location');
const accessRedirect = location && new URL(location, origin).hostname.endsWith('.cloudflareaccess.com');
if (accessRedirect && !clientId) {
  console.log('::notice::Cloudflare Access requires a site service token for HTTP verification. The deployed Pages artifact was checked.');
} else {
  assert.ok(response.ok, `Deployed evidence index returned HTTP ${response.status}`);
  assert.deepEqual(await response.json(), expected, 'The live site serves a different evidence index');
  await Promise.all(expected.versions.map(async ({version, files}) => {
    const zip = await fetchDeployment(files.zip.path);
    assert.ok(zip.ok, `Deployed ${version} ZIP returned HTTP ${zip.status}`);
    const hash = createHash('sha256').update(new Uint8Array(await zip.arrayBuffer())).digest('hex');
    assert.equal(hash, files.zip.sha256, `Deployed ${version} ZIP differs from the reviewed artifact`);
  }));
  console.log(`Verified the live evidence index and ${expected.versions.length} release ZIPs.`);
}
