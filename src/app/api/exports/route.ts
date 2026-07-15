import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createExport } from "@/lib/server/export-jobs";
import { isLocalRequest } from "@/lib/server/local-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY", message: "Video export is available only from the local editor." }, { status: 403 });
  try {
    return NextResponse.json(await createExport(await request.json()), { status: 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "EXPORT_CREATE_FAILED";
    const status = error instanceof ZodError ? 400 : code === "EXTERNAL_OVERLAYS_UNSUPPORTED" || code === "HDR_UNSUPPORTED" ? 409 : 400;
    const message = error instanceof ZodError ? "The export settings are incomplete or invalid." : code === "EXTERNAL_OVERLAYS_UNSUPPORTED" ? "Remove external video, image, and audio clips before exporting this milestone." : code === "HDR_UNSUPPORTED" ? "This source is HDR or BT.2020. Convert it to SDR Rec.709 before export." : "The export could not be queued.";
    return NextResponse.json({ error: code, message }, { status });
  }
}
