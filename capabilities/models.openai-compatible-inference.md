---
capability_schema: capability.v1
id: models.openai-compatible-inference
title: Serve every model behind an OpenAI-compatible inference API
tier: internal
persona:
  - Operator
  - Analyst
surface:
  - API
  - SDK
evidence_plan: sdk
preconditions:
  deployed_model: At least one model deployment — local or external — is in the DEPLOYED state; for the planned SDK arm to reach a pass, one deployment per declared operation (chat, embeddings, transcription, image generation).
  auth: The caller holds a bearer credential (session token or PAT); the SDK configures the OpenAI client with it.
evidence:
  - model-management/J03/SC-03
  - model-management/J08/SC-01
  - model-management/J08/SC-02
---

# Serve every model behind an OpenAI-compatible inference API

Applications call Kamiwaza-governed models — locally served or externally proxied — through OpenAI-compatible routes, so anything written against the OpenAI wire format runs against them without code changes. The SDK makes this concrete by handing back a standard `openai.OpenAI` client already pointed at a chosen deployment. This compatibility claim is distinct from deployment: it is the claim application developers actually ask about, and it can hold or fail independently of whether deploys succeed.

## What this capability guarantees

- **Every deployment gets an OpenAI-compatible base URL.** The canonical, path-based route for current deployments is `https://<host>/runtime/models/<deployment_id>/v1`, served behind the platform gateway. `/v1/models` is common to every deployment; the inference endpoint beneath that base URL follows the capability the deployment declares, so `/v1/chat/completions` is the endpoint for chat deployments rather than for all of them. Routes are created at launch, which is why a deployment can be reachable while still `INITIALIZING`.
- **The SDK returns a genuine OpenAI client, not an imitation.** `client.openai.get_client(...)` accepts exactly one of `model`, `deployment_id`, `repo_id`, or `endpoint`, resolves the active deployment, and returns an instance of the standard `openai` Python client configured with the deployment's base URL and the caller's bearer token. It refuses to construct a client without an authenticated session (`AuthenticationError`), and resolving an identifier with no active deployment is a clear `ValueError`, not a dangling client.
- **Local and external models present uniformly.** Locally served engines and the externally registered ones map onto the same OpenAI-style capability vocabulary — `chat.completions` for chat engines (vLLM, llama.cpp, MLX, and `external_chat`), `embeddings` (including `external_embedding`), `audio.transcriptions` (including `external_transcribe`), and `images.generations` — so the caller's contract does not change with the hosting path, and deployments can be filtered by capability when listing.
- **Inference calls are governed, not anonymous.** At the serving boundary the platform resolves a verified invocation context — actor, roles, request id, and workroom scope (including explicit postures for missing or invalid scope) — for downstream audit consumers, so traffic through the compatible surface is attributable rather than a side door around platform controls.
- **The pattern is documented end to end.** The RAG-pipeline use case builds on exactly this surface: deploy through the SDK, `get_client(repo_id=...)`, then standard `chat.completions.create` calls against the returned client.

## Conditions and limits

- Requests address a deployment by its base URL; the `model` field in the request body does not route between deployments (the documented pattern passes a placeholder such as `"model"`). Selecting a model means selecting which deployment's URL you call, or which identifier you hand `get_client`.
- Compatibility is at the wire-format level for the capabilities a deployment declares; provider- or engine-specific features beyond those endpoints are not claimed here.
- Authentication is required end to end: the compatible surface sits behind the platform gateway and expects the bearer credential the SDK injects.

## How this is exercised

The behavior-journey corpus reaches this surface from both personas: `model-management/J03/SC-03` (test the deployed local chat model) and `model-management/J08/SC-01` / `J08/SC-02` (analyst chats end to end through an external and a local model respectively). The planned SDK arm exercises the contract directly: obtain a client via `get_client` for a deployed model, run chat completions (and streaming where the engine supports it), and assert the identifier-resolution and authentication failure modes — emitting `scenario-evidence.v2` records naming this capability. Because a single passing record marks this whole capability characterized — `passed_with_notes` counts as passing, so a caveat in the record does not hold coverage back — and the uniform-vocabulary guarantee above spans `embeddings`, `audio.transcriptions`, and `images.generations` as well as chat, the arm emits a passing record for this capability only when it has made at least one representative call per declared operation. A build without an embedding, transcription, or image deployment is a build where this arm does not run to a pass: it records the operations it could not exercise as `skipped` steps with their reason and reports the scenario as failed rather than passing, so the capability stays `intended` instead of reading characterized on chat alone. Such a record lands in the gap report's *Failing evidence* section: read it there as an environment that could not exercise the capability — the `skipped` step details name which deployment was absent — rather than as a regression in the serving surface.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The inventory entry's codebase refs carry one weak pointer: `kamiwaza/serving/inference.py` is a legacy single-node load/generate router (ctransformers-based) and is not the OpenAI-compatible serving surface. The claims above are grounded in the SDK `OpenAIService`, the serving invocation context, and the platform documentation of the `/v1` routes — not in that module.
