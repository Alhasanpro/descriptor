import { z } from "zod";

export const analysisIssueSchema = z.object({
  type: z.enum(["filler", "false-start", "repetition", "wording", "silence"]),
  label: z.string().min(1).max(80),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  confidence: z.number().min(0).max(1),
  safeToRemove: z.boolean(),
  explanation: z.string().min(1).max(240)
});

export const analysisParagraphSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
  arabicText: z.string().min(1),
  englishTranslation: z.string().min(1),
  highlightedEnglishWords: z.array(z.string()).max(6)
});

export const timedTranscriptWordSchema = z.object({
  word: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().positive()
});

export const processVideoResponseSchema = z.object({
  transcript: z.string(),
  duration: z.number().positive(),
  paragraphs: z.array(analysisParagraphSchema.extend({ words: z.array(timedTranscriptWordSchema) })),
  issues: z.array(analysisIssueSchema.extend({ id: z.string() })),
  modelStatus: z.literal("complete")
});

export const analysisStageIdSchema = z.enum(["source", "audio", "transcription", "language", "timing", "captions"]);

export const analysisProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("status"),
    stage: analysisStageIdSchema,
    status: z.enum(["pending", "active", "complete", "error"]),
    message: z.string().min(1).max(240)
  }),
  z.object({ type: z.literal("result"), result: processVideoResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string().min(1).max(500) })
]);

export const refreshTranslationRequestSchema = z.object({
  paragraphId: z.string().min(1).max(120),
  sourceText: z.string().trim().min(1).max(4_000),
  currentTranslation: z.string().trim().max(1_000).optional()
});

export const refreshTranslationResponseSchema = z.object({
  paragraphId: z.string().min(1).max(120),
  englishTranslation: z.string().trim().min(1).max(1_000),
  modelStatus: z.literal("complete")
});

export const refreshedTranslationSchema = z.object({
  englishTranslation: z.string().trim().min(1).max(1_000)
});

export type ProcessVideoResponse = z.infer<typeof processVideoResponseSchema>;
export type RefreshTranslationResponse = z.infer<typeof refreshTranslationResponseSchema>;
export type AnalysisStageId = z.infer<typeof analysisStageIdSchema>;
export type AnalysisProgressEvent = z.infer<typeof analysisProgressEventSchema>;
