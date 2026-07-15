import { Readable } from "node:stream";
import { getExportFile } from "@/lib/server/export-jobs";
import { isLocalRequest } from "@/lib/server/local-request";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isLocalRequest(request)) return Response.json({ error: "LOCAL_ONLY" }, { status: 403 });
  try {
    const { job, stream, size } = await getExportFile((await context.params).id);
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { "Content-Type": job.format === "mp4-h264" ? "video/mp4" : "video/quicktime", "Content-Length": String(size), "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(job.filename || "descriptor-export.mp4")}`, "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "EXPORT_FILE_NOT_READY", message: "The completed video is not available yet." }, { status: 409 });
  }
}
