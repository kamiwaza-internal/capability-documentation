---
capability_schema: capability.v1
id: models.local-deployment
title: Deploy and manage local models on cluster hardware
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
requires:
  - models.discover-and-download
preconditions:
  downloaded_model: The model's files are downloaded and registered on the platform.
  admin_role: Deploying, stopping, and deleting deployments are admin operations on the API.
evidence:
  - model-management/J03/SC-02
  - model-management/J03/SC-03
  - model-management/J11/SC-01
---

# Deploy and manage local models on cluster hardware

An operator takes a downloaded model through its full serving lifecycle on cluster hardware: deploy with an automatically selected (or explicitly chosen) engine, observe the launch through a documented status vocabulary, read logs and typed error codes when something goes wrong, and stop or retire the deployment. A novice mode fronts the same lifecycle with curated defaults. Where the model lands — node, GPU, memory budget — is `models.gpu-placement`; models the platform does not host are `models.external-endpoints`.

## What this capability guarantees

- **Deploys are accepted asynchronously and never lie about readiness.** `POST /serving/deploy_model` responds `202 Accepted` with the deployment id as soon as the deployment record exists and the launch is kicked off in the background (ENG-6530). Validation and admission errors raised before the record exists still fail the request synchronously; launch failures after acceptance land on the deployment row as a terminal status with `last_error_message` rather than vanishing.
- **Readiness is observed client-side, with typed failure.** The SDK's `deploy_model(..., wait=True)` — the default — polls `wait_deployment_ready` until `DEPLOYED`. A terminal `FAILED`/`ERROR`/`MUST_REDOWNLOAD` status raises `DeploymentFailedError` carrying `status`, `last_error_code`, `last_error_message`, and `deployment_id`; exceeding the wait budget raises `TimeoutError`, which also carries `deployment_id` so the in-flight deployment can be stopped or inspected. Transient poll failures (connection blips, HTTP 5xx) are retried a bounded number of times before propagating. `wait=False` returns the id immediately for callers that own their wait loop.
- **Engine selection is automatic, with manual override.** The platform selects the inference engine from OS, hardware, and model file format — `.gguf` routes to llama.cpp variants, `.safetensors` to MLX on Apple Silicon and vLLM on GPU-equipped Linux — from a canonical engine set (`vllm`, `llamacpp`, `ampere_llamacpp`, `mlx`, `whisper_cpp`, `diffusion`, and the externally registered `external_*` engines, which automatic selection never returns). An engine can also be specified explicitly.
- **Lifecycle status is documented and current.** Deployments move through a documented vocabulary (`REQUESTED`, `DEPLOYING`, `INITIALIZING`, `DEPLOYED`, `STOPPED`, `ERROR`, `FAILED`, `MUST_REDOWNLOAD`). `GET /serving/deployments` performs an opportunistic health check before returning, so listed statuses are current without waiting on the background scheduler, and supports filtering by model and capability.
- **Failures carry actionable codes.** `ERROR`/`FAILED` deployments surface short error codes with documented remediations — `OOM`, `CUDA_ERROR`, `MODEL_LOADING_FAILURE`, `CONTAINER_EXITED`, `RUNTIME_ERROR`, `STARTUP_TIMEOUT`, `MUST_REDOWNLOAD` — and the advanced UI exposes container logs with auto-detected issue patterns per deployment.
- **Stop and retire are first-class.** `DELETE /serving/deployment/{id}` stops a deployment and `DELETE /serving/deployment/{id}/delete` hard-deletes the record, both admin-only with a `force` option; the SDK's `stop_deployment` accepts a deployment id or resolves one from a repo id.
- **Novice mode lowers the floor without forking the path.** The default novice experience picks a platform-appropriate variant (GPU, Mac, or CPU) with sensible context and cache defaults and deploys in one click; advanced mode exposes the full parameter surface on the same lifecycle.

## Conditions and limits

- Deploy, stop, and delete are admin-gated on the API; listing deployments requires only an authenticated user.
- `DEPLOYED` means the engine has loaded the model. On the Kubernetes CR path the platform budget for reaching a terminal phase defaults to 1200 seconds precisely because a cold start of a large quant (weights pull plus load) can run several minutes; `INITIALIZING` for a short period after launch is normal, not a fault.
- Once deployed, the model serves through its OpenAI-compatible route; that contract is claimed and evidenced separately as `models.openai-compatible-inference`.

## How this is exercised

The behavior-journey corpus covers this lifecycle as `model-management/J03/SC-02` (download, deploy, and monitor to ready) and `model-management/J03/SC-03` (test the deployed local chat model), with `model-management/J11/SC-01` covering the novice-mode deploy entry. The planned SDK arm exercises the API contract beneath those journeys: `deploy_model` with the default client-side wait, assert `DEPLOYED`, assert `DeploymentFailedError` semantics on a forced failure path where feasible, then `stop_deployment` — emitting `scenario-evidence.v2` records that name this capability.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The declared UI surface is where the capability is exposed (the Models page drives the same deploy/monitor/stop flow); `evidence_plan: sdk` records where it will be exercised. The journey references above are authored pointers — no run in this cycle has produced records from them.
- The planned arm asserts `DeploymentFailedError` semantics "where feasible", so a run that cannot force a failure still passes on the happy path alone and characterizes the typed-failure and error-code guarantees above without testing them. Until the forced-failure path is mandatory, read a characterized status here that is sourced from the planned SDK arm as covering deploy, monitor, and stop but not the failure contract. Tightening this is tracked with the broader work of pairing each guarantee to an assertion.
- The runner's `model_management_j03_sc_01` journey was mapped to this capability (and `models.discover-and-download`) in the runner's evidence PR (2026-08-10). **That journey browses and selects a model; it does not deploy one.** Since the kit marks a capability `characterized` on a single passing record, those records will make this capability read as characterized without exercising any of the deploy, monitor, or stop guarantees above. The planned SDK arm is what establishes this capability; narrowing the runner mapping is a change against the runner repo, tracked separately from this document.
