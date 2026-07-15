import { sampleCubeLut, type CubeLut } from "./cube-lut.ts";
import type { ColorGradeSettings } from "./types.ts";

export const DEFAULT_COLOR_GRADE: ColorGradeSettings = {
  enabled: false,
  presetId: "neutral",
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  fade: 0,
  vignette: 0,
  lut: null
};

type Preset = { id: string; name: string; values: Pick<ColorGradeSettings, "exposure" | "contrast" | "highlights" | "shadows" | "temperature" | "tint" | "saturation" | "fade" | "vignette"> };

export const COLOR_GRADE_PRESETS: Preset[] = [
  { id: "neutral", name: "Neutral", values: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 0, fade: 0, vignette: 0 } },
  { id: "clean", name: "Clean", values: { exposure: 0.1, contrast: 8, highlights: -8, shadows: 6, temperature: 0, tint: 0, saturation: 4, fade: 0, vignette: 0 } },
  { id: "warm-film", name: "Warm Film", values: { exposure: 0, contrast: 12, highlights: -18, shadows: 8, temperature: 18, tint: 4, saturation: -6, fade: 10, vignette: 12 } },
  { id: "cool-modern", name: "Cool Modern", values: { exposure: 0.05, contrast: 10, highlights: -10, shadows: 4, temperature: -14, tint: -2, saturation: -4, fade: 4, vignette: 8 } },
  { id: "rich", name: "Rich", values: { exposure: 0, contrast: 15, highlights: -12, shadows: -4, temperature: 4, tint: 2, saturation: 18, fade: 0, vignette: 8 } },
  { id: "mono", name: "Mono", values: { exposure: 0, contrast: 12, highlights: -8, shadows: 6, temperature: 0, tint: 0, saturation: -100, fade: 0, vignette: 10 } }
];

export const COLOR_GRADE_LIMITS = {
  exposure: { min: -2, max: 2, step: 0.05 },
  contrast: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  fade: { min: 0, max: 100, step: 1 },
  vignette: { min: 0, max: 100, step: 1 }
} as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function decodeRec709(value: number) {
  const v = clamp(value);
  return v < 0.081 ? v / 4.5 : Math.pow((v + 0.099) / 1.099, 1 / 0.45);
}

function encodeRec709(value: number) {
  const v = clamp(value);
  return v < 0.018 ? 4.5 * v : 1.099 * Math.pow(v, 0.45) - 0.099;
}

export function normalizeColorGrade(settings: ColorGradeSettings): ColorGradeSettings {
  const numeric = Object.fromEntries(Object.entries(COLOR_GRADE_LIMITS).map(([key, limit]) => [key, clamp(Number(settings[key as keyof typeof COLOR_GRADE_LIMITS]) || 0, limit.min, limit.max)]));
  return { ...settings, ...numeric, lut: settings.lut ? { ...settings.lut, strength: clamp(settings.lut.strength, 0, 100) } : null };
}

export function applyColorTransform(encoded: [number, number, number], input: ColorGradeSettings): [number, number, number] {
  if (!input.enabled) return encoded.map((value) => clamp(value)) as [number, number, number];
  const settings = normalizeColorGrade(input);
  let rgb = encoded.map(decodeRec709);
  const exposure = Math.pow(2, settings.exposure);
  rgb = rgb.map((value) => value * exposure);

  const warmth = settings.temperature / 100;
  const tint = settings.tint / 100;
  rgb[0] *= 1 + warmth * 0.12 + tint * 0.04;
  rgb[1] *= 1 - tint * 0.08;
  rgb[2] *= 1 - warmth * 0.12 + tint * 0.04;

  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const shadowWeight = Math.pow(1 - clamp(luminance), 2);
  const highlightWeight = Math.pow(clamp(luminance), 2);
  const tonal = 1 + (settings.shadows / 100) * 0.45 * shadowWeight + (settings.highlights / 100) * 0.45 * highlightWeight;
  rgb = rgb.map((value) => value * tonal);

  const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const saturation = 1 + settings.saturation / 100;
  rgb = rgb.map((value) => luma + (value - luma) * saturation);
  const contrast = 1 + settings.contrast / 100;
  rgb = rgb.map((value) => (value - 0.18) * contrast + 0.18);
  let output = rgb.map(encodeRec709);
  const fade = settings.fade / 100;
  output = output.map((value) => value * (1 - fade * 0.18) + 0.08 * fade);
  return output.map((value) => clamp(value)) as [number, number, number];
}

export function generateCombinedLut(settings: ColorGradeSettings, sourceLut?: CubeLut, size = 33) {
  if (!Number.isInteger(size) || size < 2 || size > 65) throw new Error("Combined LUT size must be between 2 and 65.");
  const normalized = normalizeColorGrade(settings);
  const rgba = new Uint8Array(size * size * size * 4);
  const values = new Float32Array(size * size * size * 3);
  let pixel = 0;
  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) {
        const input: [number, number, number] = [r / (size - 1), g / (size - 1), b / (size - 1)];
        let output = applyColorTransform(input, normalized);
        if (sourceLut && normalized.lut) {
          const looked = sampleCubeLut(sourceLut, output);
          const strength = normalized.lut.strength / 100;
          output = output.map((value, channel) => value + (looked[channel] - value) * strength) as [number, number, number];
        }
        for (let channel = 0; channel < 3; channel += 1) {
          const value = clamp(output[channel]);
          values[pixel * 3 + channel] = value;
          rgba[pixel * 4 + channel] = Math.round(value * 255);
        }
        rgba[pixel * 4 + 3] = 255;
        pixel += 1;
      }
    }
  }
  return { size, rgba, values };
}

export function writeCubeLut(settings: ColorGradeSettings, sourceLut?: CubeLut, size = 33) {
  const generated = generateCombinedLut(settings, sourceLut, size);
  const lines = ["TITLE \"Descriptor Combined Grade\"", `LUT_3D_SIZE ${size}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
  for (let index = 0; index < generated.values.length; index += 3) lines.push(`${generated.values[index].toFixed(7)} ${generated.values[index + 1].toFixed(7)} ${generated.values[index + 2].toFixed(7)}`);
  return `${lines.join("\n")}\n`;
}
