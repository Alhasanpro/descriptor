import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { whisperBinaryCandidates, whisperModelCandidates } from "../src/lib/ai/local-runtime-paths.ts";

test("local runtime candidates prioritize explicit configuration and stay portable", () => {
  const candidates = whisperBinaryCandidates({
    configured: "/custom/whisper-cli",
    cwd: "/workspace/descriptor",
    home: "/Users/editor",
    pathValue: ["/first/bin", "/second/bin"].join(path.delimiter),
    platform: "darwin"
  });

  assert.equal(candidates[0], "/custom/whisper-cli");
  assert.ok(candidates.includes("/workspace/descriptor/vendor/whisper.cpp/build/bin/whisper-cli"));
  assert.ok(candidates.includes("/first/bin/whisper-cli"));
  assert.ok(candidates.includes("/opt/homebrew/bin/whisper-cli"));
  assert.equal(candidates.some((candidate) => candidate.includes("WorkStation")), false);
});

test("model candidates include project, application-data, and cache conventions", () => {
  const candidates = whisperModelCandidates({
    cwd: "/workspace/descriptor",
    home: "/Users/editor",
    platform: "darwin"
  });

  assert.deepEqual(candidates, [
    "/workspace/descriptor/models/ggml-large-v3.bin",
    "/Users/editor/Library/Application Support/Descripter/models/ggml-large-v3.bin",
    "/Users/editor/.cache/whisper/ggml-large-v3.bin"
  ]);
});
