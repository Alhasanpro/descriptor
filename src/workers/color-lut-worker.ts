/// <reference lib="webworker" />

import { generateCombinedLut } from "@/lib/editor/color-grade";
import type { CubeLut } from "@/lib/editor/cube-lut";
import type { ColorGradeSettings } from "@/lib/editor/types";

type Request = {
  id: number;
  settings: ColorGradeSettings;
  lut?: { title?: string; size: number; domainMin: [number, number, number]; domainMax: [number, number, number]; values: ArrayBuffer };
};

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const sourceLut: CubeLut | undefined = event.data.lut ? { ...event.data.lut, values: new Float32Array(event.data.lut.values) } : undefined;
    const generated = generateCombinedLut(event.data.settings, sourceLut, 33);
    self.postMessage({ id: event.data.id, size: generated.size, rgba: generated.rgba.buffer }, { transfer: [generated.rgba.buffer] });
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : "Color preview could not be prepared." });
  }
};
