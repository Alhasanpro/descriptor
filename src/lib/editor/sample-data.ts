import type { TranscriptIssue, TranscriptParagraph } from "./types";

export const sampleIssues: TranscriptIssue[] = [
  { id: "issue-retake", type: "false-start", label: "False start", start: 0, end: 7.7, confidence: 0.94, safeToRemove: true },
  { id: "issue-filler", type: "filler", label: "Filler word", start: 4.45, end: 4.95, confidence: 0.98, safeToRemove: true },
  { id: "issue-pause", type: "silence", label: "Long pause", start: 7.7, end: 9.1, confidence: 0.91, safeToRemove: true }
];

export const sampleParagraphs: TranscriptParagraph[] = [
  {
    id: "paragraph-1",
    start: 0,
    end: 7.7,
    translation: "Today I was working on the design system and ran into a components problem. Let me start again.",
    words: [
      ["اليوم", 0, 0.6, "ar"], ["كنت", 0.65, 1.05, "ar"], ["بشتغل", 1.1, 1.7, "ar"], ["على", 1.75, 2.05, "ar"],
      ["الـ", 2.1, 2.3, "ar"], ["design", 2.3, 2.75, "en"], ["system", 2.8, 3.25, "en"], ["وواجهت", 3.3, 3.9, "ar"],
      ["مشكلة", 3.95, 4.4, "ar"], ["اممم،", 4.45, 4.95, "ar", "issue-filler"], ["خليني", 5, 5.55, "ar"], ["أبدأ", 5.6, 6.1, "ar"],
      ["من", 6.15, 6.4, "ar"], ["جديد.", 6.45, 7.1, "ar"]
    ].map(([text, start, end, language, issueId], index) => ({ id: `p1-${index}`, text: String(text), start: Number(start), end: Number(end), language: language as "ar" | "en", issueId: issueId ? String(issueId) : "issue-retake" }))
  },
  {
    id: "paragraph-2",
    start: 9.1,
    end: 15.8,
    translation: "Today, I want to show you how I organized the design system.",
    words: [
      ["اليوم", 9.1, 9.65, "ar"], ["بدي", 9.7, 10.1, "ar"], ["أشرحلكم", 10.15, 11, "ar"], ["كيف", 11.05, 11.45, "ar"],
      ["نظمت", 11.5, 12.1, "ar"], ["الـ", 12.15, 12.35, "ar"], ["design", 12.35, 12.9, "en"], ["system.", 12.95, 13.7, "en"]
    ].map(([text, start, end, language], index) => ({ id: `p2-${index}`, text: String(text), start: Number(start), end: Number(end), language: language as "ar" | "en" }))
  }
];
