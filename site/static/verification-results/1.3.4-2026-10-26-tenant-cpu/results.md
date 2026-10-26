# Kamiwaza 1.3.4 verification report

Evidence date: 2026-10-26

## Scope

Serve a model in a restricted CPU tenant. The complete SDK/API journey passed on the captured v1.3.4 ARM64 installation with the qualified llama.cpp runtime, Qwen3-0.6B GGUF model and owner-signed compute profile. The tenant can serve without permission to read Kubernetes Nodes. This is a scoped recipe, not certification of every tenant-mode configuration or an entire parent value stream.

The frozen Core source is 5f5f64656802eb497167f6eae6021093cfcdccf2. SDK producer 76716b614034b46a523c0c2dc887f4284abc1314 ran the complete registered node. Before and after captures matched. Original native configuration and temporary outer fixtures were restored and independently audited afterward.

## Results

This adds one distinct capability, models.tenant-mode-inference, to the 72 previously accepted capabilities: 73 of 87 scoped release-verified capabilities, with 14 remaining. All 58 historical prerelease entries remain separate and preserved. Overlapping historical and release evidence is never added together. This update does not claim a new fully verified parent value stream.

The recipe checks serving and installer authority boundaries and refuses application deployment by a nonadmin. Nine explicit invalid-profile requests reach the expected typed asynchronous failure: invalid signature, untrusted signing key, wrong cluster binding, wrong namespace, expired bundle, mutable bundle, version floor, malformed owner anchor and no compatible architecture. Native events independently match the returned deployment IDs and exact reasons; continuous observation finds no inference workload for those cases.

A version-floor change after request preparation is rechecked at dispatch and refuses the stale request. Restoring the valid profile permits recovery and real chat. Separate implicit and explicit CPU deployments also serve real chat, with exact allocation, profile, image and resource checks. Each serving invocation checks two distinct arithmetic answers and positive usage. Implicit sizing selected 100m CPU and 1 GiB; the explicit request used 2 CPU and 1 GiB.

All 13 deployment rows from this run are stopped. Owned configs, temporary profiles, file aliases, gate resources, listeners and signing keys are removed. Original model bytes are preserved. Empty isolated model metadata and stopped deployment histories remain intentionally available for audit; they are not running workloads.

## Evidence

Canonical accepted packet: https://github.com/kamiwaza-internal/capability-kit/tree/f42394c55d5a331c09a1c0e28504a2035223553b/reports/2026-10-26-tenant-cpu-release134

Acceptance: https://github.com/kamiwaza-internal/capability-kit/pull/224

Native stamp ID: e092afbcd3da9ef5a91062144dae115bb48cc3aa041590640250794966c22148.

Registered kit: sdk:tenant-cpu-arm64-async-profile-refusals. Complete scenario: cpu-arm64-llama-cpp-tenant-owner-profile-serving-authority-signed-refusals-dispatch-revalidation-and-cleanup. One registered full-recipe node passed without skips or teardown errors. The packet retains source bindings, matching captures, scenario evidence, independent full-recipe review and final restoration evidence. Earlier failed attempts remain failed and retained; diagnostic checks do not independently earn capability credit.

## Limits and assumptions

CPU on ARM64 with the recorded llama.cpp runtime, model and signed profile only. NVIDIA, AMD, GPU allocation classes, other architectures, other engines, tensor parallelism and browser UI remain unverified. Owner signing and publication are covered; automatic hardware detection, key rotation and the optional admission webhook are not.

Negative cases use explicit CPU requests. An earlier implicit invalid-signature request returned HTTP 503 during resource derivation; a complete implicit-negative matrix is not claimed. Invalid explicit requests initially return a deployment tracking ID, then fail asynchronously. Client-visible named request errors remain unverified.

The owner must control verifier settings. No protection is claimed against a tenant controlling the release or replacing the bundle without the optional webhook. The test checked actual model bytes against their digest; immutable-revision propagation through the download API was not verified. Cumulative coverage spans multiple captured configurations, not one jointly tested installation. No human whole-release sign-off is implied.

For an RFI, report Kamiwaza support, tested evidence, limits and gaps against each requirement. Do not generate a vendor response, procurement verdict or accreditation claim.

## Remaining work

Fourteen active capability IDs remain outside accepted release coverage. Broader tenant-mode operations and parent value streams keep their separate requirements. The guide's ingredient glossary distinguishes release-verified, historical prerelease and pending coverage; the new recipe states exactly what a user can reproduce. Historical evidence and prior report downloads remain unchanged.
