import { NextResponse } from "next/server";
import { z } from "zod";
import type { AnalysisProgressEvent } from "@/lib/ai/schemas";
import { localAnalysisAvailability, localAnalysisErrorCode, localAnalysisErrorMessage, runLocalAnalysisJob } from "@/lib/server/local-analysis";
import { getSource } from "@/lib/server/media-store";

export const runtime = "nodejs";
export const maxDuration = 3600;

const bodySchema = z.object({ sourceId: z.string().uuid() });

function isLocalRequest(request: Request) {
  const host = request.headers.get("host")?.split(":")[0];
  const origin = request.headers.get("origin");
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return localHost && (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
}

export async function POST(request: Request) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY", message: "Local speech analysis is available only from this Mac." }, { status: 403 });
  let sourceId: string;
  try {
    sourceId = bodySchema.parse(await request.json()).sourceId;
  } catch {
    return NextResponse.json({ error: "INVALID_SOURCE", message: "The selected source could not be opened." }, { status: 400 });
  }

  let source;
  try {
    source = await getSource(sourceId);
  } catch {
    return NextResponse.json({ error: "INVALID_SOURCE", message: "The selected source could not be opened." }, { status: 400 });
  }
  const analysisKey = `source:${source.sha256}`;
  if (localAnalysisAvailability(analysisKey) === "busy") {
    return NextResponse.json({ error: "PROCESSING_BUSY", message: "Another video is being analyzed locally. Descriptor will continue automatically when it finishes." }, { status: 429, headers: { "Retry-After": "2" } });
  }
  const wantsProgress = new URL(request.url).searchParams.get("stream") === "1";
  if (!wantsProgress) {
    try {
      const result = await runLocalAnalysisJob(analysisKey, source.sourcePath, () => undefined);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const code = localAnalysisErrorCode(error);
      return NextResponse.json({ error: code, message: localAnalysisErrorMessage(error) }, { status: 502 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisProgressEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await runLocalAnalysisJob(analysisKey, source.sourcePath, (stage, status, message) => send({ type: "status", stage, status, message }));
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
