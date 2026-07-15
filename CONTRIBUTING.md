# Contributing to Descriptor

Thank you for helping build local-first video tools for Arabic and bilingual creators.

## Before opening an issue

- Search existing issues and the roadmap in `TASKS.md`.
- Follow `docs/GETTING_STARTED.md` on a supported Mac.
- Reproduce with the smallest authorized clip possible.
- Remove media, transcript text, usernames, and local paths unless they are essential and safe to disclose.
- For a vulnerability, use a private security advisory instead of an issue.

## Development workflow

1. Fork the repository and create a focused branch.
2. Run `npm ci`; do not replace the lockfile with another package manager.
3. Copy `.env.example` to `.env.local` and use local model paths. Never commit it.
4. Confirm the baseline checks pass.
5. Make one coherent change, preserving the invariants in `AGENTS.md` and `ARCHITECTURE.md`.
6. Add or update tests for logic changes. For UI behavior, document the manual browser scenarios exercised.
7. Update `DESIGN.md` for reusable interaction/visual rules, `PROJECT_SPECIFICATION.md` for product-contract changes, and `TASKS.md` only when evidence shows a milestone item is complete.
8. Run all required checks and review your own diff before opening a pull request.

## Pull request expectations

A good pull request includes:

- the user problem and chosen behavior;
- a small implementation description;
- automated checks and manual scenarios run;
- screenshots or a short recording for visible changes, using non-sensitive media;
- known limitations and follow-up work;
- documentation and license updates for new dependencies, fonts, models, or formats.

Keep refactors separate from behavior changes when possible. Avoid dependency upgrades unrelated to the change. Maintainers may ask for the PR to be split when timing, media safety, or privacy behavior becomes hard to review.

## Tests and quality gates

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Timing changes require short-form and long-form regression coverage. Media/export changes require source-hash checks and failure-path testing. A green build does not replace browser verification of playback and editing interactions.

## Fixtures and model benchmarks

- Prefer generated tones, synthetic timing fixtures, public-domain media, or media you created.
- Never commit copyrighted clips merely because they are short.
- Never publish a person's voice or transcript without permission.
- Record runtime/model versions, hardware, source duration, and methodology with benchmark claims.
- Do not present a one-clip subjective result as general model superiority.

## Dependencies and licenses

Explain why a new package is necessary, pin or bound it appropriately, and update `THIRD_PARTY_NOTICES.md` when distribution obligations change. Do not add demo/personal-use fonts, unredistributable model weights, or provider keys.

## Commit and review style

Use clear imperative commit messages such as `Fix long-form caption timing drift`. By contributing, you agree that your contribution is provided under the repository's MIT license unless explicitly stated otherwise in the pull request and accepted by the maintainers.
