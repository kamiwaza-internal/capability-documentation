---
capability_schema: capability.v1
id: platform.app-generation-path
title: Generate, develop, and deploy an application with kz-ext and the SDK runtime contract
tier: internal
persona:
  - Developer
surface:
  - CLI
  - SDK
evidence_plan: sdk
preconditions:
  kz_ext: The kz-ext CLI is installed (ships with the kamiwaza-sdk Python package).
  instance: The developer has network access to a Kamiwaza instance and has authenticated with `kz-ext login`; the deploy loop targets the active connection.
  sdk: The extension runtime library (`kamiwaza-extensions-lib`) is available to the application; the scaffold pins it in `backend/requirements.txt`.
evidence:
  - kamiwaza-sdk:tests/e2e/scenarios/runbooks/s2-workroom-manager-launch.yaml
not_supported:
  - A conversational or agent-driven application builder. This capability documents the CLI/SDK path a developer drives by hand; a conversational builder is explicitly out of scope this cycle (DoD §9).
---

# Generate, develop, and deploy an application with kz-ext and the SDK runtime contract

A developer builds an application against the Kamiwaza platform through a single tool-supported path: scaffold a working application with `kz-ext create`, iterate on it locally with `kz-ext dev local`, check it with `kz-ext validate`, and deploy it to a connected instance with `kz-ext dev`. The application the path produces is not a blank project — it is built against the SDK runtime contract from the first commit: platform-injected identity, workroom scoping, and enforced boundary errors are wired into the generated code, so what the developer customizes is already a correctly-integrated Kamiwaza application.

## The path stage by stage

The commands and generated structure below were verified against kz-ext 0.1.0 by scaffolding a throwaway application locally; nothing in this section is quoted from documentation alone. The full command surface at that version is `login`, `validate`, `doctor`, `create`, `update`, `status`, `logs`, `shell`, `port-forward`, `bump`, `convert`, `publish`, `dev` (with a `local` subcommand), and `config`. This document covers the generation path — scaffold, local loop, validate, deploy — and names the adjacent commands only where they touch it.

### Scaffold: kz-ext create

```bash
kz-ext create --type app --name myapp
```

`--type` accepts `app`, `tool`, or `service`; this document follows the `app` type. The command scaffolds a complete working application — 28 files plus an initialized git repository — and prints the next steps (`kz-ext validate`, then `kz-ext dev local --auth`). Where those files land depends on the working directory, and the test is visible entries rather than emptiness: a directory holding no visible files is scaffolded into directly — including one that already contains only dotfiles, so the common `mkdir myapp && cd myapp && git init` flow scaffolds in place — while a directory with visible files gets a new subdirectory named for `--name`. The generated structure:

- `kamiwaza.json` — the extension manifest: name, semantic version, type, visibility, `risk_tier`, a `kz_ext_version` compatibility range, environment defaults, and a `template_version` / `template_file_hashes` block that lets `kz-ext update` later reconcile the scaffold against a newer template without clobbering developer edits.
- `backend/` — a FastAPI application (`backend/app/main.py`) with auth protection, model discovery, and chat-completion routing already implemented. `backend/requirements.txt` pins `kamiwaza-extensions-lib>=0.4.4,<0.5` — the SDK runtime contract described below arrives through this dependency.
- `frontend/` — a Next.js application with Tailwind styling and the platform integration layer in place: proxy routes for `/api/*`, `/session`, `/auth/login-url`, and `/auth/logout`, plus middleware that keeps requests base-path safe under runtime application URLs.
- `docker-compose.yml` — the local development topology (frontend plus backend). Host ports are auto-assigned rather than fixed, and the compose file passes through the `KAMIWAZA_*` environment variables the platform injects at deploy time, so local and deployed runs share one configuration surface.
- `README.md`, `AGENTS.md`, `CLAUDE.md` — the generated README documents the dev loop for the human developer; `AGENTS.md` is the canonical instruction source for AI coding assistants working in the scaffold (safe edit zones, guardrails, commands to run after changes), with `CLAUDE.md` pointing at it.

`kz-ext convert` covers the adjacent case of bringing an existing application onto this same path instead of scaffolding fresh.

### Local development loop: kz-ext dev local

```bash
kz-ext dev local --auth --sdk-repo /path/to/kamiwaza-sdk
```

Runs the application locally via Docker Compose with hot reload (source directories are bind-mounted into the containers). The CLI injects platform environment variables from the active `kz-ext login` connection, and `--auth` bridges the developer's real authenticated identity into the local containers — the frontend middleware synthesizes the platform's forwarded-auth envelope from the developer's bearer token, so identity-dependent code paths are exercisable before anything is deployed. Without `--auth`, `KAMIWAZA_USE_AUTH=false` provides an anonymous session. `--sdk-repo` substitutes a local `kamiwaza-sdk` checkout for the released runtime library when the application and the runtime contract are being developed together. As of 2026-08-10 a local checkout is not optional for this loop, which is why the command above carries the flag: the backend image installs `backend/requirements.txt` from the public index, and the scaffold's own pin does not resolve there — see the runtime-library caveat under *Conditions and limits*. The checkout may equivalently be set as `sdk_repo` in `.kz-ext/local.yaml`, which the flag overrides.

### Validate: kz-ext validate

```bash
kz-ext validate
```

Checks the extension manifest and compose file. On a fresh scaffold it passes, with informational notes about local-dev-only constructs (bind mounts are stripped at deploy; absent resource limits get platform defaults). `--json` produces machine-readable output. `kz-ext doctor` separately checks the health of the development environment itself.

### Deploy: kz-ext dev

```bash
kz-ext dev --sdk-repo /path/to/kamiwaza-sdk
```

Builds the Docker images, pushes them, and deploys the application to the connected Kamiwaza instance, where the platform can list and launch it. `--no-build` / `--no-push` skip stages, `--service` restricts the build to one service, `--revision` sets a custom revision tag, and `--unload` removes the extension's local catalog overlay, restoring the upstream catalog entry for new workrooms. `--sdk-repo` applies here on the same terms as the local loop above and for the same reason, which is why the command carries it; once 0.4.4 publishes, plain `kz-ext dev` is the command. From here the operational commands take over: `kz-ext status`, `kz-ext logs`, `kz-ext shell`, and `kz-ext port-forward` against the deployed extension, `kz-ext bump` to advance the version across the manifest and build files, and `kz-ext publish` to publish to a catalog — a separate act from the dev deploy, outside this capability.

### The SDK runtime contract

The scaffold is built against `kamiwaza_extensions_lib`, the extension runtime library that ships in the `kamiwaza-sdk` repository. The contract below is read from that library at `kamiwaza-sdk` `origin/develop` (`__version__` 0.4.4), which is the floor the scaffold pins (`kamiwaza-extensions-lib>=0.4.4,<0.5`) — see the version caveat under *Conditions and limits*. The contract the generated backend relies on:

- **Identity injection.** The platform injects identity headers (`X-User-Id`, `X-User-Email`, `X-User-Roles`, `X-Workroom-Id`, `X-User-Workroom-Role`, `X-Request-Id`, and peers) on authenticated requests. `extract_identity` resolves them strictly into an `Identity` model and raises `MisboundAuthError` when required envelope headers are missing or malformed; `identity_from_headers` is the permissive variant for local-dev and anonymous paths. The extractor's behavior is fixed by canonical test vectors (`docs/extensions/non-sdk-flow/test-vectors.json` in the SDK repo: `happy-path`, `missing-user-id`, `missing-workroom`, `global-workroom-sentinel`).
- **Workroom scoping.** `Identity.workroom_id` carries the workroom the application was launched in, with the all-`f` UUID sentinel denoting the global workroom, resolved per the same canonical vectors.
- **Boundary errors, enforced not advisory.** Access to a resource outside the declared workroom raises `OutOfEnvelopeAccessError` from the runtime library. The wider exception hierarchy (`MisboundAuthError`, `UnexpectedContextError`, `PlatformRedirectError`, `PlatformOutageError`) gives the application typed failures instead of silent misbehavior.
- **Guarded platform calls.** `platform_request()` forwards the platform-authenticated request envelope to platform APIs on behalf of the current user, rejects absolute destinations, and refuses to follow redirects (raising `PlatformRedirectError`), so the auth envelope cannot leak to an unintended host. `require_auth`, `get_model_client`, and `list_available_models` round out the surface the generated backend already uses.

## Conditions and limits

- This capability is the developer-side path: it establishes that the tooling produces, runs, and deploys an application that is correctly built against the runtime contract. What happens after deployment — the platform listing the application and a user launching it with workroom-scoped identity — is `workrooms.app-launch`, a separate capability with its own evidence. The dependency runs from that capability to this one (its preconditions name an application "built against the SDK and deployed via kz-ext"), not the other way around, which is why this document declares no `requires`.
- The command surface documented here is kz-ext 0.1.0, probed locally. Command sets and flags may differ at other versions.
- The runtime contract documented here is `kamiwaza_extensions_lib` 0.4.4, read from `kamiwaza-sdk` `origin/develop` — it is the contract as of develop, not as published. As of 2026-08-10 the newest version resolvable from the public package index is 0.4.2, which carries no `platform.py` module and therefore neither `platform_request()` nor `PlatformRedirectError`. Two of the bullets above are affected: guarded platform calls entirely, and the `PlatformRedirectError` arm of the boundary-error hierarchy.
- The same release gap has a broader consequence than those two symbols. The scaffold's pin (`>=0.4.4,<0.5`) does not resolve from the public index at all, and the generated `backend/Dockerfile` installs `requirements.txt` with a plain `pip install` and no index override, so until 0.4.4 publishes the backend image cannot be built from a released wheel. Every stage that builds it — `kz-ext dev local` and `kz-ext dev` — therefore needs a local `kamiwaza-sdk` checkout, supplied via `--sdk-repo` or `.kz-ext/local.yaml`, which is why both commands above are written with the flag. This is a property of the current release state, not of the path itself.
- Deploying requires an authenticated connection to a reachable Kamiwaza instance; scaffold and validate work without one. The local loop needs no instance for auth purposes either (it runs with the anonymous session absent `--auth`), but per the caveat above it does currently need a local SDK checkout to build at all.

## How this is exercised

The SDK scenario harness runbook **S2 — App launched from Workroom Manager** (`kamiwaza-sdk:tests/e2e/scenarios/runbooks/s2-workroom-manager-launch.yaml`) contains the scaffold step for this path: its `scaffold_app` step runs `kz-ext create --type app` and is defined to continue into a deploy via `kz-ext dev` to staging. The collected run record in this repo (`evidence/runs/s2-20260807T200738809355.json`) shows exactly how far that has been exercised: the step detail records that `kz-ext create` succeeded and produced the 28-file application scaffold, while the step status is `skipped` because the deploy to staging was deliberately deferred to the T3.3 dry-run. The same record's passing steps exercise the runtime contract the scaffold builds against (identity extraction, global-workroom sentinel, `OutOfEnvelopeAccessError`).

## Coverage notes

- **Scaffold: exercised. Deploy and validate loop: not yet evidenced.** The S2 run record demonstrates `kz-ext create` producing the scaffold and the runtime library honoring its contract. No evidence record in this cycle exercises `kz-ext dev local`, `kz-ext validate`, or the `kz-ext dev` deploy; the deploy lands with the T3.3 dry-run. Until then, the stages beyond scaffold are documented as intended behavior verified only by local CLI probing (help surfaces, a validate pass on a fresh scaffold), not by collected evidence.
- **The `Developer` persona extends the inherited vocabularies.** `kamiwaza-product-journeys` uses Admin, Non-admin user, and Analyst; other internal source material uses Analyst, Operator, and SysAdmin. Neither has a developer persona, and this capability genuinely serves one — a new persona value is a signal to reconcile the vocabularies, not a validation error.
- The `evidence` reference points at the S2 runbook because that is where the scaffold step is defined; the runbook's primary capability is `workrooms.app-launch`, and its run records name that id in `capability_ids[]`. Until a run names `platform.app-generation-path` directly, the kit query will compute this capability as `intended`, which is the honest state.
