"use client";

import { useEffect, useMemo, useState } from "react";
import { editedToSourceTime } from "@/lib/editor/time";
import type { TimeRange } from "@/lib/editor/time";

export type FilmstripFrame = {
  sourceTime: number;
  imageUrl?: string;
};

type FilmstripResult = {
  key: string;
  images: string[];
  status: "loading" | "ready" | "error";
};

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadeddata" | "seeked", timeoutMs = 5000) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Video ${eventName} timed out`));
    }, timeoutMs);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video frame could not be decoded"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener(eventName, onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function seekToFrame(video: HTMLVideoElement, sourceTime: number) {
  const safeDuration = Number.isFinite(video.duration) ? video.duration : sourceTime + 0.1;
  const target = Math.max(0, Math.min(Math.max(0, safeDuration - 0.04), sourceTime));
  if (Math.abs(video.currentTime - target) > 0.025) {
    const ready = waitForVideoEvent(video, "seeked");
    video.currentTime = target;
    await ready;
  }
}

function drawFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || !video.videoWidth || !video.videoHeight) throw new Error("Video frame is not ready");
  const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.68);
}

export function useVideoFilmstrip(mediaUrl: string | null, duration: number, removedRanges: TimeRange[], frameCount: number) {
  const sampleTimes = useMemo(() => {
    const cleanedDuration = Math.max(0, duration - removedRanges.reduce((total, range) => total + range.end - range.start, 0));
    if (!mediaUrl || cleanedDuration <= 0.04 || frameCount <= 0) return [];
    return Array.from({ length: frameCount }, (_, index) => editedToSourceTime(cleanedDuration * (index + 0.5) / frameCount, duration, removedRanges));
  }, [duration, frameCount, mediaUrl, removedRanges]);
  const generationKey = useMemo(() => `${mediaUrl ?? "none"}|${sampleTimes.map((time) => time.toFixed(3)).join(",")}`, [mediaUrl, sampleTimes]);
  const [result, setResult] = useState<FilmstripResult>({ key: "", images: [], status: "loading" });

  useEffect(() => {
    if (!mediaUrl || !sampleTimes.length) return;
    let cancelled = false;
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 72;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("aria-hidden", "true");
    video.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none";
    document.body.append(video);

    const generate = async () => {
      try {
        const loaded = waitForVideoEvent(video, "loadeddata", 10000);
        video.src = mediaUrl;
        video.load();
        await loaded;
        const images: string[] = [];
        for (let index = 0; index < sampleTimes.length; index += 1) {
          if (cancelled) return;
          await seekToFrame(video, sampleTimes[index]);
          if (cancelled) return;
          images.push(drawFrame(video, canvas));
          if (index === 0 || index === sampleTimes.length - 1 || index % 4 === 3) {
            setResult({ key: generationKey, images: [...images], status: index === sampleTimes.length - 1 ? "ready" : "loading" });
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
          }
        }
      } catch {
        if (!cancelled) setResult({ key: generationKey, images: [], status: "error" });
      }
    };

    void generate();
    return () => {
      cancelled = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    };
  }, [generationKey, mediaUrl, sampleTimes]);

  const images = result.key === generationKey ? result.images : [];
  const status = !mediaUrl ? "idle" : result.key === generationKey ? result.status : "loading";
  const frames: FilmstripFrame[] = sampleTimes.map((sourceTime, index) => ({ sourceTime, imageUrl: images[index] }));
  return { frames, status } as const;
}
