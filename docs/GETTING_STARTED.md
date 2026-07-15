# Getting started

This guide describes everything a contributor should install and verify before Descriptor's first run. The default workflow is fully local: whisper.cpp owns speech-to-text timing and Ollama/Qwen owns translation and transcript review.

## 1. Supported development environment

The packaged desktop target is macOS. The tested setup is:

- macOS 14 Sonoma or newer (the current Ollama for macOS requirement)
- Apple Silicon or Intel Mac with enough RAM for the selected models
- Node.js 24 LTS and npm 11 (`node >=20.9` and `npm >=10` are accepted by this project)
- Git, CMake, a C/C++ compiler, and standard macOS command-line tools
- At least 12 GB free before importing media; long 4K work needs substantially more

Install the Apple command-line tools and CMake if they are missing:

```bash
xcode-select --install
brew install cmake
```

Homebrew is convenient but not required. Use a trusted package manager appropriate to your machine.

## 2. Build whisper.cpp

Keep third-party source outside this repository unless you are intentionally developing a vendored runtime:

```bash
mkdir -p "$HOME/.local/src"
git clone https://github.com/ggml-org/whisper.cpp.git "$HOME/.local/src/whisper.cpp"
cd "$HOME/.local/src/whisper.cpp"
cmake -B build
cmake --build build -j --config Release
```

The resulting executable is normally:

```text
$HOME/.local/src/whisper.cpp/build/bin/whisper-cli
```

Verify it:

```bash
"$HOME/.local/src/whisper.cpp/build/bin/whisper-cli" --help
```

For reproducible releases, record the whisper.cpp commit used for testing instead of assuming the latest commit will behave identically.

## 3. Download the speech model

Descriptor is tested with whisper.cpp's GGML `large-v3` model:

```bash
cd "$HOME/.local/src/whisper.cpp"
sh ./models/download-ggml-model.sh large-v3
```

The default location becomes:

```text
$HOME/.local/src/whisper.cpp/models/ggml-large-v3.bin
```

`large-v3` is a multi-gigabyte download and typically uses roughly 4 GB of memory just for the model. A smaller compatible GGML model may run on lower-memory hardware, but Arabic accuracy and timestamp behavior must be revalidated. Descriptor currently discovers the filename `ggml-large-v3.bin` automatically; a differently named model must be set explicitly in `.env.local`.

## 4. Install Ollama and Qwen3

1. Download Ollama from <https://ollama.com/download/mac>.
2. Move `Ollama.app` to Applications and open it once.
3. Install the tested local language model:

```bash
ollama pull qwen3:8b-q4_K_M
```

Verify the daemon and model before starting Descriptor:

```bash
curl http://127.0.0.1:11434/api/version
ollama list
ollama run qwen3:8b-q4_K_M "Reply with one word: ready"
```

Ollama downloads this quantized Qwen3 model separately; expect roughly another 5 GB. Do not expose Ollama on a LAN address for Descriptor. The app deliberately accepts only loopback HTTP URLs.

## 5. Configure Descriptor

From a clean clone:

```bash
nvm use
npm ci
cp .env.example .env.local
```

Open `.env.local` and replace the two placeholders with absolute paths:

```dotenv
WHISPER_CPP_BINARY=/Users/you/.local/src/whisper.cpp/build/bin/whisper-cli
WHISPER_CPP_MODEL=/Users/you/.local/src/whisper.cpp/models/ggml-large-v3.bin
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TRANSLATION_MODEL=qwen3:8b-q4_K_M
MAX_UPLOAD_BYTES=21474836480
```

Never commit `.env.local`. The application needs no OpenAI API key, cloud transcription credential, or account token.

Descriptor also searches these portable locations when the explicit Whisper variables are absent:

- Binary: `./runtime_tools/whisper-cli`, `./vendor/whisper.cpp/build/bin/whisper-cli`, `PATH`, Homebrew paths, and `~/.local/bin/whisper-cli`
- Model: `./models/ggml-large-v3.bin`, the Descriptor application-data model folder, and `~/.cache/whisper/ggml-large-v3.bin`

Explicit variables are recommended for development because they make failures easier to diagnose.

## 6. Run the development editor

```bash
npm run dev
```

Open <http://localhost:3000>. Import a short, non-sensitive test clip first. The initial analysis should show real processing states; Descriptor intentionally does not insert a dummy transcript while local analysis is running.

Before changing code, run the baseline checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 7. Build the local macOS application

```bash
npm run desktop:dist
```

The build copies the host architecture's Whisper executable into the app, but it does not redistribute the large speech model. For a normally launched packaged app, place the model here:

```text
~/Library/Application Support/Descripter/models/ggml-large-v3.bin
```

For local test launching from this repository, `./script/build_and_run.sh` loads `.env.local` and passes the configured model path. Build Apple Silicon artifacts on an Apple Silicon Mac and Intel artifacts on an Intel Mac; the native media and Whisper executables make cross-architecture packaging unsafe.

## 8. Local data and cleanup

- Development data: `./data`
- Packaged macOS data: `~/Library/Application Support/Descripter/data`
- Packaged model default: `~/Library/Application Support/Descripter/models`
- Desktop log: the macOS application log directory, filename `descripter-desktop.log`

Imported source files are copied into private local storage and made read-only. Deleting the development `data/` directory deletes Descriptor's development copies and jobs, not the original media. Never automate deletion of the packaged Application Support directory.

## Troubleshooting

### “Local speech model is missing”

Confirm the model path is absolute, the file exists, and the current user can read it. Confirm it is a whisper.cpp GGML model rather than a Hugging Face/PyTorch checkpoint.

### “Local speech runtime is missing”

Run `whisper-cli --help`, rebuild whisper.cpp, and confirm `WHISPER_CPP_BINARY` points to an executable built for the current Mac architecture.

### “Local language model is unavailable”

Open Ollama, retry the version check, and confirm `OLLAMA_TRANSLATION_MODEL` appears in `ollama list`. Keep the base URL exactly on loopback.

### “Another video is already being analyzed”

Only one local transcription job runs at a time. Wait for the active job to finish. If the process previously crashed, quit and reopen Descriptor, verify no other Descriptor development server is running, then retry. The source file remains unchanged.

### Captions do not follow speech

Do not try to correct speech timing by changing the Ollama prompt or model. Word timing comes only from whisper.cpp. Reproduce with a short clip, inspect the timed-word JSON path in the local analysis pipeline, and add a regression test before altering the shared timing or pagination logic.

### Desktop app is blocked by macOS

The local development DMG is unsigned. Public distribution requires Developer ID signing and Apple notarization; do not tell users to disable system security. Follow [RELEASE.md](./RELEASE.md).
