# Engineering Skills Application Report

## Scope

The project combines browser media UI, local FFmpeg processing, paid AI calls, local persistence, and source-frame-rate 4K export.

| Area | Current risk | Quick win | Deeper improvement | Likely files | Order | Risk |
|---|---|---|---|---|---|---|
| AI request boundary | Key or model control could leak to client | Server-only adapter, Zod input, localhost guard, payload cap | Usage ledger, idempotency, semantic cache | `src/app/api/ai/*`, `src/lib/server/*` | 1 | High |
| Source media safety | User filename/path could escape storage or source could be overwritten | Generated IDs, allowlist, immutable source directory | Hash verification and atomic job manifests | `src/app/api/media/*`, `data/` | 1 | High |
| Heavy processing | FFmpeg and transcription can exceed request lifetimes | Explicit job states and bounded concurrency | Durable worker with resumable stages | `src/lib/server/jobs/*` | 2 | High |
| Edit consistency | Transcript deletion can desync subtitles | One source-time edit-decision model | Property-based range-map tests | `src/lib/editor/*` | 1 | High |
| Local persistence | Browser-only state can be lost | Versioned schemas and autosave | SQLite migrations and backups | `src/lib/server/db/*` | 2 | Medium |
| Secrets | Static local API key can leak through logs or Git | `.env.local`, Git ignore, redacted errors | Rotation and revocation runbook | `.env.example`, `README.md` | 1 | High |
| Production layers | Prototype may appear complete before media/AI/export are verified | Explicit milestone/task gates | Smoke tests and recovery playbook | `TASKS.md`, `docs/` | Continuous | Medium |
| Packaged media tooling | The packaged Next.js server externalizes FFmpeg/FFprobe through build-generated module aliases that are absent from the Electron bundle, so source import can fail before returning `sourceId` | Resolve packaged executable paths through explicit server environment variables and remove runtime package imports | Add a packaged API smoke test that imports and probes a real fixture after every desktop build | `src/lib/server/ffmpeg.ts`, `desktop/main.cjs`, `next.config.ts`, `script/build_and_run.sh` | 1 | High |
| Source-storage recovery | A failed immutable upload is reduced to a temporary toast while Export continues to show a permanent pending state | Model storing, stored, and failed states; preserve the open video and expose an idempotent retry | Resumable source import with byte progress and restart recovery | `src/components/editor/editor-app.tsx`, `src/store/editor-store.ts` | 2 | Medium |
| Export revisit and re-render | A successful job replaces the export action, making the finished result look terminal and hiding whether later edits are included | Preserve the completed job across tool changes, compare the live export specification with the submitted specification, and offer a guarded explicit new render | Persist a small project export history with expiry and storage visibility | `src/components/editor/editor-app.tsx`, `src/lib/editor/export-idempotency.ts`, `src/lib/server/export-jobs.ts` | 2 | Medium |

## Safe implementation order

1. Non-destructive edit schemas and server-only safety boundaries.
2. Interactive editor using deterministic sample data and real local playback.
3. Immutable import and FFprobe inspection.
4. Packaged-app import/probe smoke verification and actionable source-storage recovery.
5. SQLite and resumable media jobs.
6. AI transcription/analysis with human review.
7. Oriented 4K export, source-integrity, completed-file dimension tests, and repeat-render/idempotency checks.
