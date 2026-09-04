---
capability_schema: capability.v1
id: workrooms.session-scoping
title: Enter a workroom and scope platform operations to it
tier: internal
persona:
  - Analyst
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
requires:
  - workrooms.create
preconditions:
  membership: The entering user can view the target workroom, and the target is a non-global workroom. The Global Workroom is not a valid enter target — it is reached by leaving, not entering.
evidence:
  - workrooms/J05/SC-03
  - workrooms/J05/SC-05
  - workrooms/J05/SC-06
---

# Enter a workroom and scope platform operations to it

A user or SDK client enters a workroom and subsequent platform operations are scoped to it: the server binds the selected workroom to the authenticated session, and the SDK can alternatively pin an explicit per-request workroom scope without touching server-side selection. Scoping is what makes workrooms an isolation boundary rather than a folder.

## What this capability guarantees

- **Enter binds the session, one workroom at a time.** `POST /workrooms/{id}/enter` binds the calling user's session to the workroom — re-minting the JWT with a `workroom_id` claim (Lite/SAML posture) or updating session metadata (Keycloak posture); the route's own contract is "one user, one workroom, one token". For full-auth Keycloak sessions the selected workroom is held in a DB-backed binding keyed by the provider session, so the selection survives token refreshes.
- **Enter is transactional about runtime state.** Entering also revives the caller's runtime session and publishes a presence refresh; if that step fails (session terminated, access revoked, state conflict, read-only), the enter is rolled back to the previously bound workroom and the caller receives a structured 409 with a machine-readable code rather than a half-bound session.
- **Leave returns the session to no-workroom scope.** `POST /workrooms/leave` unbinds the current workroom, terminates the bound runtime session, and publishes a presence refresh. A caller can pass `expected_workroom_id` to make the leave conditional: if the actual binding no longer matches, the server answers 409 (`session_conflict`) instead of silently leaving something else.
- **The SDK offers both scoping mechanisms.** `WorkroomService.enter` / `WorkroomService.leave` drive the server-side session binding; `KamiwazaClient.workroom_scope(workroom_id)` instead returns a client whose every request carries the explicit workroom-scope header (`X-Workroom-Id`) — client-only, without calling enter or mutating the parent client. The two mechanisms are independent by design: session binding for interactive parity with the UI, per-request scope for automation that touches several workrooms.
- **Scope denial is fail-closed and typed.** Workroom-scoped routes are guarded server-side; the generic denial contract is 403 with detail `"Workroom access denied"`. The SDK recognizes exactly that contract during `leave` and retries once after invalidating a stale password-authenticated session — other 403s stay fail-closed.

## Conditions and limits

- SDK `enter` deliberately does not install the returned access token into the client's authenticator. Callers that need scoped access from the SDK should pass explicit `workroom_id` values where services expose them, or use `workroom_scope`; server-side session binding primarily serves browser-session parity.
- The Global Workroom is the no-selection state: leaving resolves the session back to the global sentinel rather than to an error. Enter is the asymmetric half — `POST /workrooms/{global-id}/enter` is refused with 400 ("Use the leave endpoint to return to no-workroom scope"), so a client cannot round-trip enter/leave symmetrically through the global id.
- The DB-backed selected-workroom binding applies to auth providers with a stable session claim (Keycloak); tokens without one skip the DB binding and resolve to the global workroom, with the skip logged.
- What scoped operations *do* under the binding is the consuming capability's claim (context reads, app runtime behavior); this capability establishes the binding and the denial boundary, not each consumer's semantics.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs. An SDK runbook can exercise enter, conditional leave, the `workroom_scope` header path, and the fail-closed denial contract without a browser.
- The journey corpus approaches scoping from the isolation side in `workrooms/J05`: entering a shared workroom with permission-appropriate content (SC-03) and denial of unauthorized workroom addresses and workroom-scoped data reads (SC-05, SC-06). Those scenarios carry `characterized` provenance in the journey corpus; that status does not transfer here until a run names this capability id.
