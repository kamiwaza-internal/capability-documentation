import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBundle, dockerArgs, IMAGE} from '../../mcp/integration.mjs';

import {fixture} from './fixtures/mcp.mjs';
test('MCP-1 explicit snapshot preserves full claim, limits and exact build', () => {
  const p = fixture(); const bundle = makeBundle(p, 'synthetic-r1');
  const record = JSON.parse(bundle.documents['synthetic.search.txt']);
  assert.deepEqual(record.capability, p.releases[0].capabilities[0]);
  assert.equal(record.build, p.releases[0].build);
  assert.equal(record.snapshotId, 'synthetic-r1');
  assert.match(record.citation, /#synthetic-r1--synthetic.search$/);
  assert.match(bundle.library, /^kamiwaza-[a-f0-9]{64}$/);
});
test('MCP-2 missing, empty or internal snapshots fail closed', () => {
  assert.throws(() => makeBundle(fixture(), 'latest'), /not found/);
  assert.throws(() => makeBundle({schema:1,releases:[]}, 'synthetic-r1'), /not found/);
  const p=fixture(); p.releases[0].capabilities[0].distribution='internal';
  assert.throws(() => makeBundle(p, 'synthetic-r1'));
});
test('MCP-3 amendments and builds have distinct index identities', () => {
  const p=fixture(); const first=makeBundle(p, 'synthetic-r1');
  p.releases[0].capabilities[0].limits.push('Additional limitation');
  assert.notEqual(makeBundle(p, 'synthetic-r1').library, first.library);
});
test('MCP-4 reader has no network, input mount, exposed port or inherited credentials', () => {
  const args=dockerArgs('/tmp/synthetic-bundle', makeBundle(fixture(), 'synthetic-r1'), 'serve');
  assert.equal(args[args.indexOf('--network')+1], 'none');
  assert.ok(args.includes(IMAGE)); assert.match(IMAGE, /@sha256:[a-f0-9]{64}$/);
  assert.ok(args.includes('--read-only')); assert.ok(args.includes('stdio'));
  assert.ok(!args.join(' ').includes('/input')); assert.ok(!args.includes('-p'));
  assert.ok(!args.join(' ').includes('TOKEN')); assert.ok(!args.includes('--env-file'));
});
test('MCP-5 index can read only prepared input and never the repository', () => {
  const args=dockerArgs('/tmp/synthetic-bundle', makeBundle(fixture(), 'synthetic-r1'), 'index');
  assert.ok(args.includes('type=bind,src=/tmp/synthetic-bundle/documents,dst=/input,readonly'));
  assert.ok(args.includes('scrape'));
  assert.throws(() => dockerArgs('/tmp/comma,injection', makeBundle(fixture(),'synthetic-r1'), 'index'));
  assert.throws(() => dockerArgs('/tmp/x', makeBundle(fixture(),'synthetic-r1'), 'delete'));
});
