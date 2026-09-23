import {createHash} from 'node:crypto';
import {isAbsolute} from 'node:path';
import {validatePublication} from '../site/scripts/publication.mjs';

// Upstream v3.2.0, Linux amd64 manifest. No floating tag at execution time.
export const IMAGE = 'ghcr.io/arabold/docs-mcp-server@sha256:004fc822bfd88624934b7e2fd0addabc05729d2de00b99eb7580efdc6efe452c';

export function makeBundle(publication, snapshotId) {
  validatePublication(publication);
  const release = publication.releases.find(item => item.id === snapshotId);
  if (!release) throw new Error('Requested public snapshot not found; no latest-version fallback');
  const digest = createHash('sha256').update(JSON.stringify(release)).digest('hex');
  const documents = Object.fromEntries(release.capabilities.map(capability => [
    `${capability.id}.txt`, JSON.stringify({
      snapshotId: release.id, version: release.version, channel: release.channel,
      build: release.build, sourceRevision: release.sourceRevision,
      publicationRevision: release.publicationRevision, publishedAt: release.publishedAt,
      reviewReference: release.reviewReference,
      citation: `https://capabilities.kamiwaza.dev/#${release.id}--${capability.id}`,
      capability,
    }, null, 2) + '\n',
  ]));
  return {schema: 1, snapshotId, digest, library: `kamiwaza-${digest}`, version: release.version, documents};
}

export function runtimeConfig(reader) {
  return {
    app: {storePath: '/data', telemetryEnabled: false, readOnly: reader},
    scraper: {security: {
      network: {mode: 'allowlist', allowedHosts: [], allowedCidrs: [], allowPrivateNetworks: false, allowInvalidTls: false},
      fileAccess: {mode: reader ? 'disabled' : 'allowedRoots', allowedRoots: reader ? [] : ['/input'], followSymlinks: false, includeHidden: false},
    }},
  };
}

export function dockerArgs(directory, bundle, operation) {
  if (!isAbsolute(directory) || /[,\r\n]/.test(directory)) throw new Error('Bundle path must be absolute and contain no commas or newlines');
  if (!['index', 'serve', 'list', 'search'].includes(operation)) throw new Error('Unsupported operation');
  const reader = operation !== 'index';
  const args = ['run', '--rm', '--pull=never', '--platform', 'linux/amd64', '--network', 'none',
    '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit', '256',
    '--memory', '2g', '--cpus', '2', '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m',
    '--tmpfs', '/config:rw,nosuid,nodev,size=16m',
    '--mount', `type=bind,src=${directory}/data,dst=/data`,
    '--mount', `type=bind,src=${directory}/${reader ? 'reader' : 'indexer'}.json,dst=/settings.json,readonly`];
  if (typeof process.getuid === 'function') args.push('--user', `${process.getuid()}:${process.getgid()}`);
  if (!reader) args.push('--mount', `type=bind,src=${directory}/documents,dst=/input,readonly`);
  if (operation === 'serve') args.push('-i');
  args.push(IMAGE);
  if (operation === 'index') args.push('scrape', bundle.library, 'file:///input', '--version', bundle.version);
  else if (operation === 'serve') args.push('mcp', '--protocol', 'stdio', '--read-only');
  else if (operation === 'list') args.push('list', '--output', 'json');
  else args.push('search', bundle.library);
  args.push('--config', '/settings.json', '--store-path', '/data', '--no-telemetry', '--no-logo');
  return args;
}
