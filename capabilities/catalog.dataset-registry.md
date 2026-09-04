---
capability_schema: capability.v1
id: catalog.dataset-registry
title: Register and search datasets and containers in the data catalog
tier: internal
persona:
  - Operator
  - Analyst
surface:
  - UI
  - API
  - SDK
evidence_plan: sdk
preconditions:
  auth: Every catalog route requires an authenticated user; reads run under a workroom read context and writes under a workroom write context.
  backing_catalog: The catalog backend is reachable — DataHub by default, or the platform's own database implementation in kamiwaza-lite mode.
---

# Register and search datasets and containers in the data catalog

Datasets and their containers are first-class catalog entities with URNs, schemas, and search — operators register onboarded sources so applications and analysts find governed data by name rather than by connection string. The catalog is the description layer, deliberately apart from connector configuration (transport) and from secrets management; it is also the namespace other capabilities address: retrieval jobs target dataset URNs, and attribute gates bind to them.

## What this capability guarantees

- **Datasets are URN-identified entities.** `POST /catalog/datasets/` (201) registers a dataset — name, platform, environment, tags, properties, an optional schema, and an optional parent container — and returns its URN; the URN is the stable address every other surface uses. Dataset schemas read and write through dedicated endpoints, addressable by URN in three styles (path-embedded, query-parameter, and legacy path).
- **Containers group datasets.** Containers are logical groupings with URNs of their own: `POST /catalog/containers/` (201) creates one, `GET /catalog/containers/` lists and searches them, and membership endpoints add and remove datasets.
- **Finding data is a query, not a walk.** The dataset and container list endpoints take a free-text search query; on the DataHub implementation the search runs against the catalog index and results are post-filtered to the caller's workroom, since the index cannot filter on the platform's workroom property itself.
- **The registry is governed, and how strongly depends on one flag.** Every route requires an authenticated user; reads and writes run under workroom contexts, and a cross-workroom create or upsert answers 409. Those hold unconditionally. The ReBAC layer above them does not: **when `AUTH_REBAC_ENABLED` is on**, dataset creation assigns the creator as ReBAC owner and listing applies per-caller ReBAC visibility filtering, so what a caller finds is what the caller may see. **The flag defaults to off**, and with it off the list route returns before the visibility filter and no owner tuple is written — listing is then scoped by the caller's workroom read context alone. Workroom scoping is the floor; per-caller ReBAC filtering is opt-in.
- **The backing store is pluggable without changing the contract.** The default implementation is DataHub; kamiwaza-lite deployments run the platform's own database-backed implementation behind the same routes. Operations a backend does not implement answer 501 rather than misbehaving.
- **The SDK ships two dataset clients over one capability.** The catalog client covers the full legacy surface — datasets, containers, schema mutations, catalog secrets — with typed models; the federation-aware datasets client covers a minimal create/get/delete slice that returns federation-shaped references and adds attribute-gate binding. The duplication is an SDK-shape observation the inventory records, not two capabilities.

## What this answers in customer terms

This capability is the platform's answer to "is there one governed place where our data holdings are described and findable?" — a data catalog in the customary sense: registered datasets with stable identifiers and schemas, grouped into containers, searchable by name, and scoped to the caller's workroom (with per-caller ReBAC filtering available on top, off by default). It is what lets an analyst ask for data by what it is rather than by where it lives, and what gives downstream claims (retrieval jobs, attribute gates) a governed namespace to bind to.

## Conditions and limits

- Attribute-gate binding on datasets is administered through this catalog's URNs but is claimed and documented as part of `authz.rebac-access-control`. Secrets storage alongside the catalog is a separate concern that has no capability document yet, so it is claimed nowhere in the kit — treat it as uncharacterized rather than as documented elsewhere.
- The SDK's dataset-publisher calls (`add_publisher`, `remove_publisher`) and `register_from_spec` have no server-side route at the pinned platform revision — an SDK-ahead-of-platform drift recorded here so the claim is not repeated from the SDK surface. Publishers are therefore not part of this capability's claim despite appearing in the inventory summary.
- The docs page states container creation and membership changes require admin permissions; the code requires a workroom write context, not an explicit admin check. Where they disagree, this document follows the code.

## How this is exercised

The planned SDK arm exercises the registry through the catalog client: register a dataset with a schema, read it back by URN, create a container and attach the dataset, search both by query, and confirm a second workroom's caller does not see them — emitting `scenario-evidence.v2` records naming this capability. The federation-aware client's gate binding is exercised under `authz.rebac-access-control`, not here.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The behavior-journey corpus has no catalog journey, so this document lists no `evidence` references; the planned SDK arm is the only path to characterization this cycle.
- Neither SDK dataset client has a generated SDK docs page — part of the broader recorded finding that the published SDK surface lags the shipped SDK.
