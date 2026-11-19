import {readFileSync} from 'node:fs';

// Keep historical-version tests scoped to data before the 1.4.0 publication.
// Current-release tests use the complete publication.json.
export function historicalPublication() {
  const value = JSON.parse(readFileSync(new URL('../../data/publication.json', import.meta.url), 'utf8'));
  const isHistorical = ({version}) => {
    const [major, minor] = version.split('.').map(Number);
    return major < 1 || (major === 1 && minor < 4);
  };
  value.releases = value.releases.filter(isHistorical);
  value.releaseStamps = (value.releaseStamps ?? []).filter(isHistorical);
  value.schema = 6;
  return value;
}
