import type { TimelineAssetClip, TimelineAssetType } from "@/lib/editor/types";

const extensionTypes: Record<string, TimelineAssetType> = {
  mp4: "video",
  mov: "video",
  m4v: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  aac: "audio",
  ogg: "audio",
  flac: "audio",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
};

export const timelineMediaAccept = "video/*,audio/*,image/png,image/jpeg,image/webp,image/gif";

export function timelineAssetType(file: File): TimelineAssetType | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return extensionTypes[file.name.split(".").at(-1)?.toLowerCase() ?? ""] ?? null;
}

function readMediaMetadata(url: string, type: "video" | "audio") {
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const media = document.createElement(type);
    const timeout = window.setTimeout(() => reject(new Error("Media details took too long to load")), 12_000);
    const finish = (result: { duration: number; width: number; height: number }) => {
      window.clearTimeout(timeout);
      media.removeAttribute("src");
      media.load();
      resolve(result);
    };
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) ? media.duration : 0;
      if (duration <= 0.1) {
        window.clearTimeout(timeout);
        reject(new Error("This media clip has no usable duration"));
        return;
      }
      finish({
        duration,
        width: type === "video" ? (media as HTMLVideoElement).videoWidth : 0,
        height: type === "video" ? (media as HTMLVideoElement).videoHeight : 0,
      });
    };
    media.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error(`Could not read ${type} metadata`));
    };
    media.src = url;
  });
}

function readImageMetadata(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = document.createElement("img");
    const timeout = window.setTimeout(() => reject(new Error("Image details took too long to load")), 12_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Could not read image metadata"));
    };
    image.src = url;
  });
}

export async function createTimelineAsset(file: File, requestedStart: number, projectDuration: number): Promise<TimelineAssetClip> {
  const type = timelineAssetType(file);
  if (!type) throw new Error(`${file.name} is not a supported video, audio, or image file`);
  if (file.size <= 0) throw new Error(`${file.name} is empty`);

  const url = URL.createObjectURL(file);
  try {
    const metadata = type === "image"
      ? { ...(await readImageMetadata(url)), duration: 5 }
      : await readMediaMetadata(url, type);
    const sourceDuration = Math.max(0.1, metadata.duration);
    const timelineDuration = Math.max(0.1, projectDuration);
    const start = Math.max(0, Math.min(requestedStart, timelineDuration - 0.1));
    const visibleDuration = Math.min(sourceDuration, Math.max(0.1, timelineDuration - start));
    return {
      id: `media-${crypto.randomUUID()}`,
      type,
      name: file.name,
      url,
      start,
      sourceStart: 0,
      sourceEnd: visibleDuration,
      sourceDuration,
      width: metadata.width,
      height: metadata.height,
      size: file.size,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
