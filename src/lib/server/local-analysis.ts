import "server-only";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { localProcessFailureSummary, shouldRetryNativeWhisperFailure } from "@/lib/ai/local-process-recovery";
import { groupTimedWords, parseWhisperWordSegments } from "@/lib/ai/local-transcript";
import { whisperBinaryCandidates, whisperModelCandidates } from "@/lib/ai/local-runtime-paths";
import { SingleFlightCache } from "@/lib/ai/single-flight";
import { processVideoResponseSchema } from "@/lib/ai/schemas";
import type { AnalysisStageId, ProcessVideoResponse } from "@/lib/ai/schemas";
import { getFfmpegPath, getFfprobePath } from "@/lib/server/ffmpeg";
import { WORK_DIR } from "@/lib/server/media-store";
import { analyzeTranscriptWithLocalQwen } from "@/lib/server/ollama";

const execFileAsync = promisify(execFile);
const LOCAL_ANALYSIS_TIMEOUT_MS = 6 * 60 * 60 * 1000;

const whisperOutputSchema = z.object({
  result: z.object({ language: z.string().min(1) }),
  transcription: z.array(z.object({
    text: z.string(),
    offsets: z.object({ from: z.number().nonnegative(), to: z.number().nonnegative() })
  }))
});

export type LocalAnalysisProgressReporter = (
  stage: AnalysisStageId,
  status: "active" | "complete",
  message: string
) => void;

const RECENT_ANALYSIS_TTL_MS = 30 * 60 * 1000;
type LocalAnalysisProgress = { stage: AnalysisStageId; status: "active" | "complete"; message: string };
const localAnalysisJobs = new SingleFlightCache<LocalAnalysisProgress, ProcessVideoResponse>(RECENT_ANALYSIS_TTL_MS, 4);

async function firstAccessiblePath(candidates: string[], mode: number, errorCode: string) {
  for (const candidate of candidates) {
    try {
      await access(candidate, mode);
      return candidate;
    } catch {
      // Continue through explicit, packaged, project-local, PATH, and user-data candidates.
    }
  }
  throw new Error(errorCode);
}

async function mediaDuration(inputPath: string) {
  try {
    const { stdout } = await execFileAsync(getFfprobePath(), [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath
    ], { cwd: WORK_DIR, timeout: 60_000, maxBuffer: 1024 * 1024 });
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("MEDIA_DURATION_INVALID");
    return duration;
  } catch {
    throw new Error("MEDIA_DURATION_INVALID");
  }
}

async function analyzeLocalMediaFile(
  inputPath: string,
  report: LocalAnalysisProgressReporter
): Promise<ProcessVideoResponse> {
  await mkdir(WORK_DIR, { recursive: true });
  const jobId = randomUUID();
  const audioPath = path.join(WORK_DIR, `${jobId}-analysis.wav`);
  const outputBase = path.join(WORK_DIR, `${jobId}-whisper`);
  const outputPath = `${outputBase}.json`;

  try {
    report("audio", "active", "Preparing a private mono audio track on this Mac");
    try {
      await execFileAsync(getFfmpegPath(), [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
        audioPath
      ], { cwd: WORK_DIR, timeout: LOCAL_ANALYSIS_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 });
    } catch {
      throw new Error("LOCAL_AUDIO_PREPARATION_FAILED");
    }
    report("audio", "complete", "Audio prepared locally · mono 16 kHz");

    const runtimePathOptions = {
      cwd: (() => {
        try {
          return process.cwd();
        } catch {
          return WORK_DIR;
        }
      })(),
      home: process.env.HOME || "",
      pathValue: process.env.PATH,
      platform: process.platform,
      xdgDataHome: process.env.XDG_DATA_HOME
    };
    const whisperBinary = await firstAccessiblePath(
      whisperBinaryCandidates({ ...runtimePathOptions, configured: process.env.WHISPER_CPP_BINARY }),
      constants.X_OK,
      "LOCAL_WHISPER_BINARY_MISSING"
    );
    const whisperModel = await firstAccessiblePath(
      whisperModelCandidates({ ...runtimePathOptions, configured: process.env.WHISPER_CPP_MODEL }),
      constants.R_OK,
      "LOCAL_WHISPER_MODEL_MISSING"
    );
    const threadCount = Math.max(4, Math.min(8, cpus().length - 2));

    report("transcription", "active", "Transcribing Arabic speech locally with word timing");
    const whisperArguments = [
      "-m", whisperModel,
      "-f", audioPath,
      "-l", "ar",
      "-ojf",
      "-of", outputBase,
      "-np",
      "-sow",
      "-ml", "1",
      "-t", String(threadCount),
      "--prompt", "Arabic creator speech with English product names and technical terms such as design system."
    ];
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        // The packaged app can be replaced while an older instance is open. A
        // stable writable cwd keeps ggml's backend discovery away from a stale
        // app-bundle directory and prevents std::filesystem::current_path aborts.
        await execFileAsync(whisperBinary, whisperArguments, {
          cwd: WORK_DIR,
          timeout: LOCAL_ANALYSIS_TIMEOUT_MS,
          maxBuffer: 4 * 1024 * 1024
        });
        break;
      } catch (error) {
        const canRetry = attempt === 1 && shouldRetryNativeWhisperFailure(error);
        console.error(`[local-analysis] whisper process failed attempt=${attempt} ${localProcessFailureSummary(error)} retry=${canRetry}`);
        await rm(outputPath, { force: true }).catch(() => undefined);
        if (!canRetry) throw new Error("LOCAL_TRANSCRIPTION_FAILED");
        report("transcription", "active", "The local speech engine restarted after an interruption · retrying safely");
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const whisperOutput = whisperOutputSchema.parse(JSON.parse(await readFile(outputPath, "utf8")));
    const timedWords = parseWhisperWordSegments(whisperOutput.transcription);
    if (!timedWords.length) throw new Error("TRANSCRIPTION_TIMING_EMPTY");
    report("transcription", "complete", `Transcription complete · ${timedWords.length.toLocaleString()} timed words`);

    const groupedParagraphs = groupTimedWords(timedWords);
    report("language", "active", "Reviewing wording and preparing English subtitles locally");
    const review = await analyzeTranscriptWithLocalQwen(groupedParagraphs);
    const reviewById = new Map(review.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
    report("language", "complete", `Local language review complete · ${groupedParagraphs.length} caption sections`);

    report("timing", "active", "Aligning every caption word to local speech timing");
    const duration = await mediaDuration(inputPath);
    const paragraphs = groupedParagraphs.map((paragraph) => {
      const reviewed = reviewById.get(paragraph.id);
      if (!reviewed) throw new Error("LOCAL_AI_RESPONSE_INVALID");
      return {
        start: paragraph.start,
        end: paragraph.end,
        arabicText: paragraph.arabicText,
        englishTranslation: reviewed.englishTranslation,
        highlightedEnglishWords: reviewed.highlightedEnglishWords,
        words: paragraph.words
      };
    });
    report("timing", "complete", `${timedWords.length.toLocaleString()} exact word timestamps aligned`);

    report("captions", "active", "Validating transcript, translations, cleanup suggestions, and captions");
    const result = processVideoResponseSchema.parse({
      transcript: timedWords.map((word) => word.word).join(" "),
      duration,
      paragraphs,
      issues: review.issues.map((issue, index) => ({ ...issue, id: `local-issue-${index + 1}` })),
      modelStatus: "complete"
    });
    report("captions", "complete", "Transcript and captions ready");
    return result;
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) throw new Error("LOCAL_ANALYSIS_RESPONSE_INVALID");
    throw error;
  } finally {
    await Promise.all([
      rm(audioPath, { force: true }),
      rm(outputPath, { force: true })
    ]).catch(() => undefined);
  }
}

export function localAnalysisAvailability(key: string) {
  return localAnalysisJobs.availability(key);
}

export async function runLocalAnalysisJob(
  key: string,
  inputPath: string,
  report: LocalAnalysisProgressReporter
) {
  return localAnalysisJobs.run({
    key,
    listener: ({ stage, status, message }) => report(stage, status, message),
    work: (emit) => analyzeLocalMediaFile(inputPath, (stage, status, message) => {
      emit({ stage, status, message });
    })
  });
}

export function localAnalysisErrorMessage(error: unknown) {
  const code = localAnalysisErrorCode(error);
  if (code === "LOCAL_WHISPER_BINARY_MISSING") return "The local speech engine is missing. Rebuild Descriptor with the local speech runtime installed.";
  if (code === "LOCAL_WHISPER_MODEL_MISSING") return "The local speech model is missing. Add it to Descriptor's model folder or configure its local path.";
  if (code === "LOCAL_AI_MODEL_MISSING") return "The local language model is not installed.";
  if (code === "LOCAL_AI_UNAVAILABLE") return "The local language service is not running on this Mac.";
  if (code === "LOCAL_AI_TIMEOUT") return "The local language review took too long to finish.";
  if (code === "TRANSCRIPTION_TIMING_EMPTY") return "No timed speech was found in this video.";
  if (code === "LOCAL_TRANSCRIPTION_FAILED") return "Local speech transcription could not finish for this video.";
  if (code === "LOCAL_AUDIO_PREPARATION_FAILED") return "The video's audio could not be prepared for local transcription.";
  if (code === "MEDIA_DURATION_INVALID") return "The video duration could not be read safely.";
  if (code === "PROCESSING_BUSY") return "Another video is being analyzed locally. Descriptor will continue automatically when it finishes.";
  return "Local video analysis could not finish. Your source video was preserved.";
}

export function localAnalysisErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : "LOCAL_ANALYSIS_FAILED";
  const knownCodes = new Set([
    "LOCAL_WHISPER_BINARY_MISSING",
    "LOCAL_WHISPER_MODEL_MISSING",
    "LOCAL_AI_MODEL_MISSING",
    "LOCAL_AI_UNAVAILABLE",
    "LOCAL_AI_TIMEOUT",
    "LOCAL_AI_REQUEST_FAILED",
    "LOCAL_AI_RESPONSE_EMPTY",
    "LOCAL_AI_RESPONSE_INVALID",
    "LOCAL_ANALYSIS_RESPONSE_INVALID",
    "LOCAL_AUDIO_PREPARATION_FAILED",
    "LOCAL_TRANSCRIPTION_FAILED",
    "TRANSCRIPTION_TIMING_EMPTY",
    "MEDIA_DURATION_INVALID",
    "PROCESSING_BUSY"
  ]);
  return knownCodes.has(code) ? code : "LOCAL_ANALYSIS_FAILED";
}
