# Kamiwaza Capability Documentation

What the Kamiwaza platform can do, written down one capability at a time, with the
evidence behind each claim. Published at
[capabilities.kamiwaza.dev](https://capabilities.kamiwaza.dev/).

This repository is for developers building on Kamiwaza and for partners who need to
answer "does the platform do X?" accurately. Every claim states its conditions and
limits, and says whether it is only documented or also verified.

## Three ways to use it

| You want to | Do this |
|---|---|
| Read or share a release's evidence | Open [capabilities.kamiwaza.dev](https://capabilities.kamiwaza.dev/) and download that release's Zip, MD or PDF. Each starts with its own reading rules, so you can paste it into any AI assistant with no skill installed. |
| Browse every record | Open the [full catalog](https://capabilities.kamiwaza.dev/catalog/). |
| Ask an AI assistant, or check an RFP or project plan | Install the `capability-grounding` skill (below). It answers from these records only and cites them. |
| Read the data yourself | Fetch [`/releases/index.json`](https://capabilities.kamiwaza.dev/releases/index.json), then the versioned bundle it points to. [`/llms.txt`](https://capabilities.kamiwaza.dev/llms.txt) states the reading rules. |

## Ask an AI assistant

The `capability-grounding` skill makes an assistant answer capability questions from
the published records and nothing else. It cites the record for every claim, keeps
"documented", "pre-release verified" and "release verified" apart, and reports **Not
established** when the records are silent. It does not guess, and it does not test a
running system.

### Claude Code

```bash
claude plugin marketplace add kamiwaza-internal/capability-documentation
claude plugin install capability-grounding@kamiwaza-capabilities
```

Then ask in plain words, for example:

> Does Kamiwaza support serving more than one model on a single GPU?

### Checking a document against the platform

Paste or attach a document and the skill answers everything in it that depends on the
platform, one row each, with the same citations:

- **An RFP, RFI or requirements list.** Every requirement, in document order.
- **A project plan, architecture map or a project's capability list.** It first lists
  what the project relies on the platform to do, so you can correct its reading, then
  answers each item.

It ends with the rows the records do not establish. The result is a draft: have a
person check each row against its cited record before it goes to a customer.

### Other assistants

The skill is one Markdown file:
[`plugins/capability-grounding/skills/capability-grounding/SKILL.md`](plugins/capability-grounding/skills/capability-grounding/SKILL.md).
Add it to your assistant as a skill or as instructions. It reads
`https://capabilities.kamiwaza.dev`; where that site needs a sign-in the assistant
cannot complete, it reads the same records from a checkout of this repository instead.

### What the skill sends

It fetches whole published files. It does not send your question, your documents or
any customer text to the site.

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

## What is in this repository

| Path | Contents |
|---|---|
| `site/` | The published site and its data. `site/data/publication.json` is the reviewed catalog the site and the bundles are built from. See [the site contract](site/README.md). |
| `plugins/capability-grounding/` | The assistant skill described above. |
| `capabilities/` | One Markdown file per capability — what it does, its conditions, its limits |
| `evidence/` | Records proving each tested claim — which test, which release, when |
| `tests/` | SDK-based automated tests exercising these capabilities |
| `synthetic-data/` | Sample data used to run those tests |

Some directories are still being populated; not every capability has automated evidence here yet.

## Provenance

This documentation is generated from Kamiwaza's internal capability-tracking process and reviewed before publishing. Only reviewed merges to `main` publish. It reflects a specific point in time per release; check a capability's evidence record for the release it was last validated against.

## Something wrong or missing?

Open an issue. This repository grows every release, and a claim that reads wrong is worth reporting.

## Portable Sales Dev Kit

Each release has one complete Sales Dev Kit in editable Word, PDF and Markdown. The same
content serves a salesperson or their chosen assistant: reviewed usage guidance and
customer-agnostic examples followed by the full capability/evidence reference. No plugin or
Slack bot is required. Each release's Everything ZIP includes all seven document downloads
(the complete kit in three formats, plus summary and detailed reference in PDF and Markdown)
under `human-readable/`, with source JSON under `machine-readable/`. A root README explains the
contents and `SHA256SUMS` covers every included file except itself. Standalone downloads remain available.

Guidance is authored once in the private capability records under `sales_guidance` and
prepared by the kit's `scripts/export_sales_guidance.py` from an immutable commit. Review its
allowlisted output before updating `site/data/sales-guidance.json`. The consumer checks the
exact publication content hash, published capability/version, pinned kit source and example
runtime-record references. Regenerate the guidance projection when publication data changes;
a mismatch omits guidance with a build warning and visible document gaps. Current capability
evidence downloads remain available. Malformed or unsafe guidance still fails validation.

The current 1.3 reference has usage guidance for all 88 capabilities. Four historical workroom
entries are also curated but do not enter that denominator. Other versions retain explicit gaps
rather than inheriting instructions. Unreferenced examples are illustrative; evidence-linked
examples retain their actual demonstrated scope. No download changes a verification status,
release approval, historical bundle or publication audience.

Newly reviewed guidance may describe an evidence-only row whose historical publication has no
description. Its source references remain in the pinned kit record; this does not retrofit a
declaration into the old publication. Private intake ledgers and corpus signoff from kit PR #133
do not automatically become public content. A separately reviewed publication update still
requires a regenerated guidance projection.

Slack remains optional. RFP attachments and pasted requirements default to capability
assessment. A leading user request such as `Draft our response to this RFP` explicitly opts
into full drafting, followed by content review and approval before document generation.
