# Large Media Jobs and Backpressure Report

## Current risk

The direct multipart AI route holds a complete upload in a request and caps it at 200 MB. Native 4K MOV files can be many gigabytes, exceed memory/request limits, and cause duplicate paid work when retried.

## Safe change

| Area | Quick win | Deeper improvement | Files | Risk |
|---|---|---|---|---|
| Source import | Stream bytes directly into an immutable generated path | Disk-space reservation and resumable chunk upload | `api/media/import`, `lib/server/media-store` | High |
| AI input | Extract mono transcription audio with FFmpeg | Chunk very long audio with checkpointing | `lib/server/media-jobs` | High |
| Request lifetime | Return a job ID immediately and poll state | Dedicated recoverable worker process | `api/jobs/analyze`, `api/jobs/[id]` | High |
| Duplicate work | One active job per source ID | Content-hash idempotency across restarts | job manifest | Medium |
| Backpressure | One local processing job at a time | Configurable queue and disk thresholds | job runner | Medium |
| Original safety | Store source read-only; never pass client paths | SHA-256 integrity verification before export | source manifest | High |
| Packaged runtime | Runtime package aliases can disappear during Electron packaging and leave uploads permanently pending | Pass explicit packaged FFmpeg/FFprobe executable paths to the private server and smoke-test the packaged import route | Signed helper-tool inventory with startup health check | `desktop/main.cjs`, `lib/server/ffmpeg`, desktop build script | High |
| Import failure UI | A rejected upload currently leaves only a disappearing toast and a disabled Export action | Persist a failed state with Retry while preserving the open local preview | Resumable import with durable job status | editor source-storage state | Medium |

## Implementation order

1. Stream immutable source import with generated IDs and size/type validation.
2. Persist job manifests and reject duplicate active jobs.
3. Extract a compact audio derivative with FFmpeg.
4. Run the existing validated AI pipeline on the derivative.
5. Poll status from the editor and apply results only after success.
6. Add restart recovery and resumable chunk upload before multi-hour footage testing.
