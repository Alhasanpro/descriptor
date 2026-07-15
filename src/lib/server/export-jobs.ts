import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { z } from "zod";
import { writeCubeLut } from "@/lib/editor/color-grade";
import { canonicalExportSpec } from "@/lib/editor/export-idempotency";
import { assWordSeparator, buildSpeechAlignedCaptionSegments, paginateFixedCaptionWords } from "@/lib/editor/caption-template";
import { getFfmpegPath, probeMedia } from "@/lib/server/ffmpeg";
import { getLut } from "@/lib/server/lut-store";
import { getSource } from "@/lib/server/media-store";
import { DATA_ROOT } from "@/lib/server/data-root";
import type { ColorGradeSettings, SubtitleStyle } from "@/lib/editor/types";
import { build4KContainFilter, get4KOutputResolution, type CreateExportRequest, type ExportJobStatus, type ExportJobView, type ExportResolution } from "@/lib/editor/export";

const EXPORT_DIR = path.join(DATA_ROOT, "work", "exports");
const SUCCESS_RETENTION_MS = 24 * 60 * 60 * 1000;
const EXPORT_PIPELINE_VERSION = 2;

const timeRangeSchema = z.object({ start: z.number().finite().nonnegative(), end: z.number().finite().positive() });
const lutSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(180), strength: z.number().finite().min(0).max(100), gridSize: z.number().int().min(2).max(65), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const gradeSchema = z.object({
  enabled: z.boolean(), presetId: z.string().max(80).nullable(), exposure: z.number().finite().min(-2).max(2), contrast: z.number().finite().min(-100).max(100), highlights: z.number().finite().min(-100).max(100), shadows: z.number().finite().min(-100).max(100), temperature: z.number().finite().min(-100).max(100), tint: z.number().finite().min(-100).max(100), saturation: z.number().finite().min(-100).max(100), fade: z.number().finite().min(0).max(100), vignette: z.number().finite().min(0).max(100), lut: lutSchema.nullable()
});
const captionSchema = z.object({ id: z.string().min(1).max(120), start: z.number().finite().nonnegative(), end: z.number().finite().positive(), text: z.string().max(4000), animation: z.enum(["karaoke", "typewriter", "pop", "build"]), wordTimes: z.array(timeRangeSchema).max(400) });
const subtitleStyleSchema = z.object({
  template: z.string(), fontFamily: z.string().max(120), fontSize: z.number().finite().min(8).max(400), fontWeight: z.number().finite().min(100).max(1000), textAlign: z.enum(["left", "center", "right"]), italic: z.boolean(), uppercase: z.boolean(), letterSpacing: z.number().finite(), wordSpacing: z.number().finite(), lineHeight: z.number().finite(), maxWidth: z.number().finite(), color: z.string(), highlightColor: z.string(), background: z.boolean(), backgroundColor: z.string(), backgroundOpacity: z.number().finite(), shadow: z.boolean(), shadowColor: z.string(), shadowOpacity: z.number().finite(), shadowBlur: z.number().finite(), shadowOffsetX: z.number().finite(), shadowOffsetY: z.number().finite(), position: z.number().finite(), horizontalPosition: z.enum(["left", "center", "right"]), animation: z.enum(["karaoke", "typewriter", "pop", "build"]), previewAnimation: z.boolean()
});
export const createExportSchema = z.object({ sourceId: z.string().uuid(), renderRequestId: z.string().uuid().optional(), format: z.enum(["mp4-h264", "mov-hevc"]), keepRanges: z.array(timeRangeSchema).min(1).max(1000), colorGrade: gradeSchema, burnCaptions: z.boolean(), captions: z.array(captionSchema).max(5000), subtitleStyle: subtitleStyleSchema, hasExternalOverlays: z.boolean() });

type StoredExportJob = ExportJobView & {
  hash: string;
  spec: CreateExportRequest;
  outputPath?: string;
  tempPath?: string;
};

type Runtime = {
  initialized: boolean;
  jobs: Map<string, StoredExportJob>;
  activeId: string | null;
  activeProcess: ChildProcess | null;
};

const globalJobs = globalThis as typeof globalThis & { __descripterExportRuntime?: Runtime };
const runtime: Runtime = globalJobs.__descripterExportRuntime ?? { initialized: false, jobs: new Map(), activeId: null, activeProcess: null };
globalJobs.__descripterExportRuntime = runtime;

function publicJob(job: StoredExportJob): ExportJobView {
  const { id, status, stage, progress, format, createdAt, updatedAt, error, filename, retryable } = job;
  return { id, status, stage, progress, format, createdAt, updatedAt, error, filename, retryable };
}

function manifestPath(id: string) {
  return path.join(EXPORT_DIR, `${id}.json`);
}

async function persist(job: StoredExportJob) {
  job.updatedAt = new Date().toISOString();
  await writeFile(manifestPath(job.id), JSON.stringify(job), { mode: 0o600 });
}

async function initialize() {
  if (runtime.initialized) return;
  runtime.initialized = true;
  await mkdir(EXPORT_DIR, { recursive: true });
  for (const file of await readdir(EXPORT_DIR).catch(() => [])) {
    if (!file.endsWith(".json")) continue;
    try {
      const job = JSON.parse(await readFile(path.join(EXPORT_DIR, file), "utf8")) as StoredExportJob;
      if (job.status === "processing") {
        job.status = "failed";
        job.stage = "Interrupted";
        job.error = "The local export process stopped before completion. Retry the export.";
        job.retryable = true;
        await unlink(job.tempPath || "").catch(() => undefined);
        await persist(job);
      }
      if (job.status === "succeeded" && Date.now() - new Date(job.updatedAt).getTime() > SUCCESS_RETENTION_MS) {
        await unlink(job.outputPath || "").catch(() => undefined);
        await unlink(manifestPath(job.id)).catch(() => undefined);
        continue;
      }
      runtime.jobs.set(job.id, job);
    } catch {
      // Ignore malformed local manifests; they are never trusted as a render request.
    }
  }
}

function normalizeKeepRanges(ranges: Array<{ start: number; end: number }>, duration: number) {
  const sorted = ranges.map((range) => ({ start: Math.max(0, Math.min(duration, range.start)), end: Math.max(0, Math.min(duration, range.end)) })).filter((range) => range.end - range.start > 0.001).sort((a, b) => a.start - b.start);
  const output: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const previous = output.at(-1);
    if (previous && range.start <= previous.end + 0.001) previous.end = Math.max(previous.end, range.end);
    else output.push(range);
  }
  if (!output.length) throw new Error("EXPORT_HAS_NO_MEDIA");
  return output;
}

function stableHash(spec: CreateExportRequest) {
  return createHash("sha256").update(canonicalExportSpec({ pipelineVersion: EXPORT_PIPELINE_VERSION, spec })).digest("hex");
}

function assTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const centiseconds = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function assColor(hex: string, opacity = 100) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "FFFFFF";
  const alpha = Math.round((1 - Math.max(0, Math.min(100, opacity)) / 100) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `&H${alpha}${value.slice(4, 6)}${value.slice(2, 4)}${value.slice(0, 2)}&`;
}

function assOverrideColor(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "FFFFFF";
  return `&H${value.slice(4, 6)}${value.slice(2, 4)}${value.slice(0, 2)}&`;
}

function assEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\r?\n/g, "\\N");
}

function captionAlignment(style: SubtitleStyle) {
  const horizontal = style.horizontalPosition === "left" ? 1 : style.horizontalPosition === "right" ? 3 : 2;
  const vertical = style.position < 36 ? 7 : style.position > 64 ? 1 : 4;
  return vertical + horizontal - 1;
}

function writeAss(spec: CreateExportRequest, width: number, height: number) {
  const style = spec.subtitleStyle;
  const outline = style.shadow ? Math.max(1, Math.round(style.shadowBlur / 2)) : 0;
  const shadow = style.shadow ? Math.max(0, Math.round(Math.hypot(style.shadowOffsetX, style.shadowOffsetY))) : 0;
  const alignment = captionAlignment(style);
  const marginV = Math.round(height * Math.min(style.position, 100 - style.position) / 100);
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${style.fontFamily},${style.fontSize},${assColor(style.color)},${assColor(style.highlightColor)},${assColor(style.shadowColor, style.shadowOpacity)},${assColor(style.backgroundColor, style.background ? style.backgroundOpacity : 0)},${style.fontWeight >= 700 ? -1 : 0},${style.italic ? -1 : 0},0,0,100,100,${style.letterSpacing},0,${style.background ? 3 : 1},${outline},${shadow},${alignment},40,40,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const events: string[] = [];
  for (const caption of spec.captions) {
    if (!caption.text.trim() || caption.end <= caption.start) continue;
    const text = assEscape(style.uppercase ? caption.text.toUpperCase() : caption.text);
    const words = text.split(/\s+/).filter(Boolean);
    const wordSeparator = assWordSeparator(style.letterSpacing, style.wordSpacing);
    let rendered = words.join(wordSeparator);
    if (style.template === "creator-outline" && words.length) {
      const primaryColor = assOverrideColor(style.color);
      const highlightColor = assOverrideColor(style.highlightColor);
      const maxCharacters = Math.max(8, Math.round(style.maxWidth / 5.25));
      const segments = buildSpeechAlignedCaptionSegments(caption.start, caption.end, words.length, caption.wordTimes);
      for (const segment of segments) {
        const pageWords = words.slice(segment.pageStart, segment.pageStart + 3);
        const page = paginateFixedCaptionWords(pageWords, maxCharacters, (word) => word.length, () => 1, 3)[0];
        const pageText = page.map((line) => line.map((word) => {
          const globalWordIndex = segment.pageStart + word.index;
          const escapedWord = assEscape(word.text);
          return globalWordIndex === segment.activeWord
            ? `{\\c${highlightColor}}${escapedWord}{\\c${primaryColor}}`
            : escapedWord;
        }).join(wordSeparator)).join("\\N");
        events.push(`Dialogue: 0,${assTime(segment.start)},${assTime(segment.end)},Default,,0,0,0,,${pageText}`);
      }
      continue;
    } else if (caption.animation === "karaoke" && words.length) {
      const duration = Math.max(1, Math.round((caption.end - caption.start) * 100 / words.length));
      rendered = words.map((word) => `{\\k${duration}}${word}`).join(wordSeparator);
    } else if ((caption.animation === "typewriter" || caption.animation === "build") && words.length > 1) {
      const step = (caption.end - caption.start) / words.length;
      for (let index = 0; index < words.length; index += 1) {
        const visible = words.slice(0, index + 1).join(wordSeparator);
        events.push(`Dialogue: 0,${assTime(caption.start + step * index)},${assTime(index === words.length - 1 ? caption.end : caption.start + step * (index + 1))},Default,,0,0,0,,${visible}`);
      }
      continue;
    } else if (caption.animation === "pop") rendered = `{\\fscx106\\fscy106\\t(0,140,\\fscx100\\fscy100)}${rendered}`;
    events.push(`Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},Default,,0,0,0,,${rendered}`);
  }
  return `${header}\n${events.join("\n")}\n`;
}

function escapeFilterPath(filePath: string) {
  return filePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function buildFilterGraph(spec: CreateExportRequest, hasAudio: boolean, outputResolution: ExportResolution, lutPath?: string, assPath?: string) {
  const nodes: string[] = [];
  spec.keepRanges.forEach((range, index) => {
    nodes.push(`[0:v]trim=start=${range.start.toFixed(6)}:end=${range.end.toFixed(6)},setpts=PTS-STARTPTS[v${index}]`);
    if (hasAudio) nodes.push(`[0:a]atrim=start=${range.start.toFixed(6)}:end=${range.end.toFixed(6)},asetpts=PTS-STARTPTS[a${index}]`);
  });
  if (spec.keepRanges.length === 1) {
    nodes.push(`[v0]null[vbase]`);
    if (hasAudio) nodes.push(`[a0]anull[abase]`);
  } else {
    const inputs = spec.keepRanges.map((_, index) => hasAudio ? `[v${index}][a${index}]` : `[v${index}]`).join("");
    nodes.push(`${inputs}concat=n=${spec.keepRanges.length}:v=1:a=${hasAudio ? 1 : 0}[vbase]${hasAudio ? "[abase]" : ""}`);
  }
  let video = "vbase";
  if (lutPath) {
    nodes.push(`[${video}]lut3d=file='${escapeFilterPath(lutPath)}':interp=tetrahedral[vgrade]`);
    video = "vgrade";
  }
  if (spec.colorGrade.enabled && spec.colorGrade.vignette > 0) {
    const angle = Math.max(0.18, 1.45 - spec.colorGrade.vignette / 100 * 0.82).toFixed(4);
    nodes.push(`[${video}]vignette=angle=${angle}:eval=frame[vvignette]`);
    video = "vvignette";
  }
  nodes.push(`[${video}]${build4KContainFilter(outputResolution)}[v4k]`);
  video = "v4k";
  if (assPath) {
    const fontsDirectory = path.join(process.cwd(), "public", "fonts");
    nodes.push(`[${video}]ass=filename='${escapeFilterPath(assPath)}':fontsdir='${escapeFilterPath(fontsDirectory)}'[vout]`);
    video = "vout";
  }
  return { graph: nodes.join(";"), video, audio: hasAudio ? "abase" : undefined };
}

async function updateProgress(job: StoredExportJob, progress: number, stage = job.stage) {
  job.progress = Math.max(job.progress, Math.min(0.995, progress));
  job.stage = stage;
  job.updatedAt = new Date().toISOString();
}

async function runFfmpeg(job: StoredExportJob, inputPath: string, filter: ReturnType<typeof buildFilterGraph>, duration: number, hardware: boolean) {
  const isMp4 = job.format === "mp4-h264";
  const encoder = hardware ? (isMp4 ? "h264_videotoolbox" : "hevc_videotoolbox") : (isMp4 ? "libx264" : "libx265");
  const args = ["-hide_banner", "-y", "-i", inputPath, "-filter_complex", filter.graph, "-map", `[${filter.video}]`];
  if (filter.audio) args.push("-map", `[${filter.audio}]`, "-c:a", "aac", "-b:a", "192k"); else args.push("-an");
  args.push("-c:v", encoder);
  if (hardware) args.push("-b:v", isMp4 ? "12M" : "10M"); else args.push("-crf", isMp4 ? "18" : "22", "-preset", "medium");
  if (!isMp4) args.push("-tag:v", "hvc1");
  args.push("-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", job.tempPath!);
  const child = spawn(getFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
  runtime.activeProcess = child;
  let stdout = "";
  let stderr = "";
  let lastPersist = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
    const lines = stdout.split(/\r?\n/);
    stdout = lines.pop() || "";
    for (const line of lines) {
      const [key, value] = line.split("=", 2);
      if (key === "out_time_us" || key === "out_time_ms") {
        const micros = Number(value);
        const seconds = micros / 1_000_000;
        if (Number.isFinite(seconds) && duration > 0) void updateProgress(job, seconds / duration);
      }
    }
    if (Date.now() - lastPersist > 300) {
      lastPersist = Date.now();
      void persist(job);
    }
  });
  child.stderr.on("data", (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-16_000); });
  const exitCode = await new Promise<number | null>((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  runtime.activeProcess = null;
  if (job.status === "cancelled") throw new Error("EXPORT_CANCELLED");
  if (exitCode !== 0) throw new Error(stderr.includes("Unknown encoder") || stderr.includes("Error initializing output stream") ? "ENCODER_UNAVAILABLE" : `FFMPEG_FAILED:${stderr.split(/\r?\n/).filter(Boolean).at(-1) || "render failed"}`);
}

async function processJob(job: StoredExportJob) {
  runtime.activeId = job.id;
  job.status = "processing";
  job.stage = "Inspecting source";
  job.progress = 0;
  job.retryable = false;
  await persist(job);
  try {
    const source = await getSource(job.spec.sourceId);
    const probe = await probeMedia(source.sourcePath);
    const outputResolution = get4KOutputResolution(probe.width, probe.height);
    if (probe.colorInfo.support.startsWith("unsupported")) throw new Error("HDR_UNSUPPORTED");
    if ((job.status as ExportJobStatus) === "cancelled") throw new Error("EXPORT_CANCELLED");
    job.spec.keepRanges = normalizeKeepRanges(job.spec.keepRanges, probe.duration);
    const editDuration = job.spec.keepRanges.reduce((total, range) => total + range.end - range.start, 0);
    const lutPath = path.join(EXPORT_DIR, `${job.id}-combined.cube`);
    const assPath = path.join(EXPORT_DIR, `${job.id}.ass`);
    let useLutPath: string | undefined;
    if (job.spec.colorGrade.enabled) {
      job.stage = "Building color grade";
      const userLut = job.spec.colorGrade.lut ? (await getLut(job.spec.colorGrade.lut.id)).parsed : undefined;
      await writeFile(lutPath, writeCubeLut(job.spec.colorGrade as ColorGradeSettings, userLut, 33), { mode: 0o600 });
      useLutPath = lutPath;
    }
    if ((job.status as ExportJobStatus) === "cancelled") throw new Error("EXPORT_CANCELLED");
    let useAssPath: string | undefined;
    if (job.spec.burnCaptions && job.spec.captions.length) {
      job.stage = "Preparing captions";
      await writeFile(assPath, writeAss(job.spec, probe.width, probe.height), { mode: 0o600 });
      useAssPath = assPath;
    }
    if ((job.status as ExportJobStatus) === "cancelled") throw new Error("EXPORT_CANCELLED");
    const filter = buildFilterGraph(job.spec, probe.colorInfo.hasAudio, outputResolution, useLutPath, useAssPath);
    job.stage = "Encoding video";
    await persist(job);
    try {
      await runFfmpeg(job, source.sourcePath, filter, editDuration, true);
    } catch (error) {
      if (error instanceof Error && error.message === "EXPORT_CANCELLED") throw error;
      await unlink(job.tempPath || "").catch(() => undefined);
      job.stage = "Retrying with software encoder";
      job.progress = 0;
      await persist(job);
      await runFfmpeg(job, source.sourcePath, filter, editDuration, false);
    }
    if ((job.status as ExportJobStatus) === "cancelled") throw new Error("EXPORT_CANCELLED");
    await rename(job.tempPath!, job.outputPath!);
    job.status = "succeeded";
    job.stage = "Ready to save";
    job.progress = 1;
    job.retryable = false;
    await persist(job);
    await unlink(lutPath).catch(() => undefined);
    await unlink(assPath).catch(() => undefined);
  } catch (error) {
    await unlink(job.tempPath || "").catch(() => undefined);
    await unlink(path.join(EXPORT_DIR, `${job.id}-combined.cube`)).catch(() => undefined);
    await unlink(path.join(EXPORT_DIR, `${job.id}.ass`)).catch(() => undefined);
    if ((job.status as ExportJobStatus) === "cancelled") {
      job.stage = "Cancelled";
      job.retryable = true;
      await persist(job);
    } else {
      const code = error instanceof Error ? error.message : "EXPORT_FAILED";
      job.status = "failed";
      job.stage = "Export failed";
      job.error = code === "HDR_UNSUPPORTED" ? "This source is HDR or BT.2020. Convert it to SDR Rec.709 before export." : code.startsWith("FFMPEG_FAILED:") ? `FFmpeg could not finish this export. ${code.slice(14)}` : code === "EXPORT_HAS_NO_MEDIA" ? "The current edit contains no video to export." : "The export could not be completed. Your source and edit are unchanged.";
      job.retryable = true;
      await persist(job);
    }
  } finally {
    runtime.activeId = null;
    runtime.activeProcess = null;
    void runNext();
  }
}

async function runNext() {
  await initialize();
  if (runtime.activeId) return;
  const next = [...runtime.jobs.values()].filter((job) => job.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (next) { runtime.activeId = next.id; void processJob(next); }
}

export async function createExport(input: unknown) {
  await initialize();
  const parsed = createExportSchema.parse(input) as CreateExportRequest;
  if (parsed.hasExternalOverlays) throw new Error("EXTERNAL_OVERLAYS_UNSUPPORTED");
  const source = await getSource(parsed.sourceId);
  const probe = await probeMedia(source.sourcePath);
  if (probe.colorInfo.support.startsWith("unsupported")) throw new Error("HDR_UNSUPPORTED");
  const spec = { ...parsed, keepRanges: normalizeKeepRanges(parsed.keepRanges, probe.duration) };
  const hash = stableHash(spec);
  const existing = [...runtime.jobs.values()].find((job) => job.hash === hash && ["queued", "processing", "succeeded"].includes(job.status) && (job.status !== "succeeded" || Date.now() - new Date(job.updatedAt).getTime() <= SUCCESS_RETENTION_MS));
  if (existing) return publicJob(existing);
  const id = randomUUID();
  const extension = spec.format === "mp4-h264" ? "mp4" : "mov";
  const createdAt = new Date().toISOString();
  const job: StoredExportJob = { id, hash, spec, format: spec.format, status: "queued", stage: runtime.activeId ? "Waiting for current export" : "Queued", progress: 0, createdAt, updatedAt: createdAt, filename: `${path.basename(source.originalName, path.extname(source.originalName))}-edited.${extension}`, outputPath: path.join(EXPORT_DIR, `${id}.${extension}`), tempPath: path.join(EXPORT_DIR, `${id}.partial.${extension}`), retryable: false };
  runtime.jobs.set(id, job);
  await persist(job);
  void runNext();
  return publicJob(job);
}

export async function getExport(id: string) {
  await initialize();
  const job = runtime.jobs.get(id);
  if (!job) throw new Error("EXPORT_NOT_FOUND");
  return publicJob(job);
}

export async function cancelExport(id: string) {
  await initialize();
  const job = runtime.jobs.get(id);
  if (!job) throw new Error("EXPORT_NOT_FOUND");
  if (job.status === "queued") {
    job.status = "cancelled";
    job.stage = "Cancelled";
    job.retryable = true;
    await persist(job);
  } else if (job.status === "processing") {
    job.status = "cancelled";
    job.stage = "Cancelling";
    job.retryable = true;
    runtime.activeProcess?.kill("SIGTERM");
    const process = runtime.activeProcess;
    setTimeout(() => { if (process && process.exitCode === null) process.kill("SIGKILL"); }, 2000);
    await persist(job);
  }
  return publicJob(job);
}

export async function getExportFile(id: string) {
  await initialize();
  const job = runtime.jobs.get(id);
  if (!job || job.status !== "succeeded" || !job.outputPath) throw new Error("EXPORT_FILE_NOT_READY");
  const details = await stat(job.outputPath);
  return { job: publicJob(job), stream: createReadStream(job.outputPath), size: details.size };
}
