// Public artifact validation. Private provenance remains outside the static build.
export function assertPublicOutputSafe(bytes, privateValues = []) {
  const raw = typeof bytes === 'string' ? bytes : bytes.toString('utf8');
  const normalized = raw.replaceAll('\\/', '/').replace(/\\u002f/gi, '/').replace(/&#(?:47|x2f);/gi, '/');
  if (/\/(?:home|Users|tmp)\//i.test(normalized) || /\/(?:var|etc)\/private\//i.test(normalized) || /[a-z]:\\+(?:Users|Temp)\\+/i.test(raw)) {
    throw new Error('Private absolute filesystem path in public artifact');
  }
  for (const value of privateValues) {
    if (raw.includes(value) || normalized.includes(value)) throw new Error('Private value in public artifact');
  }
}

// Free prose bound for the public site (descriptions): the capability kit's `unsafe_public_text`
// (scripts/export_prerelease_publication.py), plus internal hosts, secret names, registries and
// digests named explicitly. Stricter than the artifact check above, which also passes the site's
// own review URLs and hashes. Returns the first reason the text is unsafe, or null.
const UNSAFE_TEXT = [
  [/linear\.app|github\.com\/kamiwaza-internal/i, 'internal tracker or repository reference'],
  [/https?:\/\//i, 'URL'],
  [/\/(?:home|tmp|etc|var)\//, 'filesystem path'],
  [/PRIVATE|CANARY|\.env\b|localhost/, 'private marker'],
  [/[A-Za-z0-9]_(?:PASSWORD|TOKEN|SECRET|KEY)\b/i, 'secret variable name'],
  [/[A-Z][A-Z0-9]+_[A-Z0-9_]+/, 'environment variable name'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, 'IP address'],
  [/@sha256:|\bsha256:[a-f0-9]{12}/i, 'image digest'],
  [/\b(?:ghcr|docker|quay|gcr)\.io\b|\.dkr\.ecr\.|\b[\w-]+(?:\.[\w-]+)+(?::\d+)?\/[\w./-]+:[\w.-]+/i, 'container registry reference'],
];
export const unsafePublicText = value => UNSAFE_TEXT.find(([pattern]) => pattern.test(value))?.[1] ?? null;
