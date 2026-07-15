# Dependency Audit — 2026-07-13

`npm audit` reports two moderate findings: PostCSS `<8.5.10`, inherited through Next.js 16.2.10, and the corresponding Next dependency advisory. No high or critical findings were reported.

The automated fix proposes downgrading Next.js to 9.3.3, which is incompatible with this App Router application and is not an acceptable remediation. Keep Next pinned to the current release, avoid processing untrusted user-authored CSS, and upgrade when the current Next line adopts a patched PostCSS. Re-run the audit before release.
