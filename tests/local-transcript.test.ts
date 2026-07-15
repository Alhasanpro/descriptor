import assert from "node:assert/strict";
import test from "node:test";
import { groupTimedWords, parseWhisperWordSegments } from "../src/lib/ai/local-transcript.ts";

test("local whisper segments preserve exact word timing and attach punctuation", () => {
  const words = parseWhisperWordSegments([
    { text: " اليوم", offsets: { from: 100, to: 420 } },
    { text: "،", offsets: { from: 420, to: 470 } },
    { text: " نبدأ", offsets: { from: 520, to: 860 } },
    { text: "[BLANK_AUDIO]", offsets: { from: 860, to: 1000 } }
  ]);

  assert.deepEqual(words, [
    { word: "اليوم،", start: 0.1, end: 0.47 },
    { word: "نبدأ", start: 0.52, end: 0.86 }
  ]);
});

test("local transcript grouping respects speech gaps without changing words", () => {
  const words = [
    { word: "واحد", start: 0, end: 0.3 },
    { word: "اثنان", start: 0.35, end: 0.7 },
    { word: "ثلاثة", start: 0.75, end: 1.1 },
    { word: "أربعة", start: 1.15, end: 1.5 },
    { word: "خمسة", start: 2.4, end: 2.8 }
  ];

  const paragraphs = groupTimedWords(words);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].arabicText, "واحد اثنان ثلاثة أربعة");
  assert.equal(paragraphs[0].start, 0);
  assert.equal(paragraphs[0].end, 1.5);
  assert.equal(paragraphs[1].arabicText, "خمسة");
  assert.deepEqual(paragraphs.flatMap((paragraph) => paragraph.words), words);
});
