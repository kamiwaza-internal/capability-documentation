---
capability_schema: capability.v1
id: ingestion.scheduled-ingest
title: Run and schedule ingestion jobs against connected sources
tier: internal
persona:
  - Analyst
  - Operator
surface:
  - API
  - SDK
evidence_plan: sdk
preconditions:
  ingestion_authority: When ReBAC is enabled, the ingestion endpoints require membership (owner, editor, or member) in the ingestion-admins group; global admins pass. Per-connector triggering requires manage permission on the connector.
  workroom_context: The request's workroom must match the requester's workroom context; a mismatch answers 400.
evidence:
  - data-connectors/J05/SC-05
  - data-connectors/J05/SC-06
not_supported:
  - Unattended execution of registered schedules. `POST /ingestion/ingest/jobs` accepts and stores a job with a cron expression, but at the pinned revision no scheduler component executes stored jobs — the cron string is never parsed, the scheduler module in the tree is a test stub the service does not import, and jobs are held in memory, so they are also lost on restart. Scheduling is an API contract without an execution engine this cycle.
  - Event-triggered ingestion and ingest alerting. The workbook's file-watch/SharePoint-trigger variant and its notification dashboard have no implementation source; the inventory records them as demand without supply.
---

# Run and schedule ingestion jobs against connected sources

Ingestion runs on demand: a registered source type is ingested immediately through one call, a DDE connector's ingest is triggered per connector, and the results land as catalog datasets owned by the requester. A job-registration API with cron syntax and pollable status exists alongside — but read the `not_supported` entry before claiming schedules: at the pinned revision registered jobs are stored, not executed.

## What this capability guarantees

- **Run-now ingestion is one authorized call.** `POST /ingestion/ingest/run` runs a registered source plugin synchronously with the supplied connection arguments and responds with the URNs of the datasets it created. The registered plugins at the pinned revision are S3, Postgres, Slack, Hive, Kafka, and file. Unknown plugins and argument errors answer 400, cross-workroom catalog writes 409, and source connection or ingestion failures 500.
- **What ingestion creates, the requester owns.** When ReBAC is enabled, a successful run grants the requester the ReBAC owner relation on every created dataset URN, rolling the grants back if any of them fails, so ingested data enters the governed catalog attributed to who brought it in.
- **Job registration and status are pollable.** `POST /ingestion/ingest/jobs` registers a job — id, cron schedule expression, source type, connection arguments — and `GET /ingestion/ingest/status/{job_id}` reports it with a documented vocabulary (`pending`, `running`, `success`, `failed`) plus last run, error count, and created URNs; an unknown job answers 404. The execution caveat in `not_supported` applies: registration and status are real, firing is not.
- **Per-connector triggering is first-class.** `POST /dde/connectors/{connector_id}/trigger_ingest` triggers ingest for a DDE data-source connector, gated on manage permission for that connector; an unknown connector answers 404 and an undecryptable configuration 400. The response says `queued`, but execution is synchronous inline at the pinned revision — the call returns when the seed-document indexing and connector worker have run.
- **The SDK wraps the surface typed.** `run_active` runs a source immediately, `schedule_job` registers a job, and `get_job_status` polls it — the same three calls, with typed request and response models.

## What this answers in customer terms

This capability is the platform's grounded answer to "can we pull data in from our enterprise stores — object storage, relational databases, Slack, Hive, Kafka, files — as a governed operation the platform owns?" On-demand ingestion into the governed catalog is established, including per-connector triggering under per-connector permissions. The larger customer phrase this area attracts — "automated, scheduled data ingestion" — is exactly what the honest boundary cuts through: the scheduling API accepts cron schedules today, and nothing executes them at the pinned revision, so an RFI row about unattended recurring ingestion should cite the `not_supported` entry, not this paragraph.

## Conditions and limits

- "Active source" means an immediate pull-mode run of a registered plugin with the supplied connection arguments — not a source flagged active in a database.
- The eligibility check the journey corpus expects for triggering (`J05/SC-06`, decline when the connector is not eligible) is narrower in code: the trigger path checks existence, permission, and decryptable configuration, but does not consult the connector's enabled flag at the pinned revision.
- The docs page's ingestion-service section lists the three endpoints and describes scheduling a connector run with cron syntax, and elsewhere offers one-time or recurring runs; the recurring half is not supported by the code path this document is grounded in. The same page's DDE connector paths are stale (`/api/ingestion/api/dde/...` versus the shipped `/api/dde/...`). Where docs and code disagree, this document follows the code.
- DDE connector management itself (create, list, update, disable, security metadata) is adjacent surface exercised by the `data-connectors/J05` journey; this capability claims the run-and-trigger slice.

## How this is exercised

The planned SDK arm exercises what actually executes: `run_active` against a known small source and assert the returned dataset URNs exist in the catalog with the requester as owner; `schedule_job` and `get_job_status` to characterize the registration contract as it stands (job stored, status `pending`); and the DDE trigger over REST where the environment carries a connector — emitting `scenario-evidence.v2` records naming this capability. An arm that asserted a cron job actually fires would fail at the pinned revision; the plan deliberately does not assert it.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `sdk` evidence arm runs.
- The journey references above are authored pointers to `data-connectors/J05` (trigger ingest for an eligible connector; decline when not eligible); no run this cycle has produced records from them, and SC-06's decline expectation is only partially satisfiable per the eligibility note above.
- **The scheduling half of the inventory summary did not survive source verification.** The inventory read the jobs API and scheduler directory as "scheduled as jobs with pollable status"; opening the refs shows storage without execution, which this document records as citable negative space rather than claiming through. The docs section the inventory cites carries the same overstatement.
- The ingestion SDK service has no generated SDK docs page — part of the broader recorded finding that the published SDK surface lags the shipped SDK.
