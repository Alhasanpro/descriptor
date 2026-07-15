# Open-source validation record

Date: 2026-07-15
Scope: source publication readiness, not signed/notarized binary release certification.

## Passed checks

- `npm install --package-lock-only --ignore-scripts` — lock metadata refreshed; no vulnerabilities reported.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 28 tests passed.
- `npm run build` — production Next.js build passed.
- `npm audit --omit=dev --audit-level=high` — no known vulnerabilities reported.
- `npm run desktop:prepare` — standalone server and native helper staging passed.
- `npm run desktop:package` — unsigned arm64 application directory packaged successfully on the host Mac.
- Publishable-file credential pattern scan — no credential-shaped values found.
- Publishable-file machine-path scan — no developer-specific absolute paths found.
- Markdown link check — all local targets exist.
- Browser smoke check at `http://localhost:3000` — page loaded, editor structure was present, bundled core fonts resolved, viewport did not create page-level overflow, and no browser console warning/error was observed.

## Design guard

Static Impeccable detection was run on the editor CSS and main React surface. It identified existing design-system debt: legacy literal colors/radii/type sizes, caption-library fonts not previously expressed as a front-matter role, and a few existing motion/layout-transition patterns. The caption-library font contract was added to `DESIGN.md`; the rendered editor was then reviewed in the browser and showed no release-blocking visual regression from the licensed-font replacement.

Rendered URL detection could not run because Puppeteer is not a project dependency. Puppeteer was not added solely for this check; the existing in-app browser workflow supplied the rendered smoke test instead.

## Publication follow-up

- The initial 161 publishable files were reviewed and prepared for the first commit.
- Public repository metadata points to `https://github.com/Alhasanpro/descriptor`.
- Confirm GitHub security, branch-protection, and private-vulnerability-reporting settings after the first workflow run.
- Repeat CI from the public clean clone.
- Do not publish a production DMG until the additional gates in `docs/RELEASE.md` are complete.
