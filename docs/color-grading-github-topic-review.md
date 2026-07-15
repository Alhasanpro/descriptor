# GitHub Color-Grading Topic Review

## Review boundary

The `topics/color-grading` inventory contained 125 repositories when screened. It was reviewed for reusable architecture patterns across browser/WebGL preview, LUT parsing and application, FFmpeg/video export, image-only tools, research projects, proprietary products, and unsafe or unclear download paths. This implementation does not copy repository code, presets, or LUT assets.

## Patterns adopted

| Reference | Useful pattern | Descriptor adaptation |
|---|---|---|
| `UstymUkhman/color-grading` | GPU/WebGL interactive color processing | WebGL2 renders the current video with a deterministic 3D LUT while captions stay outside the graded layer |
| `dnav0/colorgrader` | Worker-owned color processing to protect UI responsiveness | A module Web Worker generates the combined 33-cube and returns a transferable texture payload |
| `Johnny-Kao/mp4-lut-processor` | FFmpeg `lut3d` baking for video output | The same combined cube is written for FFmpeg, with progress, cancellation, idempotency, and codec fallback added |
| FFmpeg documentation | `lut3d`, color filters, vignette, ASS composition, and `-progress` | Server-owned render graph with the grade before captions and machine-readable job progress |

## Exclusions and licensing posture

- Third-party LUT packs, preset files, sample media, and copyrighted UI are excluded.
- Image-only editors do not satisfy synchronized video preview or audio-preserving export.
- Research code without a clear production license or maintained browser/runtime path is architecture evidence only.
- Proprietary applications and binary-only downloads are excluded from implementation input.
- Repositories that require arbitrary shell commands, client filesystem paths, unsigned executables, or unclear assets are excluded.
- Built-in looks are original numeric settings stored in Descriptor source. User `.cube` files remain user-owned local data.

## Resulting implementation decision

Use an owned Rec.709 transform, a deterministic 33-cube shared by WebGL2 preview and FFmpeg, strict local LUT validation, and a background export job. This preserves the useful industry pattern—non-destructive settings, live GPU preview, LUT intensity, and baked export—without importing third-party implementation or creative assets.
