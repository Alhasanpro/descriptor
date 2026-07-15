# AI Maturity Skills Application Report

- **Architecture leadership — high:** isolate transcription, analysis, translation, and routing behind owned server adapters; do not couple UI to provider response shapes.
- **Governance and human validation — high:** detected mistakes are recommendations. Only reviewed decisions affect export; bulk removal is restricted to safe/high-confidence issues and stays undoable.
- **Data quality — high:** word timestamps, language spans, issue ranges, and source-time mappings must validate before any AI result is saved.
- **Multimodal orchestration — high:** source media, extracted audio, transcript, issues, translation, subtitle timing, and export are a staged pipeline with explicit versions.
- **Technology fit — medium:** FFmpeg owns media transforms; Remotion owns subtitle composition; AI is used for language tasks, not deterministic time-range math.
- **Software ownership — medium:** one schema per domain and provider-independent adapters prevent generated duplicate logic.

Order: schemas and review gates, deterministic media metadata, AI adapter, evaluation fixtures, then export integration.
