# Local AI endpoint protection report

## Scope

The `/api/ai/process-video`, `/api/ai/process-source`, and `/api/ai/refresh-translation` routes perform local-only speech and language work. No route has a paid model call, cloud fallback, or provider credential.

## Current protections

- No model credential is accepted, stored, bridged to the renderer, or passed to the private child server.
- The packaged child server receives a strict environment allowlist containing only local runtime and media configuration.
- Requests are restricted to localhost origins and hosts.
- Media type and the 200 MB direct-upload ceiling are validated before local processing.
- A cooldown limits repeated direct analysis requests.
- Large-source processing allows only one active job and validates a UUID source identifier.
- Translation refresh accepts one bounded paragraph, validates the response schema, limits concurrent model calls, and is debounced in the editor. Project-wide word replacement sends affected paragraphs through one sequential queue.
- Stale translation responses are discarded when the source wording changes again.
- Local runtime failures are mapped to creator-safe messages without exposing paths or transcript contents.

## Timing contract

whisper.cpp returns bounded word text, start, and end values. Subtitle animation consumes those timestamps locally; scrubbing and playback create no model calls. Qwen3 receives exact timed wording and may return translation and review suggestions, but it never owns the canonical Arabic words or timing.

## Risks and follow-ups

- **Safe now:** the app is local-only, accepts no paid-provider secret, and sends no transcript or audio to a cloud model.
- **Safe now:** Finder launches no longer depend on secret-bearing shell environment inheritance.
- **Medium:** word-timestamp transcription and local language review can be slow on long media. Persist resumable job checkpoints before public release.
- **High if deployed remotely:** add authentication, durable per-user limits, isolation, and explicit data-governance review before exposing any processing route.

## Safe implementation order

1. Preserve local-origin, media-size, and concurrency guards.
2. Validate local word timing before any editor result appears.
3. Keep exact transcript words separate from language-review output.
4. Verify malformed and missing timing data fails honestly.
5. Add durable auth, quotas, isolation, and usage logging before any remote deployment.

## Transcript wording edits

Arabic word edits and deletions update the transcript immediately, then queue a local English refresh. A project-wide normalized replacement refreshes only paragraphs whose source words changed, one request at a time. The existing English subtitle remains visible while each request runs. Only a validated response replaces it; errors preserve the previous subtitle and expose a retry action. Undo restores the earlier transcript and matching translation snapshot without another local model request.
