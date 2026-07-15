# Third-party notices

Descriptor's MIT license covers this repository's original source code. It does not replace the licenses of dependencies, fonts, AI runtimes, models, or codecs.

## Fonts included in this repository

The bundled Anton, Archivo Black, Barlow Condensed, Bebas Neue, Caveat, Inter, Lato, Libre Baskerville, Montserrat, Noto Sans Arabic, Oswald, and Playfair Display font files are licensed under the SIL Open Font License 1.1. Their license texts are in [`public/fonts/licenses`](./public/fonts/licenses).

## Runtime packages

- Next.js, React, TypeScript, Zustand, Zod, and most JavaScript support packages use permissive open-source licenses. Consult each package and `package-lock.json` for the exact version.
- `ffmpeg-static` distributes FFmpeg binaries under FFmpeg's applicable GPL terms.
- `@ffprobe-installer/ffprobe` distributes FFprobe binaries under FFmpeg's applicable LGPL/GPL terms.
- Electron and electron-builder retain their own licenses and notices.

Source-only distribution through this repository is different from distributing a prebuilt application containing FFmpeg/FFprobe binaries. Before publishing a DMG, produce a version-specific license inventory, include the required notices and corresponding-source offer/materials where applicable, and obtain legal review if the distribution model is uncertain.

## AI runtimes and models not bundled here

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) is a separate MIT-licensed project.
- OpenAI Whisper model weights are separate downloads subject to the terms published with those weights.
- [Ollama](https://github.com/ollama/ollama) is installed separately and retains its own license.
- [Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) is a separate model distributed under Apache License 2.0 at the time this notice was written.

Users who select a different Ollama model are responsible for checking its license, acceptable-use terms, redistribution rules, and suitability. No model license is granted by this repository.
