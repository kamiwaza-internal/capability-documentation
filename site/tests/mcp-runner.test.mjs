import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fixture} from './fixtures/mcp.mjs';
import {prepareBundle} from '../../mcp/bundle.mjs';
import {indexBundle,readerArgs} from '../../mcp/runner.mjs';

test('MCP-9 failed index is never marked ready or served', () => {
  const dir=join(mkdtempSync(join(tmpdir(),'mcp-runner-')),'bundle');
  const p=fixture(); prepareBundle(p,'synthetic-r1',dir);
  assert.throws(() => readerArgs(p,dir),/Index is not ready/);
  assert.throws(() => indexBundle(p,dir,() => ({status:null,error:new Error('ENOENT docker')})),/ENOENT docker/);
  assert.throws(() => indexBundle(p,dir,() => ({status:1})),/Indexing failed/);
  assert.equal(existsSync(join(dir,'ready.json')),false);
});
test('MCP-10 successful explicit indexing permits only this snapshot reader', () => {
  const dir=join(mkdtempSync(join(tmpdir(),'mcp-runner-')),'bundle');
  const p=fixture(); prepareBundle(p,'synthetic-r1',dir);
  const bundle=prepareListing(p);
  assert.throws(() => indexBundle(p,dir,(args,options) => ({status:0,stdout:options?.capture ? '[]' : ''})),/Incomplete index/);
  assert.equal(existsSync(join(dir,'ready.json')),false);
  indexBundle(p,dir,(args,options) => ({status:0,stdout:options?.capture ? JSON.stringify(bundle) : ''}));
  assert.ok(readerArgs(p,dir).includes('stdio'));
  assert.throws(() => indexBundle(p,dir,() => ({status:0})),/already indexed/);
  assert.throws(() => readerArgs({schema:1,releases:[]},dir),/not found/);
});

import {makeBundle} from '../../mcp/integration.mjs';
function prepareListing(p) {
  const bundle=makeBundle(p,'synthetic-r1');
  return [{name:bundle.library,versions:[{version:bundle.version,status:'completed',uniqueUrlCount:1}]}];
}
