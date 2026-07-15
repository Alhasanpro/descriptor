# Release guide

Descriptor is ready to publish as source code after the repository owner completes the GitHub steps below. It is not yet approved for a broadly distributed signed macOS binary.

## Source release checklist

1. Review `git status` and every file to ensure only intended source and documentation are included.
2. Search tracked content and Git history for credentials, private media, transcripts, machine-specific paths, and personal logs.
3. Confirm `.env.local`, `data/`, models, build outputs, and DMGs are ignored.
4. Run `npm ci` from the lockfile on a clean checkout.
5. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm audit --omit=dev`.
6. Import a short authorized clip and smoke-test transcription, word highlight timing, transcript correction/removal, Undo/Redo, timeline selection/trim/split/delete, LUT preview, and export error states.
7. Verify README links, license/notice files, issue templates, and contributor instructions.
8. Create the public repository with an accurate description and topics, then push the reviewed initial commit.
9. Enable GitHub private vulnerability reporting, Dependabot alerts, secret scanning/push protection where available, branch protection, required CI checks, and deletion of head branches after merge.
10. Create a `v0.1.0-alpha` source release and clearly mark it pre-release.

Do not rewrite or purge a secret from history casually. If any credential was ever committed, revoke/rotate it first, preserve evidence, then use a reviewed history-rewrite procedure before publishing.

## macOS binary release gates

Before distributing a DMG beyond trusted local testers:

- Use an Apple Developer ID Application certificate and hardened runtime.
- Define and minimize entitlements; sign nested Electron, FFmpeg, FFprobe, and Whisper executables correctly.
- Notarize with Apple and staple the notarization ticket.
- Build and test each architecture on matching hardware; do not cross-package native helpers.
- Test installation and first run on a clean Mac without developer tools or repository environment files.
- Decide how users obtain the multi-gigabyte Whisper model and verify its integrity.
- Produce a complete third-party software bill of materials and license bundle.
- Resolve FFmpeg/FFprobe GPL/LGPL distribution and corresponding-source obligations for the exact binaries shipped.
- Add a safe updater or document manual updates; test rollback and preservation of `Application Support/Descripter` data.
- Complete recovery, disk-space, long-4K, cancellation, corrupted-model, unavailable-Ollama, and export A/V validation tests.

## GitHub repository settings

Recommended initial values:

- Repository name: `descriptor`
- Description: `Local-first transcript-led video editor for Arabic and Arabic-English creators, powered by whisper.cpp and Ollama.`
- Website: leave blank until a real project page exists
- Topics: `arabic`, `captions`, `electron`, `local-ai`, `nextjs`, `ollama`, `qwen3`, `transcription`, `video-editor`, `whisper-cpp`
- License shown by GitHub: MIT
- Default branch: `main`

The canonical source repository is `https://github.com/Alhasanpro/descriptor`.

## Release artifacts

Source releases may include GitHub-generated source archives. Do not attach `.env.local`, model weights, imported media, `data/`, raw logs, unsigned DMGs presented as production-ready, or any artifact whose third-party notices have not been verified.
