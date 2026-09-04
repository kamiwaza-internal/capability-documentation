---
capability_schema: capability.v1
id: apps.app-garden
title: Deploy curated applications from the App Garden
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  catalog: The App Garden catalog is populated — either the remote catalog is enabled and synced, or garden apps have been imported as templates.
  models: For apps that use AI features, at least one model deployment is healthy; App Garden injects OpenAI-compatible environment variables automatically.
evidence:
  - web-ui-smoke-tests:journeys/appgarden_browse_sc_01.py
---

# Deploy curated applications from the App Garden

An operator browses the App Garden's curated application templates, deploys apps into the environment, monitors the resulting instances, and retires deployments — turning application delivery into a platform operation with a click-to-deploy experience instead of manual container commands. Deployed apps get stable HTTPS URLs through the platform gateway and, where they use AI, are wired to deployed models automatically.

## What this capability guarantees

- **A curated catalog, browsable and syncable.** The App Garden lists ready-to-run applications; templates can sync from a remote catalog (`GET /apps/remote/apps`, with force-refresh), and missing garden apps can be imported as local templates (`POST /apps/garden/import`). The SDK mirrors this with `list_garden_apps` and `import_garden_apps`.
- **Deploy from a template, by id or by name.** `POST /apps/deploy_app` deploys from a chosen template with environment variables and scaling parameters (`min_copies`, `starting_copies`, `max_copies`); the SDK's `deploy` wraps it and `install_by_name` — the current install-by-name path — resolves a named catalog template (optionally version-pinned), importing the garden catalog once and retrying when the name is not yet local. Workroom targeting travels as the `X-Workroom-Id` header, derived from the caller's resolved context.
- **Image readiness is checkable before first deploy.** `check_image_status(template_id)` reports whether a template's container images have been pulled, and `pull_images(template_id)` pulls them ahead of time, so a first deploy does not stall on image pulls invisibly.
- **Monitor, stop, and remove.** Deployment status, ports, and health are visible per app; deployments stop and remove from the same surface. Teardown is fenced against in-flight launches on the platform side: a stop request persists a cooperative `STOP_REQUESTED` signal and fences the exact launch worker, so stopping an app mid-launch does not race its own startup.
- **Routing and access are platform-standard.** Each app gets a stable HTTPS URL through the platform gateway and is opened from the Kamiwaza UI; direct container ports are not part of the contract.
- **AI wiring and template variables.** App Garden provides standard OpenAI-compatible environment variables to apps automatically, and template environment values can reference routing-aware variables (`{openai_base_url}`, `{openai_path_base_url}`, `{model_path_url}`, `{app_path_url}`). An explicit list of reserved keys cannot be overridden by user input: the internal `_kamiwaza_` prefix, and a set of individually named routing, session, and TLS variables (among them `OPENAI_BASE_URL`, `KAMIWAZA_API_URL`, `KAMIWAZA_APP_URL`, `KAMIWAZA_MODEL_PATH_URL`, `KAMIWAZA_DEPLOYMENT_ID`, `KAMIWAZA_APP_SESSION_TOKEN`, `KAMIWAZA_SERVICE_CLIENT_SECRET`, and the SSL-verification switches). Membership is exact-match, not prefix-match: the protection is that named list, not the `KAMIWAZA_*` namespace, and not a family implied by any of the names above. A similarly named variable outside the list is not reserved — `KAMIWAZA_DEPLOYMENT_ID` is on it while `KAMIWAZA_MODEL_DEPLOYMENT_ID` is not. `FORWARDAUTH_SIGNATURE_SECRET` is **not** on the reserved list: it is redacted from API responses and runtime artifacts, and on a host that has the secret configured the platform supplies its own value, but on a host where neither `FORWARDAUTH_SIGNATURE_SECRET` nor `AUTH_FORWARD_HEADER_SECRET` is set nothing marks the key reserved and a caller-supplied value is not rejected. This document claims redaction of that key, not override protection for it.
- **Ephemeral sessions are supported.** A deployment marked ephemeral at deploy time is automatically purged on logout or session expiry; persistent deployments remain until stopped.

## Conditions and limits

- **The Docker-Compose App Garden surface is deprecated in favor of Kubernetes CRD-based extensions.** The platform's `deploy_app` endpoint returns RFC 8594 `Deprecation`/`Warning` headers directing callers to `POST /extensions`, and the SDK's `AppService` emits a `DeprecationWarning` recommending `ExtensionService`. The verbs documented above function today — and `install_by_name` is explicitly the current install-by-name path — but new integrations should expect the extensions API to be the successor surface. This document claims the App Garden surface as it stands, not its successor.
- Deploying requires an authenticated user; catalog administration (choosing and refreshing the approved remote catalog source) is an administrator concern.
- Apps run with the configuration their template defines; most work with defaults, and model-preference settings must be chosen before deploying where an app exposes them.

## How this is exercised

The UI journey runner (`kamiwaza-internal/web-ui-smoke-tests`) carries an App Garden browse journey, `APPS/BROWSE/SC-01` (`journeys/appgarden_browse_sc_01.py`): open `/apps` and assert the App Garden landing renders its catalogue section with at least one application card carrying a Deploy affordance. The planned SDK arm exercises the deploy lifecycle beneath the catalog: resolve a template, deploy, poll status, and stop, emitting `scenario-evidence.v2` records naming this capability. Because the reserved-key protection above is a security claim, the arm asserts it directly: attempt a deploy whose environment variables set a key from the reserved list (for example `KAMIWAZA_API_URL`) and one outside it, and confirm the reserved key is rejected or ignored while the unreserved key passes through — establishing the boundary rather than a blanket claim. The arm does not assert override protection for `FORWARDAUTH_SIGNATURE_SECRET`, which the guarantee above explicitly does not claim.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one. The browse journey above is authored in the runner and marked characterized there; its evidence records are pending the runner PR landing.
- The runner's registry entry for the browse journey originally emitted `capability_ids: ["apps.appgarden_browse"]` — an identifier that joins to nothing. The registry was remapped to `apps.app-garden` in the runner's evidence PR (2026-08-10 convergence pass), so browse-journey records compute coverage for this capability once that PR lands and the suite runs.
- The browse journey covers the browse station only; deploy, monitor, and retire have no journey and rely on the planned SDK arm. Because the kit marks a capability `characterized` on a single passing record, browse-journey records alone will make this whole capability read as characterized while the deploy, monitor, and retire guarantees remain unexercised. Until the SDK arm runs, read a characterized status here as covering the catalog station only. Narrowing the runner's registry mapping to a browse-scoped id is a change against the runner repo, tracked separately from this document.
