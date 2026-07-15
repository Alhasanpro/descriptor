# Open-source readiness report

Date: 2026-07-15

## Scope

This report covers publishing Descriptor's source repository publicly. It does not certify a signed or notarized binary release.

## Audit summary

| Area | Initial finding | Resolution in working tree | Remaining risk |
| --- | --- | --- | --- |
| Source ownership | No project license or contributor terms. | MIT license, contribution terms, code of conduct, support, and security policies added. | Owner review before first commit. |
| Caption fonts | Nine bundled display fonts lacked redistribution evidence; several were demo/all-rights-reserved. | Removed and replaced with SIL Open Font License families plus one license copy per family. | Recheck any future font import. |
| Dependencies | One unused Remotion dependency carried a conditional source-available license. | Removed; lockfile retained; recurring audit, Dependency Review, Dependabot, and CodeQL workflows added. | Review every future dependency and release SBOM. |
| Media tools | Packaged app carries FFmpeg/FFprobe binaries. | Source-vs-binary licensing boundary and required release review documented. | Public DMG remains gated on exact binary compliance review. |
| Local AI | Runtime/model discovery used one developer-specific absolute path. | Environment configuration, portable discovery, clean setup, model substitution contract, and host-architecture packaging guard added. | Clean-Mac verification still required. |
| Secrets | No cloud credential required; ignored local environment file present. | Credential-free example, Git ignores, reporting rules, and release secret-scan checklist added. | GitHub secret scanning/push protection must be enabled after repository creation. |
| GitHub operations | No remote, commits, CI, or community templates. | Pinned CI/security workflows, Dependabot, issue forms, PR template, and release guide added. | Owner must create the repository, review the first commit, and configure settings. |
| Privacy | Local data flow existed only in code. | Data inventory, local paths, retention limitations, deletion guidance, and contributor privacy rules published. | In-app project deletion remains product work. |

## Safe implementation order

1. Completed: remove unlicensed assets and the unused conditional-license dependency.
2. Completed: replace machine-specific runtime assumptions with environment variables and portable local discovery.
3. Completed: add the license, notices, specification, setup, privacy/security, and contributor governance.
4. Completed: add pinned GitHub Actions for build/test and security checks.
5. Required at publication: review the final diff, create the GitHub repository, enable repository protections, and repeat checks from a clean clone.

## Remaining release boundary

Publishing the source repository and publishing a downloadable macOS binary are different releases. A public source release can proceed once the actions above pass. A downloadable app additionally needs signing, notarization, a bundled third-party-notice view/file, and a final FFmpeg/FFprobe binary-license review.
