---
capability_schema: capability.v1
id: tools.mcp-tool-shed
title: Deploy and manage MCP tools from the Tool Shed
tier: internal
persona:
  - Operator
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  templates: For template deploys, the tool template is available — imported locally or synced from the remote catalog.
  secrets: Tools requiring credentials (API keys and similar) have their required environment variables supplied at deploy time.
---

# Deploy and manage MCP tools from the Tool Shed

An operator deploys MCP (Model Context Protocol) tool servers from container images or curated Tool Shed templates, monitors their health, and discovers what is running — so agents and applications call governed, platform-managed tool endpoints instead of ad-hoc ones. Each deployed tool server gets a stable HTTPS URL usable by any MCP-compatible client.

## What this capability guarantees

- **Deploy from an image or a template.** `POST /tool/deploy` deploys a tool server from a container image with environment variables and instance counts; `POST /tool/deploy-template/{template_name}` deploys from a pre-built template. A template deploy with missing required environment variables fails as a client error naming the missing variables, not as a broken deployment. Both return a `ToolDeployment` carrying the generated public URL.
- **A template catalog with remote sync.** Available templates (`GET /tool/templates/available`) and imported templates (`GET /tool/templates`) are listed separately, with garden status showing available versus imported. Tool templates sync from the same remote catalog App Garden uses, with administrator-selectable catalog stage (LOCAL, DEV, STAGE, PROD) and on-demand refresh, so new tools roll out without shipping static files.
- **Discovery of running servers.** `GET /tool/discover` returns the deployed tool servers, including their capabilities when available, so agent workflows can find governed tools rather than hard-coding endpoints.
- **Per-deployment health checks.** `GET /tool/deployment/{id}/health` performs a health check verifying the tool server is running and responding to the MCP protocol — not merely that a container exists.
- **Lifecycle end to end.** Deployments are listable and inspectable (`GET /tool/deployments`, `GET /tool/deployment/{id}`) and stop cleanly (`DELETE /tool/deployment/{id}`). The SDK mirrors the full surface: `deploy`, `deploy_from_template`, `list_deployments`, `discover_servers`, `check_health`, `stop_deployment`, `list_available_templates`.
- **Platform-standard routing.** Tool deployments receive stable HTTPS URLs behind the standard API gateway, integrating with the same routing system as models and apps.

## Conditions and limits

- **The Docker-Compose Tool Shed surface is deprecated in favor of Kubernetes CRD-based extensions.** The SDK's `ToolService` emits a `DeprecationWarning` recommending `ExtensionService`. The verbs documented above function today; new integrations should expect the extensions API to be the successor surface. This document claims the Tool Shed surface as it stands.
- OAuth-enabled tool provisioning requires the authenticated user id to be a UUID; identity formats that do not parse as UUIDs block provisioning of OAuth-enabled tools (logged as a warning on the platform side).
- Sensitive configuration values should come from platform-managed secrets rather than plaintext environment variables; the tool itself defines which variables it requires.
- Governance claims here are about deployment, discovery, and health of tool servers. What an agent is permitted to do with a tool once connected is the concern of the consuming surface (for example Kaizen agents), not of the Tool Shed.

## How this is exercised

The planned SDK arm exercises the lifecycle end to end: list available templates, deploy one (supplying its required environment variables), assert the deployment reports healthy over MCP and appears in discovery, then stop it — emitting `scenario-evidence.v2` records naming this capability. The deploy-from-image path and the missing-required-variable failure mode are natural assertions in the same run.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` until a passing record for a stated build names it — from any arm, not only the planned one.
- The behavior-journey corpus (`kamiwaza-product-journeys`) has no Tool Shed journey, and the UI journey runner carries none either, so the declared UI surface has nothing to run until one is authored. Note that the gap report does not show this as a per-surface gap — it reports coverage per capability, not per declared surface, so once the planned SDK arm lands this capability reads as characterized with the UI surface still unexercised. This is a candidate addition for the journey corpus, not a defect in this document.
