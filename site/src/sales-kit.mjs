import {evidenceDocument, namedRows, recordVersion} from './evidence.mjs';

export const salesKitPath = version => '/evidence/' + version + '/kamiwaza-sales-dev-kit-' + version;

// The complete evidence appendix is reused unchanged. No new status computation lives here.
export function salesKitDocument(entry, publication, releaseStamps, guidance) {
  const h = (level, text) => ({type: 'h', level, text});
  const p = text => ({type: 'p', text});
  const li = text => ({type: 'li', level: 0, text});
  const version = recordVersion(entry, publication);
  const rows = namedRows(entry, publication, releaseStamps);
  const guides = rows.filter(item => item.curated && guidance?.guides[item.row.id]?.source_version === version);
  const missing = rows.filter(item => !guides.some(g => g.row.id === item.row.id));
  const blocks = [h(1, `Kamiwaza and Kaizen Sales Dev Kit ${entry.version}`),
    p(`A customer-agnostic reference for salespeople and their chosen AI assistants. ${entry.headline}.`),
    p(entry.basis), h(2, 'How to use this kit'),
    li('Read the function, prerequisites and expected result before discussing a use case. Carry the conditions and limits into your answer.'),
    li('Attach this one document to your chosen assistant and ask a capability question or assess requirements. No Slack bot, plugin or additional download is required.'),
    li('A pasted RFP is material to assess. Draft a full response only when the user explicitly requests it. Customer facts, pricing and commitments must come from that user.'),
    li('Evidence-linked examples describe only their named scope. Illustrative examples are suggestions, not demonstrated outcomes. A component test does not prove a complete workflow.'),
    p(`Usage guidance is from the ${version} source scope. It does not establish compatibility with a different build, including a later release stamp.`),
    p(`Guidance coverage: ${guides.length} of ${rows.length} capabilities. Missing usage steps remain visible; the complete capability and evidence reference follows.`),
  ];
  if (guidance) blocks.push(p(`Guidance source: kit commit ${guidance.source.kitCommit}. Publication content SHA-256: ${guidance.publicationSha256}. This identifies the input, not approval or product verification.`));
  blocks.push(h(2, 'Usage guidance and examples'));
  for (const item of guides) {
    const cid = item.row.id, guide = guidance.guides[cid];
    blocks.push(h(3, `${item.name} (${cid})`), p(`Evidence status for ${entry.version}: ${item.label}.`),
      p(guide.purpose), p('Prerequisites'), ...guide.prerequisites.map(li), p('Steps'),
      ...guide.steps.map((step, index) => li(`${index + 1}. ${step}`)), p('Expected result: ' + guide.expected_result));
    for (const example of guide.use_cases) {
      blocks.push(p(`${example.title} — ${example.evidence_sha256.length ? 'Evidence-linked example; only the described scope is demonstrated' : 'Illustrative example; not demonstrated'}`), p(example.description));
      for (const hash of example.evidence_sha256) blocks.push(li(`Historical runtime evidence SHA-256: ${hash}. See the capability evidence below for build, date and limits; this is not proof on ${entry.version}.`));
    }
  }
  if (missing.length) blocks.push(h(2, 'Usage guidance not yet published'),
    p('These capabilities remain in the reference below. No usage steps or use cases are invented for them.'),
    ...missing.map(item => li(`${item.name} (${item.row.id}) — usage guidance not yet published for ${version}.`)));
  blocks.push(h(2, 'Complete capability and evidence reference'),
    ...evidenceDocument(entry, publication, releaseStamps).slice(1));
  return blocks;
}
