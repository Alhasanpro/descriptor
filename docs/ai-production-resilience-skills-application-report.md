# AI Production Resilience Skills Application Report

The primary resilience requirements are immutable source media, resumable async processing, idempotent jobs, bounded retries, cancellation, state recovery, and exact source-to-cleaned time mapping. Local use removes paid-model and public-scale concerns but not crash, disk, codec, runtime availability, or long-form latency risk. Export and source data require audit events and hash verification.

Quick wins: source copy isolation, explicit job states, local runtime validation, stable subprocess working directories, one bounded native-crash retry, safe path-free diagnostics, and persisted edit decisions. Deeper work: startup recovery, disk-space checks, job checkpointing, and restore tests. Risk: high.
