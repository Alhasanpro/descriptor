# Privacy

Descriptor is designed for local single-user editing. The default build has no account, telemetry, analytics, cloud storage, public sharing, advertising, or cloud-AI integration.

## Data processed

- Source video/audio and externally imported timeline media
- Extracted temporary audio and media derivatives
- Arabic/mixed-language transcript words and timestamps
- English translations and cleanup suggestions
- Edit decisions, caption styles, color settings, LUT files, and export jobs
- Local operational logs that should contain states and error codes, not transcript text

## Where it goes

- Media processing runs in local FFmpeg/FFprobe processes.
- Speech transcription runs in local whisper.cpp.
- Translation and review run through Ollama on `127.0.0.1`.
- Development working data uses the repository's ignored `data/` directory.
- Packaged data uses `~/Library/Application Support/Descripter/data`.

The default application does not transmit the transcript or media to Descriptor's maintainer. Ollama and model installers are third-party software; review their own privacy and update behavior separately.

## Retention and deletion

Descriptor keeps local copies and generated files so editing and export can continue. The stable in-app project deletion/data-management experience is not complete in version 0.1. Advanced users may remove development data by quitting all Descriptor processes and deleting the ignored `data/` directory. Packaged application data should be backed up and reviewed before manual deletion.

## Contributor rules

- Use synthetic, public-domain, or explicitly authorized test media.
- Do not commit source media, transcripts, model weights, `.env.local`, working data, or logs containing personal information.
- Redact usernames, local paths, faces, voices, and transcript content from public bug reports unless the person has consented.
- New remote services, telemetry, crash reporting, or cloud AI require explicit opt-in, data-flow documentation, retention controls, deletion behavior, security review, and updates to this file before merge.

This document describes the current software behavior; it is not a substitute for legal advice or a production privacy policy for a distributor's jurisdiction.
