# Tasks

Updated: 2026-07-14

## Milestone 1 — Editor foundation

- [x] Create `DESIGN.md` from supplied editor references.
- [x] Define architecture, privacy boundary, and non-destructive edit model.
- [x] Scaffold strict Next.js, React, TypeScript 7, Zustand, and Zod project (TypeScript 6 retained only for ESLint compiler-API compatibility).
- [x] Implement desktop editor shell and responsive review mode.
- [x] Add working local file selection and browser playback.
- [x] Add synchronized transcript, issue review, undoable removal, and duration math.
- [x] Add subtitle templates and inspector controls.
- [x] Add timeline visualization and playback synchronization.
- [x] Add clip-contained source trimming plus external video/audio/image drop, move, trim, split, delete, preview, and Undo/Redo.
- [x] Verify build, typecheck, lint, and browser workflow.

## Milestone 2 — Local media pipeline

- [ ] Persist projects and edit decisions in SQLite.
- [x] Stream large imported media into an immutable local source store with generated IDs and SHA-256 integrity metadata.
- [ ] Inspect source with FFprobe and validate resolution/orientation/codecs.
- [ ] Generate poster, proxy, thumbnails, and waveform with FFmpeg.
- [x] Extract compact mono transcription audio for large sources and remove the temporary derivative after analysis.
- [ ] Add resumable processing jobs, cancellation, idempotency, and recovery.

## Milestone 3 — Arabic AI workflow

- [x] Add timestamped Arabic transcription with Arabic-English code-switching using diarized segments and derived word timing.
- [x] Add structured filler, false-start, repetition, retake, wording, and silence detection.
- [x] Add human review and confidence thresholds before edit application.
- [x] Add natural English translation and subtitle segmentation.
- [x] Run edited-paragraph Arabic-to-English translation locally with Qwen3 8B and external-drive model storage.
- [ ] Add vocabulary preservation and correction feedback.

Live API smoke test completed on 2026-07-13: server-side timed transcription, structured analysis, translation schema validation, and safe response mapping returned HTTP 200.

## Milestone 4 — Native 4K export

- [ ] Convert approved removals into source keep ranges.
- [ ] Render cleaned video/audio from original source, never proxy.
- [ ] Render animated subtitles at native source dimensions.
- [ ] Preserve source orientation, dimensions, aspect ratio, and frame rate.
- [ ] Add export progress, cancellation, validation, and history.

## Release gates

- [ ] Test with short and long 4K portrait MOV files.
- [ ] Test Arabic dialect and mixed Arabic-English terminology.
- [ ] Confirm original file hashes remain unchanged after edit/export.
- [ ] Compare cleaned output duration and subtitle timing to source decisions.
- [ ] Complete dependency/security audit and local recovery runbook.
