export const fixture = () => ({schema: 1, releases: [{
  id: 'synthetic-r1', version: '0.0.0', channel: 'development',
  build: '0.0.0; core=' + 'a'.repeat(40), sourceRevision: 'b'.repeat(40),
  publicationRevision: 1, publishedAt: '2026-09-22T00:00:00Z',
  reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/1',
  capabilities: [{id: 'synthetic.search', title: 'Synthetic search fixture',
    distribution: 'public', summary: 'Velvet otters find amber tokens.',
    conditions: ['Known synthetic input'], limits: ['No product evidence'],
    status: 'partial', wholeClaim: false, evidence: []}],
}]});
