export function filterCapabilities(capabilities, query, status) {
  const needle = query.trim().toLowerCase();
  return capabilities.filter(cap => (status === 'all' || cap.status === status) &&
    [cap.id, cap.title, cap.summary, ...cap.conditions, ...cap.limits]
      .some(value => value.toLowerCase().includes(needle)));
}

export function countStatuses(capabilities) {
  const counts = {verified: 0, partial: 0, failed: 0, untested: 0};
  for (const cap of capabilities) counts[cap.status]++;
  return counts;
}
