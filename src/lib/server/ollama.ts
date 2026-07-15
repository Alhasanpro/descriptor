import "server-only";
import { z } from "zod";
import { analysisIssueSchema, refreshedTranslationSchema } from "@/lib/ai/schemas";
import type { LocalTranscriptParagraph } from "@/lib/ai/local-transcript";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3:8b-q4_K_M";
const REQUEST_TIMEOUT_MS = 55_000;
const ANALYSIS_TIMEOUT_MS = 180_000;
const ANALYSIS_BATCH_SIZE = 18;

const translationJsonSchema = {
  type: "object",
  properties: {
    englishTranslation: { type: "string" }
  },
  required: ["englishTranslation"],
  additionalProperties: false
} as const;

type OllamaChatResponse = {
  message?: { content?: string };
};

const reviewedParagraphSchema = z.object({
  id: z.string().min(1),
  englishTranslation: z.string().trim().min(1).max(1_000),
  highlightedEnglishWords: z.array(z.string().trim().min(1)).max(6)
});

const transcriptReviewBatchSchema = z.object({
  paragraphs: z.array(reviewedParagraphSchema),
  issues: z.array(analysisIssueSchema)
});

const transcriptReviewJsonSchema = z.toJSONSchema(transcriptReviewBatchSchema);

function getLocalBaseUrl() {
  const configured = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const parsed = new URL(configured);
  if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error("LOCAL_AI_CONFIGURATION_INVALID");
  }
  return parsed.toString().replace(/\/$/, "");
}

async function requestLocalQwen(input: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  format: Record<string, unknown>;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(`${getLocalBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        model: process.env.OLLAMA_TRANSLATION_MODEL?.trim() || DEFAULT_MODEL,
        stream: false,
        think: false,
        keep_alive: "10m",
        format: input.format,
        options: { temperature: 0 },
        messages: input.messages
      })
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("LOCAL_AI_MODEL_MISSING");
      throw new Error("LOCAL_AI_REQUEST_FAILED");
    }

    const payload = await response.json() as OllamaChatResponse;
    if (!payload.message?.content) throw new Error("LOCAL_AI_RESPONSE_EMPTY");
    return JSON.parse(payload.message.content) as unknown;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("LOCAL_AI_TIMEOUT");
    if (error instanceof TypeError) throw new Error("LOCAL_AI_UNAVAILABLE");
    if (error instanceof SyntaxError) throw new Error("LOCAL_AI_RESPONSE_INVALID");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateWithLocalQwen(input: {
  sourceText: string;
  currentTranslation?: string;
}) {
  const payload = await requestLocalQwen({
    timeoutMs: REQUEST_TIMEOUT_MS,
    format: translationJsonSchema,
    messages: [
      {
        role: "system",
        content: "Translate edited Arabic creator speech into one natural, concise English subtitle. Handle Standard, Levantine, Egyptian, Moroccan, Najdi, Mesopotamian, Tunisian, and mixed Arabic-English speech. Preserve product names, English technical terms, intent, tone, and meaning. Translate only the supplied source text. Do not add explanations, timestamps, labels, or facts. Return only JSON matching the supplied schema."
      },
      {
        role: "user",
        content: `Updated Arabic transcript:\n${input.sourceText}${input.currentTranslation ? `\n\nPrevious English subtitle for context only:\n${input.currentTranslation}` : ""}`
      }
    ]
  });
  return refreshedTranslationSchema.parse(payload);
}

export async function analyzeTranscriptWithLocalQwen(paragraphs: LocalTranscriptParagraph[]) {
  const reviewedParagraphs: z.infer<typeof reviewedParagraphSchema>[] = [];
  const issues: z.infer<typeof analysisIssueSchema>[] = [];

  for (let offset = 0; offset < paragraphs.length; offset += ANALYSIS_BATCH_SIZE) {
    const batch = paragraphs.slice(offset, offset + ANALYSIS_BATCH_SIZE);
    const payload = await requestLocalQwen({
      timeoutMs: ANALYSIS_TIMEOUT_MS,
      format: transcriptReviewJsonSchema as Record<string, unknown>,
      messages: [
        {
          role: "system",
          content: "Review a batch of exact, word-timed Arabic creator transcript paragraphs. Return one natural concise English subtitle for every supplied paragraph id without rewriting, correcting, omitting, or reordering its Arabic words. Preserve English product names and technical terms. highlightedEnglishWords must contain zero to six exact words from that English subtitle. Detect only clear fillers, false starts, repetitions, awkward wording, or meaningful silence. Use only supplied word timestamps, keep issue ranges inside this batch, use short creator-facing labels, and mark safeToRemove true only when removal cannot change the speaker's intended meaning. Return only JSON matching the supplied schema."
        },
        {
          role: "user",
          content: JSON.stringify(batch.map((paragraph) => ({
            id: paragraph.id,
            start: paragraph.start,
            end: paragraph.end,
            arabicText: paragraph.arabicText,
            words: paragraph.words
          })))
        }
      ]
    });
    const parsed = transcriptReviewBatchSchema.parse(payload);
    const expectedIds = new Set(batch.map((paragraph) => paragraph.id));
    const returnedIds = new Set(parsed.paragraphs.map((paragraph) => paragraph.id));
    if (returnedIds.size !== expectedIds.size || [...expectedIds].some((id) => !returnedIds.has(id))) {
      throw new Error("LOCAL_AI_RESPONSE_INVALID");
    }
    const batchStart = batch[0].start;
    const batchEnd = batch.at(-1)!.end;
    reviewedParagraphs.push(...parsed.paragraphs);
    issues.push(...parsed.issues.filter((issue) => issue.start >= batchStart && issue.end <= batchEnd && issue.end > issue.start));
  }

  return { paragraphs: reviewedParagraphs, issues };
}
