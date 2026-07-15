import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getFfmpegPath } from "@/lib/server/ffmpeg";
import { getSource, WORK_DIR } from "@/lib/server/media-store";

export const runtime = "nodejs";
export const maxDuration = 3600;

const execFileAsync = promisify(execFile);
const waveformJobs = new Map<string, Promise<string>>();

async function createWaveform(sourceId: string) {
  const outputPath = path.join(WORK_DIR, `${sourceId}-waveform.png`);
  try {
    await access(outputPath);
    return outputPath;
  } catch {
    const existingJob = waveformJobs.get(sourceId);
    if (existingJob) return existingJob;
    const job = (async () => {
      const source = await getSource(sourceId);
      await execFileAsync(getFfmpegPath(), [
        "-hide_banner", "-loglevel", "error", "-y", "-i", source.sourcePath,
        "-filter_complex", "[0:a]aformat=channel_layouts=mono,showwavespic=s=2400x96:colors=0x998E93:scale=sqrt,format=rgba[v]",
        "-map", "[v]", "-frames:v", "1", outputPath,
      ], { timeout: 3_600_000, maxBuffer: 1024 * 1024 });
      return outputPath;
    })();
    waveformJobs.set(sourceId, job);
    try {
      return await job;
    } finally {
      waveformJobs.delete(sourceId);
    }
  }
}

export async function GET(_request: Request, context: { params: Promise<{ sourceId: string }> }) {
  try {
    const { sourceId } = await context.params;
    const waveformPath = await createWaveform(sourceId);
    const bytes = await readFile(waveformPath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("matches no streams")
      ? "This video has no audio track."
      : "The audio waveform could not be generated.";
    return NextResponse.json({ error: "WAVEFORM_FAILED", message }, { status: 422 });
  }
}
