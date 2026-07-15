# Descriptor project specification

Version: 0.1.0 public alpha
Specification date: 2026-07-15

## 1. Product definition

Descriptor is a single-user, local-first macOS video editor organized around the spoken transcript. It serves Arabic creators who mix Arabic and English and need speech-synchronized captions, fast cleanup, visual timeline editing, color treatment, and native-resolution local export without making cloud upload the default.

## 2. Product principles

1. **Local by default:** media, transcript, local AI, decisions, and exports remain on the user's machine.
2. **Immutable source:** original media is never edited in place.
3. **Speech is canonical:** transcript words and timestamps are the source of caption truth.
4. **Human control:** AI findings are suggestions; destructive-looking actions are reviewable and undoable.
5. **Honest state:** processing, empty, failed, retry, and unsupported states must reflect real work.
6. **One edit model:** transcript deletion, timeline removal, cleaned duration, preview, and export share source-time keep/remove ranges.
7. **Presentation cannot rewrite content:** caption templates and typography may not change words or speech timing.

## 3. Users and primary workflows

### Target user

An Arabic or bilingual creator editing a talking-head, tutorial, product, or short/long-form social video on a Mac.

### Primary workflow

1. Import a local source video.
2. Store an immutable local copy and inspect available media metadata.
3. Extract 16 kHz mono audio and transcribe it locally into exact words and timestamps.
4. Group words into readable transcript paragraphs and speech-aligned caption pages.
5. Review local AI translation and cleanup suggestions.
6. Correct words; optionally replace matching occurrences project-wide.
7. Remove transcript ranges, split/trim/delete source clips, or add external timeline media, with Undo/Redo.
8. Choose caption styling and color grade/LUT settings.
9. Preview synchronized video, audio, transcript, captions, and playhead.
10. Export from the immutable source using approved keep ranges.

## 4. Functional specification

### Source import

- Primary source MIME types: `video/mp4`, `video/quicktime`, `video/x-m4v`, and `video/webm`.
- Default stored-source limit: 20 GiB, configurable with `MAX_UPLOAD_BYTES`.
- Direct multipart analysis limit: 200 MiB; larger inputs use streamed immutable source storage.
- Stored source names are generated UUIDs, bytes are SHA-256 hashed, file permissions are restricted, and source copies are made read-only after import.

### Speech and transcript

- whisper.cpp produces canonical timed Arabic/mixed-language words.
- Real transcript content appears only after real analysis; sample/dummy words are not presented as processed results.
- Qwen/Ollama adds English translation, emphasized translation words, and bounded cleanup suggestions.
- Issue types: filler, false start, repetition, wording, and silence.
- Correction supports one word or matching normalized occurrences across the project while retaining each occurrence's existing time.
- Deleting transcript content creates an undoable removal decision for the corresponding source interval.

### Captions

- Caption text and timing stay tied to canonical transcript words.
- Runtime pagination adapts to typography with no more than two visible lines.
- Templates include karaoke, typewriter, highlight, outline, one/two-word, classic, impact, minimal, creator build, and creator outline treatments.
- Style properties include family, size, line height, weight, italic, foreground/background/highlight colors, stroke, rounded highlight treatment, position, animation, and text shadow controls.
- Current-word highlighting changes style without changing glyph size, avoiding slow layout movement.
- Scrub, playback, gap clearing, preview, and burned export must share speech-aligned caption events.

### Timeline and media

- Primary source lane, external media lane, audio waveform lane, and caption lane.
- Source and imported clips use stable IDs.
- Supported external preview imports: browser-supported `video/*`, `audio/*`, PNG, JPEG, WebP, and GIF.
- Operations: select, move, trim, split, delete with Backspace/Delete, context-menu delete, horizontal scroll, zoom, Fit, and Undo/Redo.
- Selection is clip-contained; lanes are visually separate; playhead shows a live time badge.
- Real source thumbnails and real waveform endpoints exist; generation/recovery work remains tracked in the roadmap.

### Color grading

- Non-destructive exposure, contrast, saturation, temperature, tint, highlights, shadows, fade, vignette, and LUT strength controls.
- Custom 3D `.cube` LUTs only; maximum 5 MiB and grid size 2–65.
- WebGL preview and FFmpeg export use the same normalized grade intent.
- HDR/BT.2020 export is rejected in the current milestone; users must convert to SDR Rec.709.

### Export

- Formats: MP4/H.264 and MOV/HEVC.
- Output canvas: 3840×2160 landscape or 2160×3840 portrait/square, containing the source without stretching.
- Export jobs expose queued, processing, succeeded, failed, and cancelled states with progress and retry-safe errors.
- Captions may be burned from speech-aligned events.
- Export maps edited time back to immutable source keep ranges.
- Current limitation: export is blocked when external overlay/audio/image clips are present because native secondary-media composition is not complete.

## 5. Interaction specification

- Native-feeling three-pane desktop shell: project/transcript navigation, central viewer, contained inspector, and bottom timeline.
- Reddish/terracotta accent system governed by `DESIGN.md`; blue is reserved only for intentional media/state semantics documented there.
- No success toast for simple selection changes.
- Selection, ranges, dropdowns, progress, and inspector controls use product-owned accessible components.
- Undo/Redo covers transcript edits, removal decisions, clip move/trim/split/delete, caption style changes, and color-grade changes where implemented.
- Keyboard deletion must not fire while typing in an input or editable transcript word.
- Reduced-motion preferences disable non-essential transitions without breaking timing feedback.

## 6. Technical specification

| Layer | Technology and boundary |
| --- | --- |
| UI | Next.js App Router, React 19, TypeScript, CSS, Lucide icons |
| State | Zustand transient editor state and bounded Undo/Redo snapshots |
| Validation | Zod at local API and model-output boundaries |
| Media | Native media elements, FFmpeg, FFprobe, WebGL 3D LUT preview |
| Speech | whisper.cpp local child process |
| Language | Ollama loopback `/api/chat`, Qwen3 8B default, strict JSON schema |
| Desktop | Electron sandboxed renderer plus private Next.js server on random loopback port |
| Storage | Local generated source/work directories; SQLite project persistence is planned |
| Tests | Node test runner, TypeScript typecheck, ESLint, Next production build |

Local route families:

- `POST /api/media/import` — stream and store immutable primary source.
- `POST /api/ai/process-video` — direct small-file analysis.
- `POST /api/ai/process-source` — analyze an already stored source with progress events.
- `POST /api/ai/refresh-translation` — refresh one edited paragraph's English translation.
- `POST /api/media/luts` — validate and store a 3D LUT.
- `POST /api/exports` — create an idempotent export job.
- `GET|DELETE /api/exports/:id` — poll or cancel an export.
- `GET /api/exports/:id/file` — download a completed local export.
- Source metadata, thumbnail, waveform, and media-serving routes use generated source IDs rather than arbitrary client paths.

## 7. Security and privacy requirements

- Privileged routes reject non-local origins/hosts.
- Ollama must be loopback HTTP; arbitrary remote base URLs are rejected.
- Client requests cannot supply executable paths or arbitrary filesystem paths.
- Environment files, local data, media, logs, and model weights are excluded from Git.
- Full transcripts, secret values, and sensitive source paths must not be logged.
- Uploaded names are reduced to safe basenames; generated IDs own stored paths.
- Temporary audio and transcript artifacts are removed after analysis success or failure.
- The renderer uses sandboxing, context isolation, disabled Node integration, and denied permission requests.

## 8. Data locations and compatibility

| Context | Location |
| --- | --- |
| Development source/work data | Repository `data/` (Git-ignored) |
| Packaged macOS data | `~/Library/Application Support/Descripter/data` |
| Packaged default Whisper model | `~/Library/Application Support/Descripter/models/ggml-large-v3.bin` |
| User preferences currently safe for browser persistence | Browser local storage |

The public product name and npm package are `Descriptor`/`descriptor`. The bundle ID `com.alhasan.descripter`, environment compatibility alias, and legacy Application Support directory intentionally retain the earlier spelling to avoid orphaning existing local data.

## 9. Non-functional requirements

- Playback uses the native media clock and animation-frame updates for smooth playhead/highlight movement.
- Long work is bounded by concurrency and timeouts and must move toward resumable, cancellable jobs.
- All destructive-looking operations are reversible until export and never mutate original media.
- Components must remain usable at the minimum desktop window and responsive review layout defined in `DESIGN.md`.
- Public changes must pass typecheck, lint, tests, build, dependency audit, and a browser smoke test proportionate to the change.
- Accessibility: keyboard-operable controls, visible focus, semantic labels, sufficient contrast, reduced motion, and no color-only critical status.

## 10. Explicit non-goals for 0.1

- Accounts, cloud project storage, collaboration, payments, analytics, or public sharing.
- Automatic cloud-AI fallback.
- Mobile application or browser-hosted multi-user service.
- Destructive source-file editing.
- Claiming broadcast-grade color management or full NLE parity.
- Shipping third-party AI model weights in the repository.

## 11. Known gaps and release gates

- SQLite project persistence and crash recovery are incomplete.
- Native thumbnail/proxy/waveform generation and recovery need broader long-media testing.
- Resumable analysis jobs and disk-space reservation are incomplete.
- Secondary timeline media is not composed into final export.
- Signed/notarized release packaging, clean-Mac installation testing, and final FFmpeg distribution compliance are incomplete.
- Short and long 4K portrait fixtures, dialect/code-switch fixtures, source-hash verification, caption drift measurement, and export A/V validation are required before a stable release.

The operational roadmap in [`TASKS.md`](../TASKS.md) is authoritative for completion status. The visual and interaction contract in [`DESIGN.md`](../DESIGN.md) is authoritative for UI behavior.
