---
capability_schema: capability.v1
id: auth.enterprise-sso
title: "Sign in through enterprise identity: SAML/OIDC brokering, CAC/PKI, sessions"
tier: internal
persona:
  - SysAdmin
  - Operator
  - Analyst
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  auth_enabled: The deployment runs auth-enabled (the admin guide's recommended posture); lite mode reduces the availability and security controls this document describes.
  keycloak: OIDC brokering requires the platform Keycloak to be configured and reachable; the browser login route answers 503 without it.
  feature_gates: SAML and CAC login are each configuration-gated and default off; every SAML route and the CAC login route answer 404 until enabled.
---

# Sign in through enterprise identity: SAML/OIDC brokering, CAC/PKI, sessions

Users authenticate through the customer's identity provider — OIDC providers brokered via the platform Keycloak, SAML federations with metadata, SP-initiated login, ACS, and single logout, and CAC/PKI smartcard login — with platform-managed sessions, token refresh, and logout, so access is enterprise identity end to end. The analyst-side login steps and the admin-side wiring steps converge on the same mechanism from both ends.

## What this capability guarantees

- **Browser login brokers through the platform Keycloak.** `GET /auth/login` redirects (302) to the platform Keycloak's authorization endpoint with the platform client and OIDC scopes, carrying the post-login destination in an HMAC-signed state; a `provider` hint pre-selects a brokered external identity provider, skipping the chooser. External IdPs are wired in as an admin operation: `POST /auth/idp/register` (the SDK's `register_identity_provider`) accepts a Google or generic OIDC provider, fetches the issuer's OIDC discovery metadata, and creates or updates the Keycloak broker entry; sibling routes update, delete, and list providers, with an unauthenticated public listing for the login page.
- **SAML is a full service-provider surface, gated off by default.** `GET /auth/saml/metadata` publishes SP metadata; `GET /auth/saml/login` starts SP-initiated login with signed relay state; `POST /auth/saml/acs` validates the assertion strictly, requires a NameID (400 without one), maps attributes to claims with required-role enforcement (403 when absent, with an audit record), provisions the local user, and establishes the session; `GET|POST /auth/saml/sls` processes single logout and purges the session. The ACS is rate-limited. All of it answers 404 until the SAML gate is enabled.
- **CAC/PKI login is edge-terminated and verifiable.** `POST /auth/cac/login` (gated, default off) trusts only requests carrying the edge shared-secret header (constant-time compared; misconfiguration is a 500, a bad header a 401), optionally requires the ingress's certificate-verified header, and reads the sanitized client certificate from the forwarded header. The certificate is validated against an issuer allowlist and subject pattern, with CRL revocation checking when CRL URLs are configured (fail-open only by explicit setting, default closed). Success mints a platform-signed RS256 token carrying the EDIPI, subject DN, `amr: ["pkix","cac"]`, and system-high claims, provisions the local user, and persists the session.
- **Sessions are platform-managed.** Tokens land as HttpOnly cookies (access, refresh, refresh timestamp, and id-token cookies); `POST /auth/token` proxies the password grant to Keycloak and returns its RS256 tokens; `POST /auth/refresh` refreshes from a parameter or the refresh cookie; `POST /auth/logout` revokes tokens with Keycloak, purges the server-side session, clears cookies, and hands back a front-channel logout URL whose separate browser leg ends the IdP session with the id-token hint. SAML IdP-initiated logout arrives through the SLS route.
- **The SDK covers the programmatic slice.** `login_with_password` runs the password grant against the gateway, `refresh_access_token` refreshes, and `register_identity_provider` performs the admin IdP wiring — the calls an automation or evidence arm uses.

## What this answers in customer terms

This capability is the platform's answer to "do our people sign in with our identity — including smartcards?" Enterprise SSO in the customary sense: the customer's OIDC or SAML identity provider is the source of truth, brokered or federated into the platform, with CAC smartcard login for environments that require it and centrally managed sessions and logout. The admin guide states the division of responsibility plainly: administrators verify the deployment domain, redirect and callback URLs, client id and audience, issuer and JWKS reachability, and the presence of claims required by policy — the platform consumes enterprise identity, it does not replace it.

## Conditions and limits

- SAML and CAC logins mint platform-local JWTs with no refresh token and no Keycloak session; only the OIDC and password paths carry Keycloak-issued tokens. A claim that all SSO flows produce IdP-session-backed tokens would be wrong.
- CAC certificate validation is performed on material forwarded by a trusted edge (mutual TLS terminates at ingress; the shared-secret header is what makes the forwarding trustworthy), not by in-process TLS peer verification.
- Local-account password policy is deliberately minimal and documented as such (no character-class rules, history, forced expiry, or per-user lockout); the admin guide directs deployments that require those controls to an external IdP — which is this capability's path.
- Who may do what once signed in is authorization, claimed separately as `authz.rebac-access-control`. Machine credentials are a separate concern with no capability document yet — uncharacterized in the kit, not claimed elsewhere.

## How this is exercised

The planned SDK arm exercises the programmatic slice: `login_with_password` against the gateway, an authenticated call proving the session, `refresh_access_token`, and — where the environment allows an admin credential — `register_identity_provider` round-tripped through the provider listing, emitting `scenario-evidence.v2` records naming this capability. The SAML and CAC flows are browser- and edge-dependent and are not exercisable by this arm; a passing record therefore characterizes the capability without touching them (see coverage notes).

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- A characterized status sourced from the planned arm covers the password-grant, refresh, and IdP-registration contract — not SAML, not CAC, and not the browser brokering path. Read it that narrowly; the docs' own validation checklist (sign-in, session validation, CAC at ingress) is the manual complement for those flows, and no cycle-1 arm automates it.
- The behavior-journey corpus has no authentication journey, so this document lists no `evidence` references.
- Both feature-gated flows (SAML, CAC) default off; a deployment that has not enabled them does not observably have them, which the gap report should reflect per deployment rather than this document claiming them unconditionally.
