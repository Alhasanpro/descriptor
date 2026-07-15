import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { AnalysisProgressEvent, ProcessVideoResponse } from "@/lib/ai/schemas";
import { localAnalysisAvailability, localAnalysisErrorCode, localAnalysisErrorMessage, runLocalAnalysisJob } from "@/lib/server/local-analysis";
import { WORK_DIR } from "@/lib/server/media-store";

export const runtime = "nodejs";
export const maxDuration = 3600;

const TYPE_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm"
};
const MAX_LOCAL_UPLOAD = 200 * 1024 * 1024;
let lastRequestAt = 0;

function isLocalRequest(request: Request) {
  const host = request.headers.get("host")?.split(":")[0];
  const origin = request.headers.get("origin");
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return localHost && (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
}

async function withTemporaryUpload(file: File, run: (filePath: string) => Promise<ProcessVideoResponse>) {
  await mkdir(WORK_DIR, { recursive: true });
  const filePath = path.join(WORK_DIR, `${randomUUID()}-upload${TYPE_EXTENSIONS[file.type]}`);
  try {
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()), { mode: 0o600, flag: "wx" });
    return await run(filePath);
  } finally {
    await rm(filePath, { force: true }).catch(() => undefined);
  }
}

function errorResponse(error: unknown) {
  const code = localAnalysisErrorCode(error);
  const unavailable = ["LOCAL_WHISPER_BINARY_MISSING", "LOCAL_WHISPER_MODEL_MISSING", "LOCAL_AI_MODEL_MISSING", "LOCAL_AI_UNAVAILABLE"].includes(code);
  return {
    status: unavailable ? 503 : 502,
    body: { error: code, message: localAnalysisErrorMessage(error) }
  };
}

export async function POST(request: Request) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY", message: "Local speech analysis is available only from this Mac." }, { status: 403 });
  if (localAnalysisAvailability("direct-upload") === "busy") return NextResponse.json({ error: "PROCESSING_BUSY", message: "Another video is being analyzed locally. Try again when it finishes." }, { status: 429, headers: { "Retry-After": "2" } });
  if (Date.now() - lastRequestAt < 4_000) return NextResponse.json({ error: "ANALYSIS_COOLDOWN", message: "Please wait a few seconds before starting another analysis." }, { status: 429 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "INVALID_UPLOAD", message: "The selected media could not be opened." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "FILE_REQUIRED", message: "Choose a video to analyze." }, { status: 400 });
  if (!TYPE_EXTENSIONS[file.type]) return NextResponse.json({ error: "UNSUPPORTED_MEDIA", message: "Use MP4, MOV, M4V, WebM, MP3, M4A, or WAV." }, { status: 415 });
  if (file.size === 0 || file.size > MAX_LOCAL_UPLOAD) return NextResponse.json({ error: "FILE_TOO_LARGE", message: "Files over 200 MB use Descriptor's stored-source analysis path." }, { status: 413 });

  lastRequestAt = Date.now();
  const wantsProgress = new URL(request.url).searchParams.get("stream") === "1";
  if (!wantsProgress) {
    try {
      const result = await withTemporaryUpload(file, (filePath) => runLocalAnalysisJob(`direct:${file.name}:${file.size}:${file.lastModified}`, filePath, () => undefined));
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const failure = errorResponse(error);
      return NextResponse.json(failure.body, { status: failure.status });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisProgressEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await withTemporaryUpload(file, (filePath) => runLocalAnalysisJob(`direct:${file.name}:${file.size}:${file.lastModified}`, filePath, (stage, status, message) => send({ type: "status", stage, status, message })));
        send({ type: "result", result });
      } catch (error) {
        send({ type: "error", message: localAnalysisErrorMessage(error) });
      } finally {
        controller.close();
      }
    }
  });
  return new NextResponse(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
