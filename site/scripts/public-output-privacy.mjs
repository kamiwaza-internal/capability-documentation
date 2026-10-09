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
