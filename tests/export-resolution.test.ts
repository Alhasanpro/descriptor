import assert from "node:assert/strict";
import test from "node:test";
import { build4KContainFilter, get4KOutputResolution } from "../src/lib/editor/export.ts";

test("vertical source exports to an exact 4K portrait canvas", () => {
  assert.deepEqual(get4KOutputResolution(720, 1280), {
    width: 2160,
    height: 3840,
    label: "4K portrait",
  });
});

test("landscape source exports to an exact 4K landscape canvas", () => {
  assert.deepEqual(get4KOutputResolution(1920, 1080), {
    width: 3840,
    height: 2160,
    label: "4K landscape",
  });
});

test("4K scale preserves aspect ratio and pads instead of cropping or stretching", () => {
  const filter = build4KContainFilter(get4KOutputResolution(720, 1280));
  assert.match(filter, /scale=w=2160:h=3840/);
  assert.match(filter, /force_original_aspect_ratio=decrease/);
  assert.match(filter, /flags=lanczos/);
  assert.match(filter, /pad=w=2160:h=3840/);
  assert.match(filter, /setsar=1/);
});
