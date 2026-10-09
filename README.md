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
| Browse capabilities | Open [capabilities.kamiwaza.dev](https://capabilities.kamiwaza.dev/). |
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
Add it to your assistant as a skill or as instructions. It needs only the ability to
fetch `https://capabilities.kamiwaza.dev`.

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
