const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const EDGE_MARKS = /^([\s\p{P}\p{S}]*)(.*?)([\s\p{P}\p{S}]*)$/u;

function wordParts(text: string) {
  const value = text.trim();
  const match = value.match(EDGE_MARKS);
  return {
    prefix: match?.[1] ?? "",
    core: match?.[2] ?? value,
    suffix: match?.[3] ?? ""
  };
}

export function normalizeTranscriptWord(text: string) {
  return wordParts(text).core
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\u0640/g, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

export function transcriptWordsMatch(left: string, right: string) {
  const leftKey = normalizeTranscriptWord(left);
  return Boolean(leftKey) && leftKey === normalizeTranscriptWord(right);
}

export function replacementTextForTranscriptWord(currentText: string, replacementText: string) {
  const current = wordParts(currentText);
  const replacement = wordParts(replacementText);
  if (!replacement.core) return replacementText.trim();
  return `${replacement.prefix || current.prefix}${replacement.core}${replacement.suffix || current.suffix}`;
}
