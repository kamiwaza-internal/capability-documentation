---
capability_schema: capability.v1
id: models.discover-and-download
title: Discover and download models from model hubs
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  hub_reachability: The Kamiwaza control plane has outbound access to the source hub (Hugging Face Hub or a configured registry).
  auth: The caller is authenticated; download initiation is additionally authorized per model.
evidence:
  - model-management/J03/SC-01
not_supported:
  - Downloading from a public hub without outbound network access. Search and download probe the hub directly; staging model artifacts into an air-gapped install is a separate concern this capability does not claim.
---

# Discover and download models from model hubs

An operator searches model hubs from Kamiwaza, inspects a model's files and quantization variants, and downloads the selected artifacts into the platform with trackable per-file status. This is the acquisition on-ramp for every local deployment: what it establishes is that open-weight models can be pulled into the platform deliberately — with file selection, progress visibility, and access control — not whether they can then be served (that is `models.local-deployment`).

## What this capability guarantees

- **Hub search with graceful degradation.** `POST /models/search/` searches the requested hubs for an authenticated caller. Hub rate limiting does not fail the whole search: the platform runs Hugging Face API calls in a dedicated thread pool and returns results together with hub-status degradation info, so a rate-limited hub yields partial results with an error indicator rather than an error.
- **File-level inspection before download.** The SDK's `search_models` loads each result's file list and detects the quantization variants present (`available_quantizations`), so the operator chooses artifacts — a specific GGUF quant for CPU hardware, `.safetensors` for GPU serving — rather than blindly pulling a repository.
- **Quantization-aware download initiation.** `POST /models/download/` initiates the download and returns the initiation result plus the model-file ids being downloaded. The SDK's `initiate_model_download(repo_id, quantization=...)` selects files for the requested quantization when a repository carries multiple variants (default `q6_k`), downloads all files when it does not, skips files that are already satisfied locally, and — when the requested quantization does not exist — fails with the list of quantizations that do.
- **Trackable and cancellable downloads.** `GET /model_files/download_status/` reports per-file download status; the SDK's `check_download_status` presents percentage complete, throughput, remaining and elapsed time per file. An in-flight download can be cancelled via `DELETE /model_files/{model_file_id}/download`.
- **Access control on acquisition.** Download initiation is authorized per model and tenant on the server side; the downloading user is assigned ownership/viewer access under relationship-based access control, and models pulled from the Hugging Face Hub get a public viewer tuple so authorized users can discover them without manual tuple edits.
- **Downloaded files are cached and registered.** Artifacts land in a local cache directory; subsequent requests for the same model do not re-download. Once downloaded, files are registered in Kamiwaza and become available for deployment.

## Conditions and limits

- Search is discovery metadata only — it is authenticated but deliberately not object-guarded; per-model authorization applies at download time, not search time.
- Admission is enforced at initiation: object-store admission failures and insufficient disk space are rejected as client errors when the download is requested, not discovered later as a hung transfer.
- Models are identified by hub repository id (for example `meta-llama/Llama-3.3-70B-Instruct`); gated or licensed repositories are subject to the hub's own access rules on the credentials the platform uses.

## How this is exercised

The behavior-journey corpus covers the browse-and-select station as `model-management/J03/SC-01` (browse the catalog/hub and select a model) within journey J03, *Admin downloads and deploys a local catalog model*. The planned evidence arm for this capability is the SDK harness (`evidence_plan: sdk`): search a hub, initiate a quantization-selected download, poll `check_download_status` to completion, and confirm the files register — the same chain the SDK exposes end to end.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The runner's `model_management_j03_sc_01` journey was mapped to this capability (and `models.local-deployment`) in the runner's evidence PR (2026-08-10), so its records compute coverage here once that PR lands and the suite runs.
- **That journey covers the browse-and-select station only — it neither downloads a model nor deploys one.** The kit marks a capability `characterized` on a single passing record, so once those records land this capability (and `models.local-deployment`) will read as characterized on evidence that exercises none of the download guarantees above. Read the browse mapping as a pointer to the journey, not as coverage of acquisition; the planned SDK arm is what establishes this capability. Narrowing the runner's registry mapping to a browse-scoped id is a change against the runner repo, tracked separately from this document.
