---
phase: "04-shape-panel-animation"
plan: "04"
subsystem: "ui"
tags: [react, tsx, hsv-sliders, shape-type-selector, cell-panel, css, tdd, wave-3]
dependency_graph:
  requires:
    - "04-02 (Wave 2 — canvasEngine drawShape + pulseScale animation)"
    - "04-03 (Wave 3 — audioEngine LFO + updateVoiceColor/updateVoiceSize)"
  provides:
    - "HsvSliders component — three gradient-track range sliders for H/S/L"
    - "ShapeTypeSelector component — 6 mini-canvas type buttons with drawShape previews"
    - "CellPanel occupied mode replaced with full interactive editor (Color + Size + Shape + Animation)"
    - "Phase 4 CSS classes — .control-group, .slider-wrap, .type-selector anatomy in index.css"
  affects:
    - "End users — all shape properties now editable in real time through the sidebar panel"
tech_stack:
  added: []
  patterns:
    - "Gradient-track slider: .slider-wrap__track div with inline background style + transparent range input z-indexed above it"
    - "Mini canvas preview: useRef<HTMLCanvasElement> + useEffect with individual h/s/l deps (not object reference)"
    - "handleUpdateShape pattern: CellPanel owns Partial<Shape> patch dispatch to shapeStore.getState().updateShape"
key_files:
  created:
    - src/components/HsvSliders.tsx
    - src/components/ShapeTypeSelector.tsx
  modified:
    - src/components/CellPanel.tsx
    - src/styles/index.css

key-decisions:
  - "useEffect deps for TypeButton: [type, color.h, color.s, color.l] instead of [type, color] — avoids object reference stability issues causing missed redraws"
  - "DPR-unaware mini canvas at PoC scope: canvas.width=32/canvas.height=32 without devicePixelRatio scaling — acceptable softness for 32x32 preview per UI-SPEC Pitfall 2"
  - "handleUpdateShape guards with `if (!shape) return` — prevents stale closure call after shape removal"

patterns-established:
  - "Gradient-track slider: wrapper div carries background gradient via inline style; range input sits above on z-index 1 with transparent background"
  - "TypeButton mini canvas: individual h/s/l as useEffect deps — not the color object — to reliably detect color changes"
  - "CellPanel update dispatch: handleUpdateShape(patch: Partial<Shape>) calls shapeStore.getState().updateShape(shape.id, patch)"

requirements-completed:
  - PANL-01
  - PANL-02
  - PANL-03

duration: "15 min"
completed: "2026-04-16"
---

# Phase 04 Plan 04: Wave 3 React UI Layer Summary

HsvSliders + ShapeTypeSelector + CellPanel occupied mode replacement delivering full real-time shape editing: gradient-track color sliders, size and animation rate controls, and 6 mini-canvas type buttons all wired to shapeStore.updateShape.

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-16
- **Completed:** 2026-04-16
- **Tasks:** 3 (Tasks 1 and 2 automated TDD; Task 3 human-verify checkpoint approved)
- **Files modified:** 4

## Accomplishments

- Created HsvSliders with three gradient-track range sliders (Hue 0-360, Saturation 0-100, Lightness 0-100); gradients update dynamically from current HSL values; correct aria-labels per UI-SPEC Section 13
- Created ShapeTypeSelector with 6 TypeButton elements, each containing a 32x32 mini-canvas rendering the shape type in the current color via drawShape; aria-pressed state and accent border highlight on active type
- Replaced CellPanel occupied mode with four interactive sections (Color, Size, Shape, Animation) all wired to shapeStore.updateShape — every slider input event fires in real time
- Appended all Phase 4 CSS classes to index.css: .control-group, .slider-wrap anatomy (webkit + moz prefixes), .type-selector, .cell-panel__section-heading
- Full vitest suite: 93/93 pass; TypeScript: 0 errors; human-verify checkpoint approved

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HsvSliders component and CSS classes** - `173af01` (feat)
2. **Task 2: Create ShapeTypeSelector and replace CellPanel occupied mode** - `7621a7a` (feat)
3. **Task 3: Human-verify checkpoint** - N/A (manual approval — no code commit)

**Plan metadata:** (this commit)

_Note: TDD tasks followed RED->GREEN flow per Wave 0 scaffolds. Null-stub imports in test files replaced with real static imports at implementation._

## Files Created/Modified

- `src/components/HsvSliders.tsx` — Three gradient-track sliders; props: `{ color: ShapeColor; onChange: (color: ShapeColor) => void }`; dynamic gradient tracks computed from current h/s/l values
- `src/components/ShapeTypeSelector.tsx` — Six TypeButton elements with mini 32x32 canvas previews; props: `{ currentType, shapeColor, onChange }`; aria-pressed on active type
- `src/components/CellPanel.tsx` — Occupied mode replaced: Color (HsvSliders) + Size slider (0-100) + Shape (ShapeTypeSelector) + Animation Rate slider (0.1-10 Hz) + Remove Shape; handleUpdateShape dispatches Partial<Shape> patches to shapeStore
- `src/styles/index.css` — New classes: .cell-panel__section-heading, .control-group, .control-group__label-row, .control-group__label, .control-group__readout, .slider-wrap, .slider-wrap__track, .slider-wrap input[type="range"] (+ ::-webkit-slider-thumb, :focus-visible, ::-moz-range-thumb), .type-selector, .type-selector__btn, .type-selector__btn:hover, .type-selector__btn--active, .type-selector__canvas

## Decisions Made

- **useEffect deps for TypeButton use individual h/s/l fields:** `[type, color.h, color.s, color.l]` instead of `[type, color]`. The color object reference changes on every CellPanel render (inline object literal), so using the object directly would cause unnecessary redraws or miss updates if React optimized the reference. Individual primitives are stable and explicit.
- **DPR-unaware mini canvas:** `canvas.width = 32; canvas.height = 32` with no devicePixelRatio scaling. Acceptable per UI-SPEC Pitfall 2 for 32x32 preview buttons in a PoC. Prevents the 64x64 CSS/logical pixel mismatch that would distort button layout.
- **handleUpdateShape guards with `if (!shape) return`:** Prevents the rare case where a stale closure fires after the shape has been removed from the store but before the panel re-renders.

## Deviations from Plan

None — plan executed exactly as written. All three tasks followed the exact code specified in the plan's `<action>` blocks. CellPanel.test.tsx occupied-mode assertions were updated as specified (removing `Type`/`circle` text checks, adding `getByLabelText(/Hue, 0 to 360/i)`). Wave 0 null-stub test guards were replaced with real static imports as specified.

## Issues Encountered

None. All Wave 0 scaffold tests turned GREEN as expected after Wave 3 implementation. The 4 previously-RED CellPanel Phase 4 tests all pass. TypeScript reported 0 errors throughout.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 4 complete: all four waves (Wave 0 scaffolds, Wave 1 data, Wave 2 canvas+audio, Wave 3 React UI) delivered
- All 93 tests pass; TypeScript 0 errors
- Human-verify checkpoint passed: shapes pulse, all sliders update in real time, type selector changes shape on canvas, Remove Shape still works
- Ready for Phase 5 (sequencer/playback or further polish per ROADMAP.md)

---
*Phase: 04-shape-panel-animation*
*Completed: 2026-04-16*

## Self-Check: PASSED

- [x] src/components/HsvSliders.tsx exists and contains `export function HsvSliders(`
- [x] src/components/HsvSliders.tsx contains `aria-label="Hue, 0 to 360"`
- [x] src/components/HsvSliders.tsx contains `aria-label="Saturation, 0 to 100"`
- [x] src/components/HsvSliders.tsx contains `aria-label="Lightness, 0 to 100"`
- [x] src/components/HsvSliders.tsx contains `linear-gradient(to right` (gradient tracks)
- [x] src/styles/index.css contains `.slider-wrap {`
- [x] src/styles/index.css contains `.slider-wrap__track {`
- [x] src/styles/index.css contains `.type-selector__btn--active {`
- [x] src/styles/index.css contains `.cell-panel__section-heading {`
- [x] src/styles/index.css contains `-webkit-slider-thumb` AND `-moz-range-thumb`
- [x] src/components/ShapeTypeSelector.tsx exists and contains `export function ShapeTypeSelector(`
- [x] src/components/ShapeTypeSelector.tsx contains `aria-pressed={isActive}`
- [x] src/components/ShapeTypeSelector.tsx contains `drawShape(ctx, 16, 16, 12, type, color)`
- [x] src/components/ShapeTypeSelector.tsx contains `canvas.width = 32`
- [x] src/components/CellPanel.tsx contains `import { HsvSliders }` and `import { ShapeTypeSelector }`
- [x] src/components/CellPanel.tsx contains `updateShape(shape.id, patch)`
- [x] src/components/CellPanel.tsx contains `aria-label="Size, 0 to 100"`
- [x] src/components/CellPanel.tsx contains `aria-label="Animation rate, 0.1 to 10 Hz"`
- [x] src/components/CellPanel.tsx contains `shape.animRate.toFixed(1)} Hz`
- [x] `npx vitest run` exits 0 — 93/93 tests pass (all Wave 3 scaffold tests now GREEN)
- [x] `npx tsc --noEmit` exits 0 — 0 TypeScript errors
- [x] Commits 173af01 and 7621a7a exist in git log
- [x] Human-verify checkpoint: approved by user
