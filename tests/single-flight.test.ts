import assert from "node:assert/strict";
import test from "node:test";
import { SingleFlightCache } from "../src/lib/ai/single-flight.ts";

test("local analysis joins duplicate sources, rejects competing work, and reuses validation", async () => {
  const jobs = new SingleFlightCache<string, { words: number }>(60_000, 2);
  const firstProgress: string[] = [];
  const joinedProgress: string[] = [];
  let workCount = 0;
  let finish!: (result: { words: number }) => void;
  const pending = new Promise<{ words: number }>((resolve) => { finish = resolve; });

  const first = jobs.run({
    key: "source-a",
    listener: (message) => firstProgress.push(message),
    work: async (emit) => {
      workCount += 1;
      emit("transcribing");
      return pending;
    }
  });
  const joined = jobs.run({
    key: "source-a",
    listener: (message) => joinedProgress.push(message),
    work: async () => {
      workCount += 1;
      return { words: 0 };
    }
  });

  assert.equal(jobs.availability("source-a"), "join");
  assert.equal(jobs.availability("source-b"), "busy");
  await assert.rejects(() => jobs.run({ key: "source-b", listener: () => undefined, work: async () => ({ words: 0 }) }), /PROCESSING_BUSY/);
  finish({ words: 42 });
  assert.deepEqual(await first, { words: 42 });
  assert.deepEqual(await joined, { words: 42 });
  assert.equal(workCount, 1);
  assert.deepEqual(firstProgress, ["transcribing"]);

  const cached = await jobs.run({ key: "source-a", listener: () => undefined, work: async () => { workCount += 1; return { words: 0 }; } });
  assert.deepEqual(cached, { words: 42 });
  assert.equal(workCount, 1);
});
