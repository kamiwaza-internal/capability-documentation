---
capability_schema: capability.v1
id: connectors.managed-data-sources
title: Configure and manage governed data-source connectors
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  admin_identity: Creating, registering, updating, deleting, and deploying connectors are admin operations; the catalog listing is admin-only as well.
  catalog_source: Catalog-driven onboarding depends on a reachable published connector catalog (the hosted `connectors.json` for the deployment's version, or a `file://` override for air-gapped installs) or on connector types registered directly into the DB-backed catalog.
evidence:
  - data-connectors/J01/SC-02
  - data-connectors/J01/SC-05
not_supported:
  - A no-code connector builder. The behavior-journey corpus describes one (data-connectors/J08 and J09), but the platform sources this document draws on contain no implementation of it; this capability covers configuring and managing connectors whose types already exist as manifests.
  - An operator-scoped fleet verification action. The verify endpoint probes the calling user's own connection through the deployed connector; there is no admin endpoint that verifies a connector on behalf of the fleet.
---

# Configure and manage governed data-source connectors

An operator onboards data sources as managed connectors: browsing a typed catalog of connector manifests, creating connector configurations from it, registering new connector types and already-running connector instances, and maintaining the fleet — so analysts discover and use sources through a governed surface instead of raw credentials. Configuration is exposed in the admin UI (Settings, Data Connectors), on the platform API under `/connectors`, and through the SDK's typed `ConnectorsService`.

## What this capability guarantees

- **Admin-gated creation with an observable deployment lifecycle.** `POST /connectors/` (201) creates a connector configuration from a registered connector type; the route requires admin identity and carries a declared admin-only policy behavior (`connector_config` resource, admin-only grant model). When the type's manifest ships a deployable workload, deployment is kicked off in the background and the connector's card moves `not_deployed` → `deploying` → `ready` on its own; the status vocabulary also includes `degraded` and `unknown`. Invalid configuration fails with 400.
- **Secrets are write-only.** Connector responses never include the client secret or service token — credential material is stored encrypted and stays server-side; what reads back is non-sensitive configuration and status.
- **A typed catalog populates onboarding.** `GET /connectors/catalog` (admin) lists connector types available to subscribe, merged from two sources deduplicated by type: the published remote catalog (`connectors.json` fetched per deployment version, with a `file://` override for air-gapped installs) and types registered into the DB-backed catalog, with the DB entry winning on conflict. Each entry is a self-describing connector manifest, validated on the way through, and flagged when the deployment is already subscribed.
- **New types and running instances both register first-class.** `POST /connectors/catalog` registers a connector *type* from its manifest — no workload deployed, no configuration stored — which is the SDK's `register_type`. `POST /connectors/register` (201) self-registers a connector already running at an endpoint: the platform fetches the connector's self-describing manifest from `GET {endpoint}/manifest` and subscribes it with the supplied (encrypted) configuration; routing and per-user verification gate on a non-null workload principal, so an instance can be registered before it is made routable.
- **Analysts see a governed availability surface, not the admin surface.** `GET /connectors/available` requires only an authenticated user and returns non-sensitive metadata for connectors that are enabled, fully configured, and actually stood up (`status` not `not_deployed`) — sync-seeded entries an admin has not deployed stay hidden. A per-connector `user_connectable` flag distinguishes connectors with per-user accounts from service-token or credential-less connectors, which present as status cards without a connect action.
- **Connection health is probed through the deployed connector.** `POST /connectors/{id}/verify` performs a real read through the platform's proxy using the calling user's own token, maps per-capability results with permanent-versus-transient classification, and persists the verdict on the user's connection (degrading it, marking `needs_reauth`, or healing it back to `connected` on positive proof). It answers 503 when the connector is not yet deployed. Note this is user-scoped verification of the caller's own connection — see `not_supported`.
- **Maintenance is part of the same surface.** Update, delete, explicit deploy, and remote-catalog sync are admin routes alongside create, so the fleet is maintained where it is created.

## What this answers in customer terms

This capability is the platform's answer to "can we onboard our enterprise data repositories through a governed, admin-controlled surface rather than handing out credentials?" The product documentation names the shipped provider integrations: Microsoft 365 (SharePoint, OneDrive, Outlook, Calendar) and Google Workspace (Drive, Gmail, Calendar, read-only), with credentials encrypted at rest and availability controlled by administrators. The provider set is catalog content, not code — an air-gapped deployment carries its own catalog file — so the durable claim is the governed onboarding surface, and the named providers are what the current catalog and documentation establish. Per-user, per-entitlement access to those sources is the separate claim `connectors.user-oauth-authorization`.

## Conditions and limits

- The connector routes are mounted unconditionally — there is no feature gate to enable; the gate is admin identity (resolved from forwarded-auth headers or Keycloak tokens).
- The catalog's provider set is deployment-dependent. The platform source names no providers; Microsoft 365 and Google Workspace are established by the product documentation (which also lists Dropbox as "Coming Soon" — not claimable), and any other entry is whatever the deployment's catalog or DB registrations carry.
- Workroom-scoped connector surfaces (listing a workroom's connector catalog, browsing and searching sources) exist as separate user-facing routes; this capability claims the management surface. Per-user authorization and account connection are `connectors.user-oauth-authorization`.

## How this is exercised

The planned SDK arm exercises the management lifecycle through the typed `ConnectorsService`: `register_type` a known manifest into the DB-backed catalog, `create` a connector from it, list the catalog and the availability surface, and clean up — emitting `scenario-evidence.v2` records that name this capability. The SDK deliberately does not wrap the per-user OAuth connection flow, which is why the sibling capability routes to the UI arm.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The behavior-journey corpus covers admin connector configuration as `data-connectors/J01`: SC-02 (enable the Google Workspace connector) and SC-05 (block incomplete or non-compliant configuration) are the scenarios this document's claims align with. The journey names exactly Google Workspace and Office 365; catalog registration, instance self-registration, and verify have no journey scenario.
- The SDK ships `ConnectorsService`, but the generated SDK docs site has no connectors service page — part of a broader recorded finding that the published SDK surface lags the shipped SDK.
