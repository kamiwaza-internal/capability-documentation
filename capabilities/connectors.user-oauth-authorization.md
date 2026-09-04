---
capability_schema: capability.v1
id: connectors.user-oauth-authorization
title: Authorize personal data-source access with OAuth/OIDC brokering
tier: internal
persona:
  - Analyst
  - Operator
surface:
  - UI
  - API
evidence_plan: ui
requires:
  - connectors.managed-data-sources
preconditions:
  configured_connector: An admin has configured and deployed the connector; the connect flow answers 409 when the connector uses a shared or public credential (there is no per-user account to connect) and verification answers 503 until the connector workload is deployed.
  provider_reachability: The user's browser and the platform can reach the identity provider; the provider's app registration lists the platform's public callback path as a redirect URI.
evidence:
  - data-connectors/J02/SC-02
  - data-connectors/J02/SC-03
  - data-connectors/J02/SC-04
---

# Authorize personal data-source access with OAuth/OIDC brokering

An analyst authorizes a connector against their own identity: the platform drives the provider's OAuth flow — redirect or device code, per the connector's manifest — completes it on a public callback, and stores the resulting tokens server-side, so per-user sources like Microsoft 365 and Google Workspace are accessed as the user, under the user's own entitlements, rather than as a shared service account. An in-process OAuth broker then mints short-lived, lease-tracked provider tokens for downstream consumers, keeping refresh tokens and client secrets inside the platform.

## What this capability guarantees

- **The connect flow is manifest-driven, not provider-hardcoded.** `POST /connectors/{id}/connect` (any authenticated user) begins connecting the caller's account per the connector's declared flow: authorization-code connectors return `{"auth_url": ...}` for a browser redirect, device-code connectors return an RFC 8628 device-authorization payload (`user_code`, `verification_uri`, poll interval), and the client branches. A connector holding a shared or public credential answers 409 — there is no per-user account to connect.
- **Device-code completion is pollable and provider-polite.** `POST /connectors/{id}/connect/poll` reports `pending`, `connected`, or `expired` for a device-code flow, with server-side throttling that honors the provider's interval and `slow_down` responses. On success, tokens are stored and the user's connection record moves to `connected`.
- **The public callback is state-driven and replay-resistant.** `GET /connectors/public/{provider}/callback` is deliberately unauthenticated — the request is the provider's redirect — and routing is carried entirely by a single-use CSRF `state` (5-minute TTL) that identifies connector and user and is consumed before the code exchange, so a state cannot be replayed. The exchange runs as a confidential client; the response is a popup page that messages the opener and closes.
- **Tokens stay server-side, per user.** The token payload is written to the platform's secret store under a per-connector, per-user key, and the user's connection record carries status, granted scopes, expiry, and (best-effort) the external account email. Connector API responses never return the tokens.
- **Connection health is a first-class, per-user verdict.** `GET /connectors/{id}/connection` reports the caller's connection including failing capabilities; `POST /connectors/{id}/verify` probes a real read through the deployed connector with the caller's own token, classifies per-capability failures as permanent versus transient, and persists the verdict — degrading the connection, marking it `needs_reauth`, or healing it back to `connected` on positive proof.
- **Downstream access is brokered, leased, and revocable.** The OAuth broker's connector-scoped mint releases a provider access token only to the workload principal bound to the connector's subscription, on presentation of the acting user's verified subject token — on-behalf-of, not impersonation — with the refresh token and client secret never leaving the platform core and every mint lease-tracked for revoke-on-disconnect. The broker's application-scoped mint (`POST /oauth-broker/tokens/mint`) applies the same discipline for App Garden tool installations: ephemeral tokens with 1-to-15-minute broker leases, an optional scope subset of the connection's granted scopes, lease status and revoke endpoints, and an explicit steer toward the proxy mode that never exposes tokens at all. Disconnecting an account revokes its outstanding broker leases.

## What this answers in customer terms

This capability is the platform's answer to "when analysts pull from SharePoint, OneDrive, Outlook, Drive, or Gmail, do they do it under their own accounts and entitlements?" — the least-privilege posture the workbooks demand for per-user sources. Each user's access is authorized by that user against the provider, scoped to what they granted, verifiable per capability, and revocable per user; nothing about one user's authorization widens another's. The product documentation states the same posture: credentials encrypted at rest, OAuth performed directly with the provider, per-user isolation, administrators controlling availability while users control their own accounts.

## Conditions and limits

- A broker lease expiring or being revoked does not guarantee provider-side token invalidation — the code states this itself: provider token lifetime is controlled by the provider and may outlive the broker lease if provider-side revocation fails.
- The connect flow acquires and stores tokens in the connectors service; the broker's role is downstream — mint, lease, refresh, proxy, and lease revocation on disconnect — not the acquisition handshake.
- The product documentation describes the redirect flow for users; the device-code path is exercised by the Microsoft 365 journey scenario but is not documented on the docs page. Neither the OAuth broker nor its endpoints have a docs page — a recorded docs-gap finding.
- The redirect URI the provider must allow is the platform's fixed public callback path (`/api/connectors/public/{provider}/callback`), derived from the platform's external URL.

## How this is exercised

The planned UI arm drives the journey corpus's `data-connectors/J02` scenarios in a browser: complete a device-code authorization (SC-02) or a redirect authorization (SC-03) against a configured connector, verify provider capabilities (SC-04), and observe the connection card move to connected — emitting `scenario-evidence.v2` records naming this capability. The SDK intentionally does not wrap this interactive flow, which is why the routing is `ui` rather than `sdk`.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs.
- **One inventory ref is imprecise and is recorded here rather than smoothed over.** The inventory cites the broker's application-scoped mint (`POST /oauth-broker/tokens/mint`) and application-scoped connection status; those endpoints key on an app installation, not a connector. The connector-scoped mint that carries this capability's "accessed as the user" claim is the adjacent route in the same module (`POST /oauth-broker/tokens/connectors/{connector_id}/mint`). Both are documented above from the same pinned source file; a future inventory run should re-point the refs.
- The workbook's PKI/CAC-to-source variant (smartcard-derived authorization to certain sources) has no implementation source and is not claimed here — it stays a recorded finding, unestablished rather than denied.
