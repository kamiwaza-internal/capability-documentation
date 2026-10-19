import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

// Exact sanitized public projection reviewed with sales-guidance.json and
// value-streams.json. Keep its bytes stable while later publication revisions
// are tested separately as stale inputs.
const bytes = gunzipSync(readFileSync(new URL('./reviewed-sidecar-publication.json.gz', import.meta.url)));
if (createHash('sha256').update(bytes).digest('hex') !== '7f9239d0e90f08c989e30e87aff7d9b26abd2aee2b02e2b75088477a75f2459b') {
  throw new Error('Reviewed sidecar publication fixture changed');
}
export const reviewedSidecarPublication = JSON.parse(bytes);
