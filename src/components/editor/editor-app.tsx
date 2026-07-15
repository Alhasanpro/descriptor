"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Icons } from "./icons";
import { useVideoFilmstrip } from "./use-video-filmstrip";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomRange } from "@/components/ui/custom-range";
import { AIPixelSpinner } from "@/components/ui/ai-pixel-spinner";
import { GradedVideo } from "./graded-video";
import { useEditorStore } from "@/store/editor-store";
import { editedToSourceTime, formatTime, keptTimeRanges, mergeTimeRanges, removedRangeAtTime, sourceToEditedTime, unionDuration } from "@/lib/editor/time";
import type { TimeRange } from "@/lib/editor/time";
import { createTimelineAsset, timelineAssetType, timelineMediaAccept } from "@/lib/editor/timeline-media";
import { transcriptWordsMatch } from "@/lib/editor/transcript-words";
import { CAPTION_LINE_HEIGHT_LIMITS, normalizeCaptionLineHeight, paginateFixedCaptionWords } from "@/lib/editor/caption-template";
import type { SourceColorInfo, SubtitleAnimation, SubtitleStyle, SubtitleTemplate, TimelineAssetClip, TranscriptIssue, TranscriptParagraph, TranscriptWord } from "@/lib/editor/types";
import { COLOR_GRADE_LIMITS, COLOR_GRADE_PRESETS } from "@/lib/editor/color-grade";
import { parseCubeLut, type CubeLut } from "@/lib/editor/cube-lut";
import { get4KOutputResolution, type CreateExportRequest, type ExportJobView } from "@/lib/editor/export";
import { canonicalExportEditSpec } from "@/lib/editor/export-idempotency";
import { analysisProgressEventSchema, refreshTranslationResponseSchema } from "@/lib/ai/schemas";
import type { ProcessVideoResponse } from "@/lib/ai/schemas";

const navItems = [
  ["Project", Icons.FolderOpen], ["Transcript", Icons.PanelLeft], ["Speech cleanup", Icons.WandSparkles],
  ["Translation", Icons.Languages], ["Subtitles", Icons.Captions], ["Animation", Icons.Sparkles],
  ["Vocabulary", Icons.Languages], ["Color", Icons.Palette], ["Export", Icons.Download], ["Settings", Icons.Settings]
] as const;
type EditorSection = typeof navItems[number][0];

const fontOptions = [
  "Lato",
  "Inter",
  "Noto Sans Arabic",
  "Montserrat",
  "Archivo Black",
  "Barlow Condensed",
  "Anton",
  "Bebas Neue",
  "Oswald",
  "Playfair Display",
  "Libre Baskerville",
  "Caveat",
  "Arial",
  "Georgia",
] as const;

const fontSelectOptions = fontOptions.map((font) => ({ value: font, label: font, fontFamily: font }));

const templates: Array<{ id: SubtitleTemplate; name: string; sample: React.ReactNode }> = [
  { id: "typewriter", name: "Typewriter", sample: <>This is a caption.</> },
  { id: "karaoke", name: "Karaoke highlight", sample: <span className="template-two-line-sample"><span>Today, I want to</span><span><mark>show you</mark>.</span></span> },
  { id: "bold-italic", name: "Bold italic · Green", sample: <><i>This is a <strong>caption</strong>.</i></> },
  { id: "impact", name: "Impact · Yellow", sample: <>MAKE YOUR MESSAGE STAND OUT</> },
  { id: "wave", name: "Modern yellow waveform", sample: <span className="template-two-line-sample template-wave-sample"><span>Captions move</span><span>with the <strong>rhythm</strong>.</span></span> },
  { id: "classic", name: "Classic serif", sample: <>A timeless caption.</> },
  { id: "two-words", name: "Bold · Two words", sample: <>TWO<br/>WORDS</> },
  { id: "yellow-highlight", name: "Bold · Yellow highlight", sample: <span className="template-two-line-sample"><span>THIS IS A <mark>LARGE</mark>,</span><span>BOLD CAPTION</span></span> },
  { id: "clean", name: "Clean paragraph", sample: <>Today, I want to show you.</> },
  { id: "preview", name: "Karaoke · Word preview", sample: <span className="template-two-line-sample template-word-preview-sample"><span><mark>This</mark></span><span>is a classic caption.</span></span> },
  { id: "one-word", name: "Karaoke · One word", sample: <><mark>KARAOKE</mark></> },
  { id: "skewed", name: "Karaoke · Skewed", sample: <>THIS IS A SKEWED, ALL-CAPS CAPTION</> },
  { id: "outline", name: "Bold outline", sample: <>These <strong>captions</strong> stand out.</> },
  { id: "minimal", name: "Minimal lower third", sample: <>Design systems, explained.</> },
  { id: "creator-build", name: "Creator build · Amber", sample: <span className="template-two-line-sample template-creator-build-sample"><span>making content</span><span><mark>full-time-ish.</mark></span></span> },
  { id: "creator-outline", name: "Creator outline · Yellow", sample: <span className="template-two-line-sample template-creator-outline-sample"><span>MAKING <mark>TRAVEL</mark></span><span>VIDEOS</span></span> }
];

const issuePresentations: Record<TranscriptIssue["type"], { title: string; description: string; removeLabel: string }> = {
  "false-start": {
    title: "Retake",
    description: "A restarted take was detected here. Preview the cut before removing it.",
    removeLabel: "Remove retake",
  },
  filler: {
    title: "Filler word",
    description: "A filler word was detected here. Preview the cut before removing it.",
    removeLabel: "Remove filler",
  },
  repetition: {
    title: "Repeated phrase",
    description: "This phrase appears more than once. Preview the cut before removing it.",
    removeLabel: "Remove repeat",
  },
  wording: {
    title: "Wording cleanup",
    description: "This phrase was marked for review. Preview the cut before removing it.",
    removeLabel: "Remove phrase",
  },
  silence: {
    title: "Long pause",
    description: "A longer pause was detected here. Preview the cut before removing it.",
    removeLabel: "Remove pause",
  },
};

const defaultCaptionShadow = {
  shadow: true,
  shadowColor: "#000000",
  shadowOpacity: 45,
  shadowBlur: 4,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
} satisfies Pick<SubtitleStyle, "shadow" | "shadowColor" | "shadowOpacity" | "shadowBlur" | "shadowOffsetX" | "shadowOffsetY">;

type SubtitlePresetStyle = Omit<SubtitleStyle, "template" | "position" | "horizontalPosition">;

const templateStylePresets: Record<SubtitleTemplate, SubtitlePresetStyle> = {
  typewriter: {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 54, fontWeight: 700, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.2, maxWidth: 84, color: "#FFFFFF", highlightColor: "#FFFFFF",
    background: true, backgroundColor: "#191416", backgroundOpacity: 82, animation: "typewriter", previewAnimation: true,
  },
  karaoke: {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 58, fontWeight: 800, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.25, maxWidth: 84, color: "#FFFFFF", highlightColor: "#FFD447",
    background: true, backgroundColor: "#191416", backgroundOpacity: 74, animation: "karaoke", previewAnimation: true,
  },
  "bold-italic": {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 58, fontWeight: 800, textAlign: "center", italic: true, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.2, maxWidth: 84, color: "#FFFFFF", highlightColor: "#50DF62",
    background: true, backgroundColor: "#191416", backgroundOpacity: 76, animation: "karaoke", previewAnimation: true,
  },
  impact: {
    ...defaultCaptionShadow,
    fontFamily: "Anton", fontSize: 62, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.5, wordSpacing: 1, lineHeight: 0.98, maxWidth: 88, color: "#FFFFFF", highlightColor: "#FFD447",
    background: false, backgroundColor: "#191416", backgroundOpacity: 74, animation: "pop", previewAnimation: true,
  },
  wave: {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 58, fontWeight: 800, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.15, maxWidth: 84, color: "#FFFFFF", highlightColor: "#FFD447",
    background: true, backgroundColor: "#191416", backgroundOpacity: 76, animation: "pop", previewAnimation: true,
  },
  classic: {
    ...defaultCaptionShadow,
    fontFamily: "Georgia", fontSize: 56, fontWeight: 700, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.18, maxWidth: 84, color: "#FFFFFF", highlightColor: "#FFD447",
    background: true, backgroundColor: "#4B3A42", backgroundOpacity: 72, animation: "karaoke", previewAnimation: true,
  },
  "two-words": {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 66, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.5, wordSpacing: 0, lineHeight: 0.94, maxWidth: 78, color: "#FFFFFF", highlightColor: "#FFD447",
    background: true, backgroundColor: "#191416", backgroundOpacity: 78, animation: "pop", previewAnimation: true,
  },
  "yellow-highlight": {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 64, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.4, wordSpacing: 0, lineHeight: 1.02, maxWidth: 88, color: "#FFFFFF", highlightColor: "#FFD447",
    background: true, backgroundColor: "#191416", backgroundOpacity: 78, animation: "karaoke", previewAnimation: true,
  },
  clean: {
    ...defaultCaptionShadow,
    shadowOpacity: 56,
    shadowBlur: 5,
    fontFamily: "Lato",
    fontSize: 52,
    fontWeight: 600,
    textAlign: "center",
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    wordSpacing: 0,
    lineHeight: 1.25,
    maxWidth: 84,
    color: "#FFFFFF",
    highlightColor: "#FFFFFF",
    background: false,
    backgroundColor: "#191416",
    backgroundOpacity: 74,
    animation: "karaoke",
    previewAnimation: true,
  },
  preview: {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 58, fontWeight: 800, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.25, maxWidth: 84, color: "#FFFFFF", highlightColor: "#38BDF8",
    background: true, backgroundColor: "#191416", backgroundOpacity: 72, animation: "karaoke", previewAnimation: true,
  },
  "one-word": {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 70, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.5, wordSpacing: 0, lineHeight: 1, maxWidth: 82, color: "#FFFFFF", highlightColor: "#38BDF8",
    background: false, backgroundColor: "#191416", backgroundOpacity: 74, animation: "pop", previewAnimation: true,
  },
  skewed: {
    ...defaultCaptionShadow,
    fontFamily: "Barlow Condensed", fontSize: 58, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.6, wordSpacing: 0, lineHeight: 1, maxWidth: 88, color: "#FFFFFF", highlightColor: "#38BDF8",
    background: true, backgroundColor: "#191416", backgroundOpacity: 78, animation: "pop", previewAnimation: true,
  },
  outline: {
    ...defaultCaptionShadow,
    fontFamily: "Lato", fontSize: 62, fontWeight: 900, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: -0.3, wordSpacing: 0, lineHeight: 1.06, maxWidth: 86, color: "#FFFFFF", highlightColor: "#FFD447",
    background: false, backgroundColor: "#191416", backgroundOpacity: 74, animation: "pop", previewAnimation: true,
  },
  minimal: {
    ...defaultCaptionShadow,
    shadowOpacity: 68,
    shadowBlur: 5,
    fontFamily: "Lato", fontSize: 48, fontWeight: 500, textAlign: "left", italic: false, uppercase: false,
    letterSpacing: 0, wordSpacing: 0, lineHeight: 1.25, maxWidth: 76, color: "#FFFFFF", highlightColor: "#FFFFFF",
    background: false, backgroundColor: "#191416", backgroundOpacity: 74, animation: "karaoke", previewAnimation: true,
  },
  "creator-build": {
    ...defaultCaptionShadow,
    shadowOpacity: 72,
    shadowBlur: 5,
    fontFamily: "Inter", fontSize: 64, fontWeight: 900, textAlign: "center", italic: false, uppercase: false,
    letterSpacing: -0.8, wordSpacing: 0, lineHeight: 1.02, maxWidth: 88, color: "#FFFFFF", highlightColor: "#FFB000",
    background: false, backgroundColor: "#191416", backgroundOpacity: 74, animation: "build", previewAnimation: true,
  },
  "creator-outline": {
    ...defaultCaptionShadow,
    shadowOpacity: 100,
    shadowBlur: 10,
    shadowOffsetY: 2,
    fontFamily: "Archivo Black", fontSize: 72, fontWeight: 900, textAlign: "center", italic: false, uppercase: true,
    letterSpacing: -0.8, wordSpacing: 1, lineHeight: 0.96, maxWidth: 84, color: "#FFFFFF", highlightColor: "#F2ED00",
    background: false, backgroundColor: "#000000", backgroundOpacity: 0, animation: "karaoke", previewAnimation: true,
  },
};

function getActiveParagraph(paragraphs: TranscriptParagraph[], currentTime: number) {
  return paragraphs.find((paragraph) => {
    const timedWords = paragraph.words.filter((word) => word.end > word.start);
    if (!timedWords.length) return currentTime >= paragraph.start && currentTime < paragraph.end;
    const speechStart = Math.min(...timedWords.map((word) => word.start));
    const speechEnd = Math.max(...timedWords.map((word) => word.end));
    return currentTime >= speechStart && currentTime < speechEnd;
  });
}

function translationForTimeRange(paragraph: TranscriptParagraph, start: number, end: number) {
  const translatedWords = paragraph.translation.trim().split(/\s+/).filter(Boolean);
  if (!translatedWords.length) return "";
  const paragraphDuration = Math.max(0.001, paragraph.end - paragraph.start);
  const startProgress = Math.max(0, Math.min(1, (start - paragraph.start) / paragraphDuration));
  const endProgress = Math.max(startProgress, Math.min(1, (end - paragraph.start) / paragraphDuration));
  const firstWord = Math.min(translatedWords.length - 1, Math.floor(startProgress * translatedWords.length));
  const lastWord = Math.max(firstWord + 1, Math.min(translatedWords.length, Math.ceil(endProgress * translatedWords.length)));
  return translatedWords.slice(firstWord, lastWord).join(" ");
}

function AnalysisProcessingPanel({ steps, message }: { steps: ReturnType<typeof useEditorStore.getState>["analysisSteps"]; message: string }) {
  return <div className="analysis-processing" role="status" aria-live="polite" aria-label={`Video processing. ${message}`}>
    <div className="analysis-processing-heading">
      <AIPixelSpinner />
      <div><strong>Preparing your transcript</strong><span>{message}</span></div>
    </div>
    <ol className="analysis-steps">
      {steps.map((step) => <li key={step.id} className={`analysis-step ${step.status}`}>
        <span className="analysis-step-marker" aria-hidden="true">{step.status === "active" ? <span className="analysis-step-loader" /> : step.status === "complete" ? "✓" : step.status === "error" ? "!" : ""}</span>
        <span><strong>{step.label}</strong><small>{step.message}</small></span>
        <em>{step.status === "active" ? "In progress" : step.status === "complete" ? "Done" : step.status === "error" ? "Stopped" : "Waiting"}</em>
      </li>)}
    </ol>
    <p>Keep this tab open. The video preview remains available while transcript content stays hidden until validation finishes.</p>
  </div>;
}

function colorWithOpacity(color: string, opacity: number) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const value = Number.parseInt(hex, 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${Math.max(0, Math.min(100, opacity)) / 100})`;
}

function contrastTextForColor(color: string) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const value = Number.parseInt(hex, 16);
  const red = value >> 16;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (red * 299 + green * 587 + blue * 114) / 1000 > 156 ? "#171316" : "#ffffff";
}

function speechStateAtTime(words: TranscriptWord[], currentTime: number) {
  const timedWords = words.filter((word) => word.end > word.start).sort((a, b) => a.start - b.start);
  const totalSpeech = timedWords.reduce((sum, word) => sum + word.end - word.start, 0);
  if (!timedWords.length || totalSpeech <= 0) return { progress: 0, timedWords, totalSpeech: 0, sourceWord: -1, sourceWordProgress: 0, inGap: true };
  let spoken = 0;
  for (let index = 0; index < timedWords.length; index += 1) {
    const word = timedWords[index];
    if (currentTime < word.start) {
      return {
        progress: Math.max(0, Math.min(1, spoken / totalSpeech)),
        timedWords,
        totalSpeech,
        sourceWord: Math.max(0, index - 1),
        sourceWordProgress: index ? 1 : 0,
        inGap: true,
      };
    }
    if (currentTime >= word.end) {
      spoken += word.end - word.start;
      continue;
    }
    const sourceWordProgress = Math.max(0, Math.min(1, (currentTime - word.start) / (word.end - word.start)));
    spoken += (word.end - word.start) * sourceWordProgress;
    return { progress: Math.max(0, Math.min(1, spoken / totalSpeech)), timedWords, totalSpeech, sourceWord: index, sourceWordProgress, inGap: false };
  }
  return { progress: 1, timedWords, totalSpeech, sourceWord: timedWords.length - 1, sourceWordProgress: 1, inGap: false };
}

function captionWordStateAtTime(words: TranscriptWord[], currentTime: number, captionWordCount: number, exactSourceWords = false) {
  const speech = speechStateAtTime(words, currentTime);
  if (!captionWordCount) return { progress: speech.progress, activeWord: -1, pageAnchorWord: -1, activeWordProgress: 0, activeWordDuration: 0, timingMode: "empty" as const };

  // Source captions can follow Whisper's word windows exactly, including natural pauses.
  if (exactSourceWords && captionWordCount === speech.timedWords.length && speech.sourceWord >= 0) {
    const activeSourceWord = speech.timedWords[speech.sourceWord];
    return {
      progress: speech.progress,
      activeWord: speech.inGap ? -1 : speech.sourceWord,
      pageAnchorWord: speech.sourceWord,
      activeWordProgress: speech.inGap ? 0 : speech.sourceWordProgress,
      activeWordDuration: speech.inGap ? 0 : activeSourceWord.end - activeSourceWord.start,
      timingMode: "exact-word-timestamps" as const,
    };
  }

  // A translation rarely has the same number of words as its source. Map it monotonically
  // over spoken time, while retaining only the page anchor through source-language pauses.
  const scaledProgress = speech.progress * captionWordCount;
  const heldProgress = speech.inGap && scaledProgress > 0 && scaledProgress < captionWordCount
    ? Math.max(0, scaledProgress - 0.000001)
    : scaledProgress;
  const activeWord = Math.min(captionWordCount - 1, Math.floor(heldProgress));
  const activeWordProgress = speech.progress >= 1 ? 1 : speech.inGap ? 1 : Math.max(0, Math.min(1, scaledProgress - activeWord));
  return {
    progress: speech.progress,
    activeWord: speech.inGap ? -1 : activeWord,
    pageAnchorWord: activeWord,
    activeWordProgress: speech.inGap ? 0 : activeWordProgress,
    activeWordDuration: speech.inGap ? 0 : speech.totalSpeech / captionWordCount,
    timingMode: "source-speech-aligned" as const,
  };
}

type CaptionPageWord = { text: string; index: number };

type CaptionMeasure = (text: string) => number;

function paginateCaptionWords(words: string[], maxLineWidth: number, measureWord: CaptionMeasure, measureSpace: CaptionMeasure) {
  const lines: CaptionPageWord[][] = [];
  let currentLine: CaptionPageWord[] = [];
  let currentWidth = 0;

  words.forEach((text, index) => {
    const wordWidth = measureWord(text);
    const nextWidth = currentWidth + (currentLine.length ? measureSpace(" ") : 0) + wordWidth;
    if (currentLine.length && nextWidth > maxLineWidth) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
    currentLine.push({ text, index });
    currentWidth += (currentLine.length > 1 ? measureSpace(" ") : 0) + wordWidth;
  });
  if (currentLine.length) lines.push(currentLine);

  const pages: CaptionPageWord[][][] = [];
  for (let index = 0; index < lines.length; index += 2) pages.push(lines.slice(index, index + 2));
  return pages.length ? pages : [[[ { text: "No subtitle", index: 0 } ]]];
}

function approximateCaptionWidth(text: string, fontSize: number, letterSpacing: number, wordPadding: number) {
  return text.length * fontSize * 0.58 + Math.max(0, text.length - 1) * letterSpacing + wordPadding;
}

function useCaptionPages(words: string[], style: SubtitleStyle, maxLineWidth: number, wordPadding: number) {
  const fixedPageSize = style.template === "creator-outline" ? 3 : undefined;
  const fallbackPages = useMemo(() => {
    const measureWord = (text: string) => approximateCaptionWidth(text, Math.max(14, style.fontSize / 2.8), style.letterSpacing, wordPadding);
    const measureSpace = () => Math.max(4, Math.max(14, style.fontSize / 2.8) * 0.28 + style.wordSpacing + style.letterSpacing);
    return fixedPageSize
      ? paginateFixedCaptionWords(words, maxLineWidth, measureWord, measureSpace, fixedPageSize)
      : paginateCaptionWords(words, maxLineWidth, measureWord, measureSpace);
  }, [fixedPageSize, words, maxLineWidth, style.fontSize, style.letterSpacing, style.wordSpacing, wordPadding]);
  const [measuredPages, setMeasuredPages] = useState(fallbackPages);

  useEffect(() => {
    if (!words.length || typeof document === "undefined") return;
    let cancelled = false;
    const measure = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      const fontSize = Math.max(14, style.fontSize / 2.8);
      context.font = `${style.italic ? "italic " : ""}${style.fontWeight} ${fontSize}px ${JSON.stringify(style.fontFamily)}, sans-serif`;
      const displayText = (text: string) => style.uppercase ? text.toLocaleUpperCase() : text;
      const textWidth = (text: string) => {
        const value = displayText(text);
        return context.measureText(value).width + Math.max(0, value.length - 1) * style.letterSpacing;
      };
      const measureWord = (text: string) => textWidth(text) + wordPadding;
      const measureSpace = () => context.measureText(" ").width + style.wordSpacing + style.letterSpacing;
      const nextPages = fixedPageSize
        ? paginateFixedCaptionWords(words, maxLineWidth, measureWord, measureSpace, fixedPageSize)
        : paginateCaptionWords(words, maxLineWidth, measureWord, measureSpace);
      if (!cancelled) setMeasuredPages(nextPages);
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => { cancelled = true; };
  }, [fallbackPages, fixedPageSize, maxLineWidth, style.fontFamily, style.fontSize, style.fontWeight, style.italic, style.uppercase, style.letterSpacing, style.wordSpacing, wordPadding, words]);

  return words.length ? measuredPages : fallbackPages;
}

type TranslationState = "idle" | "updating" | "error";

const LONG_FORM_CAPTION_RENDER_COMPENSATION_SECONDS = 0.04;

function SubtitlePreview({ currentTime, style, frameWidth, paragraph, translationState = "idle" }: { currentTime: number; style: SubtitleStyle; frameWidth: number; paragraph?: TranscriptParagraph; translationState?: TranslationState }) {
  const animation = style.animation ?? "karaoke";
  const showsActiveWordTreatment = style.template !== "clean" && style.template !== "minimal";
  const previewAnimation = style.previewAnimation !== false;
  const isShortFormCaption = style.template === "one-word" || style.template === "two-words";
  const renderCompensation = previewAnimation && !isShortFormCaption ? LONG_FORM_CAPTION_RENDER_COMPENSATION_SECONDS : 0;
  const transcriptText = paragraph?.words.map((word) => word.text).join(" ").trim() ?? "";
  const translatedText = paragraph?.translation.trim() ?? "";
  const captionSource = translationState === "idle" && translatedText ? "translation" : "transcript";
  const subtitleText = captionSource === "translation" ? translatedText : transcriptText;
  const subtitleWords = useMemo(() => subtitleText.split(/\s+/).filter(Boolean), [subtitleText]);
  const timedCaption = captionWordStateAtTime(paragraph?.words ?? [], currentTime + renderCompensation, subtitleWords.length, captionSource === "transcript");
  const progress = timedCaption.progress;
  const activeWord = previewAnimation ? timedCaption.activeWord : -1;
  const pageAnchorWord = previewAnimation ? timedCaption.pageAnchorWord : 0;
  const maxLineWidth = Math.max(48, frameWidth * (style.maxWidth / 100) - 16);
  const captionPages = useCaptionPages(subtitleWords, style, maxLineWidth, animation === "typewriter" || animation === "build" ? 0 : 4);
  const activePageIndex = previewAnimation && pageAnchorWord >= 0
    ? Math.max(0, captionPages.findIndex((page) => page.some((line) => line.some((word) => word.index === pageAnchorWord))))
    : 0;
  const activePage = captionPages[activePageIndex] ?? captionPages[0];
  const activePageWords = activePage.flat();
  const activePageStartWord = activePageWords[0]?.index ?? 0;
  const activePageEndWord = activePageWords.at(-1)?.index ?? 0;
  if (!paragraph || !subtitleText) return null;
  const captionIdentity = `${paragraph.id}:${captionSource}:${subtitleText}`;
  const className = `subtitle-preview template-${style.template} animation-${animation}`;
  const horizontalPosition = style.horizontalPosition ?? "center";
  const horizontalStyle: React.CSSProperties = horizontalPosition === "left"
    ? { left: "6%", right: "auto", width: "max-content", maxWidth: `${style.maxWidth}%`, transform: "none" }
    : horizontalPosition === "right"
      ? { left: "auto", right: "6%", width: "max-content", maxWidth: `${style.maxWidth}%`, transform: "none" }
      : { left: "50%", right: "auto", width: "max-content", maxWidth: `${style.maxWidth}%`, transform: "translateX(-50%)" };
  const captionTextShadow = style.shadow
    ? `${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${colorWithOpacity(style.shadowColor, style.shadowOpacity)}`
    : "none";
  const captionLineHeight = normalizeCaptionLineHeight(style.lineHeight);
  const sharedStyle: React.CSSProperties = {
    bottom: `${100 - style.position}%`,
    ...horizontalStyle,
    fontFamily: style.fontFamily,
    fontSize: `${Math.max(14, style.fontSize / 2.8)}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : undefined,
    textTransform: style.uppercase ? "uppercase" : undefined,
    textAlign: style.textAlign,
    letterSpacing: `${style.letterSpacing}px`,
    wordSpacing: `${style.wordSpacing}px`,
    lineHeight: captionLineHeight,
    color: style.color,
    background: style.background ? colorWithOpacity(style.backgroundColor ?? "#191416", style.backgroundOpacity ?? 74) : "transparent",
    ...({
      "--caption-text-shadow": captionTextShadow,
      "--caption-line-height": String(captionLineHeight),
      "--caption-outline-color": colorWithOpacity(style.shadowColor, style.shadowOpacity),
      "--caption-outline-width": style.shadow ? `${Math.max(1, style.shadowBlur / 4)}px` : "0px",
      "--caption-highlight-duration": "0ms",
      "--creator-build-duration": "0ms",
    } as React.CSSProperties),
  };

  if (style.template === "one-word") {
    const oneWordIndex = previewAnimation ? Math.max(0, pageAnchorWord) : 0;
    const oneWord = subtitleWords[oneWordIndex] ?? "No subtitle";
    return <div
      className={className}
      aria-label={subtitleText}
      data-animation={animation}
      data-anchor-x={horizontalPosition}
      data-anchor-y={style.position}
      data-timing-source="transcript-words"
      data-timing-mode={timedCaption.timingMode}
      data-template={style.template}
      data-caption-identity={captionIdentity}
      data-caption-source={captionSource}
      data-render-compensation-ms={renderCompensation * 1000}
      data-speech-progress={progress.toFixed(4)}
      data-active-word={oneWordIndex}
      data-active-caption-word={oneWord}
      style={{ ...sharedStyle, background: "transparent", padding: 0 }}
    >
      <span
        key={`${paragraph?.id ?? "empty"}-${oneWordIndex}-${oneWord}`}
        className="one-word-caption"
        style={{ backgroundColor: style.highlightColor, color: contrastTextForColor(style.highlightColor) }}
      >{oneWord}</span>
    </div>;
  }

  if (style.template === "two-words") {
    const currentWordIndex = previewAnimation ? Math.max(0, pageAnchorWord) : 0;
    const groupStart = Math.floor(currentWordIndex / 2) * 2;
    const wordGroup = subtitleWords.slice(groupStart, groupStart + 2);
    const visibleWordGroup = wordGroup.length ? wordGroup : ["No subtitle"];
    return <div
      className={className}
      aria-label={subtitleText}
      data-animation={animation}
      data-anchor-x={horizontalPosition}
      data-anchor-y={style.position}
      data-timing-source="transcript-words"
      data-timing-mode={timedCaption.timingMode}
      data-template={style.template}
      data-caption-identity={captionIdentity}
      data-caption-source={captionSource}
      data-render-compensation-ms={renderCompensation * 1000}
      data-speech-progress={progress.toFixed(4)}
      data-word-group-start={groupStart}
      data-active-caption-words={visibleWordGroup.join(" ")}
      style={sharedStyle}
    >
      <span key={`${paragraph?.id ?? "empty"}-${groupStart}`} className="two-word-caption" aria-hidden="true">
        {visibleWordGroup.map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}
      </span>
    </div>;
  }

  if (animation === "build") {
    const buildActiveWord = previewAnimation ? Math.max(activePageStartWord, pageAnchorWord) : activePageEndWord;
    const visibleLines = activePage
      .map((line) => line.filter((word) => word.index <= buildActiveWord))
      .filter((line) => line.length > 0);
    const activeCaptionWord = activePageWords.find((word) => word.index === activeWord)?.text ?? "";
    return <div
      className={className}
      aria-label={subtitleText}
      data-animation={animation}
      data-template={style.template}
      data-anchor-x={horizontalPosition}
      data-anchor-y={style.position}
      data-timing-source="transcript-words"
      data-timing-mode={timedCaption.timingMode}
      data-caption-identity={captionIdentity}
      data-caption-source={captionSource}
      data-render-compensation-ms={renderCompensation * 1000}
      data-speech-progress={progress.toFixed(4)}
      data-active-word={activeWord}
      data-active-caption-word={activeCaptionWord}
      data-active-word-progress={timedCaption.activeWordProgress.toFixed(4)}
      data-caption-page={activePageIndex + 1}
      data-caption-pages={captionPages.length}
      data-page-start-word={activePageStartWord}
      data-page-end-word={activePageEndWord}
      style={{ ...sharedStyle, background: "transparent" }}
    >
      <span className="caption-page creator-build-page" aria-hidden="true">
        {visibleLines.map((line, lineIndex) => <span className="caption-line creator-build-line" key={`${captionIdentity}-${activePageIndex}-${lineIndex}`}>
          {line.map((word, wordIndex) => {
            const isActive = word.index === activeWord;
            return <Fragment key={`${captionIdentity}-${word.index}`}>
              <span
                className={`creator-build-word${isActive ? " is-active" : ""}`}
                style={{ color: isActive ? style.highlightColor : style.color }}
              >{word.text}</span>
              {wordIndex < line.length - 1 ? " " : null}
            </Fragment>;
          })}
        </span>)}
      </span>
    </div>;
  }

  if (animation === "typewriter") {
    const revealWord = activeWord >= 0 ? activeWord : pageAnchorWord;
    const visiblePageText = previewAnimation
      ? activePage.map((line) => line.map((word) => {
        if (word.index < revealWord) return word.text;
        if (word.index > revealWord) return "";
        const wordProgress = activeWord >= 0 ? timedCaption.activeWordProgress : 1;
        const visibleCharacters = Math.max(1, Math.ceil(word.text.length * wordProgress));
        return word.text.slice(0, visibleCharacters);
      }).filter(Boolean).join(" ")).filter(Boolean).join("\n")
      : activePage.map((line) => line.map((word) => word.text).join(" ")).join("\n");
    return <div className={className} aria-label={subtitleText} data-animation={animation} data-template={style.template} data-anchor-x={horizontalPosition} data-anchor-y={style.position} data-timing-source="transcript-words" data-timing-mode={timedCaption.timingMode} data-caption-identity={captionIdentity} data-caption-source={captionSource} data-render-compensation-ms={renderCompensation * 1000} data-speech-progress={progress.toFixed(4)} data-active-word={activeWord} data-active-word-progress={timedCaption.activeWordProgress.toFixed(4)} data-caption-page={activePageIndex + 1} data-caption-pages={captionPages.length} data-page-start-word={activePageStartWord} data-page-end-word={activePageEndWord} style={sharedStyle}>{visiblePageText}<span className="typewriter-cursor" aria-hidden="true">|</span></div>;
  }

  return <div className={className} aria-label={subtitleText} data-animation={animation} data-template={style.template} data-anchor-x={horizontalPosition} data-anchor-y={style.position} data-timing-source="transcript-words" data-timing-mode={timedCaption.timingMode} data-caption-identity={captionIdentity} data-caption-source={captionSource} data-render-compensation-ms={renderCompensation * 1000} data-speech-progress={progress.toFixed(4)} data-active-word={activeWord} data-active-word-progress={timedCaption.activeWordProgress.toFixed(4)} data-caption-page={activePageIndex + 1} data-caption-pages={captionPages.length} data-page-start-word={activePageStartWord} data-page-end-word={activePageEndWord} style={sharedStyle}>
    <span className="caption-page" aria-hidden="true">
      {activePage.map((line, lineIndex) => <span className="caption-line" key={`${paragraph?.id ?? "empty"}-${activePageIndex}-${lineIndex}`}>
        {line.map((word, wordIndex) => {
          const isActive = showsActiveWordTreatment && word.index === activeWord;
          const isPast = showsActiveWordTreatment && (activeWord >= 0 ? word.index < activeWord : word.index <= pageAnchorWord);
          const usesCreatorOutline = style.template === "creator-outline";
          const usesFilledHighlight = !usesCreatorOutline && (style.template === "preview" || style.template === "yellow-highlight" || animation === "karaoke" || animation === "pop");
          const activeStyle = isActive ? usesCreatorOutline
            ? { color: style.highlightColor, backgroundColor: "transparent" }
            : usesFilledHighlight
            ? { color: contrastTextForColor(style.highlightColor), backgroundColor: style.highlightColor }
            : { color: style.highlightColor, backgroundColor: animation === "karaoke" ? "rgba(0,0,0,.38)" : undefined }
            : undefined;
          return <Fragment key={`${word.text}-${word.index}`}>
            <span className={`animated-word${isActive ? " is-active" : ""}${isPast ? " is-past" : ""}`} style={activeStyle}>{word.text}</span>
            {wordIndex < line.length - 1 ? " " : null}
          </Fragment>;
        })}
      </span>)}
    </span>
  </div>;
}

function TimelineAssetPlayback({ clip, currentTime, playing, playbackRate }: { clip: TimelineAssetClip; currentTime: number; playing: boolean; playbackRate: number }) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const visibleDuration = clip.sourceEnd - clip.sourceStart;
  const active = currentTime >= clip.start && currentTime < clip.start + visibleDuration;
  const localTime = clip.sourceStart + Math.max(0, Math.min(visibleDuration, currentTime - clip.start));

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = playbackRate;
    if (Math.abs(media.currentTime - localTime) > 0.08) media.currentTime = localTime;
    if (active && playing) void media.play().catch(() => undefined);
    else media.pause();
  }, [active, localTime, playbackRate, playing]);

  if (clip.type === "image") {
    return active ? <div className="timeline-asset-preview-media is-image" style={{ backgroundImage: `url(${clip.url})` }} aria-label={`${clip.name} image overlay`} /> : null;
  }
  if (clip.type === "audio") return <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={clip.url} preload="auto" aria-label={`${clip.name} audio clip`} />;
  return <video ref={mediaRef as React.RefObject<HTMLVideoElement>} className={`timeline-asset-preview-media${active ? " is-active" : ""}`} src={clip.url} preload="auto" playsInline muted aria-label={`${clip.name} video overlay`} />;
}

function TimelineAssetThumbnail({ clip }: { clip: TimelineAssetClip }) {
  const [thumbnail, setThumbnail] = useState(clip.type === "image" ? clip.url : "");
  useEffect(() => {
    if (clip.type !== "video") return;
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = clip.url;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(clip.sourceEnd - 0.01, clip.sourceStart + Math.min(0.5, (clip.sourceEnd - clip.sourceStart) / 2));
    };
    video.onseeked = () => {
      if (cancelled || !video.videoWidth || !video.videoHeight) return;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(320, video.videoWidth);
      canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnail(canvas.toDataURL("image/jpeg", 0.72));
    };
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [clip.sourceEnd, clip.sourceStart, clip.type, clip.url]);
  return <span className={`timeline-asset-thumbnail is-${clip.type}`} style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : undefined} aria-hidden="true" />;
}

export function EditorApp() {
  const state = useEditorStore();
  const setCurrentTime = state.setCurrentTime;
  const setPlaying = state.setPlaying;
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastMediaClockTimeRef = useRef<number | null>(null);
  const pendingMediaSeekTimeRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const transcriptFollowPausedUntilRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [sourceMode, setSourceMode] = useState<"cleaned" | "original">("cleaned");
  const [previewZoom, setPreviewZoom] = useState(18);
  const [fitZoom, setFitZoom] = useState(18);
  const [isFitZoom, setIsFitZoom] = useState(true);
  const [activeSection, setActiveSection] = useState<EditorSection>("Speech cleanup");
  const [showBefore, setShowBefore] = useState(false);
  const [colorPreviewState, setColorPreviewState] = useState<"checking" | "ready" | "unavailable" | "error">("checking");
  const [colorFrameUrl, setColorFrameUrl] = useState<string | null>(null);
  const [lutPreviewCache, setLutPreviewCache] = useState<Record<string, CubeLut>>({});
  const [sourceStorage, setSourceStorage] = useState<{ status: "idle" | "storing" | "stored" | "failed"; message: string }>({ status: "idle", message: "" });
  const sourceStorageFileRef = useRef<File | null>(null);
  const sourceStorageAttemptRef = useRef(0);
  const analysisRequestIdRef = useRef(0);

  useEffect(() => {
    const hideTimers = new Map<HTMLElement, number>();
    const showActiveScrollThumb = (event: Event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const scrollArea = event.target;
      scrollArea.dataset.scrolling = "true";
      const pendingTimer = hideTimers.get(scrollArea);
      if (pendingTimer) window.clearTimeout(pendingTimer);
      const hideTimer = window.setTimeout(() => {
        delete scrollArea.dataset.scrolling;
        hideTimers.delete(scrollArea);
      }, 650);
      hideTimers.set(scrollArea, hideTimer);
    };

    document.addEventListener("scroll", showActiveScrollThumb, true);
    return () => {
      document.removeEventListener("scroll", showActiveScrollThumb, true);
      hideTimers.forEach((timer) => window.clearTimeout(timer));
      hideTimers.forEach((_, scrollArea) => delete scrollArea.dataset.scrolling);
    };
  }, []);

  useEffect(() => {
    const restoreGrade = (event: KeyboardEvent) => { if (event.key === "Escape") setShowBefore(false); };
    window.addEventListener("keydown", restoreGrade);
    return () => window.removeEventListener("keydown", restoreGrade);
  }, []);

  useEffect(() => {
    if (activeSection !== "Color" || state.playing) return;
    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = 144;
      canvas.height = Math.max(72, Math.round(144 * video.videoHeight / video.videoWidth));
      const context = canvas.getContext("2d");
      if (!context) return;
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setColorFrameUrl(canvas.toDataURL("image/jpeg", 0.76));
      } catch {
        setColorFrameUrl(null);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, state.currentTime, state.playing, state.mediaUrl]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoSave, setAutoSave] = useState(true);
  const [safeGuides, setSafeGuides] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [wordDraft, setWordDraft] = useState("");
  const [translationStates, setTranslationStates] = useState<Record<string, "idle" | "updating" | "error">>({});
  const translationTimersRef = useRef<Map<string, number>>(new Map());
  const translationControllersRef = useRef<Map<string, AbortController>>(new Map());
  const translationVersionsRef = useRef<Map<string, number>>(new Map());
  const translationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const translationDisposedRef = useRef(false);

  const sourceWidth = state.media?.width || 2160;
  const sourceHeight = state.media?.height || 3840;
  const duration = state.media?.duration || 15.8;
  const removedRanges = useMemo(() => mergeTimeRanges([
    ...state.issues.filter((issue) => state.removedIssueIds.includes(issue.id)),
    ...state.deletedRanges
  ], duration), [duration, state.deletedRanges, state.issues, state.removedIssueIds]);
  const visibleParagraphs = useMemo(() => state.paragraphs.flatMap((paragraph) => keptTimeRanges(duration, removedRanges).flatMap((kept) => {
    const start = Math.max(paragraph.start, kept.start);
    const end = Math.min(paragraph.end, kept.end);
    if (end <= start) return [];
    const words = paragraph.words.filter((word) => word.end > start && word.start < end);
    if (!words.length) return [];
    return [{ ...paragraph, start, end, words, translation: translationForTimeRange(paragraph, start, end) || paragraph.translation }];
  })), [duration, state.paragraphs, removedRanges]);

  const queueTranslationRefresh = useCallback((paragraphId: string) => {
    const pendingTimer = translationTimersRef.current.get(paragraphId);
    if (pendingTimer) window.clearTimeout(pendingTimer);
    translationControllersRef.current.get(paragraphId)?.abort();
    const version = (translationVersionsRef.current.get(paragraphId) ?? 0) + 1;
    translationVersionsRef.current.set(paragraphId, version);
    setTranslationStates((current) => ({ ...current, [paragraphId]: "updating" }));

    const timer = window.setTimeout(() => {
      translationTimersRef.current.delete(paragraphId);
      translationQueueRef.current = translationQueueRef.current.catch(() => undefined).then(async () => {
        if (translationDisposedRef.current || translationVersionsRef.current.get(paragraphId) !== version) return;
        const paragraph = useEditorStore.getState().paragraphs.find((item) => item.id === paragraphId);
        if (!paragraph) return;
        const sourceText = paragraph.words.map((word) => word.text).join(" ").trim();
        if (!sourceText) {
          useEditorStore.getState().setParagraphTranslation(paragraphId, "");
          setTranslationStates((current) => ({ ...current, [paragraphId]: "idle" }));
          setNotice("Empty paragraph removed from English subtitles");
          return;
        }

        const controller = new AbortController();
        translationControllersRef.current.set(paragraphId, controller);
        try {
          const response = await fetch("/api/ai/refresh-translation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paragraphId, sourceText, currentTranslation: paragraph.translation }),
            signal: controller.signal
          });
          const payload: unknown = await response.json();
          if (!response.ok) {
            const message = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : "English subtitle update failed";
            throw new Error(message);
          }
          const result = refreshTranslationResponseSchema.parse(payload);
          const currentParagraph = useEditorStore.getState().paragraphs.find((item) => item.id === paragraphId);
          const currentSource = currentParagraph?.words.map((word) => word.text).join(" ").trim();
          if (translationVersionsRef.current.get(paragraphId) !== version || currentSource !== sourceText) return;
          useEditorStore.getState().setParagraphTranslation(paragraphId, result.englishTranslation);
          setTranslationStates((current) => ({ ...current, [paragraphId]: "idle" }));
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (translationVersionsRef.current.get(paragraphId) !== version) return;
          setTranslationStates((current) => ({ ...current, [paragraphId]: "error" }));
          setNotice(error instanceof Error ? error.message : "English subtitle update failed");
        } finally {
          if (translationControllersRef.current.get(paragraphId) === controller) translationControllersRef.current.delete(paragraphId);
        }
      });
    }, 650);
    translationTimersRef.current.set(paragraphId, timer);
  }, []);

  useEffect(() => {
    const timers = translationTimersRef.current;
    const controllers = translationControllersRef.current;
    const versions = translationVersionsRef.current;
    translationDisposedRef.current = false;
    return () => {
      translationDisposedRef.current = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      controllers.forEach((controller) => controller.abort());
      versions.clear();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateFit = () => {
      const box = stage.getBoundingClientRect();
      const nextFit = Math.max(5, Math.min(100, Math.floor(Math.min((box.width - 52) / sourceWidth, (box.height - 28) / sourceHeight) * 1000) / 10));
      setFitZoom(nextFit);
      if (isFitZoom) setPreviewZoom(nextFit);
    };
    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [sourceWidth, sourceHeight, isFitZoom]);

  function changePreviewZoom(next: number) {
    setIsFitZoom(false);
    setPreviewZoom(Math.max(5, Math.min(200, Math.round(next * 10) / 10)));
  }

  function fitPreview() {
    setIsFitZoom(true);
    setPreviewZoom(fitZoom);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let videoFrameHandle: number | null = null;
    let animationFrameHandle: number | null = null;
    const hasVideoFrameClock = typeof video.requestVideoFrameCallback === "function";

    lastMediaClockTimeRef.current = null;
    pendingMediaSeekTimeRef.current = null;

    const commitMediaTime = (mediaTime: number) => {
      if (!Number.isFinite(mediaTime)) return;
      const pendingSeek = pendingMediaSeekTimeRef.current;
      if (pendingSeek !== null && (video.seeking || Math.abs(mediaTime - pendingSeek) > 0.08)) return;
      const removed = removedRangeAtTime(mediaTime, removedRanges);
      const nextTime = removed?.end ?? mediaTime;
      if (removed && Math.abs(video.currentTime - nextTime) > 0.0005) {
        pendingMediaSeekTimeRef.current = nextTime;
        video.currentTime = nextTime;
      } else if (pendingSeek !== null) {
        pendingMediaSeekTimeRef.current = null;
      }
      lastMediaClockTimeRef.current = nextTime;
      if (Math.abs(useEditorStore.getState().currentTime - nextTime) > 0.0005) setCurrentTime(nextTime);
    };

    const syncFromMediaElement = () => commitMediaTime(video.currentTime);
    const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
      commitMediaTime(metadata.mediaTime);
      if (!disposed) videoFrameHandle = video.requestVideoFrameCallback(onVideoFrame);
    };
    const onAnimationFrame = () => {
      animationFrameHandle = null;
      syncFromMediaElement();
      if (!disposed && !video.paused && !video.ended) animationFrameHandle = window.requestAnimationFrame(onAnimationFrame);
    };
    const startFallbackClock = () => {
      if (hasVideoFrameClock || animationFrameHandle !== null) return;
      animationFrameHandle = window.requestAnimationFrame(onAnimationFrame);
    };
    const onTimeUpdate = () => {
      if (!hasVideoFrameClock) syncFromMediaElement();
    };
    const onSeeked = () => {
      pendingMediaSeekTimeRef.current = null;
      syncFromMediaElement();
    };
    const onPause = () => syncFromMediaElement();

    if (hasVideoFrameClock) videoFrameHandle = video.requestVideoFrameCallback(onVideoFrame);
    else startFallbackClock();
    video.addEventListener("loadedmetadata", syncFromMediaElement);
    video.addEventListener("play", startFallbackClock);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);

    return () => {
      disposed = true;
      if (videoFrameHandle !== null) video.cancelVideoFrameCallback(videoFrameHandle);
      if (animationFrameHandle !== null) window.cancelAnimationFrame(animationFrameHandle);
      video.removeEventListener("loadedmetadata", syncFromMediaElement);
      video.removeEventListener("play", startFallbackClock);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
    };
  }, [state.mediaUrl, removedRanges, setCurrentTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (state.playing) void video.play(); else video.pause();
  }, [state.playing, state.mediaUrl]);

  useEffect(() => {
    if (!state.playing || state.mediaUrl) return;
    let frame = 0;
    let previousFrame = window.performance.now();
    const advancePlayback = (now: number) => {
      const current = useEditorStore.getState().currentTime;
      if (current >= duration) {
        setPlaying(false);
        return;
      }
      const elapsed = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
      previousFrame = now;
      const next = Math.min(duration, current + elapsed * playbackRate);
      const removed = removedRangeAtTime(next, removedRanges);
      setCurrentTime(removed?.end ?? next);
      frame = window.requestAnimationFrame(advancePlayback);
    };
    frame = window.requestAnimationFrame(advancePlayback);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, playbackRate, removedRanges, setCurrentTime, setPlaying, state.mediaUrl, state.playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    const targetTime = Math.min(state.currentTime, video.duration || state.currentTime);
    const cameFromMediaClock = lastMediaClockTimeRef.current !== null && Math.abs(lastMediaClockTimeRef.current - targetTime) <= 0.0005;
    if (!cameFromMediaClock && Math.abs(video.currentTime - targetTime) > 0.0005) {
      pendingMediaSeekTimeRef.current = targetTime;
      video.currentTime = targetTime;
    }
  }, [state.currentTime, state.mediaUrl, playbackRate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      const timelineHasKeyboardFocus = document.activeElement instanceof HTMLElement && Boolean(document.activeElement.closest(".timeline-scroll-viewport"));
      if (timelineHasKeyboardFocus && event.shiftKey && (event.code === "ArrowLeft" || event.code === "ArrowRight")) return;
      const key = event.key.toLowerCase();
      const commandKey = event.metaKey || event.ctrlKey;
      if (commandKey && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          const action = state.redoStack.at(-1)?.label;
          if (action) {
            state.redo();
            setNotice(`${action} redone`);
          }
        } else {
          const action = state.undoStack.at(-1)?.label;
          if (action) {
            state.undo();
            setNotice(`${action} undone`);
          }
        }
        return;
      }
      if (event.ctrlKey && key === "y") {
        event.preventDefault();
        const action = state.redoStack.at(-1)?.label;
        if (action) {
          state.redo();
          setNotice(`${action} redone`);
        }
        return;
      }
      if ((event.code === "Delete" || event.code === "Backspace") && selectedWordId) {
        event.preventDefault();
        const paragraphId = state.paragraphs.find((paragraph) => paragraph.words.some((word) => word.id === selectedWordId))?.id;
        state.deleteWord(selectedWordId);
        if (paragraphId) queueTranslationRefresh(paragraphId);
        setSelectedWordId(null);
        setNotice("Word and matching video removed · Undo available");
        return;
      }
      if (event.code === "Space") { event.preventDefault(); state.setPlaying(!state.playing); }
      if (event.code === "ArrowLeft") state.setCurrentTime(Math.max(0, state.currentTime - (event.shiftKey ? 5 : 0.1)));
      if (event.code === "ArrowRight") state.setCurrentTime(Math.min(duration, state.currentTime + (event.shiftKey ? 5 : 0.1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, duration, selectedWordId, queueTranslationRefresh]);

  async function storeSource(file: File) {
    const imported = await fetch("/api/media/import", { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file });
    const responseText = await imported.text();
    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error(imported.ok ? "The source storage response was invalid." : "Source storage is unavailable in this Mac build.");
    }
    if (!imported.ok || typeof payload !== "object" || !payload || !("sourceId" in payload)) {
      throw new Error(typeof payload === "object" && payload && "message" in payload ? String(payload.message) : "Local source import failed");
    }
    const probe = "probe" in payload && typeof payload.probe === "object" && payload.probe ? payload.probe as { colorInfo?: SourceColorInfo } : undefined;
    if (!probe?.colorInfo) throw new Error("The stored source could not be color-inspected.");
    return { sourceId: String(payload.sourceId), colorInfo: probe.colorInfo };
  }

  function attachStoredSource(sourcePromise: Promise<{ sourceId: string; colorInfo: SourceColorInfo }>, attempt: number) {
    void sourcePromise.then((source) => {
      if (sourceStorageAttemptRef.current !== attempt) return;
      state.setSourceInfo(source.sourceId, source.colorInfo);
      state.setWaveformUrl(`/api/media/${source.sourceId}/waveform`);
      setSourceStorage({ status: "stored", message: "Source video stored locally" });
      if (source.colorInfo.support.startsWith("unsupported") || source.colorInfo.support === "probe-unavailable") setNotice(source.colorInfo.reason || source.colorInfo.label);
    }).catch((error) => {
      if (sourceStorageAttemptRef.current !== attempt) return;
      const detail = error instanceof Error ? error.message : "Source storage failed.";
      setSourceStorage({ status: "failed", message: `${detail} Your open video is unchanged.` });
      setNotice("Source storage failed · Retry from Export");
    });
  }

  function retrySourceStorage() {
    const file = sourceStorageFileRef.current;
    if (!file) {
      inputRef.current?.click();
      return;
    }
    const attempt = ++sourceStorageAttemptRef.current;
    setSourceStorage({ status: "storing", message: "Saving source video locally…" });
    const sourcePromise = storeSource(file);
    void sourcePromise.catch(() => undefined);
    attachStoredSource(sourcePromise, attempt);
  }

  async function processLocally(sourcePromise: Promise<{ sourceId: string; colorInfo: SourceColorInfo }>, requestId: number) {
    try {
      const source = await sourcePromise;
      if (analysisRequestIdRef.current !== requestId) return;
      let response: Response;
      while (true) {
        response = await fetch("/api/ai/process-source?stream=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId: source.sourceId }) });
        if (response.status !== 429) break;
        const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
        if (payload?.error !== "PROCESSING_BUSY") throw new Error(payload?.message || "Local analysis could not start.");
        if (analysisRequestIdRef.current !== requestId) return;
        state.updateAnalysisStep("audio", "active", "Waiting for the current local analysis to finish…");
        state.setAIStatus("processing", "Waiting for the local speech engine…");
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      }
      if (!response.ok) {
        const responseText = await response.text();
        let payload: unknown;
        try { payload = JSON.parse(responseText); } catch { payload = null; }
        const message = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : "Video analysis could not start. Your open video is unchanged.";
        throw new Error(message);
      }
      if (!response.body) throw new Error("The analysis progress stream could not be opened.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: ProcessVideoResponse | null = null;
      const consumeLine = (line: string): ProcessVideoResponse | null => {
        if (!line.trim()) return null;
        const event = analysisProgressEventSchema.parse(JSON.parse(line));
        if (event.type === "status" && analysisRequestIdRef.current === requestId) state.updateAnalysisStep(event.stage, event.status, event.message);
        if (event.type === "error") throw new Error(event.message);
        return event.type === "result" ? event.result : null;
      };
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) result = consumeLine(line) ?? result;
        if (done) break;
      }
      result = consumeLine(buffer) ?? result;
      if (!result) throw new Error("The analysis finished without a validated transcript.");
      if (analysisRequestIdRef.current !== requestId) return;
      state.applyAIResult(result);
      setNotice(`Local review complete · ${result.issues.length} issues found`);
    } catch (error) {
      if (analysisRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Local analysis failed";
      const activeStep = useEditorStore.getState().analysisSteps.find((step) => step.status === "active");
      if (activeStep) state.updateAnalysisStep(activeStep.id, "error", message);
      state.setAIStatus("error", message);
      setNotice(message);
    }
  }

  function importVideo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("Choose an MP4, MOV, M4V, or WebM video");
      return;
    }
    const analysisRequestId = ++analysisRequestIdRef.current;
    state.beginAnalysis();
    sourceStorageFileRef.current = file;
    const storageAttempt = ++sourceStorageAttemptRef.current;
    setSourceStorage({ status: "storing", message: "Saving source video locally…" });
    setSelectedWordId(null);
    setTranslationStates({});
    const url = URL.createObjectURL(file);
    const sourcePromise = storeSource(file);
    void sourcePromise.catch(() => undefined);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      state.setMedia(url, { name: file.name, duration: probe.duration, width: probe.videoWidth, height: probe.videoHeight, frameRate: 30, size: file.size });
      state.updateAnalysisStep("source", "complete", `${probe.videoWidth}×${probe.videoHeight} video loaded locally`);
      attachStoredSource(sourcePromise, storageAttempt);
      void processLocally(sourcePromise, analysisRequestId);
    };
    probe.onerror = () => {
      state.updateAnalysisStep("source", "error", "The video details could not be read");
      state.setAIStatus("error", "This video could not be opened. Choose another MP4, MOV, M4V, or WebM file.");
    };
  }

  function retryLocalAnalysis() {
    const file = sourceStorageFileRef.current;
    if (!file) {
      inputRef.current?.click();
      return;
    }
    state.beginAnalysis();
    state.updateAnalysisStep("source", "complete", `${state.media?.width ?? 0}×${state.media?.height ?? 0} video ready locally`);
    const sourcePromise = state.sourceId && state.sourceColorInfo
      ? Promise.resolve({ sourceId: state.sourceId, colorInfo: state.sourceColorInfo })
      : storeSource(file);
    void sourcePromise.catch(() => undefined);
    const analysisRequestId = ++analysisRequestIdRef.current;
    void processLocally(sourcePromise, analysisRequestId);
  }

  const cleaned = state.cleanedDuration();
  const previewTime = Math.min(cleaned, sourceToEditedTime(state.currentTime, removedRanges));
  const selectedIssue = state.issues.find((issue) => issue.id === state.selectedIssueId);
  const selectedWord = state.paragraphs.flatMap((paragraph) => paragraph.words).find((word) => word.id === selectedWordId);
  const matchingWordCount = selectedWord
    ? state.paragraphs.reduce((count, paragraph) => count + paragraph.words.filter((word) => transcriptWordsMatch(word.text, selectedWord.text)).length, 0)
    : 0;
  const activeParagraph = getActiveParagraph(visibleParagraphs, state.currentTime);
  const activeTranscriptWord = useMemo(() => {
    const paragraph = state.paragraphs.find((item) => state.currentTime >= item.start && state.currentTime < item.end);
    if (!paragraph) return undefined;
    return paragraph.words.find((word) => {
      if (state.currentTime < word.start || state.currentTime >= word.end) return false;
      if (sourceMode === "original") return true;
      return !removedRanges.some((range) => word.start < range.end && word.end > range.start);
    });
  }, [removedRanges, sourceMode, state.currentTime, state.paragraphs]);
  const isProcessing = state.aiStatus === "processing";
  const isEmptyAnalysisError = state.aiStatus === "error" && state.paragraphs.length === 0;

  useEffect(() => {
    const scrollArea = transcriptScrollRef.current;
    if (!scrollArea || !activeTranscriptWord) return;
    const activeElement = scrollArea.querySelector<HTMLElement>(`[data-transcript-word-id="${CSS.escape(activeTranscriptWord.id)}"]`);
    if (!activeElement || window.performance.now() < transcriptFollowPausedUntilRef.current) return;

    const scrollBounds = scrollArea.getBoundingClientRect();
    const wordBounds = activeElement.getBoundingClientRect();
    const followPadding = 48;
    if (wordBounds.top < scrollBounds.top + followPadding) {
      scrollArea.scrollBy({ top: wordBounds.top - scrollBounds.top - followPadding, behavior: "auto" });
    } else if (wordBounds.bottom > scrollBounds.bottom - followPadding) {
      scrollArea.scrollBy({ top: wordBounds.bottom - scrollBounds.bottom + followPadding, behavior: "auto" });
    }
  }, [activeTranscriptWord]);

  function pauseTranscriptFollow() {
    transcriptFollowPausedUntilRef.current = window.performance.now() + 1400;
  }

  function seekPreviewTime(editedTime: number) {
    state.setCurrentTime(editedToSourceTime(editedTime, duration, removedRanges));
  }

  function openWordEditor(word: TranscriptWord) {
    state.setPlaying(false);
    state.setCurrentTime(word.start);
    setSelectedWordId(word.id);
    setWordDraft(word.text);
  }

  function saveWord() {
    if (!selectedWord || !wordDraft.trim()) return;
    const replacement = state.updateWord(selectedWord.id, wordDraft);
    if (!replacement) return;
    replacement.paragraphIds.forEach(queueTranslationRefresh);
    setSelectedWordId(null);
    setNotice(replacement.count > 1
      ? `${replacement.count} matching words updated · Updating ${replacement.paragraphIds.length} English subtitles…`
      : "Word updated · Updating English subtitle…");
  }

  function deleteSelectedWord() {
    if (!selectedWord) return;
    const paragraphId = state.paragraphs.find((paragraph) => paragraph.words.some((word) => word.id === selectedWord.id))?.id;
    state.deleteWord(selectedWord.id);
    if (paragraphId) queueTranslationRefresh(paragraphId);
    setSelectedWordId(null);
    setNotice("Word and matching video removed · Undo available");
  }

  function undoLastStep() {
    const action = state.undoStack.at(-1)?.label;
    if (!action) return;
    state.undo();
    setNotice(`${action} undone`);
  }

  function redoLastStep() {
    const action = state.redoStack.at(-1)?.label;
    if (!action) return;
    state.redo();
    setNotice(`${action} redone`);
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div className="topbar-group">
          <div className="history-controls" role="group" aria-label="Edit history">
            <IconButton label={state.undoStack.length ? `Undo ${state.undoStack.at(-1)?.label}` : "Undo"} aria-keyshortcuts="Meta+Z Control+Z" disabled={!state.undoStack.length} onClick={undoLastStep}><Icons.Undo2 /></IconButton>
            <IconButton label={state.redoStack.length ? `Redo ${state.redoStack.at(-1)?.label}` : "Redo"} aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y" disabled={!state.redoStack.length} onClick={redoLastStep}><Icons.Redo2 /></IconButton>
          </div>
        </div>
        <button className="project-context"><Icons.Clapperboard /> Private project <span>/</span> {state.projectName} <Icons.ChevronDown /></button>
        <div className="topbar-group topbar-right">
          <span className="privacy-chip">Local only</span>
          <IconButton label="Help"><Icons.CircleHelp /></IconButton>
          <button className="export-button" onClick={() => { state.setActivePanel("export"); setActiveSection("Export"); }}><Icons.Download /> Export</button>
        </div>
      </header>

      <div className="workbench">
        <aside className="left-nav" aria-label="Editor sections">
          <div className="brand-mark">D</div>
          <nav>{navItems.map(([label, Icon]) => <button key={label} aria-label={label} className={label === activeSection ? "active" : ""} onClick={() => setActiveSection(label)}><Icon /><span>{label}</span></button>)}</nav>
        </aside>

        <section className={`transcript-panel${isProcessing ? " is-processing" : ""}`} data-processing={isProcessing ? "true" : "false"}>
          <div className="panel-header">
            <div><p className="eyebrow">Transcript-led edit</p><h1>{state.projectName}</h1></div>
            <button className="secondary-button" onClick={() => inputRef.current?.click()}><Icons.Upload /> Import video</button>
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm" hidden onChange={(event) => importVideo(event.target.files?.[0])} />
          </div>
          <div className="transcript-toolbar">
            <div className="segmented"><button className={sourceMode === "cleaned" ? "selected" : ""} onClick={() => setSourceMode("cleaned")}>Cleaned</button><button className={sourceMode === "original" ? "selected" : ""} onClick={() => setSourceMode("original")}>Original</button></div>
            <span className={`ai-state ${state.aiStatus}`}>{state.aiStatus === "processing" ? "Processing video" : state.aiStatus === "error" ? "Processing stopped" : `${state.issues.length - state.removedIssueIds.length} issues`}</span>
            <button className="text-button" disabled={isProcessing || !state.issues.length} onClick={state.removeSafeIssues}>Remove safe issues</button>
          </div>
          {isProcessing ? <AnalysisProcessingPanel steps={state.analysisSteps} message={state.aiMessage} /> : isEmptyAnalysisError ? <div className="analysis-error" role="alert"><span className="analysis-step-marker">!</span><strong>Transcript processing stopped</strong><p>{state.aiMessage}</p><button className="secondary-button" onClick={retryLocalAnalysis}>Retry local analysis</button></div> : <><div className="duration-strip"><span>Original <b>{formatTime(duration)}</b></span><span className="arrow">→</span><span>Cleaned <b>{formatTime(cleaned)}</b></span><span className="saved-time">−{formatTime(duration - cleaned)}</span></div>
          <div className="transcript-scroll" ref={transcriptScrollRef} onWheel={pauseTranscriptFollow} onTouchStart={pauseTranscriptFollow}>
            {(sourceMode === "cleaned" ? state.paragraphs.filter((paragraph) => !removedRanges.some((range) => paragraph.start >= range.start && paragraph.end <= range.end)) : state.paragraphs).filter((paragraph) => !searchQuery || paragraph.words.some((word) => word.text.toLowerCase().includes(searchQuery.toLowerCase())) || paragraph.translation.toLowerCase().includes(searchQuery.toLowerCase())).map((paragraph, index) => (
              <article key={paragraph.id} className="paragraph" onClick={() => state.setCurrentTime(paragraph.start)}>
                <div className="paragraph-meta"><button>{formatTime(paragraph.start)}</button><span>0{index + 1}</span></div>
                <p dir="rtl" lang="ar" className="arabic-copy">
                  {paragraph.words.map((word) => {
                    const issue = state.issues.find((item) => item.id === word.issueId);
                    const removed = (issue && state.removedIssueIds.includes(issue.id)) || removedRanges.some((range) => word.start < range.end && word.end > range.start);
                    const selected = word.id === selectedWordId;
                    if (sourceMode === "cleaned" && removed) return null;
                    const followsPlayhead = word.id === activeTranscriptWord?.id;
                    return <button key={word.id} data-transcript-word-id={word.id} className={`${issue ? `word issue ${removed ? "removed" : ""}` : "word"}${selected ? " selected" : ""}${followsPlayhead ? " playhead-active" : ""}`} lang={word.language} aria-pressed={selected} aria-current={followsPlayhead ? "true" : undefined} title={followsPlayhead ? "Current word at the playhead" : "Select to edit or delete"} onClick={(event) => { event.stopPropagation(); openWordEditor(word); if (issue) state.selectIssue(issue.id); }}>{word.text}</button>;
                  })}
                </p>
                <p className={`translation translation-${translationStates[paragraph.id] ?? "idle"}`} aria-live="polite">
                  <span>{paragraph.translation || "No English subtitle"}</span>
                  {translationStates[paragraph.id] === "updating" ? <small><AIPixelSpinner className="ai-pixel-spinner--compact" /> AI updating English…</small> : null}
                  {translationStates[paragraph.id] === "error" ? <button type="button" onClick={(event) => { event.stopPropagation(); queueTranslationRefresh(paragraph.id); }}>Retry AI translation</button> : null}
                </p>
                {selectedWord && paragraph.words.some((word) => word.id === selectedWord.id) ? <div className="word-editor" onClick={(event) => event.stopPropagation()}>
                  <label>Edit selected word<input autoFocus aria-label="Edit selected word" dir={selectedWord.language === "ar" ? "rtl" : "ltr"} value={wordDraft} onChange={(event) => setWordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveWord(); if (event.key === "Escape") setSelectedWordId(null); }}/><small className="word-editor-scope">{matchingWordCount > 1 ? `Updates all ${matchingWordCount} matching words in this project.` : "Updates this word."}</small></label>
                  <button className="secondary-button" disabled={!wordDraft.trim() || wordDraft.trim() === selectedWord.text} onClick={saveWord}>{matchingWordCount > 1 ? `Replace all ${matchingWordCount}` : "Save"}</button>
                  <button className="danger-button" onClick={deleteSelectedWord}>Delete</button>
                  <button className="text-button word-cancel" onClick={() => setSelectedWordId(null)}>Cancel</button>
                </div> : null}
              </article>
            ))}
          </div></>}
        </section>

        <section className="preview-panel">
          <div className="preview-head"><div className="segmented"><button className="selected">Preview</button><button>Source</button></div><div className="preview-head-tools">{state.colorGrade.enabled ? <button className={`before-button${showBefore ? " is-held" : ""}`} aria-pressed={showBefore} onPointerDown={(event)=>{event.currentTarget.setPointerCapture(event.pointerId);setShowBefore(true);}} onPointerUp={()=>setShowBefore(false)} onPointerCancel={()=>setShowBefore(false)} onPointerLeave={()=>setShowBefore(false)} onBlur={()=>setShowBefore(false)} onKeyDown={(event)=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();setShowBefore(true);}}} onKeyUp={(event)=>{if(event.key===" "||event.key==="Enter")setShowBefore(false);}}>Before</button> : null}<small className="preview-dimensions">{sourceWidth} × {sourceHeight}</small></div></div>
          <div className="stage" ref={stageRef}>
            <div className="video-frame" style={{ width: `${sourceWidth * previewZoom / 100}px`, height: `${sourceHeight * previewZoom / 100}px`, aspectRatio: `${sourceWidth}/${sourceHeight}` }}>
              {safeGuides && <div className="instagram-safe-guides" aria-hidden="true">
                <div className="instagram-risk-zone instagram-risk-top"><span>Reel header</span></div>
                <div className="instagram-risk-zone instagram-risk-right"><span>Actions</span></div>
                <div className="instagram-risk-zone instagram-risk-bottom"><span>Caption and controls</span></div>
                <div className="instagram-content-safe"><span>Instagram Reels · keep captions inside</span></div>
              </div>}
              {state.mediaUrl ? <GradedVideo videoRef={videoRef} src={state.mediaUrl} grade={state.colorGrade} sourceLut={state.colorGrade.lut ? lutPreviewCache[state.colorGrade.lut.id] : undefined} before={showBefore} onStateChange={setColorPreviewState} onPlay={() => state.setPlaying(true)} onPause={() => state.setPlaying(false)} onEnded={() => state.setPlaying(false)} /> : <div className="video-placeholder"><div className="street-scene"><span className="lantern l1"/><span className="lantern l2"/><span className="lantern l3"/><span className="road"/></div><button onClick={() => inputRef.current?.click()}><Icons.FileVideo /> Choose your 4K video</button></div>}
              {state.timelineAssets.map((clip) => <TimelineAssetPlayback key={clip.id} clip={clip} currentTime={previewTime} playing={state.playing} playbackRate={playbackRate} />)}
              {isProcessing ? <div className="video-processing-overlay" role="status" aria-label="Processing video"><AIPixelSpinner /><strong>Preparing captions</strong><small>Transcript and subtitles will appear when analysis is ready.</small></div> : null}
              {!isProcessing && <SubtitlePreview currentTime={state.currentTime} style={state.subtitleStyle} frameWidth={sourceWidth * previewZoom / 100} paragraph={activeParagraph} translationState={activeParagraph ? translationStates[activeParagraph.id] ?? "idle" : "idle"}/>}
            </div>
          </div>
          <div className="transport">
            <button aria-label={state.playing ? "Pause video" : "Play video"} onClick={() => state.setPlaying(!state.playing)}>{state.playing ? <Icons.Pause /> : <Icons.Play />}</button>
            <span className="transport-time">{formatTime(previewTime)} / {formatTime(cleaned)}</span>
            <CustomRange className="transport-seek" size="compact" ariaLabel="Seek video" min={0} max={Math.max(0.01, cleaned)} step={0.01} value={previewTime} onChange={seekPreviewTime}/>
            <button className="speed-button" aria-label={`Playback speed ${playbackRate}×`} onClick={() => setPlaybackRate(playbackRate === 2 ? .5 : playbackRate === .5 ? 1 : playbackRate + .5)}>{playbackRate}×</button>
            <div className="transport-zoom" aria-label="Preview zoom controls">
              <CustomRange className="zoom-slider" size="compact" ariaLabel="Preview zoom slider" min={5} max={200} step={1} value={previewZoom} onChange={changePreviewZoom}/>
              <label className="zoom-percentage"><input aria-label="Preview zoom percentage" type="number" min="5" max="200" step="0.1" value={previewZoom} onChange={(event) => changePreviewZoom(Number(event.target.value))}/><span>%</span></label>
              <button className={`fit-button${isFitZoom ? " fit-active" : ""}`} onClick={fitPreview}>Fit</button>
            </div>
          </div>
        </section>

        <InspectorPanel section={activeSection} selectedIssue={selectedIssue} searchQuery={searchQuery} setSearchQuery={setSearchQuery} autoSave={autoSave} setAutoSave={setAutoSave} safeGuides={safeGuides} setSafeGuides={setSafeGuides} onImport={() => inputRef.current?.click()} onNotice={setNotice} colorPreviewState={colorPreviewState} colorFrameUrl={colorFrameUrl} onLutPreview={(id,lut)=>setLutPreviewCache((cache)=>({...cache,[id]:lut}))} sourceStorage={sourceStorage} onRetrySourceStorage={retrySourceStorage}/>
      </div>

      <Timeline key={state.mediaUrl ?? "sample-timeline"} duration={duration} onImportSource={() => inputRef.current?.click()} onNotice={setNotice} deleteShortcutDisabled={Boolean(selectedWordId)} />
      <div className="toast" role="status"><Icons.Check /> <span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>
    </main>
  );
}

function InspectorDisclosure({ title, detail, children, className = "", defaultOpen = true }: { title: string; detail?: string; children: React.ReactNode; className?: string; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return <details className="inspector-disclosure" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
    <summary>
      <span className="inspector-disclosure-title">{title}</span>
      <span className="inspector-disclosure-meta">{detail}</span>
      <Icons.ChevronDown />
    </summary>
    <div className={`inspector-disclosure-content${className ? ` ${className}` : ""}`}>{children}</div>
  </details>;
}

function ColorGradeControl({ label, value, min, max, step, unit = "", resetValue = 0, disabled, onChange, onReset }: { label: string; value: number; min: number; max: number; step: number; unit?: string; resetValue?: number; disabled?: boolean; onChange: (value: number, mergeKey?: string) => void; onReset: () => void }) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const formatValue = useCallback((next: number) => next.toFixed(decimals), [decimals]);
  const [draft, setDraft] = useState(formatValue(value));
  const editing = useRef(false);
  const interactionCount = useRef(0);
  const interactionKey = useRef<string | undefined>(undefined);
  const beginInteraction = () => { if (!interactionKey.current) interactionKey.current=`grade:${label}:${Date.now()}:${++interactionCount.current}`; };
  const endInteraction = () => { interactionKey.current=undefined; };

  useEffect(() => {
    if (!editing.current) setDraft(formatValue(value));
  }, [value, formatValue]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(formatValue(value));
      return;
    }
    const next = Math.max(min, Math.min(max, parsed));
    setDraft(formatValue(next));
    onChange(next);
  };

  return <div className="grade-control">
    <div className="grade-control-head"><label><span>{label}</span><span className="grade-value"><input aria-label={`${label} value`} inputMode="decimal" type="text" value={draft} disabled={disabled} onFocus={()=>{editing.current=true;}} onChange={(event)=>{const nextDraft=event.target.value;setDraft(nextDraft);const parsed=Number(nextDraft);if(nextDraft.trim()&&Number.isFinite(parsed))onChange(Math.max(min,Math.min(max,parsed)));}} onBlur={()=>{editing.current=false;commitDraft();}} onKeyDown={(event)=>{if(event.key==="Enter")event.currentTarget.blur();if(event.key==="Escape"){setDraft(formatValue(value));event.currentTarget.blur();}}}/>{unit}</span></label><button type="button" aria-label={`Reset ${label}`} title={`Reset ${label}`} disabled={disabled || value===resetValue} onClick={onReset}><Icons.RotateCcw /></button></div>
    <CustomRange ariaLabel={label} min={min} max={max} step={step} value={value} disabled={disabled} onInteractionStart={beginInteraction} onInteractionEnd={endInteraction} onChange={(next)=>onChange(next,interactionKey.current)}/>
  </div>;
}

function InspectorPanel({ section, selectedIssue, searchQuery, setSearchQuery, autoSave, setAutoSave, safeGuides, setSafeGuides, onImport, onNotice, colorPreviewState, colorFrameUrl, onLutPreview, sourceStorage, onRetrySourceStorage }: { section: EditorSection; selectedIssue?: TranscriptIssue; searchQuery: string; setSearchQuery: (value: string) => void; autoSave: boolean; setAutoSave: (value: boolean) => void; safeGuides: boolean; setSafeGuides: (value: boolean) => void; onImport: () => void; onNotice: (message: string) => void; colorPreviewState: "checking" | "ready" | "unavailable" | "error"; colorFrameUrl: string | null; onLutPreview: (id: string, lut: CubeLut) => void; sourceStorage: { status: "idle" | "storing" | "stored" | "failed"; message: string }; onRetrySourceStorage: () => void }) {
  const state = useEditorStore();
  const inspectorMoreRef = useRef<HTMLDivElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const [inspectorMoreOpen, setInspectorMoreOpen] = useState(false);
  const [vocabulary, setVocabulary] = useState(["design system", "components", "AI"]);
  const [newTerm, setNewTerm] = useState("");
  const [exportFormat, setExportFormat] = useState("mp4-h264");
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [exportJob, setExportJob] = useState<ExportJobView | null>(null);
  const [exportPending, setExportPending] = useState(false);
  const [submittedExportFingerprint, setSubmittedExportFingerprint] = useState<string | null>(null);
  const exportSubmittingRef = useRef(false);
  const exportJobId = exportJob?.id;
  const exportJobStatus = exportJob?.status;

  useEffect(() => {
    if (!exportJobId || !exportJobStatus || !["queued", "processing"].includes(exportJobStatus)) return;
    let disposed = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/exports/${exportJobId}`, { cache: "no-store" });
        const payload = await response.json() as ExportJobView & { message?: string };
        if (!response.ok) throw new Error(payload.message || "Export status could not be read.");
        if (!disposed) setExportJob(payload);
        if (payload.status === "succeeded" && !disposed) onNotice("Export complete · Ready to save");
        if (payload.status === "failed" && !disposed) onNotice(payload.error || "Export failed");
      } catch (error) {
        if (!disposed) onNotice(error instanceof Error ? error.message : "Export status could not be read.");
      }
    };
    const timer = window.setInterval(()=>void poll(),750);
    void poll();
    return () => { disposed=true;window.clearInterval(timer); };
  }, [exportJobId, exportJobStatus, onNotice]);
  useEffect(() => {
    if (!inspectorMoreOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!inspectorMoreRef.current?.contains(event.target as Node)) setInspectorMoreOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectorMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [inspectorMoreOpen]);

  async function importLut(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Choose a .cube LUT smaller than 5 MB.");
      if (!file.name.toLowerCase().endsWith(".cube")) throw new Error("Choose a file with the .cube extension.");
      const parsed = parseCubeLut(await file.text());
      const response = await fetch("/api/media/luts", { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8", "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const payload = await response.json() as { id?: string; name?: string; gridSize?: number; sha256?: string; message?: string };
      if (!response.ok || !payload.id || !payload.name || !payload.gridSize || !payload.sha256) throw new Error(payload.message || "The LUT could not be imported.");
      onLutPreview(payload.id, parsed);
      state.setColorGrade({ enabled: true, presetId: null, lut: { id: payload.id, name: payload.name, gridSize: payload.gridSize, sha256: payload.sha256, strength: 100 } }, state.colorGrade.lut ? "Replace color LUT" : "Import color LUT");
      onNotice(`${payload.name} LUT imported · Updating preview`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The LUT could not be imported.");
    } finally {
      if (lutInputRef.current) lutInputRef.current.value = "";
    }
  }

  function exportRequest(): CreateExportRequest | null {
    if (!state.sourceId || !state.media) return null;
    const duration = state.media.duration;
    const removed = mergeTimeRanges([...state.issues.filter((issue)=>state.removedIssueIds.includes(issue.id)),...state.deletedRanges],duration);
    const keeps = keptTimeRanges(duration,removed);
    const captions = state.paragraphs.flatMap((paragraph)=>keeps.flatMap((keep,keptIndex)=>{
      const sourceStart=Math.max(paragraph.start,keep.start);const sourceEnd=Math.min(paragraph.end,keep.end);
      if(sourceEnd<=sourceStart||!paragraph.translation.trim())return [];
      const start=sourceToEditedTime(sourceStart,removed);const end=sourceToEditedTime(sourceEnd,removed);
      return [{id:`${paragraph.id}-${keptIndex}`,start,end,text:paragraph.translation,animation:state.subtitleStyle.animation,wordTimes:paragraph.words.filter((word)=>word.end>sourceStart&&word.start<sourceEnd).map((word)=>({start:sourceToEditedTime(Math.max(word.start,sourceStart),removed),end:sourceToEditedTime(Math.min(word.end,sourceEnd),removed)}))}];
    }));
    return { sourceId: state.sourceId, format: exportFormat as CreateExportRequest["format"], keepRanges: keeps, colorGrade: state.colorGrade, burnCaptions, captions, subtitleStyle: state.subtitleStyle, hasExternalOverlays: state.timelineAssets.length > 0 };
  }

  async function prepareExport(forceNewRender = false) {
    if (exportSubmittingRef.current) return;
    const body=exportRequest();
    if(!body)return;
    const fingerprint=canonicalExportEditSpec(body);
    const requestBody=forceNewRender?{...body,renderRequestId:crypto.randomUUID()}:body;
    exportSubmittingRef.current=true;
    setExportPending(true);
    try{
      const response=await fetch("/api/exports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(requestBody)});
      const payload=await response.json() as ExportJobView & {message?:string};
      if(!response.ok)throw new Error(payload.message||"The export could not be queued.");
      setExportJob(payload);setSubmittedExportFingerprint(fingerprint);onNotice(payload.status==="succeeded"?"This export is already ready to save":"Export queued");
    }catch(error){onNotice(error instanceof Error?error.message:"The export could not be queued.");}
    finally{exportSubmittingRef.current=false;setExportPending(false);}
  }

  async function cancelCurrentExport(){
    if(!exportJob)return;
    const response=await fetch(`/api/exports/${exportJob.id}`,{method:"DELETE"});
    const payload=await response.json() as ExportJobView;
    if(response.ok){setExportJob(payload);onNotice("Export cancelled · Your edit is unchanged");}
  }

  const panel = (() => {
    if (section === "Project") return <><section className="summary-card"><div><span>Duration</span><b>{formatTime(state.media?.duration || 15.8)}</b></div><div><span>Resolution</span><b className="small-value">{state.media ? `${state.media.width}×${state.media.height}` : "2160×3840"}</b></div></section><section className="inspector-section action-stack"><button className="secondary-button" onClick={onImport}><Icons.Upload/> Replace source</button><button className="secondary-button" onClick={() => onNotice("Project snapshot saved locally")}><Icons.Check/> Save snapshot</button></section></>;
    if (section === "Transcript") return <><section className="inspector-section"><label className="field-label">Search transcript<input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Arabic or English"/></label></section><section className="summary-card"><div><span>Paragraphs</span><b>{state.paragraphs.length}</b></div><div><span>Words</span><b>{state.paragraphs.reduce((sum,p)=>sum+p.words.length,0)}</b></div></section><section className="inspector-section action-stack"><button className="secondary-button" onClick={() => setSearchQuery("")}>Clear search</button><button className="secondary-button" onClick={() => onNotice("Transcript changes are stored as edit decisions")}>Save transcript</button></section></>;
    if (section === "Speech cleanup") {
      const presentation = selectedIssue ? issuePresentations[selectedIssue.type] : null;
      const selectedIssueRemoved = selectedIssue ? state.removedIssueIds.includes(selectedIssue.id) : false;
      return <>
        <section className="summary-card"><div><span>Issues found</span><b>{state.issues.length}</b></div><div><span>Time recoverable</span><b>{formatTime(unionDuration(state.issues))}</b></div></section>
        {selectedIssue && presentation ? <section className={`issue-card${selectedIssueRemoved ? " is-removed" : ""}`}>
          <div className="issue-card-topline">
            <span className="issue-kicker">Cleanup suggestion</span>
            <span className={`issue-confidence${selectedIssueRemoved ? " is-removed" : ""}`} aria-label={selectedIssueRemoved ? "Range removed" : `${Math.round(selectedIssue.confidence * 100)}% confidence`}>
              {selectedIssueRemoved ? "Removed" : `${Math.round(selectedIssue.confidence * 100)}% match`}
            </span>
          </div>
          <div className="issue-title-row">
            <h3>{presentation.title}</h3>
            <span>{formatTime(selectedIssue.start)}–{formatTime(selectedIssue.end)}</span>
          </div>
          <p>{presentation.description}</p>
          <div className="issue-actions">
            <button className="secondary-button issue-preview-button" onClick={() => state.setCurrentTime(selectedIssue.start)}><Icons.Play /> Preview cut</button>
            {selectedIssueRemoved
              ? <button className="secondary-button" onClick={() => state.restoreIssue(selectedIssue.id)}><Icons.RotateCcw /> Restore range</button>
              : <button className="danger-button issue-remove-button" onClick={() => state.removeIssue(selectedIssue.id)}><Icons.Scissors /> {presentation.removeLabel}</button>}
          </div>
        </section> : null}
        <section className="inspector-section"><button className="danger-button full-button" onClick={state.removeSafeIssues}>Remove all safe issues</button></section>
      </>;
    }
    if (section === "Translation") return <><section className="inspector-section translation-list">{state.paragraphs.map((p,i)=><button key={p.id} onClick={()=>state.setCurrentTime(p.start)}><small>{formatTime(p.start)} · Paragraph {i+1}</small><span>{p.translation}</span></button>)}</section><section className="inspector-section action-stack"><button className="secondary-button" onClick={() => onNotice("Translations are synchronized to approved source ranges")}><Icons.Languages/> Refresh translations</button><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(state.paragraphs.map(p=>p.translation).join("\n")); onNotice("English subtitles copied"); }}>Copy English text</button></section></>;
    if (section === "Subtitles") {
      const style = state.subtitleStyle;
      const backgroundColor = state.subtitleStyle.backgroundColor ?? "#191416";
      const backgroundOpacity = state.subtitleStyle.backgroundOpacity ?? 74;
      return <>
        <InspectorDisclosure title="Caption templates" detail={`${templates.length}`} className="styles-template-section">
          <div className="template-grid">{templates.map((template) => <button key={template.id} aria-label={`Apply ${template.name} caption template`} className={state.subtitleStyle.template === template.id ? "template-card selected" : "template-card"} onClick={() => state.setStyle({ template: template.id, ...templateStylePresets[template.id] })}><span>{template.sample}</span><small>{template.name}</small></button>)}</div>
        </InspectorDisclosure>
        <InspectorDisclosure title="Typography" detail="Live" className="typography-panel">
          <div className="typography-grid">
            <div className="control-field"><span>Typeface</span><CustomSelect ariaLabel="Subtitle typeface" value={style.fontFamily} options={fontSelectOptions} onChange={(fontFamily)=>state.setStyle({fontFamily})}/></div>
            <label>Size<input aria-label="Subtitle font size" type="number" min="24" max="120" value={style.fontSize} onChange={(event)=>state.setStyle({fontSize:Number(event.target.value)})}/></label>
            <div className="control-field"><span>Weight</span><CustomSelect ariaLabel="Subtitle font weight" value={String(style.fontWeight)} options={[400,500,600,700,800,900].map((weight)=>({value:String(weight),label:String(weight)}))} onChange={(fontWeight)=>state.setStyle({fontWeight:Number(fontWeight)})}/></div>
          </div>
          <div className="format-group"><span>Alignment</span><div className="alignment-control" role="group" aria-label="Subtitle alignment">{(["left","center","right"] as const).map(alignment=><button key={alignment} aria-pressed={style.textAlign===alignment} className={style.textAlign===alignment?"selected":""} onClick={()=>state.setStyle({textAlign:alignment})}>{alignment[0].toUpperCase()+alignment.slice(1)}</button>)}</div></div>
          <div className="format-toggle-grid">
            <label className="toggle-row"><input type="checkbox" checked={style.italic} onChange={(event)=>state.setStyle({italic:event.target.checked})}/> Italic</label>
            <label className="toggle-row"><input type="checkbox" checked={style.uppercase} onChange={(event)=>state.setStyle({uppercase:event.target.checked})}/> Uppercase</label>
          </div>
          <label className="format-range">Letter spacing <output>{style.letterSpacing.toFixed(1)} px</output><CustomRange ariaLabel="Subtitle letter spacing" min={-2} max={8} step={0.5} value={style.letterSpacing} onChange={(letterSpacing)=>state.setStyle({letterSpacing})}/></label>
          <label className="format-range">Word spacing <output>{style.wordSpacing} px</output><CustomRange ariaLabel="Subtitle word spacing" min={0} max={24} step={1} value={style.wordSpacing} onChange={(wordSpacing)=>state.setStyle({wordSpacing})}/></label>
          <label className="format-range">Line height <output>{style.lineHeight.toFixed(2)}</output><CustomRange ariaLabel="Subtitle line height" min={CAPTION_LINE_HEIGHT_LIMITS.min} max={CAPTION_LINE_HEIGHT_LIMITS.max} step={CAPTION_LINE_HEIGHT_LIMITS.step} value={style.lineHeight} onChange={(lineHeight)=>state.setStyle({lineHeight})}/></label>
          <label className="format-range">Caption width <output>{style.maxWidth}%</output><CustomRange ariaLabel="Subtitle caption width" min={40} max={96} step={1} value={style.maxWidth} onChange={(maxWidth)=>state.setStyle({maxWidth})}/></label>
          <button className="secondary-button full-button" onClick={()=>state.setStyle({fontFamily:"Lato",fontSize:58,fontWeight:800,textAlign:"center",italic:false,uppercase:false,letterSpacing:0,wordSpacing:0,lineHeight:1.25,maxWidth:84})}>Reset typography</button>
        </InspectorDisclosure>
        <InspectorDisclosure title="Colors" detail="Live" className="color-panel">
          <div className="color-fields">
            <label>Text<input aria-label="Caption text color" type="color" value={state.subtitleStyle.color} onChange={(event)=>state.setStyle({color:event.target.value})}/></label>
            <label>Highlight<input aria-label="Caption highlight color" type="color" value={state.subtitleStyle.highlightColor} onChange={(event)=>state.setStyle({highlightColor:event.target.value})}/></label>
            <label>Background<input aria-label="Caption background color" type="color" value={backgroundColor} disabled={!state.subtitleStyle.background} onChange={(event)=>state.setStyle({background:true,backgroundColor:event.target.value})}/></label>
          </div>
          <label className="toggle-row"><input type="checkbox" checked={state.subtitleStyle.background} onChange={(event)=>state.setStyle({background:event.target.checked})}/> Caption background</label>
          <label className="format-range background-opacity"><span>Background opacity</span><output>{backgroundOpacity}%</output><CustomRange ariaLabel="Background opacity" min={0} max={100} value={backgroundOpacity} disabled={!state.subtitleStyle.background} onChange={(nextOpacity)=>state.setStyle({backgroundOpacity:nextOpacity})}/></label>
          <button className={`${state.subtitleStyle.background ? "danger-button" : "secondary-button"} full-button`} onClick={()=>state.setStyle({background:!state.subtitleStyle.background})}>{state.subtitleStyle.background?"Remove background":"Add background"}</button>
          <div className="swatch-section"><small>Highlight presets</small><div className="color-swatches">{["#FFFFFF","#FFD447","#34D399","#38BDF8","#FB7185","#A78BFA"].map(color=><button key={color} aria-label={`Set highlight ${color}`} style={{background:color}} onClick={()=>state.setStyle({highlightColor:color})}/>)}</div></div>
          <div className="swatch-section"><small>Background presets</small><div className="color-swatches">{["#191416","#000000","#FFFFFF","#4B3A42","#153449"].map(color=><button key={color} aria-label={`Set background ${color}`} style={{background:color}} onClick={()=>state.setStyle({background:true,backgroundColor:color})}/>)}</div></div>
        </InspectorDisclosure>
        <InspectorDisclosure title="Text shadow" detail={style.shadow ? "On" : "Off"} className="shadow-panel">
          <label className="toggle-row"><input type="checkbox" checked={style.shadow} onChange={(event)=>state.setStyle({shadow:event.target.checked})}/> Caption text shadow</label>
          <label className="shadow-color-field"><span>Shadow color</span><input aria-label="Caption shadow color" type="color" value={style.shadowColor} disabled={!style.shadow} onChange={(event)=>state.setStyle({shadowColor:event.target.value})}/></label>
          <label className="format-range"><span>Opacity</span><output>{style.shadowOpacity}%</output><CustomRange ariaLabel="Caption shadow opacity" min={0} max={100} value={style.shadowOpacity} disabled={!style.shadow} onChange={(shadowOpacity)=>state.setStyle({shadowOpacity})}/></label>
          <label className="format-range"><span>Blur</span><output>{style.shadowBlur} px</output><CustomRange ariaLabel="Caption shadow blur" min={0} max={24} value={style.shadowBlur} disabled={!style.shadow} onChange={(shadowBlur)=>state.setStyle({shadowBlur})}/></label>
          <label className="format-range"><span>Horizontal</span><output>{style.shadowOffsetX} px</output><CustomRange ariaLabel="Caption shadow horizontal offset" min={-20} max={20} value={style.shadowOffsetX} disabled={!style.shadow} onChange={(shadowOffsetX)=>state.setStyle({shadowOffsetX})}/></label>
          <label className="format-range"><span>Vertical</span><output>{style.shadowOffsetY} px</output><CustomRange ariaLabel="Caption shadow vertical offset" min={-20} max={20} value={style.shadowOffsetY} disabled={!style.shadow} onChange={(shadowOffsetY)=>state.setStyle({shadowOffsetY})}/></label>
          <button className="secondary-button full-button" onClick={()=>state.setStyle(defaultCaptionShadow)}>Reset shadow</button>
        </InspectorDisclosure>
      </>;
    }
    if (section === "Color") {
      const grade=state.colorGrade;
      const sourceBlocked=Boolean(state.sourceColorInfo?.support.startsWith("unsupported")||state.sourceColorInfo?.support==="probe-unavailable");
      const controlsDisabled=!grade.enabled||sourceBlocked;
      const presetFilters:Record<string,string>={neutral:"none",clean:"brightness(1.04) contrast(1.06) saturate(1.04)","warm-film":"sepia(.14) saturate(.94) contrast(1.08)","cool-modern":"hue-rotate(8deg) saturate(.94) contrast(1.08)",rich:"saturate(1.2) contrast(1.12)",mono:"grayscale(1) contrast(1.1)"};
      return <>
        <section className="inspector-section color-grade-header">
          <div className="color-grade-title"><div><strong>Color grade</strong><small>{state.sourceColorInfo?.label||"Import a source to inspect color"}</small></div><button type="button" className="grade-enable" role="switch" aria-checked={grade.enabled} aria-label="Color grade" disabled={sourceBlocked} onClick={()=>state.setColorGrade({enabled:!grade.enabled},"Toggle color grade")}><span className="grade-switch" aria-hidden="true"/><span>{grade.enabled?"On":"Off"}</span></button></div>
          <button className="text-button grade-reset-all" disabled={sourceBlocked} onClick={state.resetColorGrade}><Icons.RotateCcw/> Reset all</button>
          {sourceBlocked?<div className="grade-status is-error" role="alert"><Icons.CircleHelp/><span>{state.sourceColorInfo?.reason}</span></div>:null}
          {grade.enabled&&state.mediaUrl&&colorPreviewState!=="ready"?<div className="grade-status" role="status"><Icons.CircleHelp/><span>{colorPreviewState==="checking"?"Preparing live color preview…":"Live grading preview is unavailable in this browser. Normal playback and server export still work."}</span></div>:null}
        </section>
        <InspectorDisclosure title="Looks" detail={grade.presetId?COLOR_GRADE_PRESETS.find((preset)=>preset.id===grade.presetId)?.name:"Custom"} className="grade-preset-section">
          <div className="grade-preset-grid">{COLOR_GRADE_PRESETS.map((preset)=><button key={preset.id} aria-pressed={grade.presetId===preset.id} className={grade.presetId===preset.id?"selected":""} disabled={sourceBlocked} onClick={()=>state.applyColorPreset(preset.id)}><span className="grade-preset-image" style={{backgroundImage:colorFrameUrl?`url(${colorFrameUrl})`:undefined,filter:presetFilters[preset.id]}}/><small>{preset.name}</small></button>)}</div>
        </InspectorDisclosure>
        <InspectorDisclosure title="Basic" detail="Tone" className="grade-controls">
          <ColorGradeControl label="Exposure" value={grade.exposure} {...COLOR_GRADE_LIMITS.exposure} unit=" EV" disabled={controlsDisabled} onChange={(exposure,mergeKey)=>state.setColorGrade({exposure},undefined,mergeKey)} onReset={()=>state.setColorGrade({exposure:0},"Reset exposure")}/>
          <ColorGradeControl label="Contrast" value={grade.contrast} {...COLOR_GRADE_LIMITS.contrast} disabled={controlsDisabled} onChange={(contrast,mergeKey)=>state.setColorGrade({contrast},undefined,mergeKey)} onReset={()=>state.setColorGrade({contrast:0},"Reset contrast")}/>
          <ColorGradeControl label="Highlights" value={grade.highlights} {...COLOR_GRADE_LIMITS.highlights} disabled={controlsDisabled} onChange={(highlights,mergeKey)=>state.setColorGrade({highlights},undefined,mergeKey)} onReset={()=>state.setColorGrade({highlights:0},"Reset highlights")}/>
          <ColorGradeControl label="Shadows" value={grade.shadows} {...COLOR_GRADE_LIMITS.shadows} disabled={controlsDisabled} onChange={(shadows,mergeKey)=>state.setColorGrade({shadows},undefined,mergeKey)} onReset={()=>state.setColorGrade({shadows:0},"Reset shadows")}/>
        </InspectorDisclosure>
        <InspectorDisclosure title="Color" detail="Balance" className="grade-controls">
          <ColorGradeControl label="Temperature" value={grade.temperature} {...COLOR_GRADE_LIMITS.temperature} disabled={controlsDisabled} onChange={(temperature,mergeKey)=>state.setColorGrade({temperature},undefined,mergeKey)} onReset={()=>state.setColorGrade({temperature:0},"Reset temperature")}/>
          <ColorGradeControl label="Tint" value={grade.tint} {...COLOR_GRADE_LIMITS.tint} disabled={controlsDisabled} onChange={(tint,mergeKey)=>state.setColorGrade({tint},undefined,mergeKey)} onReset={()=>state.setColorGrade({tint:0},"Reset tint")}/>
          <ColorGradeControl label="Saturation" value={grade.saturation} {...COLOR_GRADE_LIMITS.saturation} disabled={controlsDisabled} onChange={(saturation,mergeKey)=>state.setColorGrade({saturation},undefined,mergeKey)} onReset={()=>state.setColorGrade({saturation:0},"Reset saturation")}/>
          <ColorGradeControl label="Fade" value={grade.fade} {...COLOR_GRADE_LIMITS.fade} disabled={controlsDisabled} onChange={(fade,mergeKey)=>state.setColorGrade({fade},undefined,mergeKey)} onReset={()=>state.setColorGrade({fade:0},"Reset fade")}/>
        </InspectorDisclosure>
        <InspectorDisclosure title="Finish" detail="Vignette" className="grade-controls">
          <ColorGradeControl label="Vignette" value={grade.vignette} {...COLOR_GRADE_LIMITS.vignette} disabled={controlsDisabled} onChange={(vignette,mergeKey)=>state.setColorGrade({vignette},undefined,mergeKey)} onReset={()=>state.setColorGrade({vignette:0},"Reset vignette")}/>
        </InspectorDisclosure>
        <InspectorDisclosure title="LUT" detail={grade.lut?.name||"None"} className="grade-lut-section">
          <input ref={lutInputRef} className="visually-hidden" type="file" accept=".cube,text/plain" onChange={(event)=>void importLut(event.target.files?.[0])}/>
          {grade.lut?<div className="lut-summary"><span className="lut-icon"><Icons.Palette/></span><div><strong>{grade.lut.name}</strong><small>{grade.lut.gridSize}³ · User LUT</small></div></div>:<div className="lut-empty"><Icons.Palette/><strong>Add a creative LUT</strong><small>3D .cube · up to 5 MB</small></div>}
          {grade.lut?<ColorGradeControl label="LUT strength" value={grade.lut.strength} min={0} max={100} step={1} resetValue={100} unit="%" disabled={controlsDisabled} onChange={(strength,mergeKey)=>state.setColorGrade({lut:grade.lut?{...grade.lut,strength}:null},undefined,mergeKey)} onReset={()=>state.setColorGrade({lut:grade.lut?{...grade.lut,strength:100}:null},"Reset LUT strength")}/>:null}
          <div className="lut-actions"><button className="secondary-button" disabled={sourceBlocked} onClick={()=>lutInputRef.current?.click()}>{grade.lut?"Replace":"Import .cube"}</button>{grade.lut?<button className="danger-button" onClick={()=>state.setColorGrade({lut:null},"Remove color LUT")}>Remove</button>:null}</div>
          <small className="lut-help">The LUT is copied into this local project. Filesystem paths are never stored.</small>
        </InspectorDisclosure>
      </>;
    }
    if (section === "Animation") {
      const selectedAnimation = state.subtitleStyle.animation ?? "karaoke";
      const previewAnimation = state.subtitleStyle.previewAnimation !== false;
      const activeSubtitle = getActiveParagraph(state.paragraphs, state.currentTime);
      const previewStart = activeSubtitle?.start ?? 0;
      const verticalAnchors = [{ label: "top", value: 22 }, { label: "middle", value: 50 }, { label: "bottom", value: 78 }] as const;
      const horizontalAnchors = ["left", "center", "right"] as const;
      const currentVertical = verticalAnchors.reduce((closest, anchor) => Math.abs(anchor.value - state.subtitleStyle.position) < Math.abs(closest.value - state.subtitleStyle.position) ? anchor : closest);
      const currentHorizontal = state.subtitleStyle.horizontalPosition ?? "center";
      const animations: Array<{ id: SubtitleAnimation; label: string; detail: string }> = [
        { id: "karaoke", label: "Karaoke word highlight", detail: "Speech sync" },
        { id: "typewriter", label: "Typewriter reveal", detail: "Speech sync" },
        { id: "pop", label: "Word pop", detail: "Speech sync" },
        { id: "build", label: "Creator word build", detail: "Speech sync" }
      ];
      const preview = (animation: SubtitleAnimation) => {
        state.setStyle({ animation, previewAnimation: true });
        state.setCurrentTime(previewStart);
        state.setPlaying(true);
      };
      return <>
        <InspectorDisclosure title="Animation" detail="Speech synced" className="action-stack">
          {animations.map((animation) => <button key={animation.id} className={`preset-row${selectedAnimation === animation.id ? " selected" : ""}`} aria-pressed={selectedAnimation === animation.id} onClick={() => preview(animation.id)}>{animation.label}<span>{animation.detail}{selectedAnimation === animation.id ? " · Active" : ""}</span></button>)}
          <button className="secondary-button" onClick={() => { state.setCurrentTime(previewStart); state.setPlaying(true); }}><Icons.Play/> Replay preview</button>
          <label className="toggle-row"><input type="checkbox" checked={previewAnimation} onChange={(event) => state.setStyle({ previewAnimation: event.target.checked })}/> Animate with timeline playback</label>
          <small className="animation-help">Uses transcript word timestamps. Playback speed and scrubbing stay locked to speech.</small>
        </InspectorDisclosure>
        <InspectorDisclosure title="Position" detail={`${currentVertical.label} ${currentHorizontal}`} className="position-panel">
          <div className="anchor-picker" role="radiogroup" aria-label="Caption position anchor">
            {verticalAnchors.flatMap((vertical) => horizontalAnchors.map((horizontal) => { const selected=currentVertical.value===vertical.value&&currentHorizontal===horizontal;const label=`${vertical.label} ${horizontal}`;return <button key={label} type="button" role="radio" aria-label={label} aria-checked={selected} className={selected?"selected":""} onClick={()=>state.setStyle({position:vertical.value,horizontalPosition:horizontal})}><span aria-hidden="true"/></button>; }))}
          </div>
          <label className="toggle-row"><input type="checkbox" checked={safeGuides} onChange={(e)=>setSafeGuides(e.target.checked)}/> Show Instagram Reels safe area</label>
        </InspectorDisclosure>
      </>;
    }
    if (section === "Vocabulary") return <><section className="inspector-section tag-list">{vocabulary.map(term=><button key={term} onClick={()=>setVocabulary(vocabulary.filter(item=>item!==term))}>{term} ×</button>)}</section><section className="inspector-section inline-form"><input value={newTerm} onChange={(e)=>setNewTerm(e.target.value)} placeholder="Add Arabic or English term"/><button onClick={()=>{if(newTerm.trim()){setVocabulary([...vocabulary,newTerm.trim()]);setNewTerm("");}}}>Add</button></section></>;
    if (section === "Export") {
      const outputResolution=state.media?get4KOutputResolution(state.media.width,state.media.height):null;
      const currentExportRequest=exportRequest();
      const currentExportFingerprint=currentExportRequest?canonicalExportEditSpec(currentExportRequest):null;
      const colorBlocked=Boolean(state.sourceColorInfo?.support.startsWith("unsupported")||state.sourceColorInfo?.support==="probe-unavailable");
      const overlaysBlocked=state.timelineAssets.length>0;
      const sourcePending=Boolean(state.media&&!state.sourceId&&sourceStorage.status==="storing");
      const sourceFailed=Boolean(state.media&&!state.sourceId&&sourceStorage.status==="failed");
      const active=exportPending||exportJob?.status==="queued"||exportJob?.status==="processing";
      const disabled=!state.media||!state.sourceId||colorBlocked||overlaysBlocked||active;
      const exportOutdated=exportJob?.status==="succeeded"&&submittedExportFingerprint!==currentExportFingerprint;
      return <>
        <section className="summary-card export-summary"><div><span>Output</span><b className="small-value">{outputResolution?`${outputResolution.width}×${outputResolution.height}`:"No source"}</b></div><div><span>Duration</span><b>{formatTime(state.cleanedDuration())}</b></div><div><span>Color</span><b className="small-value">{state.sourceColorInfo?.label||"Waiting"}</b></div></section>
        <section className="inspector-section action-stack export-options">
          <div className="field-label"><span>Format</span><CustomSelect ariaLabel="Export format" value={exportFormat} disabled={active} options={[{value:"mp4-h264",label:"MP4 · H.264",detail:"Best compatibility"},{value:"mov-hevc",label:"MOV · HEVC",detail:"Smaller file"}]} onChange={setExportFormat}/></div>
          <label className="toggle-row"><input type="checkbox" checked={burnCaptions} disabled={active} onChange={(event)=>setBurnCaptions(event.target.checked)}/> Burn English subtitles</label>
          {state.colorGrade.enabled?<div className="export-inclusion"><Icons.Palette/><span><strong>Color grade included</strong><small>{state.colorGrade.lut?`${state.colorGrade.lut.name} at ${state.colorGrade.lut.strength}%`:COLOR_GRADE_PRESETS.find((preset)=>preset.id===state.colorGrade.presetId)?.name||"Custom settings"}</small></span></div>:null}
          {overlaysBlocked?<div className="grade-status is-error" role="alert"><Icons.CircleHelp/><span>Remove external video, image, and audio clips before export. This milestone exports the transcript-led main video only.</span></div>:null}
          {colorBlocked?<div className="grade-status is-error" role="alert"><Icons.CircleHelp/><span>{state.sourceColorInfo?.reason}</span></div>:null}
          {sourcePending?<div className="grade-status" role="status"><span>Saving source video locally…</span></div>:null}
          {sourceFailed?<><div className="grade-status is-error" role="alert"><Icons.CircleHelp/><span>{sourceStorage.message}</span></div><button className="secondary-button full-button" type="button" onClick={onRetrySourceStorage}>Retry source storage</button></>:null}
          {!state.media?<small>Import a source video to enable export.</small>:null}
          {(!exportJob||exportJob.status==="cancelled")?<button className="export-button full-button" disabled={disabled} onClick={()=>void prepareExport()}>{exportPending?"Queuing export…":"Export video"}</button>:null}
        </section>
        {exportJob?<section className={`inspector-section export-job is-${exportJob.status}`} aria-live="polite"><div className="export-job-head"><span className="export-job-icon">{exportJob.status==="succeeded"?<Icons.Check/>:exportJob.status==="failed"?<Icons.CircleHelp/>:<Icons.Download/>}</span><div><strong>{exportJob.stage}</strong><small>{exportJob.status==="processing"?`${Math.round(exportJob.progress*100)}% complete`:exportJob.status==="queued"?"One local export runs at a time":exportJob.status==="succeeded"?exportJob.filename:exportJob.error||"No partial video was kept"}</small></div></div>{["queued","processing"].includes(exportJob.status)?<><div className="export-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exportJob.progress*100)}><i style={{width:`${Math.round(exportJob.progress*100)}%`}}/></div><button type="button" className="secondary-button full-button" onClick={()=>void cancelCurrentExport()}>Cancel export</button></>:null}{exportJob.status==="succeeded"?<div className="export-job-actions">{exportOutdated?<div className="grade-status export-outdated-status" role="status"><Icons.RotateCcw/><span><strong>Edit changed since this render</strong>Render again to include the latest video changes.</span></div>:null}{exportOutdated?<><button type="button" className="export-button full-button" disabled={disabled} onClick={()=>void prepareExport(true)}>{exportPending?"Queuing export…":"Render updated video"}</button><a className="secondary-button full-button" href={`/api/exports/${exportJob.id}/file`} download={exportJob.filename||"descriptor-export.mp4"} onClick={()=>onNotice("Previous video download started")}>Save previous video</a></>:<><a className="export-button full-button" href={`/api/exports/${exportJob.id}/file`} download={exportJob.filename||"descriptor-export.mp4"} onClick={()=>onNotice("Video download started")}>Save video</a><button type="button" className="secondary-button full-button" disabled={disabled} onClick={()=>void prepareExport(true)}>{exportPending?"Queuing export…":"Export again"}</button></>}</div>:null}{exportJob.status==="failed"?<button type="button" className="secondary-button full-button" disabled={disabled} onClick={()=>void prepareExport()}>Retry export</button>:null}</section>:null}
      </>;
    }
    return <section className="inspector-section action-stack settings-general"><label className="toggle-row"><input type="checkbox" checked={autoSave} onChange={(e)=>setAutoSave(e.target.checked)}/> Autosave locally</label><label className="toggle-row"><input type="checkbox" checked={safeGuides} onChange={(e)=>setSafeGuides(e.target.checked)}/> Instagram Reels safe area</label><small className="safe-area-help">Shows the header, action rail, and bottom caption/control zones that can cover a 9:16 Reel.</small><button className="secondary-button" onClick={()=>onNotice("Local editor preferences reset")}>Reset preferences</button><p className="privacy-note">Source media, speech timing, transcripts, translations, and edits stay on this Mac.</p></section>;
  })();
  const ActiveSectionIcon = navItems.find(([label]) => label === section)?.[1] ?? Icons.Settings;
  return <aside className="inspector" data-section={section}><div className="inspector-title"><div className="inspector-title-leading"><span className="inspector-title-icon"><ActiveSectionIcon /></span><div><p className="eyebrow">{section === "Speech cleanup" ? "AI review" : "Properties"}</p><h2>{section}</h2></div></div><div className="inspector-more" ref={inspectorMoreRef}><button className="icon-button" aria-label="More inspector actions" aria-haspopup="menu" aria-expanded={inspectorMoreOpen} onClick={()=>setInspectorMoreOpen((open)=>!open)}><Icons.MoreHorizontal /></button>{inspectorMoreOpen ? <div className="inspector-menu" role="menu" aria-label="Inspector actions"><button role="menuitemcheckbox" aria-checked={autoSave} onClick={()=>setAutoSave(!autoSave)}><span>Autosave locally</span><small>{autoSave?"On":"Off"}</small></button><button role="menuitemcheckbox" aria-checked={safeGuides} onClick={()=>setSafeGuides(!safeGuides)}><span>Instagram Reels safe area</span><small>{safeGuides?"On":"Off"}</small></button><button role="menuitem" onClick={()=>{setInspectorMoreOpen(false);onNotice("Project snapshot saved locally");}}><span>Save snapshot</span><Icons.Check /></button></div> : null}</div></div>{panel}</aside>;
}

function Timeline({ duration, onImportSource, onNotice, deleteShortcutDisabled }: { duration: number; onImportSource: () => void; onNotice: (message: string) => void; deleteShortcutDisabled: boolean }) {
  const state = useEditorStore();
  const hasSourceMedia = Boolean(state.media && state.mediaUrl);
  const hasValidatedAnalysis = hasSourceMedia && state.aiStatus === "complete";
  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLButtonElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const edgeScrollFrameRef = useRef<number | null>(null);
  const edgeScrollPointerXRef = useRef<number | null>(null);
  const edgeScrollUpdateRef = useRef<(() => void) | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false, top: false, bottom: false });
  const splitMarkers = state.splitMarkers;
  const [selectedSegment, setSelectedSegment] = useState<TimeRange | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; segment: TimeRange } | null>(null);
  const [assetContextMenu, setAssetContextMenu] = useState<{ x: number; y: number; assetId: string } | null>(null);
  const [assetInteraction, setAssetInteraction] = useState<{ mode: "move" | "trim-start" | "trim-end"; clip: TimelineAssetClip; contentX: number } | null>(null);
  const [assetDraft, setAssetDraft] = useState<TimelineAssetClip | null>(null);
  const [sourceTrim, setSourceTrim] = useState<{ edge: "start" | "end"; segment: TimeRange; value: number } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ time: number; label: string } | null>(null);
  const [importingAssets, setImportingAssets] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loadedWaveformUrl, setLoadedWaveformUrl] = useState<string | null>(null);
  const [failedWaveformUrl, setFailedWaveformUrl] = useState<string | null>(null);
  const waveformStatus = !state.waveformUrl ? "idle" : loadedWaveformUrl === state.waveformUrl ? "ready" : failedWaveformUrl === state.waveformUrl ? "error" : "loading";
  const timelineSetCurrentTime = state.setCurrentTime;
  const removedRanges = useMemo(() => mergeTimeRanges([
    ...state.issues.filter((issue) => state.removedIssueIds.includes(issue.id)),
    ...state.deletedRanges
  ], duration), [duration, state.deletedRanges, state.issues, state.removedIssueIds]);
  const keptRanges = useMemo(() => keptTimeRanges(duration, removedRanges), [duration, removedRanges]);
  const clipSegments = useMemo(() => {
    const boundaries = [0, ...splitMarkers.filter((marker) => marker > 0.01 && marker < duration - 0.01), duration];
    return boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1] })).filter((segment) => segment.end - segment.start > 0.01);
  }, [duration, splitMarkers]);
  const cleanedDuration = Math.max(0, state.cleanedDuration());
  const timelineScaleDuration = Math.max(0.001, cleanedDuration);
  const timelineCurrentTime = Math.min(cleanedDuration, sourceToEditedTime(state.currentTime, removedRanges));
  const filmstripFrameCount = Math.max(12, Math.min(48, Math.round(30 * Math.sqrt(timelineZoom / 100))));
  const { frames: filmstripFrames, status: filmstripStatus } = useVideoFilmstrip(state.mediaUrl, duration, removedRanges, filmstripFrameCount);
  const tickCount = Math.max(9, Math.round(9 * timelineZoom / 100));
  const ticks = hasSourceMedia ? Array.from({ length: tickCount }, (_, index) => cleanedDuration / (tickCount - 1) * index) : [];
  const updateScrollEdges = useCallback(() => {
    const viewport = timelineViewportRef.current;
    if (!viewport) return;
    viewport.style.setProperty("--timeline-scroll-y", `${viewport.scrollTop}px`);
    const next = {
      left: viewport.scrollLeft > 1,
      right: viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1,
      top: viewport.scrollTop > 1,
      bottom: viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1
    };
    setScrollEdges((current) => current.left === next.left && current.right === next.right && current.top === next.top && current.bottom === next.bottom ? current : next);
  }, []);
  const editedTimeFromX = useCallback((clientX: number) => {
    const rect = tracksRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const trackWidth = Math.max(1, rect.width - 92);
    const x = Math.max(0, Math.min(trackWidth, clientX - rect.left - 92));
    return x / trackWidth * cleanedDuration;
  }, [cleanedDuration]);
  const trackContentXFromClientX = useCallback((clientX: number) => {
    const rect = tracksRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const trackWidth = Math.max(1, rect.width - 92);
    return Math.max(0, Math.min(trackWidth, clientX - rect.left - 92));
  }, []);
  const sourceTimeFromX = useCallback((clientX: number) => {
    return editedToSourceTime(editedTimeFromX(clientX), duration, removedRanges);
  }, [duration, editedTimeFromX, removedRanges]);
  const seekFromX = useCallback((clientX: number) => {
    timelineSetCurrentTime(sourceTimeFromX(clientX));
  }, [sourceTimeFromX, timelineSetCurrentTime]);
  const stopEdgeAutoScroll = useCallback(() => {
    if (edgeScrollFrameRef.current !== null) cancelAnimationFrame(edgeScrollFrameRef.current);
    edgeScrollFrameRef.current = null;
    edgeScrollPointerXRef.current = null;
    edgeScrollUpdateRef.current = null;
  }, []);
  const updateEdgeAutoScroll = useCallback((clientX: number, updateAtPointer: () => void) => {
    const viewport = timelineViewportRef.current;
    if (!viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const leftEdge = viewportRect.left + 92;
    const rightEdge = viewportRect.right;
    const edgeZone = 56;
    const nearLeft = clientX < leftEdge + edgeZone;
    const nearRight = clientX > rightEdge - edgeZone;
    if (!nearLeft && !nearRight) {
      stopEdgeAutoScroll();
      return;
    }
    edgeScrollPointerXRef.current = clientX;
    edgeScrollUpdateRef.current = updateAtPointer;
    if (edgeScrollFrameRef.current !== null) return;
    const scrollFrame = () => {
      edgeScrollFrameRef.current = null;
      const activeViewport = timelineViewportRef.current;
      const pointerX = edgeScrollPointerXRef.current;
      if (!activeViewport || pointerX === null) return;
      const rect = activeViewport.getBoundingClientRect();
      const contentLeft = rect.left + 92;
      const contentRight = rect.right;
      const leftStrength = pointerX < contentLeft + edgeZone ? Math.min(1, (contentLeft + edgeZone - pointerX) / edgeZone) : 0;
      const rightStrength = pointerX > contentRight - edgeZone ? Math.min(1, (pointerX - contentRight + edgeZone) / edgeZone) : 0;
      const direction = rightStrength > 0 ? 1 : leftStrength > 0 ? -1 : 0;
      const strength = Math.max(leftStrength, rightStrength);
      const previous = activeViewport.scrollLeft;
      if (direction !== 0) activeViewport.scrollLeft += direction * (4 + 18 * strength);
      const moved = Math.abs(activeViewport.scrollLeft - previous) > .1;
      if (moved) {
        updateScrollEdges();
        edgeScrollUpdateRef.current?.();
      }
      const canContinue = direction < 0
        ? activeViewport.scrollLeft > 0
        : direction > 0 && activeViewport.scrollLeft + activeViewport.clientWidth < activeViewport.scrollWidth - 1;
      if (direction !== 0 && canContinue) edgeScrollFrameRef.current = requestAnimationFrame(scrollFrame);
      else stopEdgeAutoScroll();
    };
    edgeScrollFrameRef.current = requestAnimationFrame(scrollFrame);
  }, [stopEdgeAutoScroll, updateScrollEdges]);
  const ensureSourceTimeVisible = useCallback((sourceTime: number) => {
    const viewport = timelineViewportRef.current;
    const tracks = tracksRef.current;
    if (!viewport || !tracks || viewport.scrollWidth <= viewport.clientWidth + 1) return;
    const editedTime = Math.min(cleanedDuration, sourceToEditedTime(sourceTime, removedRanges));
    const progress = Math.max(0, Math.min(1, editedTime / timelineScaleDuration));
    const contentX = 92 + Math.max(1, tracks.clientWidth - 92) * progress;
    const visibleLeft = viewport.scrollLeft + 92 + 18;
    const visibleRight = viewport.scrollLeft + viewport.clientWidth - 24;
    if (contentX < visibleLeft) viewport.scrollLeft = Math.max(0, contentX - 92 - 18);
    else if (contentX > visibleRight) viewport.scrollLeft = Math.min(viewport.scrollWidth - viewport.clientWidth, contentX - viewport.clientWidth + 24);
    updateScrollEdges();
  }, [cleanedDuration, removedRanges, timelineScaleDuration, updateScrollEdges]);
  const changeTimelineZoom = useCallback((nextZoom: number, anchorClientX?: number) => {
    const viewport = timelineViewportRef.current;
    const tracks = tracksRef.current;
    const clampedZoom = Math.max(100, Math.min(400, nextZoom));
    if (!viewport || !tracks || clampedZoom === timelineZoom) return;
    const viewportRect = viewport.getBoundingClientRect();
    const tracksRect = tracks.getBoundingClientRect();
    const currentTimeX = tracksRect.left + 92 + Math.max(1, tracks.clientWidth - 92) * Math.max(0, Math.min(1, timelineCurrentTime / timelineScaleDuration));
    const fallbackAnchorX = currentTimeX >= viewportRect.left + 92 && currentTimeX <= viewportRect.right - 20
      ? currentTimeX
      : viewportRect.left + 92 + Math.max(1, viewportRect.width - 112) / 2;
    const screenAnchorX = Math.max(viewportRect.left + 92, Math.min(viewportRect.right - 12, anchorClientX ?? fallbackAnchorX));
    const anchorTime = anchorClientX === undefined ? timelineCurrentTime : editedTimeFromX(screenAnchorX);
    const anchorOffset = screenAnchorX - viewportRect.left;
    setTimelineZoom(clampedZoom);
    requestAnimationFrame(() => {
      const nextViewport = timelineViewportRef.current;
      const nextTracks = tracksRef.current;
      if (!nextViewport || !nextTracks) return;
      const progress = Math.max(0, Math.min(1, anchorTime / timelineScaleDuration));
      const contentX = 92 + Math.max(1, nextTracks.clientWidth - 92) * progress;
      nextViewport.scrollLeft = Math.max(0, Math.min(nextViewport.scrollWidth - nextViewport.clientWidth, contentX - anchorOffset));
      updateScrollEdges();
    });
  }, [editedTimeFromX, timelineCurrentTime, timelineScaleDuration, timelineZoom, updateScrollEdges]);
  const fitTimeline = useCallback(() => {
    setTimelineZoom(100);
    requestAnimationFrame(() => {
      if (timelineViewportRef.current) timelineViewportRef.current.scrollLeft = 0;
      updateScrollEdges();
    });
  }, [updateScrollEdges]);
  const selectAsset = useCallback((clip: TimelineAssetClip, seek = true) => {
    setSelectedAssetId(clip.id);
    setSelectedSegment(null);
    setContextMenu(null);
    state.setPlaying(false);
    if (seek) state.setCurrentTime(editedToSourceTime(clip.start, duration, removedRanges));
  }, [duration, removedRanges, state]);
  const importTimelineFiles = useCallback(async (files: File[], start: number) => {
    const supportedFiles = files.filter((file) => timelineAssetType(file));
    if (!supportedFiles.length) {
      onNotice("Drop a video, audio, PNG, JPEG, WebP, or GIF file");
      return;
    }
    setImportingAssets(true);
    let cursor = Math.max(0, Math.min(start, Math.max(0, cleanedDuration - 0.1)));
    let imported = 0;
    let lastClip: TimelineAssetClip | null = null;
    try {
      for (const file of supportedFiles) {
        const clip = await createTimelineAsset(file, cursor, timelineScaleDuration);
        state.addTimelineAsset(clip);
        lastClip = clip;
        imported += 1;
        cursor = Math.min(timelineScaleDuration - 0.1, clip.start + clip.sourceEnd - clip.sourceStart);
      }
      if (lastClip) selectAsset(lastClip);
      onNotice(`${imported} media clip${imported === 1 ? "" : "s"} added · Undo available`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The media clip could not be imported");
    } finally {
      setImportingAssets(false);
      setDropPreview(null);
    }
  }, [cleanedDuration, onNotice, selectAsset, state, timelineScaleDuration]);
  const paintPlayhead = useCallback((sourceTime: number) => {
    const tracks = tracksRef.current;
    const playhead = playheadRef.current;
    if (!tracks || !playhead) return;
    const editedTime = Math.min(cleanedDuration, sourceToEditedTime(sourceTime, removedRanges));
    const progress = Math.max(0, Math.min(1, editedTime / timelineScaleDuration));
    const x = 92 + Math.max(1, tracks.clientWidth - 92) * progress;
    playhead.style.transform = `translate3d(${x}px, 0, 0)`;
  }, [cleanedDuration, removedRanges, timelineScaleDuration]);
  useEffect(() => {
    const currentTime = useEditorStore.getState().currentTime;
    paintPlayhead(currentTime);
    updateScrollEdges();
    const unsubscribe = useEditorStore.subscribe((nextState, previousState) => {
      if (nextState.currentTime !== previousState.currentTime) {
        paintPlayhead(nextState.currentTime);
        ensureSourceTimeVisible(nextState.currentTime);
      }
    });
    const observer = new ResizeObserver(() => {
      paintPlayhead(useEditorStore.getState().currentTime);
      updateScrollEdges();
    });
    if (tracksRef.current) observer.observe(tracksRef.current);
    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [ensureSourceTimeVisible, paintPlayhead, updateScrollEdges]);
  useEffect(() => () => stopEdgeAutoScroll(), [stopEdgeAutoScroll]);
  useEffect(() => {
    if (!dragging) return;
    const update = (clientX: number) => seekFromX(clientX);
    const move = (event: PointerEvent) => {
      update(event.clientX);
      updateEdgeAutoScroll(event.clientX, () => update(event.clientX));
    };
    const up = () => {
      stopEdgeAutoScroll();
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, seekFromX, stopEdgeAutoScroll, updateEdgeAutoScroll]);
  useEffect(() => {
    if (!assetInteraction) return;
    const clip = assetInteraction.clip;
    const visibleDuration = clip.sourceEnd - clip.sourceStart;
    const targets = [0, timelineScaleDuration, timelineCurrentTime, ...state.timelineAssets.filter((item) => item.id !== clip.id).flatMap((item) => [item.start, item.start + item.sourceEnd - item.sourceStart])];
    const trackWidth = Math.max(1, (tracksRef.current?.clientWidth ?? 93) - 92);
    const snapThreshold = timelineScaleDuration * 7 / trackWidth;
    const snap = (value: number) => {
      const closest = targets.reduce((best, target) => Math.abs(target - value) < Math.abs(best - value) ? target : best, targets[0] ?? value);
      return Math.abs(closest - value) <= snapThreshold ? closest : value;
    };
    const update = (clientX: number) => {
      const delta = (trackContentXFromClientX(clientX) - assetInteraction.contentX) / trackWidth * timelineScaleDuration;
      if (assetInteraction.mode === "move") {
        let start = Math.max(0, Math.min(timelineScaleDuration - visibleDuration, clip.start + delta));
        const snappedStart = snap(start);
        const snappedEnd = snap(start + visibleDuration) - visibleDuration;
        start = Math.abs(snappedStart - start) <= Math.abs(snappedEnd - start) ? snappedStart : snappedEnd;
        setAssetDraft({ ...clip, start: Math.max(0, Math.min(timelineScaleDuration - visibleDuration, start)) });
        return;
      }
      if (assetInteraction.mode === "trim-start") {
        const trimDelta = Math.max(Math.max(-clip.sourceStart, -clip.start), Math.min(visibleDuration - 0.1, delta));
        let start = clip.start + trimDelta;
        start = snap(start);
        const snappedDelta = Math.max(Math.max(-clip.sourceStart, -clip.start), Math.min(visibleDuration - 0.1, start - clip.start));
        setAssetDraft({ ...clip, start: clip.start + snappedDelta, sourceStart: clip.sourceStart + snappedDelta });
        return;
      }
      let sourceEnd = Math.max(clip.sourceStart + 0.1, Math.min(clip.sourceDuration, clip.sourceEnd + delta));
      const end = snap(clip.start + sourceEnd - clip.sourceStart);
      sourceEnd = Math.max(clip.sourceStart + 0.1, Math.min(clip.sourceDuration, Math.min(clip.sourceStart + timelineScaleDuration - clip.start, clip.sourceStart + end - clip.start)));
      setAssetDraft({ ...clip, sourceEnd });
    };
    const move = (event: PointerEvent) => {
      update(event.clientX);
      updateEdgeAutoScroll(event.clientX, () => update(event.clientX));
    };
    const finish = () => {
      stopEdgeAutoScroll();
      const draft = assetDraft;
      if (draft) {
        if (assetInteraction.mode === "move") {
          if (Math.abs(draft.start - clip.start) < 0.001) state.setCurrentTime(editedToSourceTime(clip.start, duration, removedRanges));
          else state.updateTimelineAsset(clip.id, { start: draft.start }, "Move media clip");
        }
        else if (assetInteraction.mode === "trim-start") state.updateTimelineAsset(clip.id, { start: draft.start, sourceStart: draft.sourceStart }, "Trim media clip");
        else state.updateTimelineAsset(clip.id, { sourceEnd: draft.sourceEnd }, "Trim media clip");
      }
      setAssetInteraction(null);
      setAssetDraft(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [assetDraft, assetInteraction, duration, removedRanges, state, stopEdgeAutoScroll, timelineCurrentTime, timelineScaleDuration, trackContentXFromClientX, updateEdgeAutoScroll]);
  useEffect(() => {
    if (!sourceTrim) return;
    const retained = keptRanges.filter((range) => range.end > sourceTrim.segment.start && range.start < sourceTrim.segment.end);
    const retainedStart = Math.max(sourceTrim.segment.start, retained[0]?.start ?? sourceTrim.segment.start);
    const retainedEnd = Math.min(sourceTrim.segment.end, retained.at(-1)?.end ?? sourceTrim.segment.end);
    const update = (clientX: number) => {
      const sourceTime = sourceTimeFromX(clientX);
      const value = sourceTrim.edge === "start"
        ? Math.max(retainedStart, Math.min(retainedEnd - 0.1, sourceTime))
        : Math.max(retainedStart + 0.1, Math.min(retainedEnd, sourceTime));
      setSourceTrim((current) => current ? { ...current, value } : null);
    };
    const move = (event: PointerEvent) => {
      update(event.clientX);
      updateEdgeAutoScroll(event.clientX, () => update(event.clientX));
    };
    const finish = () => {
      stopEdgeAutoScroll();
      const trim = sourceTrim;
      if (trim.edge === "start" && trim.value > trim.segment.start + 0.01) state.deleteTimeRange({ start: trim.segment.start, end: trim.value }, "Trim video clip");
      if (trim.edge === "end" && trim.value < trim.segment.end - 0.01) state.deleteTimeRange({ start: trim.value, end: trim.segment.end }, "Trim video clip");
      setSourceTrim(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [keptRanges, sourceTimeFromX, sourceTrim, state, stopEdgeAutoScroll, updateEdgeAutoScroll]);
  const segmentAtTime = useCallback((sourceTime: number) => clipSegments.find((segment) => sourceTime >= segment.start && (sourceTime < segment.end || (segment.end === duration && sourceTime <= segment.end))), [clipSegments, duration]);
  const selectSegment = useCallback((segment: TimeRange) => {
    const firstKeptRange = keptRanges.find((kept) => kept.end > segment.start && kept.start < segment.end);
    if (!firstKeptRange) return;
    setSelectedSegment(segment);
    setSelectedAssetId(null);
    setAssetContextMenu(null);
    state.setPlaying(false);
    state.setCurrentTime(Math.max(segment.start, firstKeptRange.start));
  }, [keptRanges, state]);
  const openSegmentMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const targetSegment = segmentAtTime(sourceTimeFromX(event.clientX));
    if (!targetSegment) return;
    setSelectedSegment(targetSegment);
    setSelectedAssetId(null);
    setAssetContextMenu(null);
    state.setPlaying(false);
    const menuWidth = 184;
    const menuHeight = 48;
    setContextMenu({
      x: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, event.clientX)),
      y: Math.max(8, Math.min(window.innerHeight - menuHeight - 8, event.clientY)),
      segment: targetSegment
    });
  }, [segmentAtTime, sourceTimeFromX, state]);
  const deleteSegment = useCallback((segment: TimeRange | null) => {
    if (!segment) return;
    state.deleteTimeRange(segment);
    setSelectedSegment(null);
    setContextMenu(null);
    onNotice(`Segment deleted · ${formatTime(segment.end - segment.start)} removed · Undo available`);
  }, [onNotice, state]);
  const deleteAsset = useCallback((assetId: string | null) => {
    if (!assetId) return;
    const clip = state.timelineAssets.find((item) => item.id === assetId);
    if (!clip) return;
    state.deleteTimelineAsset(assetId);
    setSelectedAssetId(null);
    setAssetContextMenu(null);
    onNotice(`${clip.name} removed · Undo available`);
  }, [onNotice, state]);
  useEffect(() => {
    if (!contextMenu && !assetContextMenu) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
        setAssetContextMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [assetContextMenu, contextMenu]);
  useEffect(() => {
    const onDeleteShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (event.key === "Escape") {
        if (contextMenu || assetContextMenu) {
          setContextMenu(null);
          setAssetContextMenu(null);
        } else {
          setSelectedSegment(null);
          setSelectedAssetId(null);
        }
        return;
      }
      if (deleteShortcutDisabled || (!selectedSegment && !selectedAssetId) || (event.key !== "Backspace" && event.key !== "Delete")) return;
      event.preventDefault();
      if (selectedAssetId) deleteAsset(selectedAssetId);
      else deleteSegment(selectedSegment);
    };
    window.addEventListener("keydown", onDeleteShortcut);
    return () => window.removeEventListener("keydown", onDeleteShortcut);
  }, [assetContextMenu, contextMenu, deleteAsset, deleteSegment, deleteShortcutDisabled, selectedAssetId, selectedSegment]);
  const split = () => {
    if (selectedAssetId) {
      const clip = state.timelineAssets.find((item) => item.id === selectedAssetId);
      if (clip && timelineCurrentTime > clip.start + 0.1 && timelineCurrentTime < clip.start + clip.sourceEnd - clip.sourceStart - 0.1) {
        state.splitTimelineAsset(clip.id, timelineCurrentTime);
        setSelectedAssetId(null);
      }
      return;
    }
    const value = Math.round(state.currentTime * 10) / 10;
    if (value <= .01 || value >= duration - .01) return;
    if (!splitMarkers.some((marker) => Math.abs(marker - value) < .05)) {
      const nextMarkers = [...splitMarkers, value].sort((a, b) => a - b);
      state.addSplitMarker(value);
      const nextBoundary = nextMarkers.find((marker) => marker > value + .01) ?? duration;
      setSelectedSegment({ start: value, end: nextBoundary });
    }
  };
  const subtitleClips = (hasValidatedAnalysis ? state.paragraphs : []).flatMap((paragraph, paragraphIndex) => keptRanges.flatMap((kept, keptIndex) => {
    const start = Math.max(paragraph.start, kept.start);
    const end = Math.min(paragraph.end, kept.end);
    if (end <= start) return [];
    const text = translationForTimeRange(paragraph, start, end) || paragraph.words.filter((word) => word.end > start && word.start < end).map((word) => word.text).join(" ");
    return [{ paragraph, paragraphIndex, keptIndex, start, end, text }];
  }));
  const handleTimelineWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      const delta = event.deltaY || event.deltaX;
      if (delta === 0) return;
      event.preventDefault();
      changeTimelineZoom(timelineZoom + (delta < 0 ? 25 : -25), event.clientX);
      return;
    }
    if (event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      event.currentTarget.scrollLeft += event.deltaY;
      updateScrollEdges();
    }
  };
  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !event.shiftKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.scrollLeft += event.key === "ArrowLeft" ? -96 : 96;
    updateScrollEdges();
  };
  return <section className="timeline">
    <div className="timeline-toolbar">
      <div>
        <button aria-label="Timeline zoom out" disabled={timelineZoom <= 100} onClick={() => changeTimelineZoom(timelineZoom - 25)}><Icons.ZoomOut /></button>
        <span>{timelineZoom}%</span>
        <button aria-label="Timeline zoom in" disabled={timelineZoom >= 400} onClick={() => changeTimelineZoom(timelineZoom + 25)}><Icons.ZoomIn /></button>
        <button className={`timeline-fit-button${timelineZoom === 100 ? " is-active" : ""}`} aria-label="Fit full timeline" aria-pressed={timelineZoom === 100} onClick={fitTimeline}>Fit</button>
        <button className="timeline-import-button" disabled={importingAssets} onClick={() => assetInputRef.current?.click()}><Icons.Upload /> {importingAssets ? "Adding…" : "Add media"}</button>
        <input ref={assetInputRef} hidden multiple type="file" accept={timelineMediaAccept} onChange={(event) => { void importTimelineFiles(Array.from(event.target.files ?? []), timelineCurrentTime); event.currentTarget.value = ""; }} />
      </div>
      <div className="timeline-center"><button aria-label={state.playing ? "Pause" : "Play"} disabled={!hasSourceMedia} onClick={() => state.setPlaying(!state.playing)}>{state.playing ? <Icons.Pause/> : <Icons.Play/>}</button><button disabled={!hasSourceMedia} onClick={split}><Icons.Scissors/> Split</button></div>
      <span>{hasSourceMedia ? `${formatTime(timelineCurrentTime)} / ${formatTime(cleanedDuration)} · ${splitMarkers.length} splits · ${state.timelineAssets.length} media` : `No source video · ${state.timelineAssets.length} media`}</span>
    </div>
    <div
      ref={timelineViewportRef}
      className={`timeline-scroll-viewport${scrollEdges.left ? " has-scroll-left" : ""}${scrollEdges.right ? " has-scroll-right" : ""}${scrollEdges.top ? " has-scroll-top" : ""}${scrollEdges.bottom ? " has-scroll-bottom" : ""}`}
      data-scroll-left={scrollEdges.left}
      data-scroll-right={scrollEdges.right}
      data-scroll-top={scrollEdges.top}
      data-scroll-bottom={scrollEdges.bottom}
      role="region"
      tabIndex={0}
      aria-label="Scrollable timeline. Wheel scrolls tracks vertically. Shift and arrow keys scroll horizontally. Control or Command and wheel zooms."
      title="Wheel to scroll tracks · Trackpad to scroll · Shift + wheel for horizontal · Ctrl/⌘ + wheel to zoom"
      onScroll={updateScrollEdges}
      onWheel={handleTimelineWheel}
      onKeyDown={handleTimelineKeyDown}
    >
      <div className="timeline-scroll-canvas" style={{ width: `${timelineZoom}%` }}>
        <div className="timeline-ruler-row">
          <div className="timeline-ruler-corner" aria-hidden="true">Time</div>
          <div className={`ruler${hasSourceMedia ? "" : " is-empty"}`} onPointerDown={(event)=>{if(hasSourceMedia)seekFromX(event.clientX)}}>{ticks.map((tick, index) => <span key={`${index}-${tick}`} style={{ left: `${tick / timelineScaleDuration * 100}%` }}>{formatTime(tick)}</span>)}</div>
        </div>
        <div
          className={`tracks${dropPreview ? " is-file-dragging" : ""}`}
          ref={tracksRef}
          onPointerDown={(event) => { if (event.target === event.currentTarget) seekFromX(event.clientX); }}
          onDragOver={(event) => {
            const item = Array.from(event.dataTransfer.items).find((candidate) => candidate.kind === "file" && /^(video|audio|image)\//.test(candidate.type));
            if (!item && event.dataTransfer.files.length === 0) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            const clientX = event.clientX;
            const label = item?.type.split("/")[0] ?? "media";
            const updatePreview = () => setDropPreview({ time: editedTimeFromX(clientX), label });
            updatePreview();
            updateEdgeAutoScroll(clientX, updatePreview);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              stopEdgeAutoScroll();
              setDropPreview(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            stopEdgeAutoScroll();
            const start = editedTimeFromX(event.clientX);
            const files = Array.from(event.dataTransfer.files);
            setDropPreview(null);
            void importTimelineFiles(files, start);
          }}
        >
      <div className="track-label"><Icons.FileVideo/><span>Video</span></div>
      <div className={`track-content filmstrip cleaned-filmstrip${state.aiStatus === "processing" ? " is-processing" : ""}`} aria-label={!hasSourceMedia ? "Source video empty" : state.aiStatus === "processing" ? "Video processing" : "Video timeline"} onPointerDown={(e)=>{if(hasSourceMedia)seekFromX(e.clientX)}} onContextMenu={(event)=>{if(hasSourceMedia)openSegmentMenu(event)}}>
        <div className="filmstrip-frames" aria-hidden="true">
          {filmstripFrames.map((frame, index) => <span key={`${index}-${frame.sourceTime.toFixed(3)}`} className={`filmstrip-frame${frame.imageUrl ? " is-ready" : ""}`} data-source-time={frame.sourceTime.toFixed(3)} style={frame.imageUrl ? { backgroundImage: `url(${frame.imageUrl})` } : undefined} />)}
        </div>
        {!hasSourceMedia ? <button type="button" className="timeline-source-empty" onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation();onImportSource();}}><Icons.Upload/><span><strong>Import source video</strong><small>Build thumbnails, waveform, captions, and cleanup markers</small></span></button> : null}
        {hasSourceMedia && filmstripStatus === "error" ? <span className="filmstrip-empty">Video thumbnails unavailable</span> : null}
        {hasSourceMedia && state.aiStatus === "processing" ? <span className="timeline-processing-banner">Analyzing captions</span> : null}
        {hasSourceMedia ? clipSegments.map((segment, index) => {
          const selected = Boolean(selectedSegment && Math.abs(selectedSegment.start - segment.start) < .01 && Math.abs(selectedSegment.end - segment.end) < .01);
          const retained = keptRanges.filter((range) => range.end > segment.start && range.start < segment.end);
          const retainedStart = Math.max(segment.start, retained[0]?.start ?? segment.start);
          const retainedEnd = Math.min(segment.end, retained.at(-1)?.end ?? segment.end);
          const displaySourceStart = selected && sourceTrim?.segment.start === segment.start && sourceTrim.edge === "start" ? sourceTrim.value : segment.start;
          const displaySourceEnd = selected && sourceTrim?.segment.start === segment.start && sourceTrim.edge === "end" ? sourceTrim.value : segment.end;
          const start = sourceToEditedTime(displaySourceStart, removedRanges);
          const end = sourceToEditedTime(displaySourceEnd, removedRanges);
          if (end <= start + .001) return null;
          return <div
            key={`${segment.start}-${segment.end}`}
            className={`timeline-video-segment${selected ? " selected" : ""}${sourceTrim?.segment.start === segment.start ? " is-trimming" : ""}`}
            style={{ left: `${start / timelineScaleDuration * 100}%`, width: `${Math.max(.5, (end - start) / timelineScaleDuration * 100)}%` }}
            role="button"
            tabIndex={0}
            aria-label={`Video segment ${index + 1}, ${formatTime(start)} to ${formatTime(end)}${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            title="Select segment · Drag grips to trim · Backspace/Delete removes it · Right-click for menu"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => selectSegment(segment)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectSegment(segment); } }}
            onContextMenu={openSegmentMenu}
          >
            {selected ? <>
              <button
                className="timeline-segment-handle is-start"
                aria-label={`Trim start of video segment ${index + 1}`}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); state.setPlaying(false); setSourceTrim({ edge: "start", segment, value: retainedStart }); }}
                onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); state.deleteTimeRange({ start: segment.start, end: Math.min(retainedEnd - 0.1, retainedStart + 0.1) }, "Trim video clip"); } }}
              ><i /></button>
              <span className="timeline-segment-label">{formatTime(end - start)}</span>
              <button
                className="timeline-segment-handle is-end"
                aria-label={`Trim end of video segment ${index + 1}`}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); state.setPlaying(false); setSourceTrim({ edge: "end", segment, value: retainedEnd }); }}
                onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); state.deleteTimeRange({ start: Math.max(retainedStart + 0.1, retainedEnd - 0.1), end: segment.end }, "Trim video clip"); } }}
              ><i /></button>
            </> : null}
          </div>;
        }) : null}
        {hasValidatedAnalysis ? state.issues.filter((issue) => !state.removedIssueIds.includes(issue.id)).map((issue) => { const start=sourceToEditedTime(issue.start,removedRanges);const end=sourceToEditedTime(issue.end,removedRanges);if(end<=start)return null;return <button key={issue.id} className="issue-range" style={{ left: `${start / timelineScaleDuration * 100}%`, width: `${Math.max(1, (end-start) / timelineScaleDuration * 100)}%` }} onPointerDown={(e)=>e.stopPropagation()} onContextMenu={openSegmentMenu} onClick={() => { state.selectIssue(issue.id); state.setCurrentTime(issue.start); }} aria-label={`${issue.label} at ${formatTime(start)}`}/>;}) : null}
      </div>
      <div className="track-label"><Icons.Clapperboard/><span>Media</span></div>
      <div className="track-content asset-track" aria-label="Imported media clips" onPointerDown={(event) => { if (event.target === event.currentTarget) seekFromX(event.clientX); }}>
        {!state.timelineAssets.length ? <button className="asset-track-empty" onClick={() => assetInputRef.current?.click()}><Icons.Upload /> Drop video, audio, or images here</button> : null}
        {state.timelineAssets.map((storedClip) => {
          const clip = assetDraft?.id === storedClip.id ? assetDraft : storedClip;
          const visibleDuration = clip.sourceEnd - clip.sourceStart;
          const selected = selectedAssetId === clip.id;
          const TypeIcon = clip.type === "audio" ? Icons.Music2 : clip.type === "image" ? Icons.ImagePlus : Icons.FileVideo;
          return <div
            key={clip.id}
            className={`timeline-asset-clip is-${clip.type}${selected ? " selected" : ""}${assetInteraction?.clip.id === clip.id ? " is-dragging" : ""}`}
            style={{ left: `${clip.start / timelineScaleDuration * 100}%`, width: `${Math.max(.8, visibleDuration / timelineScaleDuration * 100)}%` }}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${clip.name}, ${clip.type} clip at ${formatTime(clip.start)}, duration ${formatTime(visibleDuration)}`}
            title="Drag to move · Drag edges to trim · Backspace/Delete removes it"
            onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); selectAsset(storedClip, false); setAssetDraft(storedClip); setAssetInteraction({ mode: "move", clip: storedClip, contentX: trackContentXFromClientX(event.clientX) }); }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectAsset(storedClip, false);
              setContextMenu(null);
              setAssetContextMenu({ x: Math.max(8, Math.min(window.innerWidth - 184 - 8, event.clientX)), y: Math.max(8, Math.min(window.innerHeight - 92 - 8, event.clientY)), assetId: storedClip.id });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); selectAsset(storedClip); return; }
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              event.stopPropagation();
              const step = event.shiftKey ? 1 : 0.1;
              const direction = event.key === "ArrowLeft" ? -1 : 1;
              state.updateTimelineAsset(storedClip.id, { start: Math.max(0, Math.min(timelineScaleDuration - visibleDuration, storedClip.start + direction * step)) }, "Move media clip");
            }}
          >
            <TimelineAssetThumbnail clip={clip} />
            <span className="timeline-asset-name"><TypeIcon />{clip.name}</span>
            {selected ? <>
              <button className="timeline-asset-handle is-start" aria-label={`Trim start of ${clip.name}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); setAssetDraft(storedClip); setAssetInteraction({ mode: "trim-start", clip: storedClip, contentX: trackContentXFromClientX(event.clientX) }); }}><i /></button>
              <button className="timeline-asset-handle is-end" aria-label={`Trim end of ${clip.name}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); setAssetDraft(storedClip); setAssetInteraction({ mode: "trim-end", clip: storedClip, contentX: trackContentXFromClientX(event.clientX) }); }}><i /></button>
            </> : null}
          </div>;
        })}
        {dropPreview ? <span className="timeline-drop-preview" style={{ left: `${dropPreview.time / timelineScaleDuration * 100}%` }}><i />Drop {dropPreview.label} at {formatTime(dropPreview.time)}</span> : null}
      </div>
      <div className="track-label"><span className="wave-icon">∿</span><span>Audio</span></div>
      <div className={`track-content waveform waveform-${waveformStatus}`} onPointerDown={(e)=>seekFromX(e.clientX)} aria-label={waveformStatus === "ready" ? "Audio waveform" : "Audio waveform unavailable"}>
        {state.waveformUrl ? keptRanges.map((kept) => {const segmentDuration=kept.end-kept.start;return <span key={`${kept.start}-${kept.end}`} className="waveform-segment" style={{left:`${sourceToEditedTime(kept.start,removedRanges)/timelineScaleDuration*100}%`,width:`${segmentDuration/timelineScaleDuration*100}%`}}><span className="waveform-segment-source" style={{left:`${-kept.start/segmentDuration*100}%`,width:`${duration/segmentDuration*100}%`}}><Image src={state.waveformUrl!} alt="" fill unoptimized sizes="100vw" onLoad={()=>setLoadedWaveformUrl(state.waveformUrl)} onError={()=>setFailedWaveformUrl(state.waveformUrl)}/></span></span>;}) : null}
        {waveformStatus !== "ready" ? <span className="waveform-state">{waveformStatus === "loading" ? "Generating real waveform…" : waveformStatus === "error" ? "Waveform unavailable" : "Import source video for waveform"}</span> : null}
      </div>
      <div className="track-label"><Icons.Captions/><span>English</span></div>
      <div className={`track-content subtitle-track${state.aiStatus === "processing" ? " is-processing" : ""}`} aria-label={state.aiStatus === "processing" ? "English subtitles processing" : "English subtitles"} onPointerDown={(e)=>{if(e.target===e.currentTarget)seekFromX(e.clientX)}}>{subtitleClips.map(({paragraph,paragraphIndex,keptIndex,start,end,text}) => {const selected=state.currentTime>=start&&state.currentTime<=end;const editedStart=sourceToEditedTime(start,removedRanges);return <button key={`${paragraph.id}-${keptIndex}`} className={selected?"selected":""} style={{left:`${editedStart/timelineScaleDuration*100}%`,width:`${Math.max(1.2,(end-start)/timelineScaleDuration*100)}%`}} title={text} aria-label={`Subtitle ${paragraphIndex+1} at ${formatTime(editedStart)}: ${text}`} onClick={(e)=>{e.stopPropagation();state.setCurrentTime(start);}}>{text}</button>;})}</div>
      {hasSourceMedia ? removedRanges.map((range,index) => {const issue=state.issues.find((item)=>state.removedIssueIds.includes(item.id)&&item.start<range.end&&item.end>range.start);const cutTime=sourceToEditedTime(range.start,removedRanges);return <button key={`${range.start}-${range.end}`} className="edit-cut" style={{left:`calc(92px + (100% - 92px) * ${cutTime/timelineScaleDuration})`}} onClick={()=>{if(issue)state.selectIssue(issue.id);state.setCurrentTime(range.end);}} aria-label={`Edit boundary ${index+1} at ${formatTime(cutTime)}${issue?". Select the cleanup issue to restore.":". Use Undo to restore the deleted segment."}`}><i aria-hidden="true"/></button>;}) : null}
      {hasSourceMedia ? splitMarkers.filter((marker)=>!state.deletedRanges.some((range)=>marker>=range.start-.01&&marker<=range.end+.01)).map(marker=><button key={marker} className="split-marker" style={{left:`calc(92px + (100% - 92px) * ${sourceToEditedTime(marker,removedRanges)/timelineScaleDuration})`}} onClick={()=>state.removeSplitMarker(marker)} aria-label={`Remove split at ${formatTime(sourceToEditedTime(marker,removedRanges))}`}/>) : null}
      {hasSourceMedia ? <button ref={playheadRef} className={`playhead ${dragging?"dragging":""}`} style={{ left: 0 }} onPointerDown={(e) => {e.stopPropagation();state.setPlaying(false);setDragging(true);}} aria-label={`Playhead at ${formatTime(timelineCurrentTime)}`} title={`Playhead · ${formatTime(timelineCurrentTime)}`}><i aria-hidden="true"/><span aria-hidden="true">{formatTime(timelineCurrentTime)}</span></button> : null}
        </div>
      </div>
    </div>
    {contextMenu ? <div ref={contextMenuRef} className="timeline-context-menu" role="menu" aria-label="Selected video segment actions" style={{ left: contextMenu.x, top: contextMenu.y }}>
      <button role="menuitem" disabled={state.currentTime <= contextMenu.segment.start + 0.1 || state.currentTime >= contextMenu.segment.end - 0.1} onClick={() => { split(); setContextMenu(null); }}><Icons.Scissors/><span>Split at playhead</span></button>
      <button className="danger-menu-item" role="menuitem" onClick={() => deleteSegment(contextMenu.segment)}><Icons.Trash2/><span>Delete segment</span><kbd>⌫</kbd></button>
    </div> : null}
    {assetContextMenu ? (() => {
      const clip = state.timelineAssets.find((item) => item.id === assetContextMenu.assetId);
      if (!clip) return null;
      const canSplit = timelineCurrentTime > clip.start + 0.1 && timelineCurrentTime < clip.start + clip.sourceEnd - clip.sourceStart - 0.1;
      return <div ref={contextMenuRef} className="timeline-context-menu" role="menu" aria-label={`${clip.name} actions`} style={{ left: assetContextMenu.x, top: assetContextMenu.y }}>
        <button role="menuitem" disabled={!canSplit} onClick={() => { state.splitTimelineAsset(clip.id, timelineCurrentTime); setAssetContextMenu(null); setSelectedAssetId(null); }}><Icons.Scissors/><span>Split at playhead</span></button>
        <button className="danger-menu-item" role="menuitem" onClick={() => deleteAsset(clip.id)}><Icons.Trash2/><span>Delete clip</span><kbd>⌫</kbd></button>
      </div>;
    })() : null}
  </section>;
}

function IconButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}
