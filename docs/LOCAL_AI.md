# Local AI runtimes and model adapters

Descriptor separates speech timing from language review. That separation is a product invariant, not an implementation detail.

```text
media -> FFmpeg mono audio -> whisper.cpp exact words/timestamps
                                  |
                                  +-> deterministic paragraph grouping
                                           |
                                           +-> Ollama translation and review
```

## Tested default

| Responsibility | Runtime | Tested model | Network boundary |
| --- | --- | --- | --- |
| Arabic and mixed-language transcription | whisper.cpp | `ggml-large-v3.bin` | Local child process |
| English subtitle translation | Ollama | `qwen3:8b-q4_K_M` | `http://127.0.0.1:11434` only |
| Cleanup suggestions | Ollama | `qwen3:8b-q4_K_M` | `http://127.0.0.1:11434` only |

Qwen3 is sometimes mistyped as “Queen”; use the exact Ollama model name shown above. Descriptor has no cloud-AI fallback and no API-key settings.

## Timing ownership

- whisper.cpp owns every canonical Arabic word and its `start`/`end` time.
- Ollama may translate and suggest review issues, but it must not rewrite, omit, reorder, or retime canonical Arabic words.
- Caption pagination derives from the canonical timed words and may show at most two visible lines.
- Typography and templates may change presentation only. They may not alter caption wording or timing.
- Transcript deletion creates a non-destructive source-time removal decision. Export and preview must use the same keep-range map.

This boundary is why switching the Ollama model cannot fix late word highlighting. Timing bugs belong in audio extraction, whisper parsing, time mapping, playback clocking, or caption segmentation.

## Use another local Ollama model

Set the installed tag in `.env.local`:

```dotenv
OLLAMA_TRANSLATION_MODEL=your-model:tag
```

An alternative is compatible only if it:

1. Supports Ollama's `/api/chat` endpoint.
2. Honors a supplied JSON schema through the `format` field.
3. Accepts `think: false` and returns the answer in `message.content` as valid JSON.
4. Reliably follows Arabic/English instructions and preserves names and technical terms.
5. Fits the current timeout and memory budget.
6. Has a license compatible with the contributor's use and any intended distribution.

The server validates output with Zod and preserves the previous translation on failure. A model passing one prompt is not enough: test dialects, code switching, long-form speech, empty/short paragraphs, malformed output, timeout, and unavailable-model behavior.

## Add a different local AI runtime

A new runtime belongs behind a server-only adapter. It must:

- keep executable access, URLs, and credentials out of client code;
- default to local processing and require explicit user consent before any remote transfer;
- accept the same typed input and return the same schema-validated output;
- use bounded timeouts, concurrency, payload sizes, and errors safe for UI display;
- never log full transcripts, source paths, or secrets;
- preserve the whisper-owned word/timing contract;
- include offline, timeout, malformed-output, and cancellation tests;
- update `ARCHITECTURE.md`, `DESIGN.md` when UI behavior changes, privacy documentation, third-party notices, and the project specification.

Cloud-provider adapters are intentionally out of scope for the initial open-source release. Do not add one as an automatic fallback: it would change the privacy promise and require threat modeling, consent, credential protection, cost controls, retention disclosure, and user-facing failure behavior.

## Model evaluation checklist

Use media you own or have permission to process. Keep personally identifiable transcripts out of issues and fixtures.

- Compare word error rate and timestamp alignment on the same source audio.
- Include Standard Arabic and the dialects claimed in the prompt.
- Include Arabic-English code switching, product names, numbers, and short utterances.
- Separate transcription accuracy from translation quality.
- Measure first-word, per-word, and long-form drift rather than judging only the final text.
- Record model tag, runtime version, hardware, quantization, source duration, and test date.
- Report failures and uncertainty; do not claim one model is “best” from a single clip.

## Privacy and security

Ollama's base URL is parsed server-side and rejected unless it is loopback HTTP. The default system sends no transcript to a hosted model. Contributors must not weaken this check or introduce telemetry containing transcript text. See [PRIVACY.md](./PRIVACY.md) and [SECURITY.md](../SECURITY.md).
