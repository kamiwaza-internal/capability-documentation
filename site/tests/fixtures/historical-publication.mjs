import {readFileSync} from 'node:fs';

// Keep historical-version tests scoped to data before the 1.4.0 publication.
// Current 1.4.0 tests use the complete publication.json.
export function historicalPublication() {
  const value = JSON.parse(readFileSync(new URL('../../data/publication.json', import.meta.url), 'utf8'));
  value.releases = value.releases.filter(row => row.version !== '1.4.0');
  value.releaseStamps = (value.releaseStamps ?? []).filter(row => row.version !== '1.4.0');
  value.schema = 6;
  return value;
}
