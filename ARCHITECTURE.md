# Architecture

## Product boundary

Descriptor is a single-user macOS-local application delivered either through a development browser or a packaged Electron desktop host. It has no auth, public hosting, multi-tenancy, payments, collaboration, or analytics surface.

## Layers

1. **Editor UI:** Next.js App Router and React. Zustand owns transient editor state. The immutable primary source and independently imported video/audio/image clips use native browser media elements for synchronized preview.
2. **Local API boundary:** localhost-only Next.js route handlers validate inputs with Zod. Provider credentials and process execution never enter client bundles.
3. **Media services:** FFprobe inspects source metadata. FFmpeg will create proxy, waveform, audio, and final concat/render inputs. Original source bytes are immutable.
4. **Local language service:** task-owned server adapters separate audio transcription from text review. whisper.cpp produces exact local word timing from a user-installed executable and model. Qwen3 runs through a localhost-only Ollama adapter for English subtitles and cleanup suggestions. Every output is schema-validated and remains reviewable before it affects the project.
5. **Persistence:** project and edit-decision schemas are designed for SQLite/local storage. The first UI milestone persists safe editor preferences in browser storage; source paths and transcripts move to SQLite with the processing pipeline.
6. **Export:** approved keep-ranges are mapped from edited time back to source time, concatenated from the original source, then composed with subtitles at exact source width, height, orientation, and frame rate.
7. **Desktop host:** Electron starts the traced Next.js standalone server as a private child process on a random `127.0.0.1` port, presents it in a sandboxed renderer with Node integration disabled, and terminates the server process group on quit. Packaged writable data is redirected to macOS Application Support rather than the signed/read-only bundle.

## Non-destructive edit model

The source timeline never changes. Transcript words and issues reference source `start` and `end` seconds. Removal creates an edit decision. A derived keep-range map drives cleaned preview time, subtitle remapping, and export. Undo changes decisions, never source media.

Secondary media is modeled separately from the transcript-led source as stable clip IDs with a project start and source in/out points. Move, trim, split, import, and delete operations snapshot that clip array into the same Undo/Redo history as transcript edits. Browser object URLs are the current local-preview transport; SQLite-backed source IDs and native export composition for secondary media remain Milestone 4 work.

```text
immutable source media
  -> word-aligned transcript
  -> reviewed issue decisions
  -> keep/remove time-range map
  -> cleaned preview proxy
  -> native-resolution final render
```

## Security and privacy

- Reject non-local request origins for privileged routes.
- Validate media MIME type, extension, size, generated filename, and resolved destination path.
- Never accept arbitrary filesystem paths from the client.
- Never log full transcripts, API keys, or sensitive source paths.
- Rate-limit and size-limit AI calls even on localhost to prevent accidental loops.
- Keep model selection server-owned.
- Bind Ollama to `127.0.0.1` and reject any configured local-model URL that is not loopback HTTP.
- Keep Ollama bound to loopback and keep model blobs on storage controlled by the user; no transcript text is sent to a remote provider in the default configuration.

## Failure behavior

Long media and AI work must become resumable jobs with `queued`, `processing`, `needs-review`, `complete`, `failed`, and `cancelled` states. Jobs use idempotency keys and bounded retries. Failed work never deletes the source or approved edit decisions.

## Current live AI route

`POST /api/ai/process-video` is localhost-only, validates media type and a 200 MB direct-upload limit, applies a cooldown, writes a private temporary input, creates 16 kHz mono audio with FFmpeg, and runs local whisper.cpp for timed Arabic words. Exact words are grouped deterministically before Qwen3 returns only English subtitles and review suggestions. Temporary audio and transcript JSON are removed after every success or failure. Larger native 4K sources use the immutable stored-source route without loading the file into browser-memory multipart processing.

`POST /api/ai/refresh-translation` is also localhost-only and concurrency-limited. It sends only the edited paragraph and previous English subtitle to `qwen3:8b-q4_K_M` at `127.0.0.1:11434`, disables reasoning output, requests a strict JSON schema, applies a bounded timeout, validates the response with Zod, and preserves the previous subtitle on failure. No cloud translation fallback exists.
