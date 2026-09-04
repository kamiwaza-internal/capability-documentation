---
capability_schema: capability.v1
id: context.workroom-document-search
title: Upload documents into workroom collections and search them semantically
tier: internal
persona:
  - Analyst
surface:
  - API
  - SDK
evidence_plan: sdk
requires:
  - workrooms.create
preconditions:
  workroom_context: Every call runs under an authorized workroom context; collections, pipeline jobs, and search are workroom-scoped, and a job outside the caller's workroom reads as 404.
  managed_resources: The workroom's managed context resources (vector store, embedder) are provisioned; upload answers 503 with Retry-After while a managed resource is not ready, and search reports embedding-unavailable and vectordb-unprovisioned as structured 503s.
evidence:
  - kaizen-context/J02/SC-01
  - kaizen-context/J02/SC-05
  - kaizen-context/J04/SC-01
---

# Upload documents into workroom collections and search them semantically

An analyst uploads files into workroom-scoped collections, the context service pipelines them through extraction, chunking, and embedding into managed vector stores, and semantic search over those collections returns the passages — with source metadata — that ground workroom answers. This is the index substrate: it is claimable and verifiable without any chat surface on top, and the conversational experience built over it is the separate capability `kaizen.data-chat`.

## What this capability guarantees

- **Upload is a pollable pipeline job, not a blocking call.** `POST /context/upload/` (201) accepts a multipart file, enforces the size cap before writing (413 over the limit) and the supported-type list up front (400, with the supported types in the error), and returns a pipeline job in `pending` status processed in the background. The pipeline stages are explicit: extract text, chunk, embed, and index into the vector store. Jobs are pollable and manageable — list with status filters (`pending`, `running`, `completed`, `failed`, `cancelled`), per-item progress, cancel, retry, rerun, and delete — and failed items remain inspectable per item rather than vanishing into a failed job.
- **Collections are isolated per workroom.** `POST /context/collections/` (201) creates a collection whose physical name is prefixed with the workroom id (`ws_{workroom_id}_{name}`), with a declared embedding dimension and optional target vector store. Creation, listing, and deletion are permission-gated (context write for manage, read for search) and reserved internal collection names are fenced off (404 on read, 400 on write).
- **Search is semantic, filtered, and source-attributed.** `POST /context/search` queries one collection or all of the workroom's collections with top-k control, score thresholds, and validated metadata filters. Results carry content, score, and chunk metadata — source file, source URN, page number, chunk index, media type — so a hit is traceable to where it came from. Retrieval can run vector-only, lexical-only, or hybrid, with each result stamped with what retrieved it.
- **A unified search path enriches progressively.** The unified request adds LLM-ready context formatting, answer synthesis with bracketed citations returned as structured citation and source lists, bounded agentic refinement (capped iterations), and optional knowledge-graph enrichment — all on the same workroom-scoped substrate.
- **Managed vector stores are platform-operated.** The SDK creates and scales vector stores (`create_vectordb`, with replica count and workroom scoping), inserts vectors with metadata, and runs raw vector queries — the mechanism beneath collections for callers that bring their own embeddings. Milvus and Vespa are the supported engines at the pinned revision; hybrid lexical support rides on Postgres tsvector or SQLite FTS5.

## What this answers in customer terms

This capability is the platform's answer to "can our analysts put document repositories in and search them by meaning?" — semantic search across document collections, scoped to the team space that owns them, with every result traceable to its source file and page. It is the retrieval substrate a customer's "search across our documents" and "ground answers in our own material" asks resolve to; the natural-language conversation over it is `kaizen.data-chat`, and source-side bulk retrieval is `retrieval.async-retrieval-jobs`.

## Conditions and limits

- Media-heavy extraction (images, audio, video) rides on the OmniParse path documented separately as `ingestion.multimedia-extraction`; this capability's upload claim is the pipeline contract, not any specific parser's coverage.
- Answer synthesis in the unified path depends on a reachable LLM; the substrate claims here — upload, collections, semantic search with source metadata — stand without one.
- Hybrid search's engine support is uneven at the pinned revision (the hybrid request schema is marked Vespa-only); the portable claim is vector search with lexical fallback providers.
- The product docs tree has no page covering the context service — collections, upload pipeline, or search — a recorded docs-gap finding. The SDK-versioned reference docs do carry a Context Service page, so the gap is in the product docs, not the SDK reference.

## How this is exercised

The planned SDK arm exercises the substrate end to end through the typed `ContextService`: create a collection, upload known documents and poll the pipeline job to `completed`, run semantic search and assert ranked hits carry the expected source metadata, and confirm a second workroom sees none of it — emitting `scenario-evidence.v2` records naming this capability. The journey corpus's `kaizen-context/J02` (document pipeline to searchable collection) and `J04/SC-01` (ingested jobs stay in their workroom) are the authored scenarios those assertions align with.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The journey references above are authored pointers; no run this cycle has produced records from them.
- The unified path's synthesis-with-citations is where the corpus's "answer with citations" behavior actually lives (`kaizen-context/J03/SC-02`); this document claims the search substrate including that structured citation output, while conversational citation behavior remains hedged in `kaizen.data-chat`, whose sources establish less.
- The workbooks never ask about vector databases — they ask about finding things — so managed vector stores are documented here as mechanism, per the inventory's granularity decision.
