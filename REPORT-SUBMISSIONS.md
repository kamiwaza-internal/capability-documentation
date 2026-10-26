# Verification report submissions

For an already published version, add exactly two files in a new directory:

```
site/static/verification-results/X.Y.Z-YYYY-MM-DD-short-topic/results.md
site/static/verification-results/X.Y.Z-YYYY-MM-DD-short-topic/results.pdf
```

Use [the report template](docs-verification-report-template.md). Replace the version,
evidence date and every placeholder. Keep the five section headings in order.
Render the PDF from the same finished Markdown; review both for matching content,
readability, public-safe evidence and accurate scope. CI checks the pair, title,
date and sections; it does not establish PDF semantic equivalence or validate live proof.
No new manifest, JSON export, checksum file, ZIP, homepage link or layout change is required.

The build automatically includes both files, unchanged, in that version's standard
ZIP under `verification-results/`, indexes them in its README, and includes their
hashes in SHA256SUMS. Existing report snapshots and direct URLs remain available.
The homepage has exactly one PDF, one Markdown and one ZIP per version. The PDF
and Markdown remain the generated Sales Dev Kit; dated verification reports live
inside the ZIP. Reports supplement, rather than silently replace, the pinned catalog.

Canonical evidence belongs in capability-kit. Link its immutable commit and stamps
from the report. A report upload does not create capability credit, update the
catalog or grant release approval. Updating canonical catalog data still follows
its existing validation process. Preserve historical prerelease evidence; never
add overlapping counts or turn scoped results into whole-release approval.

## PR checklist

- Add only the report PDF and Markdown for a routine report submission.
- Use a new dated directory; never overwrite an accepted historical snapshot.
- Confirm both documents contain the same outcomes and citations, without secrets
  or private runtime captures.
- Run `cd site && npm test && npm run build && npm run check:release-corpus`.
- Check the generated version ZIP contains both submitted files and their hashes.

CI rejects report PRs that overwrite reports or also change other files. Layout changes are separate product changes. Report submissions must not edit
`site/src`, styles, build scripts or workflows to add links or status panels.
Adding a new release version still requires the existing catalog publication flow;
the build rejects reports with no matching release download.

## Choose the actual release target

The original tagged 1.3.4 evidence remains in the 1.3.4 download. New work on
`release/1.3.0` targets 1.3.5 prerelease. Submit new report pairs under 1.3.5 with
the actual tested component identities. Do not change earlier stamps, test dates,
report versions or frozen tags to relabel history. Prior evidence may be included
as explicitly identified history; target designation alone does not accept release
carry-forward or establish fresh execution.
