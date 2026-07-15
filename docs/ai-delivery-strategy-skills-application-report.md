# AI Delivery Strategy Skills Application Report

The delivery scope is phased: editor foundation, local media pipeline, Arabic AI workflow, then native 4K export. Speech timing uses local whisper.cpp and language review uses loopback-only Qwen3; no model credential or cloud fallback exists. Missing local runtimes produce an honest stopped state. There is deliberately no auth because the app is localhost-only and single-user, but privileged routes still reject non-local origins and validate all payloads. Model and prompt changes require fixture evaluation and rollback. No milestone is called complete until actual media output is tested.

Risk is high for transcription accuracy and export integrity, medium for UI workflows. Likely files are `src/app/api`, `src/lib/server`, `src/lib/editor`, test fixtures, and `TASKS.md`.
