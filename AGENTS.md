# Contributor instructions for coding agents

These rules apply to AI coding tools and human contributors working in this repository.

## Read before changing code

1. Read `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/PROJECT_SPECIFICATION.md`, and the relevant source files.
2. Inspect `git status` and the current diff. Do not discard unrelated or user-authored work.
3. Follow `docs/GETTING_STARTED.md` and verify the baseline before diagnosing runtime behavior.
4. Use small, reviewable changes and add regression tests for bug fixes.

## Product invariants

- The original source media is immutable.
- whisper.cpp owns canonical transcript words and exact word timing.
- Ollama/Qwen may translate and suggest issues; it may not rewrite or retime canonical words.
- Transcript deletion, timeline removal, cleaned duration, playback, captions, and export use the same source-time keep/remove mapping.
- Caption templates change presentation only. Wording and timing stay tied to the transcript/audio, with at most two visible lines.
- Processing states must be honest. Never show a dummy transcript or fake completion while analysis is running.
- Keep AI and media execution server-only and loopback-only by default. Do not add a cloud fallback, API key, telemetry, or remote data transfer without an explicit product/privacy decision.
- Do not show success toasts for selection changes.
- Reusable interaction or visual-rule changes must update `DESIGN.md`.
- Preserve the legacy bundle ID and `Application Support/Descripter` data location unless an intentional, tested migration is supplied.

## Security and privacy

- Never commit `.env.local`, credentials, models, media, transcripts, `data/`, exports, or sensitive logs.
- Never accept arbitrary filesystem paths from browser clients.
- Validate local API input and model output. Bound file size, concurrency, timeouts, and retry behavior.
- Use synthetic, public-domain, or authorized fixtures. Redact public issues.
- Report vulnerabilities through GitHub private vulnerability reporting.

## Required checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

For UI/timeline/caption changes, also verify the real app in a browser with short and long authorized clips. Check playback, scrubbing, word highlighting, horizontal/vertical timeline scrolling, zoom/Fit, selection, trim, split, delete, Undo/Redo, and reduced motion as relevant.

## Scope honesty

Do not mark roadmap items complete without evidence. Do not invent test results, model quality, supported formats, performance numbers, contributor adoption, or release readiness. `TASKS.md` is the implementation-status source; `DESIGN.md` is the UI contract.
