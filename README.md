# Descriptor

Descriptor is a local-first, transcript-led video editor for Arabic and Arabic-English creators. It turns speech into word-timed captions, keeps editing decisions non-destructive, and performs its default speech and language work on the user's Mac with whisper.cpp and Ollama.

> **Project status:** public alpha (`0.1.0`). Back up important work and keep the original media. Some persistence, recovery, secondary-media export, and release-hardening work remains open.

## What it does

- Imports MP4, MOV, M4V, and WebM source video without modifying the original.
- Transcribes Arabic and mixed Arabic-English speech locally with whisper.cpp word timestamps.
- Reviews translations and cleanup suggestions with a local Ollama model; Qwen3 8B is the tested default.
- Keeps transcript, playback, captions, playhead, split clips, trims, and deletions synchronized.
- Supports transcript word correction, project-wide matching-word replacement, issue review, Undo/Redo, and non-destructive removal decisions.
- Adds external video, audio, and images to the visual timeline for preview editing.
- Provides caption templates, timing-safe pagination, shadow/style controls, color grading, and 3D `.cube` LUT import.
- Queues local 4K MP4/H.264 or MOV/HEVC exports from immutable source media.

## Before you run it

Descriptor does not download large AI runtimes or models for you. Install and verify these first:

1. Node.js 24 LTS (Node 20.9+ is accepted) and npm 10+.
2. CMake and a C/C++ toolchain for building whisper.cpp.
3. whisper.cpp's `whisper-cli` executable.
4. A whisper.cpp GGML speech model. `ggml-large-v3.bin` is the tested default and needs several gigabytes of disk and memory.
5. Ollama for macOS, listening only on `127.0.0.1:11434`.
6. `qwen3:8b-q4_K_M` in Ollama, or another tested Ollama model that supports strict structured JSON output.
7. Enough free disk space for the source video, derivatives, model files, and exports.

The exact commands, verification checks, Apple Silicon/Intel notes, and common fixes are in [Getting started](./docs/GETTING_STARTED.md). Read [Local AI](./docs/LOCAL_AI.md) before changing models.

## Quick start

```bash
git clone https://github.com/Alhasanpro/descriptor.git
cd descriptor
nvm use
npm ci
cp .env.example .env.local
```

Edit `.env.local` with absolute paths to `whisper-cli` and `ggml-large-v3.bin`, then verify the local language model:

```bash
curl http://127.0.0.1:11434/api/version
ollama list
npm run dev
```

Open <http://localhost:3000>. No OpenAI key or cloud AI credential is used.

## Run as a macOS app

```bash
npm run desktop:dist
```

The unsigned DMG is written to `./dist` unless `DESCRIPTOR_DESKTOP_OUTPUT` is set. The app uses the existing bundle identifier `com.alhasan.descripter` and the legacy `~/Library/Application Support/Descripter` data directory so current local projects survive the visible product rename to Descriptor.

This build is for local testing. Public macOS binaries must be signed, notarized, tested on a clean Mac, and reviewed for third-party binary redistribution obligations. See [Release guide](./docs/RELEASE.md).

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Documentation

- [Project specification](./docs/PROJECT_SPECIFICATION.md) — supported workflows, formats, data model, APIs, quality attributes, and current limitations.
- [Getting started](./docs/GETTING_STARTED.md) — everything required before the first run.
- [Local AI](./docs/LOCAL_AI.md) — Qwen3, alternate Ollama models, adapter contract, privacy, and timing ownership.
- [Architecture](./ARCHITECTURE.md) — runtime boundaries and non-destructive edit model.
- [Design contract](./DESIGN.md) — visual tokens and interaction rules.
- [Roadmap](./TASKS.md) — completed and remaining milestones.
- [Open-source validation](./docs/OPEN_SOURCE_VALIDATION.md) — checks completed and owner-only publication steps.
- [Privacy](./docs/PRIVACY.md), [Security](./SECURITY.md), and [Release guide](./docs/RELEASE.md).

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), follow the [Code of Conduct](./CODE_OF_CONDUCT.md), and never attach private source media or transcripts to a public issue. Security reports belong in a private GitHub security advisory, not an issue.

## License

Descriptor source code is licensed under the [MIT License](./LICENSE). Fonts and runtime dependencies have their own licenses; models and AI runtimes are not part of the MIT grant. See [Third-party notices](./THIRD_PARTY_NOTICES.md).
