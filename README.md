# capability-documentation

Public capability documentation + SDK-based automated tests for the Kamiwaza
platform (Sales/Developer Release Kit). Split out of `capability-kit` on
2026-09-05 per the Daniel/Drew sync (2026-09-04).

**Status: scaffold only.** The actual capability documents are not yet
migrated here — 33 of 34 currently cite internal value-stream references
(front matter, and prose in 4 docs), which the sync explicitly ruled must
never appear in public output. That scrub is a separate, not-yet-done pass.
Do not copy content from `capability-kit` into this repo until it's been
reviewed and value-stream references removed.

Planned contents: `capabilities/` (final docs), `tests/` (SDK-only automated
tests — placement vs. `kamiwaza-sdk` still to be confirmed), `synthetic-data/`
(sample data for running the tests), `evidence/` (evidence records; whether
decline records belong here is still open — they carry de-identified customer
question text and may need to stay internal).
