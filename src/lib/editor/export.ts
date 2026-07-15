import type { ColorGradeSettings, SubtitleAnimation, SubtitleStyle } from "./types";
import type { TimeRange } from "./time";

export type ExportFormat = "mp4-h264" | "mov-hevc";

export type ExportResolution = {
  width: number;
  height: number;
  label: "4K portrait" | "4K landscape";
};

export const FOUR_K_PORTRAIT: ExportResolution = { width: 2160, height: 3840, label: "4K portrait" };
export const FOUR_K_LANDSCAPE: ExportResolution = { width: 3840, height: 2160, label: "4K landscape" };

/**
 * Descriptor exports to an oriented UHD canvas. Portrait and square projects
 * use the vertical 4K canvas; landscape projects use the horizontal canvas.
 */
export function get4KOutputResolution(sourceWidth: number, sourceHeight: number): ExportResolution {
  return sourceHeight >= sourceWidth ? FOUR_K_PORTRAIT : FOUR_K_LANDSCAPE;
}

/**
 * Scale into the 4K canvas without cropping or stretching, then pad only when
 * the source aspect ratio does not match the oriented UHD canvas.
 */
export function build4KContainFilter(resolution: ExportResolution) {
  const { width, height } = resolution;
  return `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=w=${width}:h=${height}:x=(ow-iw)/2:y=(oh-ih)/2:color=black,setsar=1`;
}

export type ExportCaption = {
  id: string;
  start: number;
  end: number;
  text: string;
  animation: SubtitleAnimation;
  wordTimes: Array<{ start: number; end: number }>;
};

export type CreateExportRequest = {
  sourceId: string;
  /** Present only when the creator deliberately asks for another render. */
  renderRequestId?: string;
  format: ExportFormat;
  keepRanges: TimeRange[];
  colorGrade: ColorGradeSettings;
  burnCaptions: boolean;
  captions: ExportCaption[];
  subtitleStyle: SubtitleStyle;
  hasExternalOverlays: boolean;
};

export type ExportJobStatus = "queued" | "processing" | "succeeded" | "failed" | "cancelled";

export type ExportJobView = {
  id: string;
  status: ExportJobStatus;
  stage: string;
  progress: number;
  format: ExportFormat;
  createdAt: string;
  updatedAt: string;
  error?: string;
  filename?: string;
  retryable: boolean;
};
