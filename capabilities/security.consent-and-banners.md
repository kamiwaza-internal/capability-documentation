---
capability_schema: capability.v1
id: security.consent-and-banners
title: Configure consent gates and classification banners across every surface
tier: internal
persona:
  - SysAdmin
  - Operator
surface:
  - UI
  - API
evidence_plan: ui
preconditions:
  enablement: The consent gate and banners are enabled through deployment configuration (both default off).
  admin_role: Reading and updating the security configuration requires an admin.
not_supported:
  - The consent gate is an acknowledgment control, not an authorization control. Accepting consent gates access to the UI flow; it does not grant or restrict permissions, which remain the concern of authentication and access control.
---

# Configure consent gates and classification banners across every surface

Administrators configure a pre-login consent gate and persistent classification banners — banner text and colors, consent content, and acceptance flow — and extend the same markings to embedded and extension apps through a single embeddable script. This gives deployments the SYSTEM HIGH labeling and acknowledged-use posture their accreditation requires, with acceptance recorded server-side for audit. The accreditor's question this answers is "does every surface show the approved banner and require the acknowledgment?" — not a question about endpoints.

## What this capability guarantees

- **An audited admin configuration surface.** `GET /security/admin/config` returns the complete settings to an authenticated admin, and `PUT /security/admin/config` persists consent-gate and classification-banner settings as an audited update recording the acting admin's identity.
- **Pre-login availability by design.** `GET /security/public/config` (the consent/banner configuration the UI and embed script consume) and `POST /security/consent/accept` are deliberately public, because both must work before login. Both are rate-limited with a sliding window and honest `Retry-After` responses.
- **Consent acceptance is recorded for audit, on a best-effort path.** When `POST /security/consent/accept` succeeds, acceptance is recorded server-side with the client IP and user agent. The IP is only recorded when forwarded-header trust can verify it (an unverifiable proxy chain records no fabricated address), and the user agent is sanitized and bounded before it reaches the audit stream. Client-side, consent is tracked per browser session. **The gate does not depend on that recording succeeding:** the UI issues the acceptance request without checking the response status and continues past a network error, so a run in which the endpoint is unreachable, rate-limited, or erroring admits the user with acceptance held only in session storage and no server-side audit event. The audit trail is therefore a record of the acceptances that reached the server, not a complete ledger of the acceptances that gated access. A deployment whose accreditation depends on a complete acknowledgment ledger needs that gap closed on the platform side; this document does not claim it is closed.
- **One script extends the markings to any app.** `GET /security/embed.js` returns a self-contained JavaScript bundle an application includes with a single script tag. It fetches the public config, injects top and bottom classification banners, and enforces the consent gate until accepted. It fails closed — a config fetch failure shows the consent gate with a retry option rather than silently skipping it — and sanitizes HTML content to prevent XSS. Embedded apps that must preserve consent while suppressing banners can load `embed.js?classification_banners=0`.
- **Configuration is deployment-managed.** Enablement, button label, and banner text/colors (top and bottom independently, bottom defaulting to top) are set through deployment values or environment configuration (`KAMIWAZA_SECURITY_CONSENT_ENABLED`, `KAMIWAZA_SECURITY_BANNER_ENABLED`, `KAMIWAZA_SECURITY_BANNER_TOP_TEXT`, and peers), all defaulting to disabled. Consent HTML loads from `$KAMIWAZA_ROOT/config/security/consent.html`, with a default short message when the file is absent.

## Conditions and limits

- Coverage of extension and embedded apps depends on those apps including the embed script; the platform provides the mechanism and identical behavior, but an app that omits the tag shows no markings. The expectation that extension apps show the same markings is met through this script, not through transparent injection.
- Consent acceptance is per browser session (session storage) plus the server-side audit record; it is not a per-user durable acknowledgment ledger keyed to accounts.
- Custom consent content in customer deployments should be managed through the supported configuration and release process rather than edited in running containers.

## How this is exercised

The planned UI arm exercises the operator-visible contract: enable the gate and banners, confirm the pre-login consent modal blocks until accepted, confirm top and bottom banners render with the configured text and colors after login, accept and confirm acceptance is recorded, and load a page carrying the embed script to confirm an embedded surface shows the same gate and markings (including the fail-closed behavior when the config endpoint is unreachable). Because the sanitization guarantee above is a security claim, the arm asserts it directly rather than inferring it from a clean render: configure consent HTML containing active markup and confirm `embed.js` renders it inert — the markup appears as text or is stripped, and no script from the consent content executes. The arm also pins the recording boundary the guarantees state: with the acceptance endpoint made to fail, accept the gate and confirm the observed behavior — the user is admitted, and no `consent_accepted` event appears for that acceptance. The negative half is observed in the host's audit log stream, not through an API: no endpoint exposes consent audit events, so a runner without log access on the system under test can evidence only the admission, not the missing record.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- Neither the behavior-journey corpus nor the UI journey runner carries a consent/banner journey today (the runner's recently authored security-adjacent journey covers SSO identity providers, a different capability). Authoring a consent/banner journey in the runner is the path to coverage for this capability.
