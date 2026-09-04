---
capability_schema: capability.v1
id: workrooms.export-bundle
title: Export a workroom's contents as a bundle
tier: internal
persona:
  - Analyst
  - SysAdmin
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
requires:
  - workrooms.create
preconditions:
  authority: Reading the manifest requires workroom view access. Downloading the bundle requires owner-caliber authority — the route guard checks manage-caliber, but the service then re-resolves the workroom by ownership, so a non-owner editor who passes the guard receives 404 rather than the bundle.
evidence:
  - workrooms/J04/SC-07
not_supported:
  - Export of the underlying data. The bundle carries metadata and a resource inventory only — no ingested documents, embeddings, vector indexes, ontologies, or thread and session content. App deployments and extensions are marked non-exportable outright, and workroom-scoped context instances are not enumerated in the manifest at all.
  - Bundle export of the Global Workroom. The manifest path has a global fallback but the bundle path does not, and the Global row's owner is a system principal, so `POST /workrooms/{global-id}/export` answers 404 for every human caller including administrators.
  - A standalone export control outside the delete flow, and export in the extension-owned Workroom Manager. The core-owned Manager surfaces the download only as a step inside the delete dialog; the extension-owned Manager shows an export-availability warning but no download.
---

# Export a workroom's contents as a bundle

A workroom's contents can be inventoried and exported: a manifest endpoint reports what an export would contain, and a bundle export produces a ZIP archive of the workroom's metadata and resource inventory. This backs offboarding and pre-deletion accounting — an inventory of what a workroom held — and is scriptable through the SDK. It is not a complete delete-impact answer either: the manifest omits workroom-scoped context instances that a delete does destroy (see Conditions and limits). It is **not** a data-portability path: the archive carries descriptors of the workroom's resources, not the underlying data payloads. Read "can we get our data out?" as answered no by this capability; see Conditions and limits.

## What this capability guarantees

- **A manifest before the download.** `GET /workrooms/{id}/export/manifest` returns a categorized list of the workroom's contents with per-item export eligibility. The manifest enumerates workroom metadata plus tagged app deployments, extensions, DDE data sources, and catalog datasets. It is **not** a complete delete-impact list: the cascading delete purge additionally walks workroom-scoped context instances, which the manifest does not enumerate. Nor is there another surface that closes the gap — `delete-preview` and the lifecycle summary report the same resource families the manifest does, so **no read surface anywhere enumerates workroom-scoped context instances**; their destruction is established from the delete code path only. Treat the manifest as what an export would carry, and treat any delete-impact answer as understating context instances.
- **A ZIP bundle of metadata and inventory.** `POST /workrooms/{id}/export` returns a ZIP archive with a download filename (`workroom-{id}-export.zip`) containing `workroom.json` (workroom metadata), `manifest.json`, and per-item JSON descriptors for DDE data sources and catalog datasets. `WorkroomService.export_bundle` returns the archive as bytes by default; it streams in chunks only when given an `output_path` or a `file_obj`.
- **Exports are audited, best-effort.** A successful bundle export emits a sensitive-data-export audit event naming the workroom. Emission is explicitly best-effort: an audit-sink failure is logged and does not block the download, so that named event can be absent from an otherwise successful export. A separate service-layer audit decorator on `export_bundle` provides an independent trail, so egress is not necessarily unrecorded — but the named event is not a guarantee.
- **The SDK pairs both halves.** `WorkroomService.get_export_manifest` and `WorkroomService.export_bundle` mirror the two endpoints, with 404 mapped to `NotFoundError` and a guard against conflicting output arguments.

## Conditions and limits

- **Enumeration is best-effort, and a degraded export looks like a clean one.** Each resource family is enumerated inside its own suppressing handler: if a backing subsystem is unreachable, those resources are omitted from `manifest.json` and their index file is written empty, and the export still returns 200 with no degradation marker — the audit trail even records it as a success. An empty `data_sources/index.json` is indistinguishable from a workroom that genuinely has none. This matters most for the "export, verify, then delete" runbook, where the export is the safety net: verify the manifest against a known inventory rather than treating a well-formed archive as proof of completeness.
- **The bundle contains no underlying data payloads.** Eligibility is marked per item in the manifest, but for every eligible item the archive carries a metadata descriptor only — DDE sources as connection-configuration metadata with secrets excluded, catalog datasets as identity metadata. Ingested documents, embeddings, vector indexes, ontologies, and thread or session content are not included. Do not read "exportable: true" on a data-bearing item as meaning its contents ship; it means a descriptor for it ships. An operator who needs the underlying data must retrieve it from the backing systems the descriptors name. The journey corpus states the boundary from the user's side — an exporting user obtains the data they are allowed to access and retain — which this capability satisfies only at the inventory level.
- **The two operations carry different authority, and the bundle's is stricter than its guard suggests.** Any member with view access can read the manifest — that path resolves the workroom by accessibility with no role predicate. The bundle route guards on manage-caliber authority, but the service behind it re-resolves by ownership (owner id, or an active owner-role membership row), so the one manage-caliber non-owner role — `editor`, the authorization projection of the product Contributor role described in `workrooms.membership-and-roles` — is admitted by the guard and then refused with a bare 404. Plan automation around owner-caliber authority, and expect that 404 to be indistinguishable from a missing workroom rather than a permission error.
- The core-owned Workroom Manager — the default posture — does expose the bundle download, as a "Download before delete" step inside the delete dialog. Only the download is functional there: the dialog's export panel is manifest-shaped, but the core Manager never fetches the manifest, so that panel renders its empty state. Do not read the UI surface as offering a pre-download inventory. Export is nonetheless reachable in the default UI posture even though no page in the platform documentation tree describes it. The Workroom Manager user guide names export-bundle only as a forthcoming surface; that statement is scoped to the extension-owned Manager and is stale with respect to the core surface, and should be corrected upstream. This is an inventory finding — the claim here rests on the platform code, the core frontend, and the SDK surface, which are explicit.
- Export serves migration and offboarding independently of retirement; deleting a workroom does not require an export, and the delete flow does not perform one implicitly. Pairing export with delete (J04/SC-07's "export before destructive action") is an operator practice this capability enables, not an enforced gate.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs. An SDK runbook can exercise the API/SDK claim end to end: create, populate minimally, read the manifest, download the bundle, and assert the archive's structure — specifically that it contains `workroom.json`, `manifest.json`, and descriptor entries, and that it does *not* contain the populated data. The `UI` surface (the core Manager's export-before-delete step) is not exercised by the routed SDK arm and would need a UI journey run of its own to be covered.
- The journey corpus touches export at `workrooms/J04/SC-07` (export is available before destructive action), which carries `intended` provenance in the corpus itself; no run anywhere has exercised it against a stated build.
