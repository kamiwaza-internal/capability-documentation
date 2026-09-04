---
capability_schema: capability.v1
id: workrooms.s3-object-storage
title: Back workroom storage with external S3
tier: internal
persona:
  - SysAdmin
surface:
  - CLI
evidence_plan: manual
preconditions:
  bucket: An external S3 or S3-compatible bucket exists, with an IAM identity allowed at least s3:ListBucket, s3:GetObject, s3:PutObject, and s3:DeleteObject on it.
  cluster_access: The administrator has kubectl access to the target cluster and controls the deployment's values overrides.
not_supported:
  - OneDrive-backed workroom storage. The workbook's persistent-workroom option names OneDrive alongside S3; only S3 has an implementation source. The OneDrive half is noted as demand without supply in this capability's own inventory entry, not in the inventory run's numbered findings list.
  - S3 credentials in workroom attributes. The resolution module explicitly ignores sensitive credential overrides placed in workroom metadata; credentials come from runtime secrets or ambient identity only.
---

# Back workroom storage with external S3

Workroom object storage can be backed by an external S3-compatible store instead of the in-cluster default (Ceph RGW): administrators configure bucket, region, endpoint, and credential secrets at deploy time, and both Context and Catalog resolve workroom object storage through the same neutral resolution module. This is the bring-your-own-storage posture for persistent workrooms.

**This capability routes to the `manual` evidence arm**: it is a deployment-time administrative configuration exercised by a runbook against a real cluster, not by an SDK or UI harness. No automated arm covers it.

## What this capability guarantees

- **One resolution path for every consumer.** Workroom S3 configuration resolution and client construction live in a single platform module (RGW / S3 / BYO-S3), so Context file persistence and Catalog object storage resolve through the same code path rather than each keeping its own wiring. They can still reach *different* effective configurations for the same workroom: Context honors non-secret per-workroom overrides and Catalog suppresses them by default (see Conditions and limits). Configuration is read from the `CONTEXT_SERVICE_S3_*` environment surface.
- **Two documented configuration surfaces.** On deploy-repo Helmfile installs, `storage.workrooms` in `deploy/cluster/values/storage-overrides.yaml` is the preferred surface; the storage platform materializes it into the core chart's `context.objectStorage` block and keeps the rest of the storage stack consistent. Direct core-chart consumers set `context.objectStorage` themselves. The rendered result reaches the `core-config` ConfigMap, the scheduler, the Ray head and worker pods, and the storage-janitor CronJob.
- **Two credential postures.** Static AWS access keys are supplied through a Kubernetes Secret referenced by name (with optional session token); alternatively, an empty Secret reference falls back to ambient AWS credentials (IAM roles), in which case `enabled: true` must be set explicitly because the chart cannot infer enablement without a Secret name.
- **Credentials never come from user-editable metadata.** Per-workroom attribute overrides exist for non-secret settings, but the resolution module ignores credential material placed in workroom attributes and logs the refusal; the documented security posture is Kubernetes Secrets or ambient identity only.
- **Failure is diagnosable.** The documentation pairs every configuration path with its verification commands (ConfigMap, scheduler env, Ray head) and its failure signatures — missing-bucket errors, `CreateContainerConfigError` on a missing Secret, `Unable to locate credentials`, and `AccessDenied` — each with the specific check that distinguishes it.

## Conditions and limits

- **Default installs need none of this, and misapplying it breaks them.** The default `rook-rgw` storage lane provisions in-cluster RGW and wires workroom storage automatically. A stale `core.context.objectStorage` override (notably in `overrides.yaml`) silently displaces that wiring and can leave a fresh install blocked on a Secret that never exists. The documentation's warning to this effect is part of the capability's operational story.
- `overrides.yaml` is not a supported storage-configuration surface: it deep-merges per key over the storage platform's rendered values. The single supported exception is the minimal session-token fragment documented for temporary credentials.
- This changes the workroom storage backend only; model and registry storage keep their configured backends.
- The `surface` value is a vocabulary compromise: the schema has no deploy-config surface, and `CLI` (helm/values-driven install tooling driven from a shell) is the nearest honest fit. The vocabulary gap is recorded in inventory findings.
- **Only credentials are strictly cluster-wide.** Bucket, prefix, region, endpoint, and encryption settings are deployment *defaults* that a workroom's non-secret `attributes.s3` metadata can override on the Context path, where the resolver allows workroom overrides by default. Catalog and Retrieval suppress those overrides (`WRITABLE_DATASET_ALLOW_WORKROOM_S3_OVERRIDES` defaults false) so a workroom-level actor cannot redirect platform-signed requests. Choosing external S3 remains an administrator's deployment decision, but it is not true that nothing is selectable per workroom — and because `attributes` is free-form on create, the Context-path override is reachable by anyone who can create a workroom. Operators evaluating the security posture should be told this rather than the flat cluster-wide claim.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `manual` arm runs: a manual runbook execution on a cluster configured for external S3, verifying the ConfigMap/scheduler/Ray wiring and a product-level storage workflow (context file upload, Skills Library import), captured as an evidence record naming this id.
- No journey scenario covers storage backend configuration, so this document lists no `evidence` references.
