export type WhisperJsonSegment = {
  text: string;
  offsets: { from: number; to: number };
};

export type LocalTimedWord = {
  word: string;
  start: number;
  end: number;
};

export type LocalTranscriptParagraph = {
  id: string;
  start: number;
  end: number;
  arabicText: string;
  words: LocalTimedWord[];
};

const punctuationOnly = /^[\p{P}\p{S}]+$/u;

export function parseWhisperWordSegments(segments: WhisperJsonSegment[]) {
  const words: LocalTimedWord[] = [];

  for (const segment of segments) {
    const word = segment.text.trim();
    const start = Math.max(0, segment.offsets.from / 1000);
    const end = Math.max(start, segment.offsets.to / 1000);
    if (!word || /^\[[^\]]+\]$/.test(word) || end <= start) continue;

    if (punctuationOnly.test(word) && words.length) {
      const previous = words.at(-1)!;
      previous.word += word;
      previous.end = Math.max(previous.end, end);
      continue;
    }

    words.push({ word, start, end });
  }

  return words;
}

export function groupTimedWords(words: LocalTimedWord[]) {
  const paragraphs: LocalTranscriptParagraph[] = [];
  let current: LocalTimedWord[] = [];

  const flush = () => {
    if (!current.length) return;
    paragraphs.push({
      id: `local-paragraph-${paragraphs.length + 1}`,
      start: current[0].start,
      end: current.at(-1)!.end,
      arabicText: current.map((word) => word.word).join(" "),
      words: current
    });
    current = [];
  };

  for (const word of words) {
    const previous = current.at(-1);
    const gap = previous ? Math.max(0, word.start - previous.end) : 0;
    const duration = current.length ? word.end - current[0].start : 0;
    const shouldBreak = current.length >= 14
      || duration >= 6
      || (current.length >= 4 && gap >= 0.75)
      || gap >= 1.5;
    if (shouldBreak) flush();
    current.push(word);
  }
  flush();

  return paragraphs;
}
