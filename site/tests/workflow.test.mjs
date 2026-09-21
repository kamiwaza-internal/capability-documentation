import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync(new URL('../../.github/workflows/site.yml', import.meta.url), 'utf8'));
const guard = "github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && vars.CAPABILITY_SITE_PUBLISH_ENABLED == 'true'";
function deploymentGates(value) {
  assert.equal(value.jobs.deploy.if, guard);
  const upload = value.jobs.build.steps.find(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.equal(upload.if, guard);
  assert.equal(upload.with.path, 'site/build');
  assert.deepEqual(value.permissions, {contents: 'read'});
  assert.deepEqual(value.jobs.deploy.permissions, {pages: 'write', 'id-token': 'write'});
  assert.equal(value.jobs.deploy.environment.name, 'github-pages');
  assert.equal(value.jobs.deploy.needs, 'build');
}
test('workflow guards are attached to both artifact upload and deployment', () => {
  deploymentGates(workflow);
  assert.deepEqual(workflow.on.pull_request.branches, ['main']);
  assert.equal(workflow.on.pull_request_target, undefined);
  const commands = workflow.jobs.build.steps.map(step => step.run).filter(Boolean);
  for (const command of ['npm ci --ignore-scripts', 'npm test', 'npm run test:integration', 'npm run build']) {
    assert.ok(commands.includes(command));
  }
});
test('guard regression controls fail when either gate is removed', () => {
  const noDeploy = structuredClone(workflow);
  delete noDeploy.jobs.deploy.if;
  assert.throws(() => deploymentGates(noDeploy));
  const noUpload = structuredClone(workflow);
  delete noUpload.jobs.build.steps.find(step => step.uses?.startsWith('actions/upload-pages-artifact@')).if;
  assert.throws(() => deploymentGates(noUpload));
});
