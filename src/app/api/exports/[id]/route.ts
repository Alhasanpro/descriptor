import { NextResponse } from "next/server";
import { cancelExport, getExport } from "@/lib/server/export-jobs";
import { isLocalRequest } from "@/lib/server/local-request";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY" }, { status: 403 });
  try { return NextResponse.json(await getExport((await context.params).id)); }
  catch { return NextResponse.json({ error: "EXPORT_NOT_FOUND", message: "This export job was not found." }, { status: 404 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY" }, { status: 403 });
  try { return NextResponse.json(await cancelExport((await context.params).id)); }
  catch { return NextResponse.json({ error: "EXPORT_NOT_FOUND", message: "This export job was not found." }, { status: 404 }); }
}
