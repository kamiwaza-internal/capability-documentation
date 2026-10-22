import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function checkReportSubmission(changes) {
  const prefix = 'site/static/verification-results/';
  if (!changes.some(([, path]) => path.startsWith(prefix))) return;
  for (const [status, path] of changes) {
    assert.equal(status, 'A', 'Report submissions are append-only; retain prior publications');
    assert.match(path, /^site\/static\/verification-results\/\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}(?:-[a-z0-9]+)*\/results\.(md|pdf)$/,
      'Keep report submissions to the PDF and Markdown pair; submit layout, catalog or tooling changes separately');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = process.env.PUBLICATION_BASE_SHA;
  assert.match(base ?? '', /^[a-f0-9]{40}$/, 'PUBLICATION_BASE_SHA must be a commit SHA');
  const output = execFileSync('git', ['diff', '--no-renames', '--name-status', '-z', base, 'HEAD'], {encoding: 'utf8'}).split('\0');
  const changes = [];
  for (let i = 0; i < output.length - 1; i += 2) changes.push([output[i], output[i + 1]]);
  checkReportSubmission(changes);
  console.log('Report submissions preserve history and remain separate from site changes');
}
