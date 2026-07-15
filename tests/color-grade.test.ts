import assert from "node:assert/strict";
import test from "node:test";
import { COLOR_GRADE_PRESETS, DEFAULT_COLOR_GRADE, generateCombinedLut, normalizeColorGrade, writeCubeLut } from "../src/lib/editor/color-grade.ts";
import { parseCubeLut, sampleCubeLut } from "../src/lib/editor/cube-lut.ts";
import { shouldCoalesceHistory } from "../src/lib/editor/editor-history.ts";
import { canonicalExportEditSpec, canonicalExportSpec } from "../src/lib/editor/export-idempotency.ts";
import { clampRangeValue, rangeValueFromPointer } from "../src/lib/editor/range.ts";
import { createLutTexture } from "../src/lib/editor/webgl-lut.ts";

const validTwoCube = `# a valid two-cube\nTITLE "Test look"\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\nLUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n`;

test("built-in preset values match the product contract", () => {
  assert.deepEqual(COLOR_GRADE_PRESETS.map(({ id, values }) => [id, values]), [
    ["neutral", { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 0, fade: 0, vignette: 0 }],
    ["clean", { exposure: 0.1, contrast: 8, highlights: -8, shadows: 6, temperature: 0, tint: 0, saturation: 4, fade: 0, vignette: 0 }],
    ["warm-film", { exposure: 0, contrast: 12, highlights: -18, shadows: 8, temperature: 18, tint: 4, saturation: -6, fade: 10, vignette: 12 }],
    ["cool-modern", { exposure: 0.05, contrast: 10, highlights: -10, shadows: 4, temperature: -14, tint: -2, saturation: -4, fade: 4, vignette: 8 }],
    ["rich", { exposure: 0, contrast: 15, highlights: -12, shadows: -4, temperature: 4, tint: 2, saturation: 18, fade: 0, vignette: 8 }],
    ["mono", { exposure: 0, contrast: 12, highlights: -8, shadows: 6, temperature: 0, tint: 0, saturation: -100, fade: 0, vignette: 10 }]
  ]);
});

test("grade normalization clamps every public control", () => {
  const result = normalizeColorGrade({ ...DEFAULT_COLOR_GRADE, exposure: 9, contrast: -900, fade: 160, lut: { id: "id", name: "look", strength: -2, gridSize: 33, sha256: "x" } });
  assert.equal(result.exposure, 2);
  assert.equal(result.contrast, -100);
  assert.equal(result.fade, 100);
  assert.equal(result.lut?.strength, 0);
});

test("neutral enabled grade is identity and deterministic", () => {
  const grade = { ...DEFAULT_COLOR_GRADE, enabled: true };
  const first = generateCombinedLut(grade, undefined, 5);
  const second = generateCombinedLut(grade, undefined, 5);
  assert.deepEqual(first.rgba, second.rgba);
  for (let b = 0; b < 5; b += 1) for (let g = 0; g < 5; g += 1) for (let r = 0; r < 5; r += 1) {
    const pixel = ((b * 5 + g) * 5 + r) * 4;
    assert.ok(Math.abs(first.rgba[pixel] / 255 - r / 4) <= 1 / 255);
    assert.ok(Math.abs(first.rgba[pixel + 1] / 255 - g / 4) <= 1 / 255);
    assert.ok(Math.abs(first.rgba[pixel + 2] / 255 - b / 4) <= 1 / 255);
  }
  assert.equal(writeCubeLut(grade, undefined, 3), writeCubeLut(grade, undefined, 3));
});

test("preview texture and exported cube share the same graded samples", () => {
  const warm = COLOR_GRADE_PRESETS.find((preset) => preset.id === "warm-film")!;
  const grade = { ...DEFAULT_COLOR_GRADE, ...warm.values, enabled: true, presetId: warm.id };
  const preview = generateCombinedLut(grade, undefined, 5);
  const exported = parseCubeLut(writeCubeLut(grade, undefined, 5));
  assert.equal(exported.values.length, preview.values.length);
  for (let index = 0; index < exported.values.length; index += 1) {
    assert.ok(Math.abs(exported.values[index] - preview.values[index]) < 1e-6);
    assert.ok(Math.abs(preview.rgba[Math.floor(index / 3) * 4 + index % 3] / 255 - preview.values[index]) <= 1 / 255);
  }
});

test("every LUT-backed grading control changes the generated preview", () => {
  const identity = generateCombinedLut({ ...DEFAULT_COLOR_GRADE, enabled: true }, undefined, 5).rgba;
  const adjustments = [
    { exposure: 1 },
    { contrast: 50 },
    { highlights: -50 },
    { shadows: 50 },
    { temperature: 50 },
    { tint: 50 },
    { saturation: -50 },
    { fade: 50 }
  ];
  for (const adjustment of adjustments) {
    const generated = generateCombinedLut({ ...DEFAULT_COLOR_GRADE, enabled: true, ...adjustment }, undefined, 5).rgba;
    assert.notDeepEqual(generated, identity, `${Object.keys(adjustment)[0]} must change the preview LUT`);
  }
});

test("LUT strength produces distinct combined preview textures", () => {
  const invertCube = parseCubeLut(`LUT_3D_SIZE 2\n1 1 1\n0 1 1\n1 0 1\n0 0 1\n1 1 0\n0 1 0\n1 0 0\n0 0 0\n`);
  const lut = { id: "invert", name: "Invert", gridSize: 2, sha256: "test", strength: 0 };
  const zero = generateCombinedLut({ ...DEFAULT_COLOR_GRADE, enabled: true, presetId: null, lut }, invertCube, 5).rgba;
  const half = generateCombinedLut({ ...DEFAULT_COLOR_GRADE, enabled: true, presetId: null, lut: { ...lut, strength: 50 } }, invertCube, 5).rgba;
  const full = generateCombinedLut({ ...DEFAULT_COLOR_GRADE, enabled: true, presetId: null, lut: { ...lut, strength: 100 } }, invertCube, 5).rgba;
  assert.notDeepEqual(zero, half);
  assert.notDeepEqual(half, full);
  assert.notDeepEqual(zero, full);
});

test("3D LUT upload clears video-only pixel state before replacing the texture", () => {
  const calls: Array<[string, number, number?]> = [];
  let flipY = 1;
  let error = 0;
  const texture = {} as WebGLTexture;
  const gl = {
    PIXEL_UNPACK_BUFFER: 1, UNPACK_FLIP_Y_WEBGL: 2, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 3,
    UNPACK_ROW_LENGTH: 4, UNPACK_IMAGE_HEIGHT: 5, UNPACK_SKIP_PIXELS: 6, UNPACK_SKIP_ROWS: 7, UNPACK_SKIP_IMAGES: 8,
    TEXTURE1: 9, TEXTURE_3D: 10, TEXTURE_MIN_FILTER: 11, TEXTURE_MAG_FILTER: 12, LINEAR: 13,
    TEXTURE_WRAP_S: 14, TEXTURE_WRAP_T: 15, TEXTURE_WRAP_R: 16, CLAMP_TO_EDGE: 17,
    RGBA8: 18, RGBA: 19, UNSIGNED_BYTE: 20, NO_ERROR: 0,
    createTexture: () => texture,
    bindBuffer: (target: number) => calls.push(["bindBuffer", target]),
    pixelStorei: (parameter: number, value: number) => { calls.push(["pixelStorei", parameter, value]); if (parameter === 2) flipY = value; },
    activeTexture: (unit: number) => calls.push(["activeTexture", unit]),
    bindTexture: (target: number) => calls.push(["bindTexture", target]),
    texParameteri: (target: number, parameter: number) => calls.push(["texParameteri", target, parameter]),
    texImage3D: () => { calls.push(["texImage3D", flipY]); if (flipY) error = 1282; },
    getError: () => { const current = error; error = 0; return current; },
    deleteTexture: () => calls.push(["deleteTexture", 0])
  } as unknown as WebGL2RenderingContext;

  assert.equal(createLutTexture(gl, new Uint8Array(32), 2), texture);
  const upload = calls.find((call) => call[0] === "texImage3D");
  assert.deepEqual(upload, ["texImage3D", 0]);
});

test("3D cube parser supports metadata and trilinear identity sampling", () => {
  const lut = parseCubeLut(validTwoCube);
  assert.equal(lut.title, "Test look");
  assert.equal(lut.size, 2);
  const sample = sampleCubeLut(lut, [0.25, 0.5, 0.75]);
  assert.ok(sample.every((value, index) => Math.abs(value - [0.25, 0.5, 0.75][index]) < 1e-6));
});

test("3D cube parser rejects 1D, malformed, incomplete, non-finite, and multiple tables", () => {
  assert.throws(() => parseCubeLut("LUT_1D_SIZE 2\n0 0 0\n1 1 1"), /1D LUTs/);
  assert.throws(() => parseCubeLut("LUT_3D_SIZE no\n"), /integer/);
  assert.throws(() => parseCubeLut("LUT_3D_SIZE 2\n0 0 0\n"), /Incomplete/);
  assert.throws(() => parseCubeLut(validTwoCube.replace("1 1 1", "NaN 1 1")), /non-finite/);
  assert.throws(() => parseCubeLut(`${validTwoCube}\nLUT_3D_SIZE 2\n`), /more than one/);
});

test("history coalesces only a continuous run with the same merge key", () => {
  assert.equal(shouldCoalesceHistory("grade:exposure", "grade:exposure"), true);
  assert.equal(shouldCoalesceHistory("grade:exposure", "grade:contrast"), false);
  assert.equal(shouldCoalesceHistory(undefined, "grade:exposure"), false);
});

test("contained sliders map pointer positions to exact stepped values", () => {
  const geometry = { left: 100, width: 252, inset: 9, min: -2, max: 2, step: 0.05 };
  assert.equal(rangeValueFromPointer({ ...geometry, clientX: 100 }), -2);
  assert.equal(rangeValueFromPointer({ ...geometry, clientX: 109 }), -2);
  assert.equal(rangeValueFromPointer({ ...geometry, clientX: 226 }), 0);
  assert.equal(rangeValueFromPointer({ ...geometry, clientX: 343 }), 2);
  assert.equal(rangeValueFromPointer({ ...geometry, clientX: 360 }), 2);
  assert.equal(clampRangeValue(0.126, -2, 2, 0.05), 0.15);
});

test("export idempotency canonicalization is property-order independent", () => {
  const first = canonicalExportSpec({ sourceId: "one", grade: { enabled: true, exposure: 0.1 }, keep: [{ start: 0, end: 2 }] });
  const second = canonicalExportSpec({ keep: [{ end: 2, start: 0 }], grade: { exposure: 0.1, enabled: true }, sourceId: "one" });
  assert.equal(first, second);
});

test("explicit rerenders create unique jobs without making an unchanged edit look stale", () => {
  const base = { sourceId: "one", format: "mp4-h264", keepRanges: [{ start: 0, end: 2 }] };
  const rerender = { ...base, renderRequestId: "23b7d1f2-bf0c-41de-8851-b4e3b80fcc83" };
  assert.equal(canonicalExportEditSpec(base), canonicalExportEditSpec(rerender));
  assert.notEqual(canonicalExportSpec(base), canonicalExportSpec(rerender));
});
