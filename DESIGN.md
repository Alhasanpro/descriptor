---
version: "0.2.27"
name: "Descriptor"
description: "A calm, native-feeling desktop editor for transcript-led vertical video, captions, media, and timeline editing."
colors:
  canvas: "#F3F4F6"
  workspace: "#FFFFFF"
  surface-subtle: "#F3F4F5"
  surface-muted: "#E7E9EC"
  surface-selected: "#EBE7FB"
  surface-inverse: "#26282B"
  control-fill: "#F1F2F4"
  control-fill-hover: "#E9EBEE"
  text-primary: "#1F2124"
  text-secondary: "#60646A"
  text-tertiary: "#969BA2"
  border: "#E7E9EB"
  border-strong: "#D7DADE"
  primary: "#26282B"
  primary-hover: "#15171A"
  primary-active: "#0D0F11"
  accent: "#6F56D9"
  accent-soft: "#F0ECFC"
  success: "#27856C"
  success-soft: "#E9F6F1"
  warning: "#C68118"
  danger: "#C94C52"
  uncertain: "#E15C40"
  record: "#FF3B3B"
  timeline-waveform: "#998E93"
  timeline-playhead: "#6F56D9"
  focus-ring: "#6F56D9"
  ai-spinner-start: "#FF9966"
  ai-spinner-end: "#FF5E62"
typography:
  display:
    fontFamily: "Lato, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.25
  heading:
    fontFamily: "Lato, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Lato, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Lato, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Lato, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
  captionLibrary:
    fontFamily: "Lato, Inter, Noto Sans Arabic, Montserrat, Archivo Black, Barlow Condensed, Anton, Bebas Neue, Oswald, Playfair Display, Libre Baskerville, Caveat, Arial, Georgia, sans-serif, serif"
    fontSize: "72px"
    fontWeight: "400 900"
    lineHeight: "0.8 2"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  menu: "12px"
  lg: "14px"
  xl: "24px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    size: "34px"
  panel:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    rounded: "0px"
    padding: "14px"
  control:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "7px 9px"
    height: "34px"
  dropdown-trigger:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "7px 9px"
    height: "32px"
  dropdown-menu:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.menu}"
    padding: "5px"
  inspector-header:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    height: "60px"
    padding: "9px 14px"
  disclosure-header:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    height: "44px"
    padding: "0 14px"
  switch-off:
    backgroundColor: "#D0D3D6"
    rounded: "{rounded.pill}"
    width: "32px"
    height: "18px"
  switch-on:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    width: "32px"
    height: "18px"
  slider-track:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.pill}"
    height: "26px"
  slider-progress:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    height: "26px"
  slider-thumb:
    backgroundColor: "{colors.workspace}"
    rounded: "{rounded.pill}"
    size: "18px"
  slider-compact-track:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.pill}"
    height: "20px"
  slider-compact-thumb:
    backgroundColor: "{colors.workspace}"
    rounded: "{rounded.pill}"
    size: "14px"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "10px 8px"
  preset-card:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "4px"
    height: "74px"
  comparison-control:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "6px 11px"
    height: "28px"
  progress-track:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.pill}"
    height: "8px"
  progress-fill:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    height: "8px"
  toast-success:
    backgroundColor: "{colors.workspace}"
    textColor: "{colors.text-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  media-preview:
    backgroundColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
  ai-pixel-spinner:
    backgroundColor: "{colors.ai-spinner-start}"
    size: "24px"
---

# Overview

Descriptor is a desktop-first video editing workspace modeled from the supplied reference screenshots and adapted to the existing product theme. Its identity is quiet and workmanlike: true-white working surfaces, neutral gray application chrome, charcoal primary actions, hairline separators, compact typography, and one restrained purple interaction accent. The product should feel like a native professional editor rather than a browser dashboard or cinematic post-production suite.

The central principle is **edit in context**. The transcript, canvas, inspector, caption presets, transport controls, and timeline remain visible together so changes never detach users from time, media, or output. Dense controls are acceptable when grouped clearly and revealed progressively.

Mobbin grounding used: operational web app shell, persistent toolbars, context-preserving split views, right-side detail panels, grouped settings, explicit selection, compact controls, and visible success/error feedback. The supplied screenshots define inspector density, filled-control geometry, disclosure behavior, toggles, and surface hierarchy; Mobbin memory supplies the UX structure.

## Product Character

- Calm, precise, neutral, and creator-focused.
- Desktop-native density without cramped hit targets or browser-default controls.
- Content carries the color; application chrome stays subdued.
- The inspector feels like one continuous application surface, not a stack of web cards.
- Text labels accompany unfamiliar tools. Icons alone are reserved for common actions with tooltips.
- Selection and time are always visible through highlights, outlines, and the playhead.

# Colors

Use the front-matter colors as exact values. The neutral palette reduces glare during long editing sessions, matches the rest of the application, and keeps media visually dominant.

- `canvas` is the app background around the main workspace.
- `workspace` is the transcript, preview, inspector, card, and timeline surface.
- `surface-subtle` and `surface-muted` separate controls and tracks without heavy borders.
- `control-fill` is the default background for fields, switches, compact buttons, segmented controls, and inspector values; `control-fill-hover` is its hover state.
- `primary` is reserved for Export, review-first actions, dark preview tiles, and other high-confidence product actions.
- `accent` marks focus, the playhead, active caption words, selected handles, active inspector options, switches, and direct manipulation.
- `uncertain` red is reserved for transcript words whose recognition needs review, their wavy underline/edit states, and linked uncertainty ranges. Purple selection must never replace this semantic red.
- Other semantic colors communicate status only. Do not use danger or uncertainty red for ordinary emphasis.
- Media, waveform thumbnails, and caption previews may contain colors outside the UI palette.

Minimum text contrast is WCAG AA. On `surface-inverse`, use white or verified high-contrast caption colors. Never communicate timeline or upload state by color alone.

# Iconography

Descriptor's macOS application icon is a single rounded-square charcoal tile with a transcript-to-waveform-to-play mark. Three off-white transcript lines merge into the purple speech waveform, then resolve into the restrained warm AI gradient on the play shape. The symbol communicates the product's core promise—turn speech and transcript intent into edited video—without combining unrelated tool metaphors.

- Use `desktop/assets/descriptor-icon-1024.png` as the canonical 1024px transparent PNG source and `desktop/assets/Descriptor.icns` for the packaged Mac application.
- Preserve the `primary` charcoal tile, `accent` purple waveform, off-white transcript lines, and `ai-spinner-start` to `ai-spinner-end` warm play treatment.
- Keep transparent outer corners, one centered silhouette, generous padding, and enough weight to remain identifiable at 16px.
- Do not add product text, letters, microphones, clapperboards, scissors, robots, generic AI sparkles, excessive glow, or small decorative detail.
- The icon may use restrained inset depth inside its tile; it must not rely on an external cast shadow or a background scene.

# Typography

Lato is the preferred product typeface because it appears in the reference caption controls. Inter and the system sans-serif are approved fallbacks. Use tabular numerals for timecode, duration, zoom, dimensions, coordinates, and percentages.

Every font committed to `public/fonts` must permit source and binary redistribution. The default caption library uses SIL Open Font License families from the Google Fonts source repository: Lato, Inter, Noto Sans Arabic, Montserrat, Archivo Black, Barlow Condensed, Anton, Bebas Neue, Oswald, Playfair Display, Libre Baskerville, and Caveat. Keep each upstream `OFL.txt` in `public/fonts/licenses`; never commit a demo, personal-use-only, purchased-seat, or all-rights-reserved font without a project-owned redistribution grant.

Use Lato and Inter for compact product chrome. Use Noto Sans Arabic when an authored Arabic caption needs broader glyph coverage. Display faces are presentation-only choices and must not alter canonical caption wording, timing, pagination rules, accessibility labels, or source edit decisions.

| Role | Token | Use |
|---|---|---|
| Project title | `display` | Editable project name in the transcript pane |
| Panel heading | `heading` | Captions, Properties, section titles |
| Interface copy | `body` | Rows, controls, transcript, menus |
| Control label | `label` | Buttons, selected tools, inspector labels |
| Metadata | `caption` | Timestamps, preset names, secondary values |
| Timecode | `mono` | Current time, total duration, rulers, frame values |

Avoid oversized marketing typography inside the editor. Truncate long project and media names with an ellipsis and reveal the full value in a tooltip or inline rename state.

# Layout & Spacing

## Persistent Desktop Shell

1. **Global top bar — 48px:** undo/redo on the left; centered workspace/project context; privacy, help, and Export on the right.
2. **Primary workspace — flexible height:** transcript/source pane on the left, media canvas in the center, contextual inspector on the right, and a narrow vertical tool rail at the far edge.
3. **Timeline — 286px default:** scrub/zoom row, transport toolbar, time ruler, video track, audio waveform track, and add-track control.

Recommended desktop column behavior at a 1920px viewport:

- Transcript/source pane: `minmax(420px, 41%)`.
- Canvas stage: `minmax(540px, 1fr)`.
- Inspector: `320px` by default, `292px` in compact desktop layouts; long preset libraries scroll inside the same panel width.
- Tool rail: `64px`.
- Dividers: 1px `border`, draggable where resizing is supported.

The preview stage centers the output frame and preserves aspect ratio. Portrait video uses a 9:16 frame with a maximum height that leaves room for the floating caption toolbar and transport controls. Canvas zoom must never alter export dimensions. Keep preview transport controls on one 54px row in this order: play/pause, current and total time, seek, playback speed, then preview zoom. Preview zoom exposes a custom slider, an editable percentage, and a persistent Fit action together; the percentage and Fit action must never disappear. When the preview panel is too narrow, hide only the redundant zoom slider and retain percentage plus Fit. Toasts and background-operation notices sit above the transport and must never obscure playback, speed, zoom, or Fit controls.

## Spacing Rules

- Use the 4px-based spacing scale from the front matter.
- Panel section padding is 14px; compact toolbars may use 8px.
- Related controls sit 4–8px apart; separate groups by 12–16px.
- Inspector disclosure headers use a 44px row. Expanded content uses 14px side padding and 15px bottom padding.
- Reserve inset cards for review objects, previews, and summaries. Ordinary property groups stay flat with one bottom divider.
- Do not add decorative whitespace that reduces editing density or pushes the timeline below the fold.

# Elevation & Depth

The interface is mostly flat. Structure comes from surface shifts and hairline borders.

- Level 0: canvas and main pane backgrounds, no shadow.
- Level 1: review objects and selected controls, `0 1px 3px rgba(24, 28, 34, 0.08)` or a subtle inset hairline.
- Level 2: floating caption toolbar, menus, popovers, and toasts, `0 14px 34px rgba(24, 28, 34, 0.13), 0 2px 8px rgba(24, 28, 34, 0.06)`.
- Level 3: modal dialogs only, `0 24px 56px rgba(24, 28, 34, 0.18)` plus a `rgba(24, 28, 34, 0.28)` scrim.

Do not use glassmorphism, colored glow, or deep stacked shadows. Floating UI must remain visually attached to the object or action it controls.

# Shapes

- Default controls use 9–10px radii.
- The main workspace container uses 16px top corners; substantial overlays use 14px.
- The media preview frame uses a 24px radius and clips the video, captions, processing state, and safe-area overlays as one canvas.
- Switches use a full pill. Color swatches are circular; small icon tiles use 9px radii.
- Pills are limited to usage indicators, statuses, and compact segmented controls.
- Selection handles are 8px circles or squares with a white fill, purple border, and minimum 16px invisible hit area.
- Use 1px strokes. A 2px purple ring indicates keyboard focus or direct canvas selection.

# Components

Speech-cleanup suggestion cards are compact review objects, not alert banners. Never render raw model or backend identifiers such as snake_case labels. Map every issue type to a short creator-facing title, place timing in quiet monospaced metadata, and contain confidence in a fixed, non-wrapping status pill. Keep the title neutral; semantic red belongs to the removal action only. `Preview cut` is the primary action because review precedes deletion, while the type-specific remove action remains visibly destructive but secondary. Removed ranges replace confidence with a calm `Removed` status and expose `Restore range` without changing the card geometry.

## Global Top Bar

Keep the bar single-line and visually quiet. The left group contains only Undo and Redo; do not show Home, Menu, View, or passive save/sync status in the editor top bar. The project context is centered; Export remains the strongest action. Undo and redo disable when unavailable.

Undo and redo use a bounded, multi-level LIFO history shared by transcript, cleanup, timeline, and subtitle presentation edits. Timeline history includes creating a split, removing a split marker, and deleting a selected segment. Each entry has a creator-facing action name so the top-bar controls expose specific accessible labels such as `Undo Delete transcript word` and `Redo Apply caption template`. A new edit after Undo clears the redo branch. Continuous caption controls coalesce one drag or run of changes into one meaningful step; selection, seeking, playback, panel navigation, and other non-editing context never enter history.

Support `Command/Ctrl + Z` for Undo, `Command/Ctrl + Shift + Z` for Redo, and `Ctrl + Y` as a Redo alternative. Never intercept these shortcuts inside an input, textarea, dropdown, or contenteditable field, where native text-entry history must remain available. Undoing a transcript deletion restores both the word and its matching source interval in the same step. Translation refreshes caused by transcript edits are folded into the originating edit and never create a separate user-visible history entry.

## Transcript and Source Pane

The pane has a Write mode and supports transcript-led editing. Media rows show thumbnail, file icon, filename, current time, and total duration. The active insertion point or selected segment uses the purple accent. Preserve scroll and selection when users manipulate the canvas or timeline. Uncertain transcript words remain red during hover, editing, selection, and playhead activity.

Transcript word feedback uses compact soft rectangles with an 8px corner radius and 5px horizontal padding for playback-active, selected, and cleanup-issue states. Preserve the transcript's line height and the cleanup state's wavy underline; do not turn word feedback into full pills or let it shift surrounding Arabic text.

Saving a transcript word correction replaces every matching word across the project in one undoable edit. Match conservatively by normalized token identity: ignore surrounding punctuation, Latin case, Arabic diacritics, tatweel, and Arabic alef variants, but never use fuzzy spelling distance that could change a different word. Preserve each occurrence's leading and trailing punctuation, stable word ID, source timing, issue linkage, and language classification. The inline editor must state the project-wide scope and matching count before Save. Refresh only the affected paragraph translations, run those refreshes through one bounded sequential queue, preserve the previous subtitle until each validated result arrives, and do not show a separate success toast for every refreshed paragraph.

Required states: importing, transcribing, ready, selected, rename, no transcript, transcription failed, media offline, and read-only.

Speech transcription and language review are local-only. The packaged app accepts no cloud credential and Settings contains no model-key field. When a local runtime or model is unavailable, keep the selected source visible, name the missing local component in creator language, and offer `Retry local analysis` without requiring another import. Never show fixture transcript or caption content while the local pipeline is stopped.

When a new video enters processing, stale fixture or prior-project content must disappear immediately. Keep the newly selected video visible in the canvas, but clear or suppress transcript paragraphs, caption overlays, detected issues, issue ranges, and English timeline clips until the validated result for that exact video is ready. Never display sample wording beneath a real imported source.

Use one persistent stage tracker inside the transcript pane for long media analysis. It reports the actual pipeline boundaries in order: load video, extract or prepare audio, transcribe speech, review Arabic wording and prepare English subtitles, align word timing, and validate captions. Every row has a visible `waiting`, `in progress`, `done`, or `stopped` state plus short factual detail supplied by the processing pipeline. Use a quiet conventional circular loader only inside the currently running tracker row; reserve the branded AI pixel spinner for the processing state outside the card and for canvas-level processing. Do not invent percentages or advance steps on timers. The final transcript, preview caption, issue list, and timeline caption clips appear together only after response validation succeeds. On failure, preserve the selected media, identify the stopped stage, explain what was preserved, and offer a clear choose-again or retry action.

Local analysis is single-flight and keyed by the immutable source hash. A duplicate request for the same video joins the active work or reuses its recent validated result. When a different video already occupies the local engine, keep the new request in the processing tracker with `Waiting for the local speech engine…` and retry automatically; never replace the transcript pane with a competing-job error. A newer import supersedes older waiting UI so stale results cannot overwrite the current project.

## Canvas Stage

Center the media frame on a neutral workspace. The complete preview frame uses the `rounded.xl` 24px radius; all video content and overlays clip to that boundary at every zoom level. Overlays use bounding boxes, selection handles, and a nearby floating toolbar. The toolbar may contain AI-assisted action, typeface, style, size, alignment, color, effects, and animation, but controls must be grouped and tooltips must explain icon-only actions.

The frame supports fit, 100%, and custom zoom; pan when zoomed; snap guides; safe-area overlays; and keyboard nudging. Do not crop or stretch media silently.

## Contextual Inspector

The inspector changes with selection and remembers the open section per object type. It is a continuous white application surface with a sticky 60px header, compact icon tile, contextual title, and overflow action. Property groups use disclosure rows separated by one hairline; expanded content stays visually attached to its header. Do not wrap every group in a bordered card.

Use flat disclosure groups for:

- Source and speaker mapping.
- Opacity with numeric input, slider, and visibility toggle.
- Size, position, rotation, and aspect lock.
- Text family, weight, size, alignment, and color.
- Style, color adjustments, visual effects, and animation.

The Mac app Settings inspector contains local editor preferences only. Privacy copy states that source media, speech timing, transcripts, translations, and edits remain on this Mac. Do not add credential fields, cloud-provider status, or restart-for-key flows.

Collapsed sections keep their label, short status summary, and chevron visible. Expanded sections rotate the chevron downward and reveal content without shifting the canvas. The full summary row is keyboard-operable and has a visible purple focus ring. Numeric controls support typing, arrow-key stepping, reset, and validation. Changes update the canvas immediately; invalid values revert with an inline explanation.

Filled controls use `control-fill` with no visible default border, a 9–10px radius, and compact 32–34px height. Hover moves to `control-fill-hover`; keyboard focus moves to white with an inset purple edge and soft 2px purple halo. Selected segmented choices may use a solid `accent` fill with white text when the selection is a direct property value. Menus, summary metrics, review suggestions, and media previews may use inset surfaces where containment adds meaning.

Boolean settings use a native-style 32×18px switch: neutral gray off, `accent` on, and a white circular thumb. The switch sits on the row's trailing edge. Never expose a browser checkbox for a settings toggle. Color properties use a named row plus a compact swatch control; preset swatches are circular and retain visible focus.

Typography range controls—letter spacing, word spacing, line height, caption width, and background opacity—use a borderless 26px muted capsule with an 18px white circular thumb contained inside the rail. Do not wrap sliders in bordered input boxes. Keep the label and live value above the rail, place the value in a quiet filled capsule, preserve keyboard operation, and show the 2px `focus-ring` around the thumb on keyboard focus.

All range controls use the shared custom progress component; never expose the browser's native range appearance. Render the 26px muted capsule, purple filled progress, and 18px white thumb with a neutral edge and shallow shadow. The rail extends behind the thumb at both endpoints so the handle remains contained at minimum and maximum values. Dense playback and preview-zoom contexts use the same anatomy at a compact 20px rail and 14px thumb. Hover scales the thumb to 105% without changing layout; keyboard focus adds the purple ring. Retain an invisible semantic range input over the custom visual so pointer dragging, arrow keys, screen readers, minimum, maximum, step, and current value remain native and reliable. Use this same component for typography, opacity, playback seeking, preview zoom, and every future continuous-value control.

## Color Grading

Color is a persistent tool-rail destination after Animation and Vocabulary and immediately before Export. Its inspector remains one continuous application surface and uses the same disclosure rhythm, native switches, filled numeric fields, shared contained-handle sliders, focus system, and purple selection language as the rest of Descriptor.

- The top row contains the immediate Enable grade switch, current source color status, and `Reset all`. Reset is undoable and never removes or changes source media.
- Looks use compact two-column current-frame thumbnails. Built-in looks are immutable numeric settings: Neutral, Clean, Warm Film, Cool Modern, Rich, and Mono. Applying one preset is one history step; changing a control moves the status to Custom.
- Basic contains Exposure, Contrast, Highlights, and Shadows. Color contains Temperature, Tint, Saturation, and Fade. Finish contains Vignette. Every row keeps a label and editable value above the 26px shared rail, plus an individually named reset action.
- Exposure is `-2...+2 EV` at `0.05`. Contrast, Highlights, Shadows, Temperature, Tint, and Saturation are `-100...100`. Fade, Vignette, and LUT strength are `0...100`.
- `Before` is a 28px filled comparison control above the preview. It reveals the ungraded picture only while pointer or keyboard activation is held. Pointer release, pointer cancellation, leaving the control, blur, and Escape always restore the graded preview.
- Captions, safe-area guides, selection handles, processing UI, and external editor overlays remain outside the graded video layer. The grade affects only source picture pixels.

The LUT disclosure accepts one locally copied 3D `.cube` file up to 5 MB with a grid size from 2 to 65. Show LUT name, grid, strength, Replace, and Remove. A malformed, incomplete, non-finite, 1D, or multi-table LUT reports a concise error without replacing the current look. Never display or persist a client filesystem path.

Required grading states are: disabled, enabled-neutral, preset-selected, custom-adjusted, LUT-importing, LUT-ready, LUT-invalid, WebGL-preview-unavailable, source-inspection-pending, Rec.709, Rec.709-assumed, and HDR/BT.2020-blocked. Disabled controls remain legible. WebGL failure preserves original playback and explains that local server export can still bake the grade. HDR, HLG, PQ, and BT.2020 block grading and export while preserving transcript editing.

## Video Export Jobs

Export is a persistent background operation, not a modal spinner or synchronous request. The inspector first summarizes resolution, edited duration, color classification, format, caption choice, and whether a grade is included. Export stays disabled until immutable source storage and FFprobe inspection succeed. External timeline video, image, or audio clips block this milestone with a direct removal message; never silently omit them.

Source storage has explicit `saving`, `ready`, and `failed` states. Show `Saving source video locally…` only while the upload request is active. If storage or inspection fails, preserve the open preview and edit, replace the pending notice with a concise semantic error, and expose `Retry source storage` in place. Never leave Export in an indefinite pending state after a rejected request, and never surface raw HTML, JSON parsing text, module names, or stack traces.

The Output summary is the factual render target, never the imported source size. Vertical and square projects display and render an exact `2160×3840` 4K portrait canvas; landscape projects use `3840×2160`. Scale source picture into that canvas with high-quality aspect-preserving resampling, never stretch or crop it, and center-pad only footage whose aspect ratio does not match the oriented UHD canvas. Apply captions after the 4K scale so the subtitle renderer preserves source-coordinate layout while rasterizing text sharply at final resolution and outside the color grade. Preserve source orientation and frame rate. A 4K render-recipe version participates in export idempotency so successful files created under an older resolution contract are never reused.

After submission, retain the progress surface while users change tools. Required states are queued, processing with factual stage and percentage, cancelling, cancelled, retrying with the software encoder, failed, succeeded, changed-since-render, and expired output. Use the 8px purple progress fill on a muted track and never invent a time estimate. Queued and processing states expose Cancel; failure exposes the preserved-edit explanation and Retry. A successful unchanged render keeps `Save video` strongest and adds `Export again`; the explicit repeat action creates a fresh job while accidental double clicks remain idempotent. If the source, edit map, grade, captions, format, or caption inclusion changes after success, keep the prior file available as `Save previous video`, label it as older than the live edit, and make `Render updated video` the strongest action.

Completed export state belongs to the persistent editor session rather than the Export panel lifecycle. Switching to another tool and returning must reveal the same active or completed job, including its save action and any changed-since-render status. A successful output never disables future rendering.

Use red only for a real export error or destructive/cancellation meaning. Ordinary progress, selection, grade intensity, LUT readiness, and successful output stay purple, neutral, or success green. Errors state what happened, confirm that source and edit decisions were preserved, and name the recovery action.

## Custom Dropdown

All selection controls use the shared custom dropdown; native browser `<select>` menus are not part of the Descriptor interface. The trigger is a 32px `control-fill` surface with no visible default border, a 9px radius, current value, and right-aligned chevron. The floating menu is white with Level 2 elevation, 5px internal padding, a 12px radius, and a maximum height with internal scrolling for long lists such as typefaces.

Dropdown menus must remain inside their containing editor canvas or inspector at every viewport size and browser zoom level. Constrain menu width to the available panel width, shift it horizontally when it would cross either edge, open upward when there is more usable space above the trigger, and reduce its maximum height with internal scrolling when neither direction can show the full list. Recalculate placement while the panel or page scrolls and when the viewport resizes; never allow a dropdown to cover UI outside its owning canvas.

Options use a compact 38px minimum row with visible hover, keyboard-active, and selected states. The selected option uses `accent-soft`, includes a checkmark, and may preview its actual typeface. Menus dismiss on outside press, focus leaving the component, selection, `Escape`, or `Tab`. Keyboard behavior includes `Enter`/`Space` to open or select, arrow keys to move, and `Home`/`End` to jump. Disabled dropdowns remain legible but cannot open. Dropdowns expose button, listbox, and option semantics with the current selection announced to assistive technology.

## Scroll Areas

All editor scroll areas use a transient overlay-style thumb. The scrollbar track, corner, and reserved gutter remain invisible so panels never show a persistent base rail or lose usable width. Show the compact neutral thumb only while that specific area is actively scrolling, then hide it 650ms after scrolling stops. Apply this globally to panes, inspectors, template libraries, dropdown menus, and future overflow containers. The precision timeline is the deliberate exception: while it is horizontally zoomed, keep a quiet thin horizontal rail visible so overflow and location remain discoverable. Preserve wheel, trackpad, touch, drag, and keyboard scrolling, and never remove scroll affordance while movement is in progress.

## Tool Rail

The editor rail contains stable destinations in this order: Project, Transcript, Speech cleanup, Translation, Subtitles, Animation, Vocabulary, Color, Export, and Settings. Animation and Vocabulary stay directly above Color so caption motion and language preparation precede picture grading in the vertical workflow. Each item uses icon plus label. Active state uses `accent-soft` with dark purple icon/text; hover uses `control-fill`. Rail navigation changes the adjacent inspector without losing canvas or timeline context.

Subtitles is the single destination for caption templates, typography, text and highlight colors, and caption backgrounds. Do not expose separate Styles or Typography rail items, and do not duplicate font, size, or background controls across multiple subtitle panels.

Caption text shadow is a presentation-only property contained in its own Subtitles disclosure. Expose one immediate on/off switch plus custom controls for color, opacity, blur, horizontal offset, and vertical offset. Turning the shadow off preserves its values, disabled controls remain visible, and `Reset shadow` restores `#000000` at 45% opacity, 4px blur, 0px horizontal offset, and 2px vertical offset. Shadow changes participate in global Undo/Redo and must affect every runtime caption template without changing wording, paging, alignment, or speech timing.

Animation is the single destination for caption motion and spatial placement. Its inspector groups speech-synced animation controls first and the 3×3 position anchor plus safe-area visibility second. Do not expose a separate Position rail item or duplicate position controls elsewhere. Switching to or away from Animation preserves the selected animation, anchor, playhead, and preview state.

## Caption Preset Browser

All caption templates are presentation-only views over one canonical, paragraph-scoped caption track. Template selection may change grouping, typography, color, background, animation, or placement, but it must never change, reorder, omit, invent, or replace the underlying caption wording. Every rendered template retains the same full canonical caption as its accessible label and identifies the same transcript paragraph and timing source.

The canonical track is visible only while its transcript paragraph is active; never hold the previous caption through silence or into the next paragraph. Speech progress comes from the transcript's ordered word timestamps. One-word, two-word, karaoke, pop, typewriter, and paged templates derive their active content from that same progress value. Typewriter reveals the currently timed word rather than estimating progress from the raw caption character count.

Source-language captions use the exact start and end window of each transcript word. Translated captions use one monotonic alignment over cumulative source speech because the translated word count may differ; natural pauses hold the current translated word and never advance the caption early. Fixed per-word timers are forbidden. In the editor preview, long-form and sentence-style templates apply 40ms of display-only render compensation before choosing the highlighted word and visible page so browser paint does not make them feel late. One-word and two-word templates remain uncompensated because their direct group replacement is already snappy. Paragraph activation and clearing remain tied to exact media time, and compensation never changes transcript, edit-map, source, or export timestamps. Any decorative highlight duration is clamped to 50–85ms, while the actual word and page handoff remains controlled only by media time.

Caption overlays begin at the paragraph's first timed word and clear at its final timed word. Paragraph metadata may extend beyond those boundaries, but it must never hold a visible caption through leading or trailing silence.

When source wording is edited, stale translated wording must not remain on the canvas. While the refreshed translation is pending or unavailable, render the exact source transcript as the temporary caption track; switch back to the validated translation only after the response still matches the latest source text. Template changes during either state remain presentation-only.

Every sentence-style caption renders at most two visible lines at a time. Measure the grouping from the selected caption width and type size, keep words intact, and replace the current pair with the next two-line group as transcript speech progress advances. Playback, scrubbing, and animation previews must select the same group from the same word timestamps. Preserve the complete subtitle as the accessible label. Single-word and explicit two-word templates retain their specialized grouping behavior.

Line grouping is always dynamic. Recalculate it from the rendered frame width, caption width, actual loaded typeface, font size and weight, italic/uppercase state, letter spacing, word spacing, and per-word styling whenever any of those values change. Never preserve an over-wide line and hide its tail with overflow. Formatting may create more two-line pages, but it must not invent an independent animation duration: each page appears when the transcript-timed active word enters that page and hands off when the active word enters the next page.

Line height is one shared multi-line presentation value from `0.8...2`. Apply it to the actual line boxes used by sentence pages, two-word stacks, creator-build captions, creator-outline captions, and typewriter line breaks. Template classes may supply a preset value, but they must never override a later Line height adjustment. A single-line or one-word caption naturally has no visible inter-line distance until it contains a second line.

Word spacing applies to the real separator between adjacent rendered word elements, not trailing whitespace inside an individual word span. Keep that separator outside animated/highlighted spans so the browser, line measurement, scrubbing preview, and every multi-word template react immediately and consistently to the shared Word spacing value. Burned ASS captions apply the same extra spacing only to their hard-space separators and then restore the configured letter spacing before the next word. One-word and vertically stacked two-word templates retain their intentional layouts because they have no same-line word pair to separate.

`Karaoke · One word` is a speech-synced display mode, not a color-only preset. It must render exactly one translated word at a time, map transcript speech progress proportionally across the translated words, and update identically during playback and timeline scrubbing. When animation preview is disabled, keep the layout readable by holding on the first word. The full subtitle remains available as the accessible label.

`Bold · Two words` is also a speech-synced display mode. Render the translated subtitle in consecutive two-word groups, with one word per line, and advance to the next group from transcript timing during playback or scrubbing. An odd final word may appear alone. When animation preview is disabled, hold the first two-word group. Preserve the full subtitle as the accessible label.

`Karaoke · Word preview` keeps the active two-line page readable while presenting exactly one current word with a solid highlight chip and contrast-safe text. Past and upcoming words remain visible as context. It uses the same speech alignment, pause holding, page boundaries, and accessible full wording as every other caption preset; it must never inherit a previously selected preset's animation.

`Creator build · Amber` is the reference-matched progressive caption preset from the supplied screen recording. It uses a 900-weight geometric sans in sentence case, centered white revealed words, one `#FFB000` current word, no caption box, and a restrained dark text shadow. Only words up to the speech-timed active word are visible; future words remain absent. The newly active word uses a fast 60–90ms opacity-and-color highlight handoff while the preceding amber word becomes white immediately. Glyph size and position stay fixed: no word-scale pulse, bounce, or vertical settling is permitted. Page handoff, phrase wording, and word visibility come only from the canonical transcript or validated translation timing, never an independent animation timer. Keep the dynamic page to at most two visible lines. When animation preview or reduced motion is disabled, preserve a readable built state and the amber current-word treatment without motion. The recording is a presentation reference only and never supplies or changes caption wording or timing.

`Creator outline · Yellow` matches the supplied July 14 creator-caption recording. It uses the redistributable Archivo Black face, uppercase white glyphs, a solid black outline plus restrained black shadow, no caption box, and a `#F2ED00` current word. Each page contains exactly three consecutive words, except the final shorter page. Keep all words on the active page visible and split an over-wide three-word page into the most balanced maximum of two lines; do not reveal words progressively. Speech timing changes only the yellow current word. During a source-speech gap, hold the current three-word page but clear yellow emphasis until speech resumes. Page and highlight changes are immediate with no scale, bounce, fade, or independent timer. The preview and burned export must share the three-word grouping, active-word timing, black outline, loaded bundled font, and gap behavior.

The caption library begins with an `Apply to` segmented control for all scenes versus the current scene, followed by a scrollable list of realistic style previews. Each preset card contains a dark preview area and a short descriptive name. Inset the preview 6px from the card's top, left, and right edges so its outer whitespace is balanced; both the card and dark preview use a 10px radius. Hover reveals preview/application affordances; selection uses a purple outline and checkmark.

Required caption variants include typewriter, karaoke highlight, bold/italic emphasis, all-caps impact, waveform/animated, clean paragraph, two-word grouping, highlighted key word, progressive creator word build, and fixed three-word creator outline. Preset names describe behavior, not vague moods.

Template thumbnails communicate their defining layout at a glance. The Karaoke highlight thumbnail always uses exactly two balanced, non-wrapping preview lines—`Today, I want to` followed by highlighted `show you.` The Modern yellow waveform thumbnail follows the same two-line rule with `Captions move` followed by `with the rhythm.` and highlights the rhythm word in yellow. Bold · Yellow highlight also uses exactly two non-wrapping rows—`THIS IS A LARGE,` followed by `BOLD CAPTION`—with `LARGE` highlighted. Karaoke · Word preview uses a compact two-row composition with a `1` line height and no extra row gap, keeping the highlighted current word visually attached to its context line. Thumbnail line composition is a catalog preview rule only and never changes the canonical caption wording or runtime line paging.

Preset selection is atomic: selecting a card applies that preset's complete presentation bundle rather than changing only its selected identifier. `Clean paragraph` uses Lato Semibold in sentence case, centered two-line paging, no caption background, and no per-word highlight or scale treatment. Its visible two-line page still advances from the canonical transcript word timestamps, so the wording and timing remain identical to every other template.

Every required card has a complete bundle for typeface, size, weight, alignment, case, spacing, line height, width, text color, highlight color, background, text shadow, animation, and preview state. Position and horizontal anchor remain project placement choices and are not reset by style selection. Changing among any of the 16 presets must immediately update both the rendered appearance and its documented grouping behavior without carrying stale values from the prior card.

Applying a preset is reversible and must expose scope. If captions are missing, replace the library with a focused empty state and a primary `Generate captions` action. Loading uses stable card skeletons; errors preserve scroll and offer retry.

## Timeline

The timeline is a precision surface, not a decorative filmstrip.

- The ruler shows time at a density appropriate to zoom.
- The purple playhead crosses all tracks and aligns with the canvas and transcript.
- Resolve the playhead against exact transcript word start/end timestamps. During playback, transport seeking, timeline clicking, and playhead dragging, highlight the one word currently under the playhead in the transcript-led editor; clear the highlight during silence instead of guessing. This current-time highlight is independent from editable word selection and must not open the word editor or change transcript content. Keep it visible without layout shift, scroll the transcript only when the active word leaves the visible pane, and temporarily pause automatic following after the user manually scrolls the transcript.
- The HTML media element is the single live-preview clock. Use `requestVideoFrameCallback` and its presented `mediaTime` when available, with `requestAnimationFrame` plus `video.currentTime` only as the fallback. `timeupdate` is fallback/reconciliation, never a second competing playback loop. Exact seeks—including sub-200ms scrubs—must update the video, playhead, transcript word, caption page, and caption highlight from the same time value.
- Video clips include thumbnails; audio clips include waveforms.
- With no primary source video, the timeline uses one neutral source-import empty state. Do not show source segments, cleanup ranges, transcript-derived subtitle clips, edit seams, split markers, the playhead, source duration, or enabled source playback and split controls until real source media exists. Red uncertainty ranges appear only after validated analysis is attached to that source. Keep the independent Media lane available for supported operating-system drops and picker imports.
- Imported video filmstrips always use frames sampled from the real source media. Never substitute decorative gradients, repeated mock artwork, the preview poster, or another dummy thumbnail.
- Selected clips use a modern clip-contained state: a strong 3px accent frame, white inner separation, subtle elevation, visible full-height trim grips, and an optional compact duration badge. Do not wash the same time range across unrelated tracks; selection belongs to the clip being edited and must never move it.
- Clicking source footage selects the footage even when cleanup suggestions overlap it. Cleanup suggestions occupy a compact marker strip rather than intercepting the clip body. The selected source clip exposes real left and right trim grips; dragging either grip inward commits one non-destructive ripple deletion against immutable source time on pointer release, keeps transcript/audio/captions on the shared edit map, and remains fully undoable. Source-footage body dragging must not silently reorder transcript-led speech; reordering requires a future explicit sequence model.
- The dedicated Media lane accepts operating-system drops and its `Add media` picker accepts supported video, audio, PNG, JPEG, WebP, and GIF files. Validate type, metadata, and non-zero duration before insertion, position the clip at the visible drop time, show a time-labeled drop target, select the completed import, and surface actionable failure text. Multiple supported files insert sequentially from the drop point; do not replace the immutable primary source.
- Imported media clips are independent edit objects with stable IDs, source in/out points, timeline start, type, real file metadata, and local object URLs. Their bodies drag horizontally with boundary/playhead/neighbor-edge snapping; their handles trim both inward and back out to available source; `Split` and the custom context menu split at the playhead; `Backspace`, `Delete`, and right-click Delete remove the selected clip. Arrow keys move a focused clip by 100ms, or 1s with Shift. Every move, trim, split, import, and delete is one global Undo/Redo step; passive selection and direct manipulation never show a success toast.
- Active imported image/video clips render above the primary picture in the preview; imported videos are muted visual overlays and imported audio remains audible and speech-clock synchronized. Imported-video clip surfaces use a frame sampled from that actual file. Never fabricate media thumbnails or waveform content.
- Transport controls include record, play/pause, speed, and split.
- Timeline zoom is real horizontal magnification from 100% to 400%, never a tick-density-only change. At 100%, the complete edit fits exactly with no phantom horizontal overflow; `Fit` returns to 100% and the start. Ruler, playhead, source footage, imported media, waveform, captions, cut seams, and split markers occupy one shared zoomed canvas and use the same time-to-pixel geometry.
- Minus and plus zoom around the current playhead while retaining its screen position when visible. `Control/Command + wheel` zooms around the time beneath the pointer. Native horizontal trackpad gestures scroll the canvas, `Shift + wheel` converts a vertical wheel gesture into horizontal movement, and `Shift + Left/Right Arrow` scrolls a focused timeline without invoking the editor seek shortcut.
- The time ruler and every lane scroll together. The ruler corner and lane labels remain fixed at the left edge with a restrained separation shadow once content passes beneath them; ticks, clip bounds, captions, waveform, and playhead must never drift into independent scroll planes.
- The timeline viewport scrolls vertically whenever the full lane stack exceeds its visible height. A normal vertical wheel or trackpad gesture moves between lanes, while horizontal trackpad gestures and `Shift + wheel` continue to move through time. Keep the ruler pinned to the top, lane labels pinned to the left, and the playhead badge pinned to the ruler during vertical movement. Canvas height must include lane padding and gaps so the final subtitle lane is fully reachable and never clipped.
- Media-time changes keep the playhead visible by scrolling only when it exits the usable viewport. Manual horizontal exploration remains undisturbed while current time is stationary. Dragging the playhead, trimming source or imported media, moving imported clips, and positioning an operating-system file drop auto-scroll near either visible edge and continuously recalculate the pointer time from the newly exposed canvas.
- Zooming out, fitting, changing cleaned duration, deleting ranges, and undoing edits clamp horizontal scroll to the remaining content. The playhead badge and clip shadows must not create scrollable overflow beyond the real timeline duration.

Support hover scrub, click-to-seek, drag, trim, split, snapping, multi-select, keyboard navigation, undo, locked/muted tracks, and clear drop targets. During drag, show the target time and prevent impossible overlaps. Keep the time ruler and track labels visible while the timeline scrolls.

Split markers create selectable video segments and keep a 10px invisible horizontal hit target so they remain removable when the playhead occupies the same timestamp. Timeline tracks use separated rounded lanes: subtitle clips are compact labeled cards, video clips preserve full-fidelity source thumbnails, and waveform clips sit in their own calm surface. Selecting a video segment keeps those thumbnails unchanged, adds a 3px purple outer frame with a white inner separator, compact white-and-purple trim grips, restrained elevation, and a small duration badge when space allows. Do not add a full-height selected-time wash across the audio or subtitle lanes. Neighboring material remains legible, and selection introduces no scale, position, or layout shift. `Backspace` and `Delete` remove the selected segment, while right-click opens a compact custom menu with `Delete segment`. Never intercept these keys while the user is typing in a transcript, input, textarea, dropdown, or editable field. Segment deletion is a non-destructive edit decision against the immutable source and must be available through the global Undo action.

The playhead uses the purple timing token, a high-contrast ruler tip, a 2px line spanning every lane, and a compact live time badge attached to the ruler. It updates directly from media time without easing. Ruler ticks remain visible behind the label and tracks use 6px vertical separation so clip boundaries are scannable without heavy table borders.

Video, audio, transcript timing, and every subtitle presentation share one source-time edit map. Deleting a segment compresses all timeline tracks by the same removed duration: the filmstrip closes the gap, the waveform uses the matching kept source ranges, subtitle clips move with their video ranges, playback skips the deleted source interval, and caption word/page timing continues from the next kept source frame. Never leave a red placeholder, silent hole, stale caption clip, or independently positioned subtitle after deletion. Split markers inside a deleted interval disappear; the resulting edit boundary remains visible as a compact seam.

Deleting a transcript word is a media edit, not text-only cleanup. Remove the word and add its exact source `[start, end)` range to the shared deletion map in one undo snapshot. If the playhead is inside that word, stop playback and move directly to the retained frame at the word's end. Cleaned duration, video playback, waveform, filmstrip, subtitle clips, caption timing, edit boundaries, and export decisions must all update from that same range immediately. Undo restores both the word and its matching media interval together.

The preview transport presents edited time and cleaned duration. Its seek control maps edited positions back to immutable source time through the shared edit map, so a deleted transcript interval is not exposed as a scrub destination and the preview clock agrees with the timeline clock after every cut.

Filmstrip samples are distributed across edited time and then mapped back to immutable source time through that same edit map, so every visible frame stays aligned after splits and deletions. Keep real thumbnails visible while transcript or AI analysis is running. Generation uses one hidden decoder and one small canvas, emits progressive loading slots, caps the visible sample set at 48 frames, and cancels stale work when the source or edit map changes. Loading and decoding failures use explicit stable states; they must never fall back to fake imagery.

## Toasts and Status

Use compact bottom-right toasts only for meaningful outcomes: asynchronous completion, durable save/copy/import/export, errors, and destructive or reversible operations that are not already obvious in context. A toast contains status icon, short message, optional action, progress/disclosure, and dismiss. Long operations move to a persistent progress surface; they must survive panel navigation.

Media transcription progress belongs in the transcript pane rather than a toast. Start and intermediate stage changes update the persistent tracker silently; reserve a toast for the final completion or actionable failure only.

Do not show a toast for passive selection or immediate direct manipulation. Template, color, typography, animation, position, format, timeline selection, and settings-toggle changes confirm themselves through persistent selected state and live preview. Redundant selection toasts add noise and can cover precision controls.

# Motion

- Hover and selection transitions: 100–140ms, ease-out.
- Inspector expand/collapse and panel swap: 160–200ms, ease-out.
- Toast entrance/exit: 180ms with opacity plus 8px translation.
- AI processing uses the reusable `dual-ring-5 copy 2` pixel spinner: a 3×3 grid of 6px sharp cells with 3px gaps, a `#FF9966` to `#FF5E62` diagonal fill, a four-step opacity trail, and a 16-frame discrete loop at 150ms per frame. Use the full 24px mark outside the stage card for persistent transcript and preview processing. Inside the stage card, the current row uses the standard circular loading indicator so the branded pixel mark is not nested or repeated. Inline translation may use the compact proportional pixel variant. Keep the accompanying factual status text visible; motion is never the only state signal.
- The pixel spinner is CSS-only and exposes cell, gap, duration, speed, color, and glow custom properties. Peak cells use the specified 280ms pop, while opacity changes use discrete frame stepping. Under reduced motion, freeze on the legible first frame with cells 0 and 4 lit instead of substituting a different indicator.
- Timeline scrubbing, canvas transforms, and playhead movement update directly without decorative easing.
- Playback clocks use the media frame callback or `requestAnimationFrame`, never a fixed interval. The playhead moves with a compositor transform, has no CSS transition, and cancels its frame loop immediately on pause or unmount.
- Clamp unusually large frame deltas after a background-tab stall so the playhead never jumps unexpectedly when the editor returns to the foreground.
- Speech-synced caption emphasis uses color, background, and opacity only. The active-word handoff is immediate at the exact `[start, end)` timestamp—matching Twick's zero-duration karaoke state change—and never scales, bounces, or repositions glyphs. During a source-speech gap, keep the current caption page stable but clear the active-word treatment instead of carrying the previous highlight forward.
- Caption animation previews may loop only while visible and must stop under reduced-motion preferences.
- Never animate layout in a way that shifts the canvas, playhead, or selected clip unexpectedly.

# Accessibility

- All functionality must be keyboard operable, including timeline clips, trimming, inspector controls, preset selection, and tool-rail navigation.
- Minimum hit target is 36×36px on desktop; use 44×44px on touch-capable layouts.
- Use a 2px `focus-ring` with 2px offset. Never remove focus indication.
- Provide names and tooltips for every icon-only control.
- Sliders expose their label, current value, minimum, maximum, and step to assistive technology.
- Timeline tracks, clips, current time, and selection use meaningful accessible labels.
- Caption previews cannot rely on animated color alone; provide a static readable name.
- Respect reduced motion, increased contrast, and browser/system zoom up to 200%.

# Responsive Behavior

This is a desktop authoring product; preserve capability rather than forcing a phone layout.

- **≥1440px:** full three-pane workspace, inspector, rail, and expanded timeline.
- **1100–1439px:** transcript narrows, inspector becomes 280px, less-used toolbar labels collapse to icons with tooltips.
- **800–1099px:** one side panel is visible at a time; transcript and inspector become switchable drawers while canvas and timeline remain primary.
- **<800px:** provide a review/light-edit mode only unless a dedicated mobile editor is designed. Stack canvas, transport, transcript, and simple caption controls; hide precision timeline editing behind an explicit unsupported message or simplified clip list.

At all widths, preserve selected time, clip, object, active tool, and unsaved changes when panels collapse or reopen.

# Do's and Don'ts

## Do

- Keep media, transcript, canvas, inspector, and timeline synchronized to one current time.
- Preserve user context when switching between Properties, Captions, Media, and Elements.
- Use progressive disclosure for advanced properties and animation controls.
- Make scope explicit before applying a caption style to one scene or all scenes.
- Keep undo available for direct manipulations and preset application.
- Use realistic thumbnail, waveform, caption, and duration previews during design reviews.
- Keep operational screens quiet, compact, and highly scannable.
- Use the shared custom dropdown for every selection menu so visual and keyboard behavior remains consistent.

## Don't

- Do not turn the editor into a card dashboard or marketing-style canvas.
- Do not hide unfamiliar actions behind unlabeled icons.
- Do not use heavy borders around every region; rely on hierarchy and subtle separators.
- Do not let the inspector cover the media frame or timeline.
- Do not apply changes to all scenes without an explicit scope control.
- Do not lose selections, playhead position, scroll, or panel state on navigation.
- Do not animate timeline or canvas geometry for decoration.
- Do not expose technical AI provider names in the interface; use product-language labels for assisted actions.
- Do not introduce native browser dropdowns or one-off menu implementations.
- Do not introduce native browser range styling or one-off slider implementations; use the shared custom range component.

# Content Voice

Use short, direct creator language: `Split`, `Fit`, `Apply to all scenes`, `Generate captions`, `Upload complete`, `Export`. Prefer verbs for actions and nouns for destinations. Error messages state what happened, what was preserved, and the next recovery action. Avoid emoji, hype, and anthropomorphic assistant copy.

# Implementation Notes

- Map these tokens into the project's existing styling system when one exists; do not create a second parallel token layer.
- Treat pane sizes, timeline height, and panel visibility as persisted user preferences.
- Model editor state explicitly: current time, playback, selection, active tool, active side panel, zoom, transcript cursor, timeline scroll, undo history, dirty state, and background-operation status.
- Virtualize long transcripts, preset libraries, and dense timelines while keeping keyboard focus stable.
- Keep visual editor components props-based: data and callbacks enter through props; preview/sample wrappers may supply fixture data.
- Separate persistent shell chrome from section content. Section components must not recreate the top bar, tool rail, or timeline.

## Migration Notes

- `0.2.27` makes packaged local transcription recover from a native whisper.cpp interruption: every local-analysis subprocess starts from Descriptor's stable private work directory instead of inheriting a replaceable app-bundle directory, one native crash receives one bounded retry, and the persistent transcription stage reports that recovery without losing or replacing the selected source.
- `0.2.26` makes the public source distribution portable: unlicensed and demo caption fonts are replaced by SIL Open Font License families with their license files, the creator-outline preset maps to Archivo Black, and local speech/runtime paths become environment-configurable with standard project, user-data, cache, PATH, and Homebrew discovery.
- `0.2.25` makes local transcription single-flight: identical source requests join one job, recent validated results are reused, different active media waits and retries automatically, and a newer import prevents stale progress or results from replacing the current transcript.
- `0.2.24` removes the cloud transcription adapter, SDK dependency, credential bridge, encrypted key file, setup UI, provider fallback, and secret-bearing environment flow. Speech timing now runs through bundled whisper.cpp with a user-controlled local large-v3 model; Qwen3 performs local translation and cleanup review without owning canonical Arabic wording or timing. Missing local runtimes preserve the selected video and expose `Retry local analysis`.
- `0.2.23` adds the production macOS identity: a native rounded-square application icon whose transcript lines transform into a purple speech waveform and warm video play mark, with a complete alpha-enabled iconset and packaged `.icns` asset.
- `0.2.22` renames the visible product and packaged macOS application to Descriptor while retaining the established bundle identifier, local settings, and `~/Library/Application Support/Descripter` data boundary so existing projects, LUTs, and exports remain available.
- `0.2.21` makes Line height control the real runtime caption line boxes across standard pages, two-word stacks, creator build, creator outline, and typewriter layouts instead of being overridden by template-specific CSS.
- `0.2.20` makes successful exports reusable: completed and active job state survives tool navigation, unchanged edits expose `Export again`, later edit changes expose `Render updated video` while retaining `Save previous video`, and explicit repeat renders create a new job without weakening double-click idempotency.
- `0.2.19` repairs packaged Mac source storage by passing explicit bundled FFmpeg and FFprobe executable paths to the private server. Export now distinguishes active saving from a failed upload, preserves the open video, reports a creator-facing error, and provides an in-place source-storage retry instead of waiting forever.
- `0.2.18` makes the Export summary and FFmpeg renderer share one oriented 4K contract: `2160×3840` for vertical projects and `3840×2160` for landscape projects, with Lanczos scaling, no stretching or cropping, optional centered padding, captions rasterized after scaling, and a versioned idempotency recipe that cannot reuse older lower-resolution results.
- `0.2.17` repairs caption word spacing by placing each live-preview separator between sibling rendered word elements and encoding the same extra separator spacing in burned ASS captions, without changing canonical wording, letter spacing, or timing.
- `0.2.16` moves Animation and Vocabulary directly above Color in the tool rail, keeping Color immediately before Export while preserving every destination's panel state and behavior.
- `0.2.15` adds the reference-matched `Creator outline · Yellow` subtitle template: fixed three-word pages, balanced two-line wrapping, uppercase wide display glyphs, a strong black outline, speech-synced yellow current-word emphasis, gap-safe highlight clearing, matching library preview, and equivalent burned-export events with the bundled font directory. The public-source font mapping is Archivo Black under the SIL Open Font License.
- `0.2.13` makes the no-source timeline honest: one source-import action replaces placeholder cleanup ranges and source-linked geometry, while source playback, splitting, time readout, captions, edit seams, and playhead remain unavailable until real media exists and cleanup markers wait for validated analysis.
- `0.2.12` adds non-destructive SDR Rec.709 color grading, current-frame looks, held Before comparison, validated local 3D LUTs, shared contained-handle grade controls, source color classification, and factual background export states. It also turns transcript correction into one project-wide normalized word replacement with visible match count, punctuation and timing preservation, one-step Undo, and sequential refresh of only the affected English subtitle paragraphs.
- `0.2.11` enables native vertical timeline scrolling, sizes the shared canvas from complete lane geometry including insets and gaps, pins the ruler and playhead badge during vertical movement, and keeps horizontal scrolling and zoom gestures independent.
- `0.2.10` applies 40ms of preview-only frame compensation to long-form caption word and page handoffs while keeping one-word and two-word templates at zero compensation. Paragraph boundaries, canonical wording, transcript timing, edit-map timing, and export timing remain unchanged.
- `0.2.9` replaces the ruler-density-only zoom with a shared 100–400% horizontal timeline canvas, exact Fit, pointer/playhead-anchored zoom, native horizontal and Shift-wheel scrolling, sticky ruler/track labels, playhead auto-follow, edge auto-scroll for scrub/trim/move/drop, and scroll clamping after edits. Timeline keyboard scrolling is isolated from source-time seeking.
- `0.2.8` makes source footage reliably clickable beneath cleanup markers, activates transcript-safe trim grips, and adds a dedicated external-media lane with validated drag/drop import, real imported-video thumbnails, move/trim/split/delete interactions, snapping, preview playback, keyboard movement, context menus, and undoable model operations.
- `0.2.7` replaces competing preview clocks with one presented-media-frame clock, makes sub-200ms seeks exact, removes the fixed caption lead, and switches word emphasis instantly at canonical transcript boundaries while clearing highlight state during silence.
- `0.2.6` changes the application interaction theme from terracotta to purple while preserving red exclusively for uncertain transcript words, their review states, destructive actions, and errors.
- `0.2.5` adds a caption text-shadow controller with color, opacity, blur, and two-axis offset controls. The effect is template-aware, presentation-only, and fully undoable.
- `0.2.4` changes slider geometry from an oversized floating thumb to a taller capsule rail with a narrower handle fully contained inside the base, including both endpoints.
- `0.2.3` replaces the blue interaction system with a warm terracotta accent across transcript playback, selection, focus, controls, subtitle clips, and the timeline playhead. Semantic danger red remains reserved for destructive actions and errors.
- `0.2.2` enlarges inspector sliders to the supplied reference proportions: 14px rail, 30px thumb, and a stronger live-value capsule. Playback and preview zoom keep the same design at a compact 10px/20px density.
- `0.2.1` routes every continuous-value control through the same 8px muted track, blue progress fill, and 18px white native thumb, including inspector properties, playback seeking, and preview zoom.
- `0.2.0` replaces the warm plum-heavy chrome with Descriptor's neutral application surfaces, charcoal primary actions, and shared blue interaction accent.
- Inspector cards become continuous disclosure sections. Existing review suggestions and summary metrics remain inset because their containment is meaningful.
- Shared selects move from bordered 36px triggers to filled 32px controls; checkboxes become 32×18px switches; shared ranges move from plum fill/solid thumb to blue fill/white thumb.
- Existing product structure, caption behavior, media timing, timeline semantics, and content copy remain unchanged by this visual migration.

# Known Gaps

The source includes the existing Descriptor editor captures plus three supplied light-theme inspector references covering a long properties panel, expanded effects controls, and an edit-material sheet. The following are inferred and must be validated before production implementation:

- Custom font import, license validation, and user-facing missing-glyph recovery.
- Dark theme.
- Import, onboarding, export, collaboration, comments, project browser, AI Tools, Elements, and Media panels.
- Exact timeline editing rules, multi-track behavior, keyframes, snapping, and transition editing.
- Caption generation, translation, speaker detection, and failure behavior.
- Mobile/tablet editing scope.
- Permission, offline, conflict, autosave recovery, and destructive-action flows.
- Exact component measurements; screenshot-derived values are directional and should be checked against working prototypes.

# Agent Prompt Guide

When implementing Descriptor UI, first read this file and use its front-matter tokens as normative. Build a neutral, desktop-first editing shell with a 48px top bar, transcript/source pane, centered aspect-ratio-safe canvas, continuous contextual right inspector plus 64px tool rail, and a persistent multitrack timeline. Use true-white work surfaces, soft gray filled controls, charcoal primary actions, purple focus/selection/playhead states, semantic red uncertain-word feedback, compact Lato-based typography, native switches, disclosure groups, subtle borders, and restrained elevation. Preserve time, selection, scroll, panel, and undo context across every interaction. Include loading, empty, error, success, disabled, offline, and long-content behavior. Do not invent backend, authentication, persistence, AI provider, or export business rules from this visual contract.
