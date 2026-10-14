// Sanitized public projection of the kit's plain-language capability introductions: the first
// paragraph of each capabilities/<id>.md, as plain text. Nothing else of a record is read out.
// Usage: node scripts/project-descriptions.mjs <path-to-kit-checkout>
// Writes data/descriptions.json. Deterministic: same kit bytes and publication, same output bytes.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {id, requireValue, shape, text} from './local-stamps.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';
import {stampsApply} from '../src/catalog.mjs';

// ponytail: pinned like the stamp projections, not derived from the checkout, so regeneration
// stays byte-identical. Change it in the same commit that regenerates from a newer kit commit.
const KIT_COMMIT = '5964dca385d869d3df276f1c55fac516c887b971';
const KIT_REPOSITORY = 'kamiwaza-internal/capability-kit';

const publishedIds = publication => new Set((publication.releases ?? []).flatMap(release => release.capabilities.map(cap => cap.id)));

// The file's own checks always run. `publication` is optional. When given and it holds the
// baseline release this projection names, every described capability must be a published one.
// Returns the data, or null when the projection does not apply to the given publication.
export function validateDescriptions(data, publication) {
  shape(data, ['schema', 'baselineReleaseId', 'source', 'descriptions']);
  requireValue(data.schema === 'capability-description-projection.v1', 'Unsupported description projection');
  requireValue(typeof data.baselineReleaseId === 'string' && id.test(data.baselineReleaseId), 'Descriptions must name the baseline release they were projected against');
  shape(data.source, ['kitRepository', 'kitCommit']);
  requireValue(data.source.kitRepository === KIT_REPOSITORY && /^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Kit source must pin a commit');
  requireValue(Object.prototype.toString.call(data.descriptions) === '[object Object]', 'Invalid descriptions');
  for (const [capability, description] of Object.entries(data.descriptions)) {
    requireValue(id.test(capability), 'Invalid capability identifier');
    text(description);
  }
  assertPublicOutputSafe(JSON.stringify(data));
  if (!publication) return data;
  if (!stampsApply(data, publication)) return null;
  const known = publishedIds(publication);
  for (const capability of Object.keys(data.descriptions)) requireValue(known.has(capability), 'Description for a capability outside the publication: ' + capability);
  return data;
}

// The prose before the first `## ` heading, after the front matter and the H1. A record that
// opens with a list, table, quote or code block has no introduction; none is invented.
function intro(markdown) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '').split(/^## /m)[0];
  const first = body.split(/\n\s*\n/).map(block => block.trim()).find(block => block && !block.startsWith('# '));
  return first && !/^(?:[-+*] |\d+\. |[>|<#]|```|:::)/.test(first) ? first : null;
}

// ponytail: regex Markdown stripping (links to their text, bold, italic, backticks), enough for
// one prose paragraph. Use a Markdown parser if introductions start carrying nested or reference syntax.
export const plain = markdown => markdown.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|`/g, '')
  .replace(/(^|[^\w*])[*_](\S(?:.*?\S)?)[*_](?![\w*])/g, '$1$2').replace(/\s+/g, ' ').trim();

export function projectDescriptions(kit, publication) {
  const baseline = publication.releases.filter(r => r.baselineKind === 'prerelease-evidence').sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
  requireValue(baseline, 'No pre-release evidence release to project against');
  const descriptions = {};
  // Published ids only: a record that is omitted, deferred or absent from the publication is never read.
  for (const capability of Array.from(publishedIds(publication)).sort()) {
    requireValue(id.test(capability), 'Invalid capability identifier');
    const path = join(kit, 'capabilities', capability + '.md');
    const found = existsSync(path) ? intro(readFileSync(path, 'utf8')) : null;
    if (found) descriptions[capability] = plain(found);
  }
  return validateDescriptions({schema: 'capability-description-projection.v1', baselineReleaseId: baseline.id,
    source: {kitRepository: KIT_REPOSITORY, kitCommit: KIT_COMMIT}, descriptions}, publication);
}

export const serialize = data => JSON.stringify(data, null, 2) + '\n';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/project-descriptions.mjs <path-to-kit-checkout>');
  const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('../data/descriptions.json', import.meta.url), serialize(projectDescriptions(process.argv[2], publication)));
}
