---
capability_schema: capability.v1
id: federation.remote-jobs
title: Submit and monitor jobs on federated clusters
tier: internal
persona:
  - Operator
  - Analyst
surface:
  - API
  - SDK
evidence_plan: sdk
preconditions:
  paired_cluster: Remote execution reaches only a federation in `PAIRED` status; the mesh proxy answers 404 for any other target and 400 for a target that resolves to the local cluster.
  mesh_transport: The initiating cluster can reach the peer's ingress over TLS (optionally with a pinned peer CA); the pairing's per-federation preshared key signs the mesh envelope.
---

# Submit and monitor jobs on federated clusters

Work runs where the data lives: jobs are submitted to a paired cluster synchronously or asynchronously, monitored, cancelled, and their results and logs retrieved, with mesh-proxied transport carrying the calls between clusters and the receiving cluster keeping authorization in its own hands. Execution is authorized before compute is spent, and gated results are filtered per caller before release.

## What this capability guarantees

- **The job surface is a complete lifecycle.** `POST /cluster/jobs/submit` (201) submits asynchronously and returns the job id; `POST /cluster/jobs/run` (200) blocks to completion or timeout; list, status, result, logs, and cancel round it out. Failure semantics are typed: a gate denial is 403 with the gate named, a result requested before success is 409, expired engine logs are 410, an engine-dashboard failure is 502, and an on-behalf-of token problem distinguishes 401 from 503.
- **A job is a bounded, sanitized execution.** The entrypoint is a shell command run as a Ray job with a timeout (1 second to 24 hours) that auto-cancels — a timed-out synchronous run terminates as `STOPPED` with `timed_out: true` rather than hanging. Structured results travel by a log-marker protocol the job prints. The server strips every runtime-environment key except environment variables as a deliberate supply-chain safeguard, because the job inherits the submitter's platform token.
- **Execution and release are both gate-checked.** Submission runs the cluster's execution gate before dispatch — authorization happens before any compute is spent, and a deny or unknown answers 403. Result retrieval record-filters gated target datasets against the caller's identity attributes before release. With ReBAC enabled, job reads and cancels require an executor-class relation (auto-granted to the submitter); mesh-origin callers see only their own source cluster's jobs.
- **Cross-cluster transport is paired, signed, and receiver-controlled.** Remote calls travel the mesh proxy (`/api/mesh/{cluster}/cluster/jobs/...`) to a `PAIRED` federation only. The envelope is HMAC-signed with the pairing's preshared key over the source cluster, user, roles, route, and the hash of the forwarded caller JWT; the receiver validates the caller's own token against the shared keys, allowlists which brokered users may act, strips source-asserted cluster roles, and enforces its own ReBAC and attribute gates — cross-cluster authorization is receiver-controlled by design, with loop and hop-limit protection (508) on the proxy.
- **The SDK makes remote jobs a branch, not an exception.** `run` returns a typed job result synchronously — a failed job is a result with `status: FAILED` to branch on, not an exception — and its recoverable mode composes `submit_async` plus `wait` so the job id is in hand from the start. `wait` polls status with capped backoff to a terminal state, tolerates a 410 no-marker result while keeping status authoritative, and raises a typed timeout; `cancel` stops a job; a 401 mid-flight gets one token refresh and retry, and pairing-propagation delays are retried on their own schedule before raising a typed pairing timeout.

## What this answers in customer terms

This capability is the platform's answer to "can we send compute to the enclave that holds the data, instead of moving the data?" — remote job execution across paired clusters, with the sovereignty properties a receiving side asks about: the receiver authorizes execution before it spends compute, filters what leaves by the caller's attributes, and never accepts the sender's word for roles. One vocabulary caution the inventory records for sales use: the workbooks phrase this demand as agent-to-agent (A2A) delegation with agent cards and trust configuration; what ships and is claimed here is federated job submission, and the A2A program remains a recorded gap — do not present this entry in the workbooks' A2A language.

## Conditions and limits

- **The SDK's `target_cluster` argument does not reach a remote cluster at the pinned platform revision.** The SDK places `target_cluster` in the body of the local job endpoints, but the platform's request schema carries no such field and ignores it silently — the job executes locally. The working remote path is addressing the job endpoints through the mesh proxy URL, which is what the federation docs' own examples do. Treat any `target_cluster`-based remote claim as unsupported until the platform honors the field.
- The SDK's convenience arguments for pip packages, Python modules, and working directories are stripped server-side along with the rest of the runtime environment (only environment variables survive); the docs' submit example showing a pip list contradicts the shipped behavior, and the code wins.
- The docs page states admin authentication as a prerequisite; the code requires an authenticated user plus the gate and executor checks, not the admin role.
- Inter-cluster trust is preshared-key HMAC plus forwarded-token validation over TLS — not mutual-TLS client certificates between clusters.
- Three adjacent concerns sit outside this capability and none of them has a capability document yet, so each is uncharacterized in the kit rather than claimed elsewhere: establishing the cluster pairing (see the coverage note below), moving data rather than compute, and the receiver-side sovereignty controls in their full depth.

## How this is exercised

The planned SDK arm exercises the lifecycle against a paired pair of clusters: submit through the mesh proxy path, `wait` to a terminal state, retrieve the marker-protocol result and logs, cancel an in-flight job, and assert the typed failure result on a job that exits nonzero — emitting `scenario-evidence.v2` records naming this capability. An arm that only exercises the local job endpoints characterizes the job lifecycle but not federation; the mesh leg is the load-bearing assertion.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- **The `target_cluster` finding above is a source-verification result recorded this cycle**: the SDK surface implies platform routing the platform does not implement at the pinned revision. It is documented under conditions rather than silently narrowed so the claim set stays honest and the drift is visible to the next inventory run.
- The behavior-journey corpus has no federation journey, so this document lists no `evidence` references.
- This capability depends on `federation.cluster-pairing`, which has no capability document yet; the dependency is carried as the `paired_cluster` precondition rather than a `requires` reference until that document is authored, at which point `requires` should be added.
- The jobs router lives under the platform's cluster package rather than the services tree; the inventory's ref resolves, with that prefix noted for future runs. The jobs-federation SDK service has no generated SDK docs page — part of the broader recorded finding that the published SDK surface lags the shipped SDK.
