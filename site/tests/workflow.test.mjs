import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('site workflow validates PRs but only deploys main with explicit enablement', () => {
  const workflow=readFileSync(new URL('../../.github/workflows/site.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /vars.CAPABILITY_SITE_PUBLISH_ENABLED == 'true'/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /contents: write/);
  assert.match(workflow, /path: site\/build/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /environment:\s*name: github-pages/);
});
