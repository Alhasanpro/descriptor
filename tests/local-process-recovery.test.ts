import assert from "node:assert/strict";
import test from "node:test";
import { localProcessFailureSummary, shouldRetryNativeWhisperFailure } from "../src/lib/ai/local-process-recovery.ts";

test("native whisper crashes receive one safe retry classification", () => {
  for (const signal of ["SIGABRT", "SIGBUS", "SIGILL", "SIGSEGV"]) {
    assert.equal(shouldRetryNativeWhisperFailure({ signal, killed: false }), true);
  }
});

test("timeouts, normal exits, and killed work are not retried", () => {
  assert.equal(shouldRetryNativeWhisperFailure({ code: "ETIMEDOUT", killed: true, signal: "SIGTERM" }), false);
  assert.equal(shouldRetryNativeWhisperFailure({ code: 1, killed: false }), false);
  assert.equal(shouldRetryNativeWhisperFailure(new Error("model failure")), false);
});

test("local process diagnostics stay path-free and transcript-free", () => {
  assert.equal(localProcessFailureSummary({ signal: "SIGABRT", stderr: "/private/source/video.mov" }), "signal=SIGABRT");
  assert.equal(localProcessFailureSummary({ code: 5 }), "exit=5");
  assert.equal(localProcessFailureSummary({ code: "ENOENT" }), "code=ENOENT");
});
