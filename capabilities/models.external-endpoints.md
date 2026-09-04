---
capability_schema: capability.v1
id: models.external-endpoints
title: Register external model endpoints behind the same catalog and controls
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
evidence_plan: ui
preconditions:
  egress: Outbound HTTPS from the Kamiwaza control plane to the provider hostname is permitted.
  credential: The operator holds a valid provider credential (API key, Azure resource or project key, AWS IAM access key or Bedrock bearer token, LiteLLM master key, or similar).
evidence:
  - model-management/J01/SC-01
  - model-management/J01/SC-02
  - model-management/J02/SC-01
  - model-management/J02/SC-02
not_supported:
  - A dedicated SDK method for endpoint registration. Registration is driven through the UI wizard and its API; once registered, deployment and serving flow through the normal serving surface.
---

# Register external model endpoints behind the same catalog and controls

An operator fronts existing inference-provider contracts with Kamiwaza: a discovery wizard validates the endpoint URL and credentials, enumerates the models the provider exposes, and registers the selected ones — after which they deploy through the normal model lifecycle and serve through the same OpenAI-compatible routes, audit, and access-control surfaces as locally hosted models. This is the workbook's Path B beside local hosting (Path A): "can we front our existing provider contracts with Kamiwaza?" is claimable and deniable independently of "can we host models ourselves?".

## What this capability guarantees

- **Discovery validates before it registers.** `discover_external_endpoint` validates the endpoint URL, authenticates with the supplied credential, and probes the provider's model inventory, returning the advertised model list for the operator to select from. Failures come back as classified discovery errors (unreachable, auth, malformed response), not generic 500s. The probe deliberately refuses to follow redirects, so the host that is validated and credentialed is the host the operator entered — a provider response cannot redirect the probe onward to a different address. This document claims the no-redirect behavior itself; it does not claim a general egress or private-address policy, which is a deployment network concern.
- **Credentials are handled server-side.** A stored credential can be referenced by secret URN instead of pasting a plaintext key; the URN is resolved server-side and the plaintext is used in memory for the probe — it is never returned to the client. The wizard offers existing-credential reuse when one is already stored for the endpoint.
- **Provider breadth through one wizard.** The same three-step wizard (source, setup, review) covers: OpenAI directly; Azure OpenAI Service and Azure AI Foundry, with the correct Azure handler detected from the pasted hostname; AWS Bedrock (Claude, Nova, Llama 3, and other Bedrock-hosted families through the Converse and InvokeModel APIs, with IAM access key or Bedrock API key auth, and an endpoint override for PrivateLink/GovCloud); AWS Transcribe (batch and streaming speech-to-text with S3 staging); and any OpenAI-compatible host — LiteLLM proxies, self-hosted vLLM, Ollama — with provider-specific inventory augmentation for LiteLLM and OpenRouter hosts.
- **Registered models are ordinary models afterwards.** Selected models register into the catalog (with per-model display name and default-parameter customization at review time), deploy through the normal deployment lifecycle, and are listed by the deployment's `/v1/models` route. Applications then call them without knowing which provider sits behind them, because the request shape is the provider-agnostic OpenAI one. Which OpenAI-compatible operation a registered model answers follows the engine it was registered under, not this registration path — an `external_chat` model answers chat completions, while `external_embedding` and `external_transcribe` models answer their own operations. This document does not claim that every externally registered model exposes chat completions; the operation each engine answers is described with the serving surface (`models.openai-compatible-inference`), not here.
- **External engines are explicit, never guessed.** The external engine names (`external_chat`, `external_embedding`, `external_transcribe`) are part of the platform's canonical engine set but are registered explicitly through this path — automatic engine selection never returns them, so a local deploy cannot silently become an external one.

## Conditions and limits

- Discovery requires the provider to be reachable and the credential to be enabled for the target models; for Azure, the deployment must exist in the project the URL points at. Egress-restricted networks must permit the provider hostnames (and for AWS Transcribe streaming, the separate streaming hostname and port).
- The wizard registers and Kamiwaza proxies; model quality, quota, and availability remain properties of the provider account. Testing each deployment from the Models list before applications call it is the documented practice.
- Serving external models through the OpenAI-compatible surface is claimed and evidenced separately as `models.openai-compatible-inference`.

## How this is exercised

The behavior-journey corpus covers this capability directly: `model-management/J01/SC-01` and `J01/SC-02` (validate and save an Azure OpenAI endpoint, then test the registered GPT chat model) and `model-management/J02/SC-01` and `J02/SC-02` (validate and save Bedrock credentials, then test the registered Claude model). The planned UI arm runs the register-and-test flow end to end through the wizard, and asserts the discovery guarantees above that the journeys do not reach: that a discovery URL answering with a redirect is refused rather than followed, and that a credential supplied by secret URN never appears in the wizard's responses.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The J01/J02 journeys exist in the journey corpus but are not yet authored in the UI journey runner (`web-ui-smoke-tests`), so there is no runner scenario to execute them today; authoring them there is the path to coverage for this capability's UI arm.
- The corpus notes Azure AI Foundry as a distinct protocol deserving a sibling journey to J01; the docs and discovery code support it now, but no journey exercises the Foundry variant specifically.
