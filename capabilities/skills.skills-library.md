---
capability_schema: capability.v1
id: skills.skills-library
title: Curate and share reusable agent skills in a platform skills library
tier: internal
persona:
  - Analyst
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  permissions: The caller holds the skills read context for listing and the skills write context for import, edit, export, and delete.
  package: A skill package is a ZIP containing a SKILL.md with YAML front matter, optionally with scripts, assets, and references directories.
---

# Curate and share reusable agent skills in a platform skills library

Agent skills — packaged agent behaviors (a `SKILL.md` instruction package an AI agent loads and follows), not workforce competencies or personnel skill records — are imported, listed, curated, exported singly or as bundles, and deleted through a platform skills library, so teams share vetted agent behaviors across workrooms and applications instead of rebuilding them per app. The library is its own claim, deliberately separate from the agents that consume skills: it can exist and be evidenced without Kaizen, and the workbooks' team-scope sharing step demands exactly that separation.

## What this capability guarantees

- **Import lands as a reviewable draft.** `POST /skills/import` accepts a skill package upload and creates the skill as a Draft (`201 Created`), with honest failure modes: an invalid package is a `400`, a conflicting import a `409`, and storage trouble a classified storage error. The UI accepts both individual Agent Skills packages and Skills Library export bundles via drag and drop. The SDK's `import_skill_package` sanitizes the upload filename and returns the created skill detail.
- **Listing is tenant-scoped and filterable.** `GET /skills` lists skills within the caller's tenant with free-text search plus category, tag, and status filters and pagination (page size capped at 100). Visibility is permission-aware: non-published skills (drafts, archived) are included only for callers allowed to manage skills, and listing honors the requester's system-high context.
- **Curation without repackaging.** Metadata — display name, category, classification, tags, trigger, inputs, custom metadata — is editable in place (`PUT /skills/{id}`); the imported package contents themselves remain read-only, so what was vetted is what ships.
- **An explicit lifecycle gates what analysts see.** Skills move Draft → Enabled → Archived (and Archived → Draft to restore). Draft skills are not visible to analysts; Enabled publishes the skill into the Kaizen skill catalog; Archived hides it while retaining history.
- **Export travels as packages and bundles.** A single skill's current package downloads via `GET /skills/{id}/export` (or `GET /skills/{id}/package` for the published package); `POST /skills/export` bundles one or more skills into a single ZIP download with a proper attachment disposition and a sanitized filename. The SDK mirrors this with `export_skill_package`, `download_skill_package`, and `export_skills_bundle`; the UI exports whatever the current search and filters have scoped.
- **Deletion is soft.** `DELETE /skills/{id}` soft-deletes a library entry (`204 No Content`), recording who deleted it, rather than destroying history.

## Conditions and limits

- Read and write are separately gated (skills read context versus write context); import, metadata edits, export bundles, and deletion all require the write context.
- The library shares skills; it does not execute them. How a consuming application (for example Kaizen custom agents) activates an Enabled skill is that surface's claim, not this one.
- Import validates package structure (the `SKILL.md` with YAML front matter contract); it does not certify the behavior of the skill's contents — curation and classification of what is fit to enable remain human decisions the metadata fields exist to record.

## How this is exercised

The planned SDK arm exercises the library lifecycle end to end through the typed `SkillsService`: import a known-good skill package and assert it lands as Draft, list with filters and confirm tenant-scoped visibility, update metadata, export the single package and a bundle and verify the returned archives, and soft-delete — emitting `scenario-evidence.v2` records naming this capability. The invalid-package (`400`) and duplicate-import (`409`) failure modes are natural assertions in the same run.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The planned arm above does not exercise the publication lifecycle guaranteed at *An explicit lifecycle gates what analysts see* — it imports a Draft, curates, exports, and soft-deletes, but never moves a skill Draft → Enabled → Archived → Draft, and never checks that a Draft is invisible to an analyst. A passing record from that arm characterizes the whole capability regardless, so until the transitions join the arm, read a characterized status here as covering import, curation, export, and deletion but not publication. Extending the arm is tracked with the broader work of pairing each guarantee to an assertion.
- The behavior-journey corpus (`kamiwaza-product-journeys`) has no skills-library journey, so the declared UI surface (the three-pane library app documented in the skills-library guide) has nothing to run on the UI arm until a journey is authored. Note that the gap report does not show this as a per-surface gap — it reports coverage per capability, not per declared surface, so once the planned SDK arm lands this capability reads as characterized with the UI surface still unexercised. Authoring the journey is the path to closing it.
