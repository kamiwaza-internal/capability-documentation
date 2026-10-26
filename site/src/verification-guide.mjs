const h = (level, text) => ({type: 'h', level, text});
const p = text => ({type: 'p', text});
const li = text => ({type: 'li', level: 0, text});
export const verificationLabel = row => row.status === 'accepted-scoped-release'
  ? 'Scoped proof — verified on the recorded build' : row.historicalPrerelease
    ? 'Prerelease verified — release acceptance pending' : 'Release verification pending';

// User instructions are curated from the cited product journeys, not inferred from stamp counts.
export const recipes134 = [
  {title: 'Serve a model in a restricted CPU tenant',
    outcome: 'Run a local model and send chat requests from a restricted ARM64 tenant, using an owner-approved CPU profile.',
    roles: 'An application administrator working with a cluster owner who manages the tenant’s trusted compute profile.',
    needs: ['The qualified v1.3.4 ARM64 installation with tenant mode enabled, the pinned llama.cpp CPU runtime and Qwen3-0.6B GGUF model.', 'An owner-signed CPU profile, trusted API certificates and approved model storage. Explicit serving uses 2 CPU and 1 GiB; implicit serving selected 100m CPU and 1 GiB in this test.'],
    ingredients: ['models.tenant-mode-inference'],
    steps: ['Ask the cluster owner to enable tenant mode and publish a trusted CPU profile for this ARM64 installation. Confirm that the model and qualified llama.cpp runtime are available.',
      'Sign in through the supported SDK/API as an application administrator. Confirm that your serving identity is limited to its namespace; nonadmin users may inspect the model but cannot deploy it.',
      'Deploy the model with automatic CPU sizing. Wait until it is ready, send a chat request, and inspect the selected owner profile, runtime image and resource allocation.',
      'For a controlled resource request, stop the first deployment and deploy with 2 CPU and 1 GiB. Wait for readiness, send another chat request and confirm the allocation matches your request.',
      'Stop the deployment when finished and remove only your disposable configurations. Keep shared model files and the owner-managed profile available for other authorized users.'],
    result: 'The complete SDK/API journey passed: nine typed asynchronous refusals with no workload created, dispatch revalidation, recovery, implicit and explicit CPU serving, real chat, authority boundaries and independently audited cleanup.',
    coverage: 'CPU on ARM64 with the recorded llama.cpp runtime and model only. GPU, tensor parallelism, other architectures or engines, browser UI, automatic hardware detection, key rotation, optional admission webhook, client-visible named request errors, immutable-revision propagation through the download API and a complete implicit-negative matrix remain unverified. This scoped recipe does not certify an entire parent value stream or every tenant-mode configuration.',
    source: 'capability-kit, reports/2026-10-26-tenant-cpu-release134; SDK 76716b614034b46a523c0c2dc887f4284abc1314'},
  {title: 'Organize a dataset registry and enforce Workroom access',
    outcome: 'Register dataset metadata, organize it in nested containers, find it within a Workroom and handle conflicting edits safely.',
    roles: 'A registry owner, an independently authenticated same-tenant viewer and an outsider.',
    needs: ['A database-backed catalog on the recorded corrective release/1.3.0 API build, now the 1.3.5 development line; candidate evidence for 1.3.5 qualification.', 'A disposable Workroom, synthetic dataset metadata and independent identities. Use the supported SDK/API; this is not a graphical UI recipe.'],
    ingredients: ['catalog.dataset-registry'],
    steps: ['Create owned dataset metadata and read back its schema. Group it in containers, page through members and search within the Workroom.',
      'Grant the viewer read access. Confirm the viewer can read the registry while prohibited writes and outsider access are refused.',
      'Reparent and detach nested containers. Confirm dataset membership remains intact.',
      'Use two independent sessions to submit conditional metadata updates against the same revision. Confirm exactly one update succeeds and the conflicting update is refused.',
      'Delete only the owned test records and containers. Confirm cleanup and retain the result and source bindings.'],
    result: 'All four registered scenarios passed: metadata and organization, viewer/outsider controls, nested membership and one two-session contention round.',
    coverage: 'Scoped SDK/API proof on the recorded corrective build, candidate evidence for 1.3.5 qualification. The captured environment combines corrected API and tagged 1.3.4 platform components; it is not certification of the original v1.3.4 tag or a final 1.3.5 build. Database backend only; no UI, external backend, cross-tenant, cross-process, multi-replica or stress atomicity proof. Physical content purge, publisher grants, register_from_spec, registered-source lifecycle and parent deletion with children are outside this journey. Historical recipe qualifiers remain in the ZIP with their original context.',
    source: 'capability-kit PR #220, reports/2026-10-24-catalog-corrective-release130; SDK 654f2e35d702426186038c32e57c31ae17cd0271'},
  {title: 'Ingest a source, inspect a registered job, and trigger a managed connector',
    outcome: 'Ingest a disposable S3 source, inspect requester ownership and pending status, then trigger a managed connector with attributable indexed output.',
    roles: 'An ingestion operator, a connector manager and a separate read-only viewer.',
    needs: ['An approved S3 test source and a compatible Kamiwaza API with the accepted ingestion correction.', 'Disposable source credentials, a managed DDE connector and independently authenticated manager/viewer identities.'],
    ingredients: ['ingestion.scheduled-ingest'],
    steps: ['Create a disposable S3 object and store its credentials through the supported secrets API. Run ingestion and inspect the resulting dataset and source path.',
      'Check that the requester owns the dataset. Register a job and repeatedly inspect its pending status and required fields.',
      'As the read-only viewer, attempt to trigger the managed connector. Confirm refusal and unchanged trigger timestamps and indexed output.',
      'As the connector manager, trigger the connector. Confirm the queued response, advanced timestamps and an indexed document attributable to the trigger.',
      'Remove the owned dataset, object and secret and confirm absence. Disable the disposable connector and replace its stored configuration with an empty object; verify credential disposal. Remove temporary users, grants and test deployments, restore routing and retain cleanup receipts.'],
    result: 'The source is ingested with requester ownership, the registered job remains inspectable, the viewer cannot trigger it, and the manager produces attributable indexed output.',
    coverage: 'SDK/API journey on the recorded corrective release/1.3.0 API build, now the 1.3.5 development line; candidate evidence for 1.3.5 qualification. The captured environment combines corrected API and tagged 1.3.4 platform components; it is not certification of the original v1.3.4 tag or a final 1.3.5 build. Unattended schedule execution, execution durability and cross-tenant isolation were not exercised. Disabled credential-empty connector metadata, indexed metadata and nonsecret pending status remain under documented retention.',
    source: 'kamiwaza-sdk@d1e32f9ebd47282d946efef2acc2fff0dc2923e6, tests/integration/test_catalog_ingest_retrieval.py::test_run_now_owner_job_and_dde_trigger; capability-kit, reports/2026-10-23-ingestion-lifecycle-release130'},
  {"title": "Run disposable workers with ready capacity", "outcome": "Create a sandbox worker, keep warm capacity ready and return safely to the default provider.", "roles": "An operator authorized to configure an extension and dedicated sandbox namespace, plus an application allowed to call the sandbox API.", "needs": ["Qualified ARM64 Operator/native controller and pinned upstream Agent Sandbox v0.5.2 when using that provider.", "Approved worker images, a worker-token Secret and configured network policies. Use disposable resources with recorded ownership."], "ingredients": ["apps.sandbox-workload-provider"], "steps": ["Start with Kubernetes. From the authorized application, create, list, retrieve, health-check and delete a worker; confirm it disappears.", "Opt the extension into Agent Sandbox. Configure the approved image, readiness endpoint, warm-pool size and maximum lifetime; wait for ready capacity.", "Create a worker from the pool, retrieve and call its endpoint, delete its claim and confirm the pool replenishes.", "Change between approved worker revisions using OnReplenish and Recreate. Confirm disallowed images and images inconsistent with the pool are refused.", "Renew a claim; confirm abandoned claims expire and the maximum age also removes actively renewed claims. Return to Kubernetes and verify worker-token delivery uses a Secret reference. Remove disposable resources and confirm owned cleanup."], "result": "Both worker lifecycles succeed; image, access, expiry and token controls hold. All 19 checks passed and all 34 temporary fixture objects were absent after rollback.", "coverage": "Accepted in capability-kit PR196: all 19 operator/API checks passed for both workload providers, worker lifecycle, image refusals, warm capacity, update strategies, expiry, Secret-only token handling, rollback and owned cleanup. This covers the captured ARM64 configuration and two worker revisions. It does not establish a graphical configuration journey or isolation stronger than standard shared-kernel containers. Worker tokens are distinct from controller tokens. ConfigMap token sources and foreign-owned Secret mirror collisions are refused.", "source": "https://github.com/kamiwaza-internal/capability-kit/tree/d16f17521f8d7ad9a824c99c7e903f0a35938bcb/reports/2026-10-23-sandbox-both-providers"},
  {title:'Create a reusable skill and delegate a task to its agent',outcome:'Draft a small guidance-only package, have an administrator approve it, and explicitly select its agent to handle a task.',roles:'A member who can use the builder and a separate administrator who can review proposals.',needs:['Primary Kaizen with the package-creator and agent-builder available, a working serving model, and an operator able to review the exact package and agent revisions.','A unique package name, a small Markdown skill, an expected answer that shows the skill was used, and access to your own Kaizen instance. The test used synthetic guidance, not production content.'],ingredients:['kaizen.agent-packages','kaizen.agent-auto-routing'],steps:['Open the package-creator in Kaizen. Ask it to draft a native Pi guidance-only package with your unique name and Markdown skill, and validate that exact draft. Review the validation result before proceeding.','Ask the agent-builder to create an agent that uses that exact package version. If the package is not approved yet, keep the agent as a draft with its dependency recorded.','Have the administrator review and approve the submitted package. Resume the agent draft against the approved package, then submit the agent for administrator approval. This test used authenticated administrative API calls for approval; it did not verify an approval-screen click path.','Open the approved agent and ask a question that requires its skill. Check that the reply uses the expected guidance.','In a general Kaizen chat, open “Add files, agents, connectors, or tools”, then “Sub-agents”. Select the approved agent. Ask Kaizen to delegate the task explicitly to that agent. Check the named sub-agent activity and its answer.','When the exercise is finished, restore your prior sub-agent selection. Ask the operator to remove the disposable agent, package and drafts and archive the exercise chats. Approval audit history is intentionally retained.'],result:'The approved skill is used by the agent, and the explicitly selected child agent appears by name in the delegated run.',coverage:'Accepted scoped release evidence: all six registered browser checkpoints passed, including original-author validation, approval, skill-backed use, member-selected delegation and cleanup. Approval and state/cleanup assertions also used API calls. This does not prove automatic specialist selection, routing-policy pins or exclusions, consult audit, dependency/vulnerability scanning, npm import, grant-ceiling enforcement or unregistered-package refusal. The broad member API suite was not exercised; this is not full PR UAT or release sign-off.',source: 'https://github.com/kamiwaza-internal/capability-kit/tree/6a5e7249ed9a4340bd4c84bcb530e4a4a712650f/reports/2026-10-23-native-package-guidance-unique-fixture'},
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
    p(`${c.acceptedScoped} of ${c.included} capabilities have accepted scoped proofs across the recorded builds. ${c.remaining} have no accepted scoped proof. Evidence through ${report.asOf}.`),
    p(`${c.historicalPrerelease} historical prerelease verifications are preserved: ${c.historicalInScope} overlap this release inventory and ${c.historicalOutsideScope} sit outside it. These are not additional release passes.`),
    p('Results were collected across multiple configurations and component builds. A tagged Core reference does not establish that every extension or corrected API belongs to that tag. These cumulative proofs do not establish one jointly tested release bill of materials or whole-release approval.')];
  if (concise) return [...blocks, h(2, 'Capability status'), ...report.capabilities.flatMap(row => [h(3, ingredientTitle(row)), p(verificationLabel(row)), ...(row.scopeNote ? [p(row.scopeNote)] : [])])];
  blocks.push(h(2, 'Current capability results'));
  for (const row of report.capabilities) {
    blocks.push(h(3, row.title), p(`${row.id} · ${verificationLabel(row)}`),
      p(row.historicalPrerelease ? 'Historical prerelease verification is also retained.' : 'No historical prerelease verification is recorded for this capability.'));
    if (row.gap) blocks.push(p(`Remaining work: ${row.gap}`));
    if (row.scopeNote) blocks.push(p(`Current versus historical scope: ${row.scopeNote}`));
    if (row.limits?.length) blocks.push(p('Retained evidence notes include earlier assessments. Historical statements about missing release proof do not override the current status above; current scope and exclusions still apply.'));
    for (const limit of row.limits ?? []) blocks.push(li(limit));
    for (const assumption of row.assumptions ?? []) blocks.push(li(`Assumption: ${assumption}`));
    if (row.releaseLine) blocks.push(p(`Tested release-line source: ${row.releaseLine.ref}@${row.sourceCommit}. Reviewed assignment: ${row.releaseLine.reviewReference}. This does not change the original product tag.`));
    if (row.stampId) blocks.push(p(`Evidence: ${row.stampId}; recorded ${row.finishedAt}.`));
  }
  blocks.push(h(2, 'Historical prerelease evidence'));
  for (const row of report.historicalPrerelease) blocks.push(h(3, row.title), p(`${row.id} · Historical prerelease verified; original target ${row.originTarget}, ledger target ${row.ledgerTarget}.`),
    ...row.limits.map(li), ...row.assumptions.map(value => li(`Assumption: ${value}`)));
  blocks.push(h(2, 'Sources'), p(`Canonical capability-kit commit: ${report.sourceKitCommit}. Original baseline Core source: ${report.sourceCoreCommit}. Any corrected release-line source is identified separately in its capability record.`),
    p(`Full source record: ${report.sourcePath}. Detailed stamps, limits and historical records are retained in the ZIP.`));
  return blocks;
}

// Display the tested operation; canonical titles and IDs remain in the evidence.
const scopedIngredientTitles = {
  'models.tenant-mode-inference': 'Serve a model in a restricted CPU tenant (ARM64 / llama.cpp)',
  'ingestion.scheduled-ingest': 'Ingest a source, inspect a registered job, and trigger a managed connector',
  'kaizen.agent-auto-routing': 'Explicitly delegate to a member-selected agent',
  'kaizen.agent-packages': 'Create and use an approved guidance-only package',
};
const ingredientTitle = row => scopedIngredientTitles[row.id] ?? row.title;
const ingredientStatus = row => ({
  ...p(`**${verificationLabel(row)}**`), callout: true,
  tone: row.status === 'accepted-scoped-release' ? 'green' : 'amber',
});

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
    p('Choose a task, check its ingredients, and follow the steps. The glossary identifies recorded scoped proofs, prerelease evidence and remaining gaps.'),
    p(`${c.acceptedScoped} of ${c.included} capabilities have accepted scoped proofs across recorded builds; ${c.remaining} have no accepted scoped proof. ${c.historicalPrerelease} historical prerelease records are retained separately. Evidence through ${report.asOf}.`),
    h(2, 'Before you start'),
    p('Scoped proof means the recorded scenarios passed on the exact tested build. The cumulative count combines builds and is not a release certification total. Corrective release/1.3.0 API results are candidate evidence for 1.3.5 qualification; native designation or carry remains pending. Other results retain their tagged Core reference and recorded component scope; that reference alone does not establish a stock release bill of materials. Release certification or carried-forward credit requires a reviewed target-build and change-impact decision. Original scope and dates remain attached.'),
    p('Verified ingredients do not automatically make a verified recipe. Each recipe below states which path was tested. Your administrator must provide the applications, models, data and permissions it needs.'),
    ];
  for (const [index, recipe] of recipes.entries()) {
    const recipeStart = blocks.length;
    blocks.push({...h(2, `Recipe ${index + 1}: ${recipe.title}`), pageBreakBefore: true}, p(recipe.outcome), p(`Who this is for: ${recipe.roles}`), h(4, 'You need'), ...recipe.needs.map(li),
      h(4, 'Ingredients'), ...recipe.ingredients.map(id => {
        const row = report.capabilities.find(row => row.id === id);
        if (!row) throw new Error(`Recipe ingredient ${id} is absent from ${report.version}`);
        return {...ingredientStatus(row), text: `**${ingredientTitle(row)}** (${id})\n**${verificationLabel(row)}**`};
      }), h(4, 'Steps'), ...recipe.steps.map((step, i) => p(`${i + 1}. ${step}`)),
      h(4, 'Expected result'), p(recipe.result), h(4, `End of recipe ${index + 1}: tested scope and limits`), p(recipe.coverage), p(`Source: ${recipe.source}`));
    for (const block of blocks.slice(recipeStart)) block.compact = true;
  }
  blocks.push({...h(2, 'Ingredient glossary'), pageBreakBefore: true}, p('Scoped proof covers the recorded scenarios on the exact tested build, not every operation or a full release bill of materials. Read the current designation and component limits below. Prerelease evidence is not final-release certification. Pending proof does not mean the feature is unsupported.'));
  for (const row of report.capabilities) {
    blocks.push(h(3, ingredientTitle(row)), ingredientStatus(row), p(`Ingredient: ${row.id}`),
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
