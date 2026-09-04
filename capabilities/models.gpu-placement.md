---
capability_schema: capability.v1
id: models.gpu-placement
title: Control model placement across hardware classes, including fractional GPU serving
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
evidence_plan: manual
requires:
  - models.local-deployment
not_supported:
  - Operator-chosen node or GPU pinning. Placement is automatic; the operator controls it through capacity and configuration, not by naming a device.
---

# Control model placement across hardware classes, including fractional GPU serving

When a model is deployed, Kamiwaza decides where it runs — which node, which GPU or memory pool, and how much memory to reserve — so that a cluster's accelerators serve more than one model deliberately rather than by accident. The platform estimates the model's VRAM footprint, classifies the hardware it could land on, reserves a budget there, and refuses fast and legibly when nothing fits. The deploy flow itself is unchanged: placement is a property of every deploy, not a separate operation.

## What this capability guarantees

- **Footprint estimation is a first-class surface.** `POST /serving/estimate_model_vram` estimates the memory a deployment request needs (weights, context/KV cache, per-deployment overhead), running on the node holding the model files when the cluster is up; the SDK exposes the same estimator as `client.serving.estimate_model_vram()` for previewing a request before deploying.
- **Placement flows through custom resources with enforced budgets.** Deployments are realized as `ModelDeployment` custom resources (`serving.kamiwaza.io/v1alpha1`), reconciled by the placement operator (the default path). Each GPU on a node advertises its capacity as a per-device resource, `kamiwaza.ai/vram-gb-gpu-<i>` in GB, and the estimate becomes a reservation against one specific device. Kubernetes enforces the budgets at scheduling time, so an over-budget model is refused before anything starts — never left half-running or silently pending.
- **Hardware classes are detected, not configured.** Placement classifies devices from node labels into `hardware_isolated` (MIG/partitioned cards: one model per partition, hardware fault isolation), `software_shared` (discrete cards without partitioning: fractional per-GPU budgets, cluster-configured sharing, or whole-GPU exclusive), and `unified_memory` (Apple Silicon, AMD Strix Halo, NVIDIA DGX Spark: budgets against the shared system pool, with an 8 GiB operating-system reserve held back). The operator never selects a class by hand.
- **Fractional serving is the default, with a compliance off-switch.** Multiple models coexist on one card as long as their combined budgets fit; on mixed nodes, placement picks a card whose remaining budget fits the request. Installations that require exclusivity can disable fractional placement at install time (`placement.vramPluginV2.enabled=false` on the placement-operator chart), falling back to whole-GPU exclusive placement.
- **No-fit is a structured, fast failure.** A model that fits nowhere fails with a structured placement error — reason codes such as `insufficient_capacity` — translated to an HTTP 409 envelope on the deploy path and recorded on the deployment, with no pending pod and no partial deployment.
- **Where a model landed is visible.** Every deployment's details surface the topology (managed versus standalone cluster), node and GPU index, hardware class and sharing class (for example `unified_memory`, or `mig_2g_20gb` for a MIG slice), and the allocated capacity in GB.

## Conditions and limits

- On managed clusters, placement respects whatever GPU sharing the cluster admin configured through the GPU Operator (MIG partitions, time-slicing, MPS) and requires no privileged access beyond the one-time install steps (a CRD and a read-only role for node labels). Without a configured sharing strategy, deployments still work but density is limited to one model per GPU.
- On hardware-isolated cards, capacity is the partition size, not the card: a model larger than the largest configured partition fails with a structured no-fit error even when the card as a whole is big enough.
- macOS installs run the control plane in a VM while model processes run natively on the host for Metal GPU access; they appear as standalone topology with the `metal_spawner` sharing class.
- The `surface` front matter above declares UI and API, while the estimator guarantee names the SDK method `client.serving.estimate_model_vram()`. The declared value is reproduced verbatim from the 2026-08-09 inventory run and is left as recorded rather than corrected here, so a consumer reading `surface` should not infer that the SDK estimator is unavailable. Reconciling the declaration is a change for the inventory's next pass.

## What a manual sign-off must demonstrate

This capability routes to the manual evidence arm. A sign-off for a stated build, on named hardware, must demonstrate all of the following, with the deployment-details evidence captured:

1. **Coexistence:** two models deployed to the same GPU (or the same unified memory pool), both reaching `DEPLOYED` and serving concurrently, with each deployment's details showing its own allocated capacity in GB on that device.
2. **Fail-fast no-fit:** a deliberately oversized additional deploy failing promptly with the structured no-fit reason (for example `insufficient_capacity`) recorded on the deployment — no pending pod, no partial deployment.
3. **Truthful classification:** the deployment details reporting a hardware class and sharing class consistent with the hardware under test (for example `software_shared` with per-GPU budgets on a T4-class card, `unified_memory` on Apple Silicon, a `mig_*` sharing class on a partitioned card).
4. **Estimator agreement:** the VRAM estimate for the deployed model (`estimate_model_vram`) consistent with the budget actually reserved.

The sign-off must record the build identifier, the hardware (device model, memory size, and class), and which of the three hardware classes the run covered — a single sign-off covers only the classes it actually exercised.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one. Only a manual sign-off meeting the bar above actually demonstrates the guarantees here, but the kit does not enforce that: a passing automated record naming this capability would read as characterized without the bar having been met. Read a characterized status on this capability against the sign-off record, not against the status alone.
- The behavior-journey corpus (`kamiwaza-product-journeys`) has no placement journey, which is why this capability routes `manual` rather than `ui`.
