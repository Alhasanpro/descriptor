import { NextResponse } from "next/server";
import { refreshTranslationRequestSchema, refreshTranslationResponseSchema } from "@/lib/ai/schemas";
import { translateEditedSubtitle } from "@/lib/server/translation";

export const runtime = "nodejs";
export const maxDuration = 60;

let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;

function isLocalRequest(request: Request) {
  const host = request.headers.get("host")?.split(":")[0];
  const origin = request.headers.get("origin");
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return localHost && (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
}

export async function POST(request: Request) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "LOCAL_ONLY", message: "AI translation is available only from this Mac." }, { status: 403 });
  }
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return NextResponse.json({ error: "AI_BUSY", message: "Translation is busy. Try this subtitle again in a moment." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE", message: "This subtitle is too long to translate safely." }, { status: 413 });
  }

  activeRequests += 1;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON", message: "The subtitle update request was not valid." }, { status: 400 });
    }
    const parsed = refreshTranslationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_TRANSLATION_REQUEST", message: "Choose a valid transcript paragraph to translate." }, { status: 400 });
    }
    const input = parsed.data;
    const translated = await translateEditedSubtitle(input);

    return NextResponse.json(refreshTranslationResponseSchema.parse({
      paragraphId: input.paragraphId,
      englishTranslation: translated.englishTranslation,
      modelStatus: "complete"
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TRANSLATION_FAILED";
    const unavailable = ["LOCAL_AI_UNAVAILABLE", "LOCAL_AI_MODEL_MISSING", "LOCAL_AI_TIMEOUT"].includes(code);
    const localMessage = code === "LOCAL_AI_MODEL_MISSING"
      ? "The local language model is not installed."
      : code === "LOCAL_AI_TIMEOUT"
        ? "The local language model took too long to respond. Your previous subtitle was kept."
        : "Local AI is not running on this Mac.";
    return NextResponse.json({
      error: unavailable ? code : "TRANSLATION_FAILED",
      message: unavailable
        ? localMessage
        : "The English subtitle could not be updated. Your previous subtitle was kept."
    }, { status: unavailable ? 503 : 502 });
  } finally {
    activeRequests = Math.max(0, activeRequests - 1);
  }
}
