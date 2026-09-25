# Kamiwaza Capability Documentation

The publishing layer for [capabilities.kamiwaza.dev](https://capabilities.kamiwaza.dev/).
The private capability-kit remains the source of truth. Published records distinguish
Tier 1 source declarations from Tier 2 runtime verification; a declaration is not a
passing test. See [the site contract](site/README.md) for release-binding limits and
downloadable evidence bundles. Only reviewed main merges publish automatically.

## How this works

Each file under [`capabilities/`](./capabilities) is one capability: what it guarantees, the conditions it requires, and its documented limits. A claim here is always one of three things:

- **Established** — backed by a passing test for a named platform release
- **Not established** — documented, but not yet backed by a passing test for that release
- **Not present** — this repo doesn't cover it yet

**Absence from this repo does not mean the platform can't do something.** It means it hasn't been documented and evidenced here yet. Treat an undocumented capability as "not established," never as "not supported" — those are different claims.

## Structure

| Path | Contents |
|---|---|
| `capabilities/` | One Markdown file per capability — what it does, its conditions, its limits |
| `tests/` | SDK-based automated tests exercising these capabilities |
| `synthetic-data/` | Sample data used to run those tests |
| `evidence/` | Records proving each tested claim — which test, which release, when |

Some directories are still being populated as this repo comes online; not every capability has automated evidence here yet.

## Using this repo

- **Looking for whether the platform does something specific?** Check `capabilities/` for a matching document. The file's own conditions and limits sections are the actual scope of the claim — read past the title.
- **Building against the SDK?** `tests/` doubles as a set of working, evidenced examples, not just a test suite.
- **Something look out of date or wrong?** Open an issue — this repo is actively maintained and grows every release.

## Provenance

This documentation is generated from Kamiwaza's internal capability-tracking process and reviewed before publishing. It reflects a specific point in time per release; check a capability's evidence record for the release it was last validated against.

## How to read a claim

Every capability carries two independent signals. They are never collapsed.

| Tier | Means | Does **not** mean |
|---|---|---|
| **Tier 1 — Declared** | The shipped source establishes this surface, cited to a pinned revision. | That it was tested, meets an SLA, or works on your configuration. |
| **Tier 2 — Verified** | A passing record proves the operations on a named build. | That other builds or untested configurations behave the same. |

Tier 1 without Tier 2 is a normal, honest state — "the platform supports this; we have not proven it for this release." It is not a warning sign. A capability can also be **Tier 1 declared with a known Tier 2 failure**; both are reported, because a declaration is not erased by a failing test and a failing test is never shown as working behavior.

Two things that look like "no" and are not:

- **Not established** — we cannot back the claim from this repo, for this release. It is **not** a statement that the platform cannot do it.
- **Omitted** — the capability was deliberately left out of this publication. Not declared unsupported, not failed.

Only **not supported** — a cited, explicit exclusion — means the platform does not do something. **Absence from this repo is "not established," never "not supported."**

## Release status

A published release is either **approved** or **pending**.

**Pending** means it is published before release-manager sign-off: accurate to the evidence held at publication time, subject to change before approval, and **not a release commitment**. Pending is shown on the release itself, not only on the landing page, because readers deep-link a single release and paste single claims into documents.

Note the two are separate questions. *Channel* (`development` / `released`) is about what the evidence is bound to — source snapshot or an attested build. *Approval* is about whether a human signed the release off. A release can be runtime-verified and still unapproved; a source baseline is unverified no matter who approved it. Merging a publication PR approves **publishing**; it does not by itself make a release approved.

If a release does not say approved, treat it as pending.
