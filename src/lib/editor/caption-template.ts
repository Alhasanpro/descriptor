export const CREATOR_OUTLINE_PAGE_SIZE = 3;
export const CAPTION_LINE_HEIGHT_LIMITS = { min: 0.8, max: 2, step: 0.05 } as const;

export function normalizeCaptionLineHeight(value: number) {
  const finiteValue = Number.isFinite(value) ? value : 1.25;
  return Math.max(CAPTION_LINE_HEIGHT_LIMITS.min, Math.min(CAPTION_LINE_HEIGHT_LIMITS.max, finiteValue));
}

function formatAssSpacing(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * ASS has character spacing but no dedicated word-spacing property. Apply the
 * requested extra spacing only to a hard-space glyph, then restore the caption's
 * normal letter spacing before the next word.
 */
export function assWordSeparator(letterSpacing: number, wordSpacing: number) {
  if (!(wordSpacing > 0)) return " ";
  return `{\\fsp${formatAssSpacing(letterSpacing + wordSpacing)}}\\h{\\fsp${formatAssSpacing(letterSpacing)}}`;
}

export type CaptionPageWord = {
  text: string;
  index: number;
};

type CaptionMeasure = (text: string) => number;

function measuredLineWidth(words: CaptionPageWord[], measureWord: CaptionMeasure, measureSpace: CaptionMeasure) {
  return words.reduce((width, word, index) => width + measureWord(word.text) + (index ? measureSpace(" ") : 0), 0);
}

/**
 * Builds fixed-size creator caption pages, then chooses the most balanced two-line
 * split only when the complete page is too wide. Word indices stay global so the
 * speech-timed highlight can select the same word before and after pagination.
 */
export function paginateFixedCaptionWords(
  words: string[],
  maxLineWidth: number,
  measureWord: CaptionMeasure,
  measureSpace: CaptionMeasure,
  pageSize = CREATOR_OUTLINE_PAGE_SIZE,
) {
  if (!words.length) return [[[ { text: "No subtitle", index: 0 } ]]];
  const pages: CaptionPageWord[][][] = [];

  for (let start = 0; start < words.length; start += pageSize) {
    const pageWords = words.slice(start, start + pageSize).map((text, offset) => ({ text, index: start + offset }));
    if (pageWords.length < 2 || measuredLineWidth(pageWords, measureWord, measureSpace) <= maxLineWidth) {
      pages.push([pageWords]);
      continue;
    }

    let bestSplit = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let split = 1; split < pageWords.length; split += 1) {
      const firstWidth = measuredLineWidth(pageWords.slice(0, split), measureWord, measureSpace);
      const secondWidth = measuredLineWidth(pageWords.slice(split), measureWord, measureSpace);
      const overflow = Math.max(0, firstWidth - maxLineWidth) + Math.max(0, secondWidth - maxLineWidth);
      const score = overflow * 10 + Math.max(firstWidth, secondWidth) + Math.abs(firstWidth - secondWidth) * 0.15;
      if (score <= bestScore) {
        bestScore = score;
        bestSplit = split;
      }
    }
    pages.push([pageWords.slice(0, bestSplit), pageWords.slice(bestSplit)]);
  }

  return pages;
}

export type CaptionTimingRange = { start: number; end: number };

export type SpeechAlignedCaptionSegment = {
  start: number;
  end: number;
  activeWord: number;
  pageStart: number;
};

function normalizedSpeechRanges(start: number, end: number, ranges: CaptionTimingRange[]) {
  return ranges
    .map((range) => ({ start: Math.max(start, range.start), end: Math.min(end, range.end) }))
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function timeAtSpeechOffset(ranges: CaptionTimingRange[], offset: number) {
  let elapsed = 0;
  for (const range of ranges) {
    const duration = range.end - range.start;
    if (offset <= elapsed + duration) return range.start + Math.max(0, offset - elapsed);
    elapsed += duration;
  }
  return ranges.at(-1)?.end ?? 0;
}

/**
 * Mirrors the preview's cumulative-speech alignment for translated captions.
 * Source-speech gaps keep the current three-word page visible but deliberately
 * clear the active yellow word, matching scrub, playback, and exported video.
 */
export function buildSpeechAlignedCaptionSegments(
  start: number,
  end: number,
  captionWordCount: number,
  wordTimes: CaptionTimingRange[],
  pageSize = CREATOR_OUTLINE_PAGE_SIZE,
) {
  if (!(end > start) || captionWordCount < 1) return [];
  const speechRanges = normalizedSpeechRanges(start, end, wordTimes);
  if (!speechRanges.length) {
    const step = (end - start) / captionWordCount;
    return Array.from({ length: captionWordCount }, (_, activeWord) => ({
      start: start + step * activeWord,
      end: activeWord === captionWordCount - 1 ? end : start + step * (activeWord + 1),
      activeWord,
      pageStart: Math.floor(activeWord / pageSize) * pageSize,
    }));
  }

  const totalSpeech = speechRanges.reduce((total, range) => total + range.end - range.start, 0);
  const boundaries = new Set<number>([start, end]);
  for (const range of speechRanges) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }
  for (let index = 1; index < captionWordCount; index += 1) {
    boundaries.add(timeAtSpeechOffset(speechRanges, totalSpeech * index / captionWordCount));
  }
  const ordered = [...boundaries].filter(Number.isFinite).sort((a, b) => a - b);
  const segments: SpeechAlignedCaptionSegment[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const segmentStart = ordered[index];
    const segmentEnd = ordered[index + 1];
    if (segmentEnd - segmentStart < 0.000001) continue;
    const midpoint = (segmentStart + segmentEnd) / 2;
    let elapsedSpeech = 0;
    let inSpeech = false;
    for (const range of speechRanges) {
      if (midpoint >= range.end) {
        elapsedSpeech += range.end - range.start;
        continue;
      }
      if (midpoint >= range.start) {
        elapsedSpeech += midpoint - range.start;
        inSpeech = true;
      }
      break;
    }
    const scaledWord = totalSpeech > 0 ? elapsedSpeech / totalSpeech * captionWordCount : 0;
    const anchorWord = Math.max(0, Math.min(captionWordCount - 1, Math.floor(Math.max(0, scaledWord - (inSpeech ? 0 : 0.000001)))));
    const activeWord = inSpeech ? Math.max(0, Math.min(captionWordCount - 1, Math.floor(scaledWord))) : -1;
    const next = {
      start: segmentStart,
      end: segmentEnd,
      activeWord,
      pageStart: Math.floor(anchorWord / pageSize) * pageSize,
    };
    const previous = segments.at(-1);
    if (previous && previous.activeWord === next.activeWord && previous.pageStart === next.pageStart && Math.abs(previous.end - next.start) < 0.000001) {
      previous.end = next.end;
    } else {
      segments.push(next);
    }
  }

  return segments;
}
