---
capability_schema: capability.v1
id: workrooms.app-launch
title: Launch an application from Workroom Manager with workroom-scoped identity
tier: internal
persona:
  - Admin
  - Non-admin user
surface:
  - SDK
  - API
  - UI
evidence_plan: sdk
preconditions:
  workroom_manager: Workroom Manager extension is deployed and feature-enabled on the target instance.
  application: The application is built against the SDK and deployed via kz-ext so the platform can list and launch it.
  workroom: The launching user is a member of a workroom (or operates in the global workroom).
evidence:
  - kamiwaza-sdk:tests/e2e/scenarios/runbooks/s2-workroom-manager-launch.yaml
---

# Launch an application from Workroom Manager with workroom-scoped identity

A user opens a deployed application from Workroom Manager and the application runs *as that workroom*: the platform injects the workroom identity at launch, the application backend resolves it, and every resource access the application makes is scoped to the workroom the user launched from.

## What this capability guarantees

- **Workroom-scoped identity reaches the application.** When an application is entered through the Workroom Manager launch flow, the backend resolves the workroom-scoped identity from the launch context the platform injects (`X-Workroom-Id`).
- **The global workroom is handled uniformly.** Launching in the global workroom (the all-`f` UUID sentinel) resolves to the documented global-workroom semantics — the same canonical test vectors the SDK's `IdentityExtractor` ships with.
- **The workroom boundary is enforced by the SDK runtime, not advisory.** An application built against the SDK that attempts to access a workroom-scoped resource from outside its declared workroom gets `OutOfEnvelopeAccessError` from the runtime library instead of the resource. Cross-workroom access is a failure, by design — not a warning the application may ignore. What this capability establishes is that the runtime library refuses the access; it does **not** claim that the platform independently rejects a forged, absent, or mutated `X-Workroom-Id` presented by something other than an SDK-built application. Server-side rejection of untrusted launch context is a distinct capability and is evidenced separately.

## Conditions and limits

- The guarantees above are properties of the *extension side*: they hold for applications built against the SDK and launched with platform-injected workroom context. Discoverability — the platform listing that surfaces deployed applications inside Workroom Manager — is a platform-side concern evidenced separately.
- Navigating directly to an application's URL is an **intended** entry path: an unauthenticated user is prompted to log in and is then redirected to the originally requested application. Direct navigation previously returned a 502 unless the user first clicked "Enter Workroom"; that was ENG-7181, resolved 2026-06-18 by launching through a runtime-launch token. **This path is not evidenced this cycle** — the S2 runbook exercises the launch flow only — so it is recorded here as intended behavior that no run in this cycle exercises. The launch-flow path above is the evidenced path.

## How this is exercised

The SDK scenario harness runbook **S2 — App launched from Workroom Manager** (in the `kamiwaza-sdk` repo at `tests/e2e/scenarios/runbooks/s2-workroom-manager-launch.yaml`, written `kamiwaza-sdk:tests/e2e/scenarios/runbooks/s2-workroom-manager-launch.yaml` in the `evidence` front-matter key) exercises the chain end to end: scaffold an application with `kz-ext create`, deploy with `kz-ext dev`, then assert workroom-scoped identity resolution, global-workroom sentinel handling against the canonical test vectors, and boundary enforcement (`OutOfEnvelopeAccessError`) in sequence. Runs against a stated build emit `scenario-evidence.v2` records naming this capability.

## Coverage notes

- **The declared UI surface is not evidenced this cycle.** `surface` records where the capability is *exposed* — launch is initiated from the Workroom Manager UI, identically for admin and non-admin users, so the generic `UI` tag is declared rather than a role-specific one. `evidence_plan: sdk` records where it is *exercised*: the S2 runbook drives the SDK/API contract beneath that surface, not the UI click path. The two keys answer different questions and are deliberately not aligned here.
- The behavior-journey corpus (`kamiwaza-product-journeys`) has **no journey covering application launch from Workroom Manager** — workrooms journeys J01–J06 cover presence, focus, lifecycle, membership, and creation. That absence is why the UI arm has nothing to run: a launch journey is a candidate addition for the journey corpus, and until it exists the UI surface above will read as uncovered in the gap report. This is correct, not a defect in the document.
