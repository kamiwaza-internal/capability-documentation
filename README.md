# Kamiwaza Capability Documentation

The evidence-backed record of what the Kamiwaza platform actually does. Every capability described here is backed by a specific, dated test run — not a specification, and not a marketing claim.

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
