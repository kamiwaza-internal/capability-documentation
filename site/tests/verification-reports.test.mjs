import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadVerificationReports, reportSections} from '../scripts/verification-reports.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';
import {zipMembers} from '../scripts/check-release-corpus.mjs';
import {createHash} from 'node:crypto';

test('a two-file submission is validated and packaged without changing the page', t => {
  const root = mkdtempSync(join(tmpdir(), 'report-pair-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const id = '1.3.0-2026-10-22-example', dir = join(root, id);
  mkdirSync(dir);
  const md = '# Kamiwaza 1.3.0 verification report\n\nEvidence date: 2026-10-22\n\n' +
    reportSections.map(section => `## ${section}\n\nExplicit scoped finding.\n`).join('\n');
  writeFileSync(join(dir, 'results.md'), md);
  assert.throws(() => loadVerificationReports(root), /submit only/);
  writeFileSync(join(dir, 'results.pdf'), '%PDF-1.4\nfixture');
  writeFileSync(join(dir, 'results.md'), md.replace('Explicit scoped finding.', 'Runtime capture: /Users/synthetic/private-fixture.txt'));
  assert.throws(() => loadVerificationReports(root), /Private absolute filesystem path/);
  writeFileSync(join(dir, 'results.md'), md);
  const reports = loadVerificationReports(root);
  const out = join(root, 'build');
  const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
  emitBundles(publication, out);
  emitEvidence(publication, null, out, JSON.parse(readFileSync(new URL('../data/descriptions.json', import.meta.url))).descriptions, null, null, [], reports);
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  for (const entry of index.versions) {
    const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
    for (const file of reports[0].files) {
      if (entry.version === '1.3.0') {
        assert.deepEqual(members.get(file.name), file.data);
        assert.ok(members.get('README.md').toString().includes(file.name));
        assert.ok(members.get('SHA256SUMS').toString().includes(createHash('sha256').update(file.data).digest('hex') + '  ' + file.name));
      } else assert.equal(members.has(file.name), false);
    }
  }
  for (const invalid of [md.replace('1.3.0 verification', '9.9.9 verification'),
    md.replace('Evidence date: 2026-10-22', 'Evidence date: 2026-10-23'),
    md.replace('## Evidence', '## Random'), md.replace('Explicit scoped finding.', '[Replace this]')]) {
    writeFileSync(join(dir, 'results.md'), invalid);
    assert.throws(() => loadVerificationReports(root));
  }
  writeFileSync(join(dir, 'results.md'), md);
  writeFileSync(join(dir, 'results.pdf'), 'not a PDF');
  assert.throws(() => loadVerificationReports(root), /invalid PDF/);
  writeFileSync(join(dir, 'extra.json'), '{}');
  assert.throws(() => loadVerificationReports(root), /submit only/);
});

import {checkReportSubmission} from '../scripts/check-report-submission.mjs';
test('report PRs cannot change layout or overwrite history', () => {
  const path = 'site/static/verification-results/1.3.4-2026-10-23-topic/results.md';
  assert.doesNotThrow(() => checkReportSubmission([['A', path], ['A', path.replace('.md', '.pdf')]]));
  assert.throws(() => checkReportSubmission([['A', path], ['M', 'site/src/pages/index.jsx']]));
  assert.throws(() => checkReportSubmission([['M', path]]));
  assert.throws(() => checkReportSubmission([['D', path]]));
  assert.doesNotThrow(() => checkReportSubmission([['M', 'site/src/pages/index.jsx']]));
});
