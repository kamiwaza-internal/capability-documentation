// Consumer checks only: guidance never computes or changes a capability verdict.
import {createHash} from 'node:crypto';
import {id, requireValue, shape, text} from './local-stamps.mjs';
import {assertPublicOutputSafe, unsafePublicText} from './public-output-privacy.mjs';

const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const publicationDigest = publication => createHash('sha256').update(JSON.stringify(sorted(publication))).digest('hex');
const plain = value => { text(value); requireValue(value.length <= 2000 && !unsafePublicText(value), 'Unsafe or oversized public guidance'); };
const texts = (value, max) => {
  requireValue(Array.isArray(value) && value.length > 0 && value.length <= max, 'Invalid guidance list');
  value.forEach(plain);
};

export function validateGuidance(data, publication) {
  shape(data, ['schema', 'publicationSha256', 'source', 'guides', 'missingGuidance']);
  requireValue(data.schema === 'capability-sales-guidance.v1', 'Unsupported sales guidance');
  requireValue(typeof data.publicationSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.publicationSha256), 'Invalid guidance publication hash');
  const applies = data.publicationSha256 === publicationDigest(publication);
  shape(data.source, ['sourceKind', 'kitCommit']);
  requireValue(data.source.sourceKind === 'reviewed-private-kit' && typeof data.source.kitCommit === 'string' && /^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Guidance must pin its kit source');
  requireValue(data.guides && typeof data.guides === 'object' && !Array.isArray(data.guides), 'Invalid guides');
  // This sidecar is a new reviewed projection from canonical source records. It can
  // describe evidence-only rows without rewriting their historical declarations.
  const curated = new Set(publication.releases.filter(r => r.publicationState !== 'draft').flatMap(r => r.capabilities.map(c => c.id)));
  for (const [cid, guide] of Object.entries(data.guides)) {
    requireValue(id.test(cid) && (!applies || curated.has(cid)), 'Guidance outside published capability scope');
    shape(guide, ['source_version', 'purpose', 'prerequisites', 'steps', 'expected_result', 'use_cases']);
    requireValue(typeof guide.source_version === 'string' && /^\d+\.\d+\.\d+$/.test(guide.source_version), 'Invalid guidance version');
    const caps = publication.releases.filter(r => r.version === guide.source_version && r.publicationState !== 'draft')
      .flatMap(r => r.capabilities.filter(c => c.id === cid));
    requireValue(!applies || caps.length > 0, 'Guidance version has no published capability');
    plain(guide.purpose); plain(guide.expected_result);
    texts(guide.prerequisites, 30); texts(guide.steps, 30);
    requireValue(Array.isArray(guide.use_cases) && guide.use_cases.length > 0 && guide.use_cases.length <= 10, 'Invalid use cases');
    const passed = new Set(caps.flatMap(c => c.evidence.filter(r => r.outcome === 'passed').map(r => r.recordSha256).filter(Boolean)));
    for (const example of guide.use_cases) {
      shape(example, ['title', 'description', 'evidence_sha256']); plain(example.title); plain(example.description);
      requireValue(Array.isArray(example.evidence_sha256) && example.evidence_sha256.length <= 20 && new Set(example.evidence_sha256).size === example.evidence_sha256.length, 'Invalid example evidence');
      requireValue(example.evidence_sha256.every(sha => typeof sha === 'string' && /^[a-f0-9]{64}$/.test(sha) && (!applies || passed.has(sha))), 'Example requires passing runtime evidence for this capability and version');
    }
  }
  requireValue(Array.isArray(data.missingGuidance) && new Set(data.missingGuidance).size === data.missingGuidance.length, 'Invalid guidance gaps');
  requireValue(data.missingGuidance.every(cid => typeof cid === 'string' && id.test(cid) && !Object.hasOwn(data.guides, cid)), 'Invalid guidance gap identity');
  const expected = [...curated].filter(cid => !Object.hasOwn(data.guides, cid)).sort();
  requireValue(!applies || JSON.stringify([...data.missingGuidance].sort()) === JSON.stringify(expected), 'Missing guidance must be explicit and complete');
  assertPublicOutputSafe(JSON.stringify(data));
  return applies ? data : null;
}
