# AI Operating Model Skills Application Report

This private workflow uses AI to recommend edits, never silently finalize them. Each run records operation, input-content hash, schema version, status, model class, output version, and user decision without logging full transcript text. The build-vs-buy decision is hybrid: local FFmpeg and owned edit logic; external language intelligence behind a replaceable adapter. Generated code and AI outputs require deterministic tests and review fixtures before release.

Main risks: incorrect retake removal, timing drift, dialect errors, provider outage, and duplicated jobs. Quick wins are human review, confidence thresholds, idempotency, typed outputs, and replayable fixtures. Durable jobs and an evaluation corpus follow after the editor foundation. Risk: high.
