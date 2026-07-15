import { NextResponse } from "next/server";
import { importSource } from "@/lib/server/media-store";
import { probeMedia } from "@/lib/server/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function POST(request: Request) {
  try {
    if (!request.body) throw new Error("FILE_REQUIRED");
    const mimeType = request.headers.get("content-type")?.split(";")[0] || "";
    const size = Number(request.headers.get("content-length"));
    const name = decodeURIComponent(request.headers.get("x-file-name") || "source-video");
    const source = await importSource(request.body, mimeType, name, size);
    try {
      const probe = await probeMedia(source.sourcePath);
      return NextResponse.json({ sourceId: source.id, size: source.size, sha256: source.sha256, status: "stored", probe });
    } catch {
      return NextResponse.json({ sourceId: source.id, size: source.size, sha256: source.sha256, status: "stored", probe: { width: 0, height: 0, duration: 0, colorInfo: { frameRate: 0, hasAudio: false, pixelFormat: "unknown", colorPrimaries: "unknown", colorTransfer: "unknown", colorSpace: "unknown", support: "probe-unavailable", label: "Color information unavailable", reason: "FFprobe is unavailable. Configure FFPROBE_PATH to enable color grading and export." } } });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMPORT_FAILED";
    const status = code === "FILE_TOO_LARGE" ? 413 : code === "UNSUPPORTED_MEDIA" ? 415 : 400;
    return NextResponse.json({ error: code, message: code === "FILE_TOO_LARGE" ? "The file exceeds the configured local storage limit." : "The source video could not be imported safely." }, { status });
  }
}
