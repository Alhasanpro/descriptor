import "server-only";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { SourceColorInfo } from "@/lib/editor/types";

const execFileAsync = promisify(execFile);

function executablePath(configuredPath: string | undefined, candidates: string[], unavailableCode: string) {
  const paths = [configuredPath?.trim(), ...candidates].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of paths) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through owned packaged and development candidates.
    }
  }
  throw new Error(unavailableCode);
}

function moduleRoots() {
  return [path.join(process.cwd(), "runtime_modules"), path.join(process.cwd(), "node_modules")];
}

export function getFfmpegPath() {
  const binary = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  return executablePath(process.env.FFMPEG_PATH, moduleRoots().map((root) => path.join(root, "ffmpeg-static", binary)), "FFMPEG_UNAVAILABLE");
}

export function getFfprobePath() {
  const binary = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  const platformPackage = `${process.platform}-${process.arch}`;
  return executablePath(process.env.FFPROBE_PATH, moduleRoots().map((root) => path.join(root, "@ffprobe-installer", platformPackage, binary)), "FFPROBE_UNAVAILABLE");
}

type ProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  color_primaries?: string;
  color_transfer?: string;
  color_space?: string;
  duration?: string;
};

function frameRate(value?: string) {
  if (!value) return 0;
  const [numerator, denominator = 1] = value.split("/").map(Number);
  return denominator && Number.isFinite(numerator) && Number.isFinite(denominator) ? numerator / denominator : 0;
}

export async function probeMedia(sourcePath: string) {
  const { stdout } = await execFileAsync(getFfprobePath(), ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", sourcePath], { maxBuffer: 4 * 1024 * 1024 });
  const payload = JSON.parse(stdout) as { streams?: ProbeStream[]; format?: { duration?: string } };
  const video = payload.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("SOURCE_HAS_NO_VIDEO");
  const primaries = (video.color_primaries || "unknown").toLowerCase();
  const transfer = (video.color_transfer || "unknown").toLowerCase();
  const space = (video.color_space || "unknown").toLowerCase();
  const hdr = primaries.includes("bt2020") || space.includes("bt2020") || transfer.includes("smpte2084") || transfer.includes("arib-std-b67") || transfer.includes("hlg") || transfer.includes("pq");
  const tagged709 = primaries === "bt709" && ["bt709", "bt1886", "iec61966-2-1"].includes(transfer) && ["bt709", "unknown"].includes(space);
  const untagged = [primaries, transfer, space].every((value) => ["unknown", "unspecified", "reserved"].includes(value));
  const incompatibleSdr = !hdr && !tagged709 && !untagged && (primaries !== "unknown" || !["unknown", "bt709"].includes(transfer) || !["unknown", "bt709"].includes(space));
  const support: SourceColorInfo["support"] = hdr ? "unsupported-hdr" : incompatibleSdr ? "unsupported-color" : tagged709 ? "rec709" : "rec709-assumed";
  const colorInfo: SourceColorInfo = {
    frameRate: frameRate(video.avg_frame_rate) || frameRate(video.r_frame_rate) || 30,
    hasAudio: Boolean(payload.streams?.some((stream) => stream.codec_type === "audio")),
    pixelFormat: video.pix_fmt || "unknown",
    colorPrimaries: primaries,
    colorTransfer: transfer,
    colorSpace: space,
    support,
    label: hdr ? "HDR / BT.2020 unsupported" : incompatibleSdr ? "Non-Rec.709 source unsupported" : tagged709 ? "Rec.709" : "Rec.709 assumed",
    reason: hdr || incompatibleSdr ? "This milestone supports SDR Rec.709 footage only. Convert the source to SDR Rec.709 before grading or export." : undefined
  };
  return {
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    duration: Number(video.duration || payload.format?.duration) || 0,
    colorInfo
  };
}
