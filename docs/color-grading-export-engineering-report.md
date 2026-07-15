# Color Grading and Export Engineering Report

## Scope and platform fit

Descriptor is a single-user, localhost-only macOS editor. Color preview is interactive browser work; source-frame-rate 4K rendering is a long-running local media job. The safe boundary is therefore a WebGL2 preview in the client and a persistent-process FFmpeg worker owned by the local Next.js server. Export must never remain inside the create-job request.

| Area | Current risk | Quick win in this milestone | Deeper improvement | Likely files | Safe order | Risk |
|---|---|---|---|---|---|---|
| Grade state | UI-only values can drift from export values | One typed `ColorGradeSettings` contract, shared presets, one deterministic transform | Versioned project persistence and grade migrations | `src/lib/editor/color-grade.ts`, `src/store/editor-store.ts` | 1 | Medium |
| Source color | Browser metadata cannot identify HDR or color tags | Probe the immutable source with configured/system `ffprobe`; block PQ, HLG, and BT.2020 grading/export | Color-managed proxy generation and camera-Log input transforms | `src/lib/server/ffmpeg.ts`, `src/app/api/media/import/route.ts` | 1 | High |
| LUT input | Malformed or hostile tables can consume memory or change the active look | 5 MB limit, generated IDs, strict one-table 3D parser, finite values, grid `2...65`, atomic storage | Signed LUT catalog and project-level garbage collection | `src/lib/editor/cube-lut.ts`, `src/lib/server/lut-store.ts`, `src/app/api/media/luts/route.ts` | 2 | High |
| Live preview | CPU pixel transforms can stall playback and disagree with export | Web Worker creates deterministic 33-cube; WebGL2 3D texture renders the video; original playback remains usable on failure | Worker pool and measured GPU fallbacks | `src/workers/color-lut-worker.ts`, `src/components/editor/graded-video.tsx` | 3 | Medium |
| Export request | FFmpeg can outlive an HTTP request and double-clicks can duplicate work | Return an idempotent job immediately; one local active worker; durable JSON job state | Separate launchd-managed worker and restart-safe queue | `src/lib/server/export-jobs.ts`, `src/app/api/exports/*` | 4 | High |
| Partial output | Cancel, disk failure, or encoder failure can leave corrupt deliverables | Render to a temporary file, remove partials, atomically promote success, retry hardware encoder once in software | Disk reservation and checksum verification | `src/lib/server/export-jobs.ts` | 4 | High |
| Progress and recovery | Invented estimates or lost state undermine trust | Parse `ffmpeg -progress`, persist factual stage/progress, expose cancel/retry/save states | Native notifications and persisted resume metadata | `src/app/api/exports/*`, `src/components/editor/editor-app.tsx` | 5 | Medium |
| Completed-job reuse | A successful render currently becomes a terminal UI state, so creators cannot deliberately render the same edit again or clearly see when later edits need a new render | Keep the completed result available across tool navigation, fingerprint the submitted edit, and separate `Export again` from `Render updated video` | Persist completed-job history per project with named versions and storage controls | `src/components/editor/editor-app.tsx`, `src/lib/editor/export-idempotency.ts`, `src/lib/server/export-jobs.ts` | 5 | Medium |
| Overlay boundary | Existing external clips are not represented in the render graph | Disable export and name the removal requirement | Full multi-track compositor | editor export panel | 5 | High |

## Async job and idempotency boundary

- `POST /api/exports` validates a bounded render specification and computes a server-owned hash from immutable source ID, normalized keep ranges, color settings, LUT ID, caption payload, and format.
- An identical active or successful request returns the existing job. At most one local export process runs at once; additional unique jobs remain queued.
- An explicit creator-requested re-render includes a fresh render-attempt ID so it creates a new job even when the edit is identical. The client still guards the submission boundary, and ordinary retries or accidental double clicks omit that ID and remain idempotent.
- Job states are `queued`, `processing`, `succeeded`, `failed`, and `cancelled`. The worker writes the current stage, progress fraction, timestamps, safe error text, and output metadata to a job manifest.
- `DELETE /api/exports/{id}` cancels queued work or sends a termination signal to the active FFmpeg process. Cancellation and failure remove temporary output.
- Successful internal output remains available for 24 hours. Cleanup never deletes immutable source media, a user LUT, or editor decisions.
- Stale `processing` jobs found after a server restart become `failed` with a retryable interruption message. A dedicated durable worker is the graduation point if this editor becomes multi-user or remotely hosted.

## Failure behavior

- Missing WebGL2: original playback stays available, the Color panel explains that live grade preview is unavailable, and server export remains enabled when FFmpeg is usable.
- Missing `ffprobe`: source import succeeds, but color classification and export stay disabled with a recovery message.
- PQ, HLG, or BT.2020: transcript editing remains available; grading controls and export are blocked without changing media.
- Untagged SDR: clearly report `Rec.709 assumed` and allow grading/export.
- Invalid LUT: retain the currently selected look and surface the parser reason.
- Missing FFmpeg or both encoder attempts fail: preserve the edit and source, mark the job failed, and expose Retry.
- Cancellation, disk write failure, or interruption: remove partial output and leave the job recoverable.

## Verification gates

1. Unit checks for ranges, presets, identity transform, deterministic LUT output, parser rejection, and idempotency.
2. Typecheck, lint, and production build.
3. API smoke checks for LUT upload, duplicate export creation, status, cancellation, and file headers.
4. A real short-video MP4 export plus sampled preview/export frame comparison.
5. Browser checks for every control family, Before release behavior, error/disabled states, progress, keyboard focus, and reduced motion.
6. A source-resolution fixture must verify that the completed vertical file is exactly `2160×3840` and the completed landscape file is exactly `3840×2160`.
