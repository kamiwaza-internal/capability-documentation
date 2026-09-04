---
capability_schema: capability.v1
id: ingestion.multimedia-extraction
title: Extract text and transcripts from images, audio, and video during ingestion
tier: internal
persona:
  - Analyst
surface:
  - UI
  - API
evidence_plan: ui
requires:
  - context.workroom-document-search
preconditions:
  omniparse_reachable: OmniParse is the parsing and transcription extension; it runs as its own service (a workroom-scoped instance is lazily provisioned when the platform manages it locally, or an operator points the context service at a deployed endpoint). The audio-readiness probe exists precisely because it can be absent, unreachable, or unconfigured.
  extraction_config: The pipeline routes a file through OmniParse only when the extraction configuration enables it (`use_omniparse`); the context service's connector-import bridge sets this per batch.
evidence:
  - kaizen-context/J02/SC-03
not_supported:
  - Face extraction, object extraction, and satellite change detection. The workbook's IMINT/VIDEX steps demanding them have no implementation source; the inventory records them as findings rather than mapping them onto this parsing pipeline, and this document claims none of them.
  - Video understanding beyond the audio track. The supported video containers (`.mov`, `.mp4`, `.webm`) are transcribed from their audio track; no frame-level video analysis is claimed.
---

# Extract text and transcripts from images, audio, and video during ingestion

Media-heavy files are parsed on the way in: the context service routes image, audio, and video inputs through the OmniParse extension for OCR-and-vision-oriented extraction and transcription, so a scanned page or a recording lands in the same searchable substrate as a text document. An audio-readiness probe tells a workroom — before anyone uploads — whether transcription is actually available, with a remediation-carrying answer when it is not.

## What this capability guarantees

- **The supported-type surface is explicit.** The context service's OmniParse type list covers documents (`.pdf`, `.docx`, `.md`, `.txt`), images (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`), twelve audio formats (including `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.opus`), and audio-bearing video containers (`.mov`, `.mp4`, `.webm`). The built-in extractors handle only the four text-document types — everything image, audio, and video is OmniParse-only, which is what makes the extension's presence the load-bearing precondition.
- **Routing is configuration-honest, not magical.** The pipeline worker sends a file to OmniParse when the extraction configuration enables it (`use_omniparse`) and the extension supports the type; the context service's connector-import bridge sets that configuration per ingest batch. The OmniParse endpoint is operator-configurable, and when the platform manages OmniParse locally, a workroom-scoped instance is provisioned lazily by the runtime rather than by reads.
- **Audio readiness is answerable before upload.** `GET /context/audio-readiness` (workroom-scoped, read-gated) reports whether transcription would work — for the workroom generally or for a specific file by MIME type or name — as `ready` plus a typed code, message, and remediation. The failure vocabulary distinguishes OmniParse unreachable, transcription unconfigured, unreachable, auth failure, TLS failure, and unsupported audio MIME. A read never provisions anything; the probe result is briefly cached for inline preflight during uploads.
- **The operational limits are documented numbers.** The service guide states the shipped bounds: 100 MB decoded file size, 200 MB streaming upload, 300-second parse timeout, and a non-strict mode in which OmniParse failure falls back rather than failing the pipeline.

## What this answers in customer terms

This capability is the platform's answer to "can Kamiwaza read our images and recordings?" — scanned and photographed documents are OCR-processed, meeting and broadcast recordings are transcribed, and both become searchable alongside ordinary documents in the workroom's collections. The boundary matters in the same breath: this is a parsing pipeline for text and transcripts, and the fuller multimedia-intelligence suite the workbooks describe (faces, objects, change detection) is recorded negative space, not a smaller version of this claim.

## Conditions and limits

- The service guide claims OCR- and vision-oriented extraction and audio/video transcription; it names no specific OCR or transcription engines and makes no language-detection claim. Engine names appear only as platform configuration defaults, so this document does not claim them as product behavior.
- Extraction quality and modality coverage are OmniParse's; this document claims the routing, readiness, and limit contract the platform sources establish, and `context.workroom-document-search` claims what happens to the extracted text afterward.
- OmniParse failure behavior depends on strictness: the guide documents non-strict fallback, so a media file in a non-strict pipeline can complete without its media extraction rather than failing loudly.

## How this is exercised

The planned UI arm uploads representative media — a scanned image, an audio recording, an audio-bearing video — into a workroom collection, watches the pipeline jobs complete, and asserts the extracted text and transcripts are searchable, with the audio-readiness probe checked first so an unready environment is distinguished from a failed extraction — emitting `scenario-evidence.v2` records naming this capability. The journey corpus's `kaizen-context/J02/SC-03` (process supported modalities) is the authored scenario those assertions align with.

## Coverage notes

- **No evidence record names this capability yet**, so the kit computes it `intended` — documented, not validated — until its planned `ui` evidence arm runs.
- The journey reference above is an authored pointer; no run this cycle has produced records from it.
- The inventory's summary phrase "rich extraction" is carried here at the guide's own altitude (OCR-and-vision-oriented extraction); anything richer — layout understanding, language detection, engine-specific behavior — is unestablished by the pinned sources and deliberately unclaimed.
