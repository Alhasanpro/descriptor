# Product compliance application report

Date: 2026-07-15

## Where the baseline applies

Descriptor processes user-selected video, audio, transcript text, translations, LUTs, edit decisions, and exports on the user's own Mac. It has no account, subscription, analytics, advertising, or cloud-storage system.

## Current risks and actions

| Topic | Finding | Risk | Action |
| --- | --- | --- | --- |
| Data inventory | Media, transcript, derivative, edit, LUT, export, log, and model-adjacent data flows are documented in `docs/PRIVACY.md`. | Low | Keep the document aligned with route and storage changes. |
| Third parties | Runtime/model licenses and resource requirements are separate from the project license. | Medium | Notices and model-selection checks are published; re-audit every new runtime/model. |
| User deletion | Local source/export files persist in Application Support and stable in-app deletion is incomplete. | Medium | Exact locations and manual limitations are documented; implement safe in-app project deletion before stable release. |
| Terms | This is an early open-source desktop application, not a hosted service. | Low | MIT warranty disclaimer, code of conduct, security policy, and support boundary are included without invented service promises. |
| Binary distribution | Signing, notarization, and exact FFmpeg/FFprobe binary compliance remain incomplete. | Medium | Public DMG distribution is explicitly gated in `docs/RELEASE.md`. |

## Validation

Documentation must stay aligned with the actual loopback-only service, local Ollama URL validation, ignored environment files, immutable source storage, and current absence of telemetry.
