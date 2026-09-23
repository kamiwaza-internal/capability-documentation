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
  assert.throws(() => readerArgs(p,dir));
  assert.throws(() => indexBundle(p,dir,() => ({status:1})),/Indexing failed/);
  assert.equal(existsSync(join(dir,'ready.json')),false);
});
test('MCP-10 successful explicit indexing permits only this snapshot reader', () => {
  const dir=join(mkdtempSync(join(tmpdir(),'mcp-runner-')),'bundle');
  const p=fixture(); prepareBundle(p,'synthetic-r1',dir);
  indexBundle(p,dir,() => ({status:0}));
  assert.ok(readerArgs(p,dir).includes('stdio'));
  assert.throws(() => indexBundle(p,dir,() => ({status:0})),/already indexed/);
  assert.throws(() => readerArgs({schema:1,releases:[]},dir),/not found/);
});
