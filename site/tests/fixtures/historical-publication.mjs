import {readFileSync} from 'node:fs';

// Keep tests for already-published versions pinned to the input that preceded
// the staged 1.4.0 candidate. Candidate-specific tests use publication.json.
export function historicalPublication() {
  const value = JSON.parse(readFileSync(new URL('../../data/publication.json', import.meta.url), 'utf8'));
  value.releases = value.releases.filter(row => row.version !== '1.4.0');
  value.schema = 6;
  return value;
}
