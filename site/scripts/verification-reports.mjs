import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const reportRoot = fileURLToPath(new URL('../static/verification-results', import.meta.url));
// Immutable historical publications keep their original files and URLs.
const legacy = new Set(['1.3.4-2026-10-21', '1.3.4-2026-10-21-retirement',
  '1.3.4-2026-10-22', '1.3.4-2026-10-22-oauth', '1.3.4-2026-10-22-markings']);
export const reportSections = ['Scope', 'Results', 'Evidence', 'Limits and assumptions', 'Remaining work'];

export function loadVerificationReports(root = reportRoot) {
  return readdirSync(root, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name)).map(dir => {
    const match = dir.name.match(/^(\d+\.\d+\.\d+)-(\d{4}-\d{2}-\d{2})(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/);
    assert.ok(dir.isDirectory() && match, `Invalid verification report directory: ${dir.name}`);
    const files = readdirSync(join(root, dir.name), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name));
    assert.ok(files.every(file => file.isFile()), `${dir.name}: only regular files are allowed`);
    if (!legacy.has(dir.name)) {
      assert.deepEqual(files.map(file => file.name), ['results.md', 'results.pdf'], `${dir.name}: submit only results.md and results.pdf`);
      const md = readFileSync(join(root, dir.name, 'results.md'), 'utf8');
      assert.ok(md.startsWith(`# Kamiwaza ${match[1]} verification report\n`), `${dir.name}: version title must match directory`);
      assert.ok(md.includes(`\nEvidence date: ${match[2]}\n`), `${dir.name}: evidence date must match directory`);
      assert.deepEqual([...md.matchAll(/^## (.+)$/gm)].map(row => row[1]), reportSections, `${dir.name}: use the standard report sections`);
      for (const section of reportSections) {
        const body = md.split(`## ${section}\n`)[1]?.split('\n## ')[0]?.trim();
        assert.ok(body && !body.includes('[Replace'), `${dir.name}: complete ${section}`);
      }
      assert.ok(readFileSync(join(root, dir.name, 'results.pdf')).subarray(0, 5).equals(Buffer.from('%PDF-')), `${dir.name}: invalid PDF header`);
    }
    return {id: dir.name, version: match[1], historical: legacy.has(dir.name), files: files.map(file => ({
      name: `verification-results/${dir.name}/${file.name}`, data: readFileSync(join(root, dir.name, file.name)),
    }))};
  });
}
