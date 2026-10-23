const h = (level, text) => ({type: 'h', level, text});
const p = text => ({type: 'p', text});
const li = text => ({type: 'li', level: 0, text});
export const verificationLabel = row => row.status === 'accepted-scoped-release'
  ? 'Release verified — tested this release' : row.historicalPrerelease
    ? 'Prerelease verified — release acceptance pending' : 'Release verification pending';

// User instructions are curated from the cited product journeys, not inferred from stamp counts.
export const recipes134 = [
  {title: 'Find an application to deploy', outcome: 'See the applications available in your App Garden and choose a suitable template.',
    roles: 'An authenticated platform user; an operator for deployment.',
    needs: ['Access to App Garden and a configured application catalog.'],
    ingredients: ['apps.app-garden'],
    steps: ['Open App Garden at /apps.', 'Browse the application cards and choose the template that fits your task.',
      'Review the template settings and model requirements before using its Deploy action. Deployment and model choices may require your operator.'],
    result: 'The catalog shows available applications and their deployment controls.',
    coverage: 'Catalog browsing was observed in Chrome. Separate SDK checks cover one application’s deploy, inspect, stop and purge lifecycle. A complete browser deployment is not established.',
    source: 'web-ui-smoke-tests, journeys/appgarden_browse_sc_01.py; capability-kit, verification/stream-recipes/Operator:VS3:app-garden-sdk-lifecycle/r1.json'},
  {title: 'Ask a question about a workroom file', outcome: 'Get an answer grounded in an uploaded workroom file, then ask a follow-up.',
    roles: 'A user with access to the workroom and its Kaizen conversation.',
    needs: ['Kaizen deployed for the workroom, a serving model and an agent allowed to read the file.',
      'An uploaded file and a prepared conversation. Ask your operator to provision these if they are not available.'],
    ingredients: ['kaizen.data-chat', 'kaizen.conversation-event-streaming'],
    steps: ['Open the prepared conversation in Kaizen.', 'Enter a question about the file in “Send a message...” and select “Send message”.',
      'Read the reply and check its cited source before relying on it.', 'Ask a follow-up in the same conversation.'],
    result: 'The answer refers to the file and the conversation retains context for the follow-up.',
    coverage: 'The accepted 1.3.4 data-chat proof used the API, a synthetic uploaded file and a prepared conversation. These UI steps are documented in the browser test; they are not a completed release UI verification. General answer accuracy is not guaranteed.',
    source: 'web-ui-smoke-tests, candidates/test_kaizen_data_chat.py; capability-kit, reports/2026-10-21-legacy-data-chat-release134 (see the capability stamp for its exact run)'},
  {title: 'Connect your own account to a data source', outcome: 'Authorize a configured connector to use your own account, then disconnect it when finished.',
    roles: 'A signed-in user with access to the workroom and connector.',
    needs: ['An administrator has deployed and configured an OAuth connector.', 'An account with the source provider and permission to approve the requested access.'],
    ingredients: ['connectors.user-oauth-authorization'],
    steps: ['Open /connectors and find the configured connector.', 'Select “Connect”. In the provider window, sign in and review the requested permissions before granting consent.',
      'Return to the connector card and select “Test” if offered. Confirm the account is shown as connected.',
      'Use only content your account is authorized to access. When finished, select “Disconnect” and confirm the card shows “Not connected”.'],
    result: 'Your connection uses your identity; disconnecting removes this application’s active connection.',
    coverage: 'The recorded Chrome journey tested two nonadmin users with an owned provider: consent, identity, own-file access, cross-user refusal and disconnect. Other providers, device-code login and provider-side token revocation were not verified.',
    source: 'web-ui-smoke-tests@4d3bc8838247cfe80a39eb09702516070e9d6eb4, candidates/test_user_oauth_authorization.py; capability-kit, reports/2026-10-22-oauth-release134/README.md'},
];

export function verificationDocument(report, concise = false) {
  const c = report.counts;
  const blocks = [h(1, `Kamiwaza ${report.version}: capability verification`),
    p(`${c.acceptedScoped} of ${c.included} capabilities are release verified for their recorded scenarios. ${c.remaining} still need release verification. Evidence through ${report.asOf}.`),
    p(`${c.historicalPrerelease} historical prerelease verifications are preserved: ${c.historicalInScope} overlap this release inventory and ${c.historicalOutsideScope} sit outside it. These are not additional release passes.`),
    p('Results were collected across multiple configurations. They do not establish one jointly tested deployment or whole-release approval.')];
  if (concise) return [...blocks, h(2, 'Capability status'), ...report.capabilities.flatMap(row => [h(3, row.title), p(verificationLabel(row))])];
  blocks.push(h(2, 'Current capability results'));
  for (const row of report.capabilities) {
    blocks.push(h(3, row.title), p(`${row.id} · ${verificationLabel(row)}`),
      p(row.historicalPrerelease ? 'Historical prerelease verification is also retained.' : 'No historical prerelease verification is recorded for this capability.'));
    if (row.gap) blocks.push(p(`Remaining work: ${row.gap}`));
    if (row.scopeNote) blocks.push(p(`Current versus historical scope: ${row.scopeNote}`));
    if (row.limits?.length) blocks.push(p('Retained evidence notes include earlier assessments. Historical statements about missing release proof do not override the current status above; current scope and exclusions still apply.'));
    for (const limit of row.limits ?? []) blocks.push(li(limit));
    for (const assumption of row.assumptions ?? []) blocks.push(li(`Assumption: ${assumption}`));
    if (row.stampId) blocks.push(p(`Evidence: ${row.stampId}; recorded ${row.finishedAt}.`));
  }
  blocks.push(h(2, 'Historical prerelease evidence'));
  for (const row of report.historicalPrerelease) blocks.push(h(3, row.title), p(`${row.id} · Historical prerelease verified; original target ${row.originTarget}, ledger target ${row.ledgerTarget}.`),
    ...row.limits.map(li), ...row.assumptions.map(value => li(`Assumption: ${value}`)));
  blocks.push(h(2, 'Sources'), p(`Canonical capability-kit commit: ${report.sourceKitCommit}. Core source: ${report.sourceCoreCommit}.`),
    p(`Full source record: ${report.sourcePath}. Detailed stamps, limits and historical records are retained in the ZIP.`));
  return blocks;
}

// Human summaries of the pinned report; the ZIP retains every original note and assumption.
const scopeSummaries = {
  'apps.app-garden': 'Browse the App Garden in Chrome. A separate SDK journey deploys, inspects, stops and purges one disposable app. Full browser deployment and every template are not verified.',
  'connectors.user-oauth-authorization': 'Connect two users through an owned authorization-code provider, verify separate file access, and disconnect. Other providers, device-code login, token-replay/expiry, encryption-at-rest and durable token erasure are not verified.',
  'ingestion.document-translation': 'Translate one synthetic English document into Spanish through OmniParse’s API, retrieve it and remove the owned documents. General translation accuracy, other languages and the browser/Core ingestion path are not verified.',
  'ingestion.multimedia-extraction': 'Extract and retrieve facts from synthetic PNG, WAV and MP4 inputs through Core’s API. Requires prepared parsing, embedding, vision and transcription services. Other formats, real-world extraction quality, browser use and permission isolation are not verified. API cleanup does not prove physical erasure.',
  'ingestion.parse-from-url': 'Fetch an approved public HTTPS document, read its Markdown/HTML, reject a loopback URL and clean up. Authenticated sources, redirects, other restricted address classes, multimedia and Core ingestion jobs are not verified.',
  'ingestion.structured-document-outputs': 'Parse synthetic HTML and check table values, figure identities, chunks and Markdown/HTML. Figure pixels, captions, coordinates, page numbers, OCR, annotated PDFs and Docling JSON are not verified.',
  'kaizen.privacy-guard': 'In Chrome’s Legacy Kaizen app, exercise Off, Warn and Redact for typed text, editing/send choices, saved preferences and inherited defaults. Attachment scanning, direct-API enforcement, comprehensive data-loss prevention and cross-user isolation are not verified.',
  'models.discover-and-download': 'Find and download the registered Qwen3-0.6B GGUF quantization, then inspect its stored file metadata. Other models/providers, bulk cancellation, deletion, deployment, inference and browser use are not verified. Downloaded weights remain available for reuse.',
  'models.openai-compatible-inference': 'Deploy one prepared GGUF model with llama.cpp on CPU, receive a text chat response through the OpenAI client and stop the owned deployment. Streaming, GPU engines, other modalities and provider breadth are not verified. Broader deployment and inference failures remain unresolved.',
  'platform.admin-copilot': 'Run a scripted question/read/confirmed preference-change journey, including ownership checks, token refusal, cancellation, action denial, turn limits and audit records. This does not prove answer quality, autonomous reasoning, other executors, concurrency or cross-tenant isolation. Terminal records and one preference remain under normal product retention.',
};

export function recipeGuide(report) {
  const c = report.counts;
  const recipes = report.version === '1.3.4' ? recipes134 : [];
  const blocks = [h(1, `Kamiwaza ${report.version}: recipes and capability guide`),
    p('Choose a task, check its ingredients, and follow the steps. The glossary tells you which capabilities have release or prerelease verification.'),
    p(`${c.acceptedScoped} of ${c.included} capabilities have release verification for recorded scenarios; ${c.remaining} await release verification. ${c.historicalPrerelease} historical prerelease records are retained separately. Evidence through ${report.asOf}.`),
    h(2, 'Before you start'),
    p('Release verified — tested this release means accepted fresh tests. Release verified — carried forward means accepted earlier evidence with a reviewed change-impact decision for this release. Both count toward release coverage, once per capability. Prerelease verified stays separate until release-baseline acceptance. Original scope and test dates remain attached.'),
    p('Verified ingredients do not automatically make a verified recipe. Each recipe below states which path was tested. Your administrator must provide the applications, models, data and permissions it needs.'),
    h(2, 'Recipes')];
  for (const recipe of recipes) {
    blocks.push(h(3, recipe.title), p(recipe.outcome), p(`Who this is for: ${recipe.roles}`), h(4, 'You need'), ...recipe.needs.map(li),
      h(4, 'Ingredients'), ...recipe.ingredients.map(id => {
        const row = report.capabilities.find(row => row.id === id);
        if (!row) throw new Error(`Recipe ingredient ${id} is absent from ${report.version}`);
        return li(`${row.title} (${id}) — ${verificationLabel(row)}`);
      }), h(4, 'Steps'), ...recipe.steps.map((step, i) => p(`${i + 1}. ${step}`)),
      h(4, 'Expected result'), p(recipe.result), h(4, 'What was tested'), p(recipe.coverage), p(`Source: ${recipe.source}`));
  }
  blocks.push(h(2, 'Ingredient glossary'), p('Release verified means accepted tests or applicable carried evidence cover the recorded scenarios on the named release; it does not mean every operation was tested. Prerelease verified identifies retained earlier evidence, not a release pass. Pending means the release proof is missing, not that the feature is unsupported.'));
  for (const row of report.capabilities) {
    blocks.push(h(3, row.title), p(`Ingredient: ${row.id}`), p(verificationLabel(row)),
      p(`Prerelease evidence: ${row.historicalPrerelease ? 'verified in the historical ledger' : 'not recorded'}.`));
    if (row.gap) blocks.push(p(`Still needed: ${row.gap}`));
    if (scopeSummaries[row.id] || row.scopeNote) blocks.push(p(`Verified scope and limits: ${scopeSummaries[row.id] || row.scopeNote}`));
    else {
      for (const note of row.limits ?? []) blocks.push(p(note));
      for (const assumption of row.assumptions ?? []) blocks.push(p(`Assumption: ${assumption}`));
    }
    if (row.finishedAt) blocks.push(p(`Evidence date: ${row.finishedAt.slice(0, 10)}. Full record: ${row.id} in the ZIP verification report.`));
  }
  blocks.push(h(2, 'Evidence and further reading'),
    p('Glossary entries summarize tested scope. The complete ZIP contains the detailed verification report and source records, including all historical prerelease entries. They preserve the exact test scope, assumptions and stamps behind this glossary.'),
    p(`Canonical source: capability-kit commit ${report.sourceKitCommit}. Report: ${report.sourcePath}.`),
    p('The retired Docker/SSH paired-node workflow is excluded. Counts are cumulative across test configurations and do not constitute whole-release sign-off.'));
  return blocks;
}
