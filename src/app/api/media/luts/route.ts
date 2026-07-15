import { NextResponse } from "next/server";
import { isLocalRequest } from "@/lib/server/local-request";
import { MAX_LUT_BYTES, storeLut } from "@/lib/server/lut-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: "LOCAL_ONLY", message: "LUT import is available only from the local editor." }, { status: 403 });
  try {
    const declaredSize = Number(request.headers.get("content-length"));
    if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > MAX_LUT_BYTES) throw new Error("LUT_FILE_TOO_LARGE");
    const bytes = new Uint8Array(await request.arrayBuffer());
    const name = decodeURIComponent(request.headers.get("x-file-name") || "look.cube");
    const { manifest } = await storeLut(bytes, name);
    return NextResponse.json({ id: manifest.id, name: manifest.name, title: manifest.title, size: manifest.size, gridSize: manifest.gridSize, sha256: manifest.sha256 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "LUT_IMPORT_FAILED";
    const status = code === "LUT_FILE_TOO_LARGE" ? 413 : 400;
    const message = code === "LUT_FILE_TOO_LARGE" ? "Choose a .cube LUT smaller than 5 MB." : code === "LUT_EXTENSION_REQUIRED" ? "Choose a file with the .cube extension." : code.includes("UTF") ? "The LUT is not valid UTF-8 text." : code;
    return NextResponse.json({ error: code, message }, { status });
  }
}
