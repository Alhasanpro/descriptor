import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assWordSeparator, buildSpeechAlignedCaptionSegments, normalizeCaptionLineHeight, paginateFixedCaptionWords } from "../src/lib/editor/caption-template.ts";

test("caption line height stays bounded without changing template preset values", () => {
  assert.equal(normalizeCaptionLineHeight(0.4), 0.8);
  assert.equal(normalizeCaptionLineHeight(2.4), 2);
  assert.equal(normalizeCaptionLineHeight(0.94), 0.94);
  assert.equal(normalizeCaptionLineHeight(Number.NaN), 1.25);
});

test("every multi-line preview layout consumes the shared line-height value", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.caption-line\{[^}]*line-height:var\(--caption-line-height/);
  assert.match(css, /\.two-word-caption\{[^}]*line-height:var\(--caption-line-height/);
  assert.match(css, /\.creator-build-line\{line-height:var\(--caption-line-height/);
  assert.match(css, /\.template-creator-outline \.caption-line\{line-height:var\(--caption-line-height/);
});

test("burned captions add word spacing without changing letter spacing", () => {
  assert.equal(assWordSeparator(0, 0), " ");
  assert.equal(assWordSeparator(-0.5, 7), "{\\fsp6.5}\\h{\\fsp-0.5}");
  assert.equal(assWordSeparator(1.25, 24), "{\\fsp25.25}\\h{\\fsp1.25}");
});

test("creator outline groups exactly three words and balances a second line", () => {
  const pages = paginateFixedCaptionWords(
    ["MAKING", "TRAVEL", "VIDEOS", "NINE", "YEARS", "AGO"],
    16,
    (word) => word.length,
    () => 1,
  );

  assert.deepEqual(pages, [
    [[{ text: "MAKING", index: 0 }, { text: "TRAVEL", index: 1 }], [{ text: "VIDEOS", index: 2 }]],
    [[{ text: "NINE", index: 3 }, { text: "YEARS", index: 4 }, { text: "AGO", index: 5 }]],
  ]);
});

test("creator outline clears the active word through source-speech gaps", () => {
  const segments = buildSpeechAlignedCaptionSegments(0, 3, 3, [
    { start: 0, end: 0.5 },
    { start: 1, end: 1.5 },
    { start: 2, end: 3 },
  ]);

  assert.ok(segments.some((segment) => segment.start === 0.5 && segment.end === 1 && segment.activeWord === -1));
  assert.ok(segments.some((segment) => segment.start === 1.5 && segment.end === 2 && segment.activeWord === -1));
  assert.ok(segments.every((segment) => segment.pageStart === 0));
});

test("creator outline changes page only when speech enters the next three-word group", () => {
  const segments = buildSpeechAlignedCaptionSegments(0, 6, 6, [{ start: 0, end: 6 }]);
  assert.deepEqual(segments.map(({ start, end, activeWord, pageStart }) => ({ start, end, activeWord, pageStart })), [
    { start: 0, end: 1, activeWord: 0, pageStart: 0 },
    { start: 1, end: 2, activeWord: 1, pageStart: 0 },
    { start: 2, end: 3, activeWord: 2, pageStart: 0 },
    { start: 3, end: 4, activeWord: 3, pageStart: 3 },
    { start: 4, end: 5, activeWord: 4, pageStart: 3 },
    { start: 5, end: 6, activeWord: 5, pageStart: 3 },
  ]);
});
