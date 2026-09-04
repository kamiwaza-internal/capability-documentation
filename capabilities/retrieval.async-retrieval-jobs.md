---
capability_schema: capability.v1
id: retrieval.async-retrieval-jobs
title: Run asynchronous retrieval jobs with streaming results
tier: internal
persona:
  - Analyst
surface:
  - API
  - SDK
evidence_plan: sdk
requires:
  - catalog.dataset-registry
preconditions:
  registered_dataset: The target is a catalog dataset identified by URN; the caller holds viewer (or higher) access to it, and when ReBAC is enabled the dataset `can_view` check gates create, status, and stream.
  workroom_context: Job creation runs under a workroom read context; the job records its workroom and tenant at create time.
  flight_transport: The gRPC transport requires network reachability to the platform's Arrow Flight endpoint (port 6130 by default) with TLS.
---

# Run asynchronous retrieval jobs with streaming results

Retrieval against registered datasets runs as asynchronous jobs: create a job against a dataset URN, poll or cancel it, stream results over SSE, or pull columnar batches over Arrow Flight — so a large retrieval is an operation with a lifecycle, ownership, and access checks, not a blocking query. Source coverage at the pinned revision spans filesystem, S3, Hive, Postgres, Kafka, Slack, and platform-managed datasets, each behind its own adapter.

## What this capability guarantees

- **Jobs are created against governed datasets.** `POST /retrieval/jobs` (201) creates a job for a catalog `dataset_urn` with row limit and offset, filters, column projection, an optional per-call credential override (held as a secret), and a transport choice of `auto`, `inline`, `sse`, or `grpc`. An unknown dataset — or one the caller may not view — answers 404; transport overflow answers 413 and an unsupported transport 422; upstream unavailability (dataset access, transport, gate resolution, secret access) answers 503 rather than mislabeling the failure.
- **The lifecycle is explicit and ownership-enforced.** Jobs move through `CREATED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELED`. `GET /retrieval/jobs/{id}` reports status; `POST /retrieval/jobs/{id}/cancel` cancels an active job and answers 409 from a non-active state. Non-admin users list and cancel only their own jobs; admins see all.
- **Results stream with attribute-gate filtering applied.** The SSE stream (`GET /retrieval/jobs/{id}/stream`) emits sequenced `chunk` events carrying data, media type, and metadata, closed by a terminal `complete` event. When a dataset carries attribute gates, the gate runner filters records per chunk and stamps audit metadata on the way through, so what streams is what the caller is entitled to see.
- **Bulk transport is Arrow Flight with single-use tickets.** The gRPC transport hands back a handshake naming Arrow Flight endpoints, a token, and an expiry. The ticket is atomically consumed when the stream starts — replay is refused — and TLS is on by default (client-certificate verification optional). Inline responses are bounded near 1 MB and SSE near 512 MB by configuration, which is what makes Flight the at-scale path.
- **The SDK wraps the lifecycle with typed failure.** `create_job` translates 404, 403, and 422 into typed errors; `materialize` normalizes the three transports into one result shape (inline rows, a wired SSE event iterator, or the Flight handshake); `stream_events` parses the SSE stream; `flight_batches` yields Arrow record batches over TLS and, after a clean end of stream, verifies the job actually reached `COMPLETED` — an incomplete stream raises rather than passing silently as a short result.

## What this answers in customer terms

This capability is the platform's answer to "can we pull large result sets out of our enterprise data stores — object storage, relational databases, Hive, Kafka topics, Slack history, file shares — as governed, monitorable operations rather than ad hoc scripts?" A retrieval is addressed to a registered dataset by name, permission-checked per caller, filtered through the dataset's attribute gates, and delivered over a transport sized to the result — which is the substance behind "repeatable, reusable queries over the working data set" in the workbook step this serves. Semantic search over ingested documents is the separate claim `context.workroom-document-search`; this capability is source-side bulk retrieval.

## Conditions and limits

- Retrieval is dataset-addressed, not connector-addressed: the job targets a catalog URN, and the adapter behind the dataset does the reading. A source with no registered dataset is not retrievable through this surface.
- Kafka datasets cannot be materialized through the SDK yet — the SDK rejects Kafka URNs client-side before job creation.
- The SDK has no cancel method; cancellation exists only on the REST API at the pinned revision.
- `materialize` is an SDK-side convenience; the server exposes no materialize endpoint.
- The docs page describes the bulk transport as a named gRPC service (`RetrievalService.StreamData`); the code at the pinned revision ships Arrow Flight with single-use DoGet tickets instead, and the docs also omit the cancel endpoint, the status vocabulary, and the managed-dataset adapter. Where they disagree, this document follows the code.

## How this is exercised

The planned SDK arm exercises the job lifecycle end to end through the typed `RetrievalService`: create a job against a known registered dataset, poll status to `COMPLETED`, materialize inline for a small result and stream SSE events for a larger one, and pull the same job's batches over Arrow Flight where the environment allows — emitting `scenario-evidence.v2` records naming this capability. Cancel semantics can only be asserted over REST, since the SDK does not wrap them.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The behavior-journey corpus has no retrieval-jobs journey — the kaizen-context journeys cover the context service's search path, not this service — so this document lists no `evidence` references; the planned SDK arm is the only path to characterization this cycle.
- The workbook expresses the demand as reusable, repeated queries over the working data set rather than naming a jobs API; the mapping is behavioral, as the inventory records.
- The retrieval SDK service ships with no generated SDK docs page — part of the broader recorded finding that the published SDK surface lags the shipped SDK.
