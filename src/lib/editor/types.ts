export type IssueType = "filler" | "false-start" | "repetition" | "wording" | "silence";

export type TranscriptWord = {
  id: string;
  text: string;
  start: number;
  end: number;
  language: "ar" | "en";
  issueId?: string;
};

export type TranscriptIssue = {
  id: string;
  type: IssueType;
  label: string;
  start: number;
  end: number;
  confidence: number;
  safeToRemove: boolean;
};

export type TranscriptParagraph = {
  id: string;
  start: number;
  end: number;
  words: TranscriptWord[];
  translation: string;
};

export type SubtitleTemplate = "typewriter" | "karaoke" | "bold-italic" | "impact" | "wave" | "classic" | "two-words" | "yellow-highlight" | "clean" | "preview" | "one-word" | "skewed" | "outline" | "minimal" | "creator-build" | "creator-outline";

export type SubtitleAnimation = "karaoke" | "typewriter" | "pop" | "build";

export type SubtitleStyle = {
  template: SubtitleTemplate;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: "left" | "center" | "right";
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  wordSpacing: number;
  lineHeight: number;
  maxWidth: number;
  color: string;
  highlightColor: string;
  background: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  shadow: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  position: number;
  horizontalPosition: "left" | "center" | "right";
  animation: SubtitleAnimation;
  previewAnimation: boolean;
};

export type MediaMetadata = {
  name: string;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  size: number;
};

export type SourceColorInfo = {
  frameRate: number;
  hasAudio: boolean;
  pixelFormat: string;
  colorPrimaries: string;
  colorTransfer: string;
  colorSpace: string;
  support: "rec709" | "rec709-assumed" | "unsupported-hdr" | "unsupported-color" | "probe-unavailable";
  label: string;
  reason?: string;
};

export type ColorGradeLut = {
  id: string;
  name: string;
  strength: number;
  gridSize: number;
  sha256: string;
};

export type ColorGradeSettings = {
  enabled: boolean;
  presetId: string | null;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  saturation: number;
  fade: number;
  vignette: number;
  lut: ColorGradeLut | null;
};

export type TimelineAssetType = "video" | "audio" | "image";

export type TimelineAssetClip = {
  id: string;
  type: TimelineAssetType;
  name: string;
  url: string;
  start: number;
  sourceStart: number;
  sourceEnd: number;
  sourceDuration: number;
  width: number;
  height: number;
  size: number;
};
