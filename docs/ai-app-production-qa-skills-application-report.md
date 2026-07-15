# AI App Production QA Skills Application Report

QA must cover dependency maintenance, media security, local-model availability, cache safety, local deployment, rollback, and macOS desktop behavior. Cross-platform parity is intentionally scoped to the browser and packaged macOS surfaces: both use the same protected local routes and neither exposes credential setup. Release gates include strict typecheck/lint/build, missing-runtime tests, malformed-upload tests, source-integrity hashes, timestamp-range tests, 4K export metadata comparison, and actual playback review.

No analytics SDK is planned; operational logs remain local and never record transcript contents or source paths. Dependency and codec support will be audited before a release build. Risk: medium for the editor UI and desktop host, high for production media processing and export regressions.
