# Security policy

## Supported versions

Descriptor is currently an alpha. Security fixes are applied to the latest source on the default branch and, when a release exists, the latest `0.1.x` pre-release. Older snapshots are not supported.

## Report a vulnerability

Use GitHub's **Report a vulnerability** button to open a private security advisory for this repository. Do not open a public issue and do not attach private media, transcripts, environment files, tokens, or exploit details publicly.

Include only what is necessary:

- affected version/commit and macOS architecture;
- impact and realistic attack boundary;
- minimal reproduction using synthetic data;
- whether local media, filesystem access, loopback APIs, Electron navigation, model output, or packaged binaries are involved;
- any suggested mitigation.

The maintainer will acknowledge the report when it is seen, assess severity and scope, coordinate a fix and disclosure where appropriate, and credit reporters who want attribution. Because this is a volunteer alpha project, no guaranteed response or resolution time is promised.

## Security boundaries

The local-only design reduces network exposure but does not make every local file or model trustworthy. Treat media, subtitles, LUTs, model output, dependencies, and packaged native executables as untrusted inputs. A report about an Ollama, whisper.cpp, Electron, FFmpeg, or model vulnerability may need coordinated disclosure to that upstream project.

Only test systems and media you own or are authorized to assess. The project does not authorize testing third-party services or other users' machines.
