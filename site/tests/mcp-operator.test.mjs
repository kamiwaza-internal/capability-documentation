import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,symlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareBundle} from '../../mcp/bundle.mjs';
import {dockerArgs,makeBundle} from '../../mcp/integration.mjs';
import {fixture} from './fixtures/mcp.mjs';

test('MCP-12 root cannot prepare or launch a container', t => {
  const dir=join(mkdtempSync(join(tmpdir(),'mcp-root-control-')),'bundle');
  t.mock.method(process,'getuid',()=>0);
  assert.throws(()=>prepareBundle(fixture(),'synthetic-r1',dir),/non-root/);
  assert.equal(existsSync(dir),false);
  assert.throws(()=>dockerArgs(dir,makeBundle(fixture(),'synthetic-r1'),'serve'),/non-root/);
});

test('MCP-13 symlinked parent is rejected before creating a bundle', () => {
  const root=mkdtempSync(join(tmpdir(),'mcp-parent-control-'));
  const link=join(root,'alias'); symlinkSync(root,link,'dir');
  const dir=join(link,'bundle');
  assert.throws(()=>prepareBundle(fixture(),'synthetic-r1',dir),/real absolute parent/);
  assert.equal(existsSync(dir),false);
});
