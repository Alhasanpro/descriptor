const RETRYABLE_NATIVE_SIGNALS = new Set(["SIGABRT", "SIGBUS", "SIGILL", "SIGSEGV"]);

type ChildProcessFailure = {
  code?: string | number | null;
  killed?: boolean;
  signal?: string | null;
};

function childProcessFailure(error: unknown): ChildProcessFailure {
  return typeof error === "object" && error !== null ? error as ChildProcessFailure : {};
}

export function shouldRetryNativeWhisperFailure(error: unknown) {
  const failure = childProcessFailure(error);
  return failure.killed !== true
    && typeof failure.signal === "string"
    && RETRYABLE_NATIVE_SIGNALS.has(failure.signal);
}

export function localProcessFailureSummary(error: unknown) {
  const failure = childProcessFailure(error);
  if (typeof failure.signal === "string" && failure.signal.length > 0) return `signal=${failure.signal}`;
  if (typeof failure.code === "number") return `exit=${failure.code}`;
  if (typeof failure.code === "string" && failure.code.length > 0) return `code=${failure.code}`;
  return "failure=unknown";
}
