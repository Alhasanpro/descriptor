"use client";

import { create } from "zustand";
import { sampleIssues, sampleParagraphs } from "@/lib/editor/sample-data";
import { mergeTimeRanges, removedRangeAtTime, unionDuration } from "@/lib/editor/time";
import { replacementTextForTranscriptWord, transcriptWordsMatch } from "@/lib/editor/transcript-words";
import { COLOR_GRADE_PRESETS, DEFAULT_COLOR_GRADE } from "@/lib/editor/color-grade";
import { shouldCoalesceHistory } from "@/lib/editor/editor-history";
import type { TimeRange } from "@/lib/editor/time";
import type { ColorGradeSettings, MediaMetadata, SourceColorInfo, SubtitleStyle, TimelineAssetClip, TranscriptParagraph } from "@/lib/editor/types";
import type { AnalysisStageId, ProcessVideoResponse } from "@/lib/ai/schemas";

export type AnalysisStepStatus = "pending" | "active" | "complete" | "error";
export type AnalysisStep = { id: AnalysisStageId; label: string; status: AnalysisStepStatus; message: string };

const createAnalysisSteps = (): AnalysisStep[] => [
  { id: "source", label: "Load video", status: "pending", message: "Waiting for a video" },
  { id: "audio", label: "Extract audio", status: "pending", message: "Queued" },
  { id: "transcription", label: "Transcribe speech", status: "pending", message: "Queued" },
  { id: "language", label: "Review and translate", status: "pending", message: "Queued" },
  { id: "timing", label: "Build word timing", status: "pending", message: "Queued" },
  { id: "captions", label: "Prepare captions", status: "pending", message: "Queued" }
];

type EditorSnapshot = {
  label: string;
  mergeKey?: string;
  removedIssueIds: string[];
  deletedRanges: TimeRange[];
  splitMarkers: number[];
  timelineAssets: TimelineAssetClip[];
  paragraphs: TranscriptParagraph[];
  subtitleStyle: SubtitleStyle;
  colorGrade: ColorGradeSettings;
};

const HISTORY_LIMIT = 100;

type HistorySource = Pick<EditorSnapshot, "removedIssueIds" | "deletedRanges" | "splitMarkers" | "timelineAssets" | "paragraphs" | "subtitleStyle" | "colorGrade">;

export type WordReplacementResult = {
  count: number;
  paragraphIds: string[];
};

function createSnapshot(state: HistorySource, label: string, mergeKey?: string): EditorSnapshot {
  return {
    label,
    mergeKey,
    removedIssueIds: state.removedIssueIds,
    deletedRanges: state.deletedRanges,
    splitMarkers: state.splitMarkers,
    timelineAssets: state.timelineAssets,
    paragraphs: state.paragraphs,
    subtitleStyle: state.subtitleStyle,
    colorGrade: state.colorGrade
  };
}

function addHistoryEntry(state: HistorySource & { undoStack: EditorSnapshot[] }, label: string, mergeKey?: string) {
  if (shouldCoalesceHistory(state.undoStack.at(-1)?.mergeKey, mergeKey)) return state.undoStack;
  return [...state.undoStack, createSnapshot(state, label, mergeKey)].slice(-HISTORY_LIMIT);
}

function cleanupHistoryLabel(type: string, verb: "Remove" | "Restore") {
  const subject = type === "false-start" ? "retake" : type === "repetition" ? "repetition" : type === "wording" ? "phrase" : type === "silence" ? "pause" : "filler";
  return `${verb} ${subject}`;
}

function styleHistory(style: Partial<SubtitleStyle>): { label: string; mergeKey?: string } {
  if (style.template !== undefined) return { label: "Apply caption template" };
  if (style.animation !== undefined) return { label: "Change caption animation" };
  if (style.position !== undefined || style.horizontalPosition !== undefined) return { label: "Move captions" };
  if (style.fontFamily !== undefined) return { label: "Change caption typeface" };
  if (style.fontSize !== undefined) return { label: "Change caption size", mergeKey: "style:fontSize" };
  if (style.fontWeight !== undefined) return { label: "Change caption weight" };
  if (style.textAlign !== undefined) return { label: "Change caption alignment" };
  if (style.italic !== undefined || style.uppercase !== undefined) return { label: "Change caption format" };
  if (style.letterSpacing !== undefined) return { label: "Change letter spacing", mergeKey: "style:letterSpacing" };
  if (style.wordSpacing !== undefined) return { label: "Change word spacing", mergeKey: "style:wordSpacing" };
  if (style.lineHeight !== undefined) return { label: "Change line height", mergeKey: "style:lineHeight" };
  if (style.maxWidth !== undefined) return { label: "Change caption width", mergeKey: "style:maxWidth" };
  if (style.color !== undefined) return { label: "Change caption color", mergeKey: "style:color" };
  if (style.highlightColor !== undefined) return { label: "Change highlight color", mergeKey: "style:highlightColor" };
  if (style.backgroundColor !== undefined) return { label: "Change caption background", mergeKey: "style:backgroundColor" };
  if (style.backgroundOpacity !== undefined) return { label: "Change background opacity", mergeKey: "style:backgroundOpacity" };
  if (style.background !== undefined) return { label: "Toggle caption background" };
  if (style.shadowColor !== undefined) return { label: "Change caption shadow color", mergeKey: "style:shadowColor" };
  if (style.shadowOpacity !== undefined) return { label: "Change caption shadow opacity", mergeKey: "style:shadowOpacity" };
  if (style.shadowBlur !== undefined) return { label: "Change caption shadow blur", mergeKey: "style:shadowBlur" };
  if (style.shadowOffsetX !== undefined) return { label: "Move caption shadow horizontally", mergeKey: "style:shadowOffsetX" };
  if (style.shadowOffsetY !== undefined) return { label: "Move caption shadow vertically", mergeKey: "style:shadowOffsetY" };
  if (style.shadow !== undefined) return { label: "Toggle caption shadow" };
  return { label: "Change caption style" };
}

type EditorState = {
  projectName: string;
  mediaUrl: string | null;
  sourceId: string | null;
  sourceColorInfo: SourceColorInfo | null;
  waveformUrl: string | null;
  media: MediaMetadata | null;
  currentTime: number;
  playing: boolean;
  selectedIssueId: string | null;
  removedIssueIds: string[];
  deletedRanges: TimeRange[];
  splitMarkers: number[];
  timelineAssets: TimelineAssetClip[];
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  subtitleStyle: SubtitleStyle;
  colorGrade: ColorGradeSettings;
  activePanel: "cleanup" | "subtitles" | "export";
  aiStatus: "idle" | "processing" | "complete" | "error";
  aiMessage: string;
  analysisSteps: AnalysisStep[];
  paragraphs: typeof sampleParagraphs;
  issues: typeof sampleIssues;
  setMedia: (url: string, media: MediaMetadata) => void;
  setSourceInfo: (sourceId: string, colorInfo: SourceColorInfo) => void;
  setWaveformUrl: (url: string | null) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  selectIssue: (id: string | null) => void;
  removeIssue: (id: string) => void;
  restoreIssue: (id: string) => void;
  removeSafeIssues: () => void;
  addSplitMarker: (time: number) => void;
  removeSplitMarker: (time: number) => void;
  deleteTimeRange: (range: TimeRange, label?: string) => void;
  addTimelineAsset: (clip: TimelineAssetClip) => void;
  updateTimelineAsset: (id: string, changes: Partial<Pick<TimelineAssetClip, "start" | "sourceStart" | "sourceEnd">>, label: string) => void;
  deleteTimelineAsset: (id: string) => void;
  splitTimelineAsset: (id: string, time: number) => void;
  updateWord: (wordId: string, text: string) => WordReplacementResult | null;
  deleteWord: (wordId: string) => void;
  setParagraphTranslation: (paragraphId: string, translation: string) => void;
  undo: () => void;
  redo: () => void;
  setStyle: (style: Partial<SubtitleStyle>) => void;
  setColorGrade: (grade: Partial<ColorGradeSettings>, label?: string, mergeKey?: string) => void;
  applyColorPreset: (presetId: string) => void;
  resetColorGrade: () => void;
  setActivePanel: (panel: EditorState["activePanel"]) => void;
  setAIStatus: (status: EditorState["aiStatus"], message?: string) => void;
  beginAnalysis: () => void;
  updateAnalysisStep: (id: AnalysisStageId, status: AnalysisStepStatus, message: string) => void;
  applyAIResult: (result: ProcessVideoResponse) => void;
  cleanedDuration: () => number;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: "Arabic creator edit",
  mediaUrl: null,
  sourceId: null,
  sourceColorInfo: null,
  waveformUrl: null,
  media: null,
  currentTime: 10.4,
  playing: false,
  selectedIssueId: "issue-retake",
  removedIssueIds: [],
  deletedRanges: [],
  splitMarkers: [],
  timelineAssets: [],
  undoStack: [],
  redoStack: [],
  subtitleStyle: { template: "karaoke", fontFamily: "Lato", fontSize: 58, fontWeight: 800, textAlign: "center", italic: false, uppercase: false, letterSpacing: 0, wordSpacing: 0, lineHeight: 1.25, maxWidth: 84, color: "#FFFFFF", highlightColor: "#FFD447", background: true, backgroundColor: "#191416", backgroundOpacity: 74, shadow: true, shadowColor: "#000000", shadowOpacity: 45, shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 2, position: 78, horizontalPosition: "center", animation: "karaoke", previewAnimation: true },
  colorGrade: DEFAULT_COLOR_GRADE,
  activePanel: "cleanup",
  aiStatus: "idle",
  aiMessage: "",
  analysisSteps: createAnalysisSteps(),
  paragraphs: sampleParagraphs,
  issues: sampleIssues,
  setMedia: (mediaUrl, media) => set({ mediaUrl, sourceId: null, sourceColorInfo: null, waveformUrl: null, media, projectName: media.name.replace(/\.[^.]+$/, ""), currentTime: 0, deletedRanges: [], splitMarkers: [], timelineAssets: [], colorGrade: DEFAULT_COLOR_GRADE, undoStack: [], redoStack: [] }),
  setSourceInfo: (sourceId, sourceColorInfo) => set({ sourceId, sourceColorInfo }),
  setWaveformUrl: (waveformUrl) => set({ waveformUrl }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setPlaying: (playing) => set({ playing }),
  selectIssue: (selectedIssueId) => set({ selectedIssueId }),
  removeIssue: (id) => set((state) => {
    if (state.removedIssueIds.includes(id)) return state;
    const issue = state.issues.find((item) => item.id === id);
    return {
      undoStack: addHistoryEntry(state, cleanupHistoryLabel(issue?.type ?? "filler", "Remove")),
      redoStack: [],
      removedIssueIds: [...state.removedIssueIds, id],
      currentTime: issue && state.currentTime >= issue.start && state.currentTime < issue.end ? issue.end : state.currentTime
    };
  }),
  restoreIssue: (id) => set((state) => {
    if (!state.removedIssueIds.includes(id)) return state;
    const issue = state.issues.find((item) => item.id === id);
    return {
      undoStack: addHistoryEntry(state, cleanupHistoryLabel(issue?.type ?? "filler", "Restore")),
      redoStack: [],
      removedIssueIds: state.removedIssueIds.filter((item) => item !== id)
    };
  }),
  removeSafeIssues: () => set((state) => {
    const removedIssues = state.issues.filter((issue) => issue.safeToRemove);
    const nextRemovedIssueIds = [...new Set([...state.removedIssueIds, ...removedIssues.map((issue) => issue.id)])];
    if (nextRemovedIssueIds.length === state.removedIssueIds.length) return state;
    const removed = removedRangeAtTime(state.currentTime, removedIssues);
    return {
      undoStack: addHistoryEntry(state, "Remove safe cleanup suggestions"),
      redoStack: [],
      removedIssueIds: nextRemovedIssueIds,
      currentTime: removed?.end ?? state.currentTime
    };
  }),
  addSplitMarker: (time) => set((state) => {
    const duration = state.media?.duration || 15.8;
    const marker = Math.round(time * 10) / 10;
    if (marker <= 0.01 || marker >= duration - 0.01 || state.splitMarkers.some((item) => Math.abs(item - marker) < 0.05)) return state;
    return {
      splitMarkers: [...state.splitMarkers, marker].sort((a, b) => a - b),
      undoStack: addHistoryEntry(state, "Split video"),
      redoStack: []
    };
  }),
  removeSplitMarker: (time) => set((state) => {
    if (!state.splitMarkers.some((marker) => Math.abs(marker - time) < 0.05)) return state;
    return {
      splitMarkers: state.splitMarkers.filter((marker) => Math.abs(marker - time) >= 0.05),
      undoStack: addHistoryEntry(state, "Remove split"),
      redoStack: []
    };
  }),
  deleteTimeRange: (range, label = "Delete timeline segment") => set((state) => {
    const duration = state.media?.duration || 15.8;
    const [nextRange] = mergeTimeRanges([range], duration);
    if (!nextRange) return state;
    const alreadyDeleted = state.deletedRanges.some((deleted) => nextRange.start >= deleted.start && nextRange.end <= deleted.end);
    if (alreadyDeleted) return state;
    const currentTime = state.currentTime >= nextRange.start && state.currentTime < nextRange.end
      ? nextRange.end < duration ? nextRange.end : Math.max(0, nextRange.start - 0.01)
      : state.currentTime;
    return {
      undoStack: addHistoryEntry(state, label),
      redoStack: [],
      deletedRanges: mergeTimeRanges([...state.deletedRanges, nextRange], duration),
      currentTime,
      playing: false
    };
  }),
  addTimelineAsset: (clip) => set((state) => ({
    timelineAssets: [...state.timelineAssets, clip],
    undoStack: addHistoryEntry(state, `Import ${clip.type} clip`),
    redoStack: [],
    playing: false
  })),
  updateTimelineAsset: (id, changes, label) => set((state) => {
    const clip = state.timelineAssets.find((item) => item.id === id);
    if (!clip) return state;
    const changed = Object.entries(changes).some(([key, value]) => clip[key as keyof typeof changes] !== value);
    if (!changed) return state;
    return {
      timelineAssets: state.timelineAssets.map((item) => item.id === id ? { ...item, ...changes } : item),
      undoStack: addHistoryEntry(state, label),
      redoStack: [],
      playing: false
    };
  }),
  deleteTimelineAsset: (id) => set((state) => {
    const clip = state.timelineAssets.find((item) => item.id === id);
    if (!clip) return state;
    return {
      timelineAssets: state.timelineAssets.filter((item) => item.id !== id),
      undoStack: addHistoryEntry(state, `Delete ${clip.type} clip`),
      redoStack: [],
      playing: false
    };
  }),
  splitTimelineAsset: (id, time) => set((state) => {
    const clip = state.timelineAssets.find((item) => item.id === id);
    if (!clip) return state;
    const visibleDuration = clip.sourceEnd - clip.sourceStart;
    const offset = time - clip.start;
    if (offset <= 0.1 || offset >= visibleDuration - 0.1) return state;
    const sourceSplit = clip.sourceStart + offset;
    const left = { ...clip, sourceEnd: sourceSplit };
    const right = { ...clip, id: `${clip.id}-${crypto.randomUUID()}`, start: time, sourceStart: sourceSplit };
    return {
      timelineAssets: state.timelineAssets.flatMap((item) => item.id === id ? [left, right] : [item]),
      undoStack: addHistoryEntry(state, `Split ${clip.type} clip`),
      redoStack: [],
      playing: false
    };
  }),
  updateWord: (wordId, text) => {
    let result: WordReplacementResult | null = null;
    set((state) => {
      const nextText = text.trim();
      const selectedWord = state.paragraphs.flatMap((paragraph) => paragraph.words).find((word) => word.id === wordId);
      if (!nextText || !selectedWord) return state;

      const affectedParagraphIds = new Set<string>();
      let count = 0;
      const paragraphs = state.paragraphs.map((paragraph) => {
        let paragraphChanged = false;
        const words = paragraph.words.map((word) => {
          const matches = word.id === wordId || transcriptWordsMatch(word.text, selectedWord.text);
          if (!matches) return word;
          const replacement = replacementTextForTranscriptWord(word.text, nextText);
          if (replacement === word.text) return word;
          paragraphChanged = true;
          count += 1;
          return { ...word, text: replacement, language: /[A-Za-z]/.test(replacement) ? "en" as const : "ar" as const };
        });
        if (!paragraphChanged) return paragraph;
        affectedParagraphIds.add(paragraph.id);
        return { ...paragraph, words };
      });

      if (!count) return state;
      result = { count, paragraphIds: [...affectedParagraphIds] };
      return {
        undoStack: addHistoryEntry(state, count > 1 ? "Replace matching transcript words" : "Edit transcript word"),
        redoStack: [],
        paragraphs
      };
    });
    return result;
  },
  deleteWord: (wordId) => set((state) => {
    const word = state.paragraphs.flatMap((paragraph) => paragraph.words).find((item) => item.id === wordId);
    if (!word) return state;
    const duration = state.media?.duration || 15.8;
    const deletedRanges = mergeTimeRanges([...state.deletedRanges, { start: word.start, end: word.end }], duration);
    const currentTime = state.currentTime >= word.start && state.currentTime < word.end
      ? word.end < duration ? word.end : Math.max(0, word.start - 0.01)
      : state.currentTime;
    return {
      undoStack: addHistoryEntry(state, "Delete transcript word"),
      redoStack: [],
      deletedRanges,
      paragraphs: state.paragraphs.map((paragraph) => ({ ...paragraph, words: paragraph.words.filter((item) => item.id !== wordId) })),
      currentTime,
      playing: false
    };
  }),
  setParagraphTranslation: (paragraphId, translation) => set((state) => ({
    paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId ? { ...paragraph, translation } : paragraph)
  })),
  undo: () => set((state) => {
    const snapshot = state.undoStack.at(-1);
    if (!snapshot) return state;
    return {
      removedIssueIds: snapshot.removedIssueIds,
      deletedRanges: snapshot.deletedRanges,
      splitMarkers: snapshot.splitMarkers,
      timelineAssets: snapshot.timelineAssets,
      paragraphs: snapshot.paragraphs,
      subtitleStyle: snapshot.subtitleStyle,
      colorGrade: snapshot.colorGrade,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, createSnapshot(state, snapshot.label, snapshot.mergeKey)].slice(-HISTORY_LIMIT),
      playing: false
    };
  }),
  redo: () => set((state) => {
    const snapshot = state.redoStack.at(-1);
    if (!snapshot) return state;
    return {
      removedIssueIds: snapshot.removedIssueIds,
      deletedRanges: snapshot.deletedRanges,
      splitMarkers: snapshot.splitMarkers,
      timelineAssets: snapshot.timelineAssets,
      paragraphs: snapshot.paragraphs,
      subtitleStyle: snapshot.subtitleStyle,
      colorGrade: snapshot.colorGrade,
      undoStack: [...state.undoStack, createSnapshot(state, snapshot.label, snapshot.mergeKey)].slice(-HISTORY_LIMIT),
      redoStack: state.redoStack.slice(0, -1),
      playing: false
    };
  }),
  setStyle: (style) => set((state) => {
    const unchanged = Object.entries(style).every(([key, value]) => state.subtitleStyle[key as keyof SubtitleStyle] === value);
    if (unchanged) return state;
    const history = styleHistory(style);
    return {
      subtitleStyle: { ...state.subtitleStyle, ...style },
      undoStack: addHistoryEntry(state, history.label, history.mergeKey),
      redoStack: []
    };
  }),
  setColorGrade: (grade, label, mergeKey) => set((state) => {
    const unchanged = Object.entries(grade).every(([key, value]) => state.colorGrade[key as keyof ColorGradeSettings] === value);
    if (unchanged) return state;
    const keys = Object.keys(grade);
    const onlyContinuousValue = keys.length === 1 && keys[0] !== "enabled" && keys[0] !== "presetId" && keys[0] !== "lut";
    const lutStrengthOnly = keys.length === 1 && keys[0] === "lut" && grade.lut?.id === state.colorGrade.lut?.id;
    const historyLabel = label ?? (grade.enabled !== undefined ? "Toggle color grade" : lutStrengthOnly ? "Change LUT strength" : "Adjust color grade");
    return {
      colorGrade: { ...state.colorGrade, ...grade, presetId: grade.presetId !== undefined ? grade.presetId : onlyContinuousValue ? null : state.colorGrade.presetId },
      undoStack: addHistoryEntry(state, historyLabel, mergeKey),
      redoStack: []
    };
  }),
  applyColorPreset: (presetId) => set((state) => {
    const preset = COLOR_GRADE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return state;
    const next = { ...state.colorGrade, ...preset.values, enabled: true, presetId };
    if (JSON.stringify(next) === JSON.stringify(state.colorGrade)) return state;
    return { colorGrade: next, undoStack: addHistoryEntry(state, `Apply ${preset.name} color preset`), redoStack: [] };
  }),
  resetColorGrade: () => set((state) => {
    if (JSON.stringify(state.colorGrade) === JSON.stringify(DEFAULT_COLOR_GRADE)) return state;
    return { colorGrade: DEFAULT_COLOR_GRADE, undoStack: addHistoryEntry(state, "Reset color grade"), redoStack: [] };
  }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setAIStatus: (aiStatus, aiMessage = "") => set({ aiStatus, aiMessage }),
  beginAnalysis: () => set({
    aiStatus: "processing",
    aiMessage: "Reading video details…",
    analysisSteps: createAnalysisSteps().map((step) => step.id === "source" ? { ...step, status: "active", message: "Reading video details…" } : step),
    paragraphs: [],
    issues: [],
    removedIssueIds: [],
    deletedRanges: [],
    splitMarkers: [],
    timelineAssets: [],
    selectedIssueId: null,
    undoStack: [],
    redoStack: [],
    currentTime: 0,
    playing: false
  }),
  updateAnalysisStep: (id, status, message) => set((state) => ({
    aiStatus: status === "error" ? "error" : state.aiStatus,
    aiMessage: message,
    analysisSteps: state.analysisSteps.map((step) => step.id === id ? { ...step, status, message } : step)
  })),
  applyAIResult: (result) => set(() => {
    const issues = result.issues.map((issue) => ({ id: issue.id, type: issue.type, label: issue.label, start: issue.start, end: issue.end, confidence: issue.confidence, safeToRemove: issue.safeToRemove }));
    const paragraphs = result.paragraphs.map((paragraph, paragraphIndex) => {
      const timedTokens = paragraph.words.length ? paragraph.words : paragraph.arabicText.trim().split(/\s+/).map((word, wordIndex, words) => ({
        word,
        start: paragraph.start + (paragraph.end - paragraph.start) * wordIndex / words.length,
        end: paragraph.start + (paragraph.end - paragraph.start) * (wordIndex + 1) / words.length
      }));
      return {
        id: `ai-paragraph-${paragraphIndex + 1}`,
        start: paragraph.start,
        end: paragraph.end,
        translation: paragraph.englishTranslation,
        words: timedTokens.map(({ word: text, start, end }, wordIndex) => {
          const issue = issues.find((item) => start < item.end && end > item.start);
          return { id: `ai-p${paragraphIndex + 1}-w${wordIndex + 1}`, text, start, end, language: /[A-Za-z]/.test(text) ? "en" as const : "ar" as const, issueId: issue?.id };
        })
      };
    });
    return { paragraphs, issues, removedIssueIds: [], deletedRanges: [], splitMarkers: [], undoStack: [], redoStack: [], selectedIssueId: issues[0]?.id ?? null, aiStatus: "complete", aiMessage: "Transcript and captions ready", analysisSteps: createAnalysisSteps().map((step) => ({ ...step, status: "complete" as const, message: step.id === "captions" ? "Captions ready" : "Complete" })) };
  }),
  cleanedDuration: () => {
    const state = get();
    const duration = state.media?.duration || 15.8;
    const removed = mergeTimeRanges([
      ...state.issues.filter((issue) => state.removedIssueIds.includes(issue.id)),
      ...state.deletedRanges
    ], duration);
    return Math.max(0, duration - unionDuration(removed));
  }
}));
