---
phase: 03-canvas-interaction
plan: "04"
subsystem: canvas-rendering
tags: [selection-highlight, canvasEngine, selectionStore, layout-fix, human-verify]
dependency_graph:
  requires:
    - 03-01-PLAN.md (selectionStore — subscribe API and getState().selectedCell)
    - 03-02-PLAN.md (CellPanel — visual panel that accompanies the highlight)
    - 03-03-PLAN.md (CanvasContainer — routes clicks that drive selectionStore)
  provides:
    - canvasEngine selectionStore subscription (dirty-flag, cleaned up in destroy)
    - drawSelection function rendering 2px inset accent border on selected cell
    - Canvas layout stability (no resize on panel toggle, correct circle aspect ratio)
  affects:
    - src/engine/canvasEngine.ts
    - src/App.tsx
    - src/components/CanvasContainer.tsx
    - src/styles/index.css
tech_stack:
  added: []
  patterns:
    - Second store subscription follows identical dirty-flag pattern as shapeStore subscription
    - drawSelection reads selectionStore.getState() synchronously in RAF loop (no hooks)
    - visibility:hidden reserves panel width so canvas area never changes on toggle
    - canvas element height:100% matches container clientHeight used by ResizeObserver
key_files:
  created: []
  modified:
    - src/engine/canvasEngine.ts
    - src/App.tsx
    - src/components/CanvasContainer.tsx
    - src/styles/index.css
decisions:
  - selectionStore subscription added alongside shapeStore — same dirty-flag pattern, same destroy() cleanup
  - drawSelection uses synchronous getState() read inside render() — consistent with drawShapes approach
  - strokeRect(x+1, y+1, size-2, size-2) insets by 1px — highlight stays within cell bounds, no bleed
  - rgba(99, 102, 241, 0.90) accent color matches --color-accent token at 90% opacity (UI-SPEC Section 6)
  - visibility:hidden replaces display:none on panel wrapper — 240px column always reserved in flex layout
  - canvas height:100% (not 70vh) ensures CSS display dimensions match ResizeObserver-reported clientHeight
metrics:
  duration: "~15 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 04: Selection Highlight (canvasEngine drawSelection) Summary

**One-liner:** selectionStore subscription and drawSelection function added to canvasEngine rendering a 2px inset rgba(99,102,241,0.90) accent border on the selected cell; two canvas layout bugs found during human verification and fixed post-checkpoint.

## What Was Built

### Task 1 — selectionStore subscription + drawSelection (feat commit 0eadce9)

Three additions to `src/engine/canvasEngine.ts`:

1. **Import:** `import { selectionStore } from '../store/selectionStore'` added alongside the existing shapeStore import.

2. **`drawSelection` function** placed after `drawShapes`, before `render()`:
   - Reads `selectedCell: { col, row } | null` from `selectionStore.getState()` synchronously inside the RAF loop (no hooks, no React)
   - Uses identical cell math as `drawGrid`/`drawShapes`: `Math.floor(Math.min(logicalW, logicalH) / 4)` for cell size
   - Renders a `strokeRect(x+1, y+1, size-2, size-2)` — 1px inset on all sides keeps the 2px line within the cell boundary
   - Color: `rgba(99, 102, 241, 0.90)` — accent value from UI-SPEC Section 6
   - Called after `drawShapes` in `render()` so the highlight overlays any shape in the selected cell

3. **Second subscription and updated `destroy()`:**
   - `const unsubscribeShape = shapeStore.subscribe(() => { dirty = true })`
   - `const unsubscribeSelection = selectionStore.subscribe(() => { dirty = true })`
   - `destroy()` calls both `unsubscribeShape()` and `unsubscribeSelection()` — no subscription leak

### Task 2 — Layout bug fixes found during human verification (fix commit 371c18e)

During the human-verify checkpoint, two layout bugs were identified and fixed by the orchestrator:

**Bug 1: Circles rendered as ovals (canvas height mismatch)**

- **Root cause:** Canvas CSS height was `70vh` but `ResizeObserver` measured `container.clientHeight`, which differed from the viewport-relative `70vh` value on non-standard screen sizes. The backing buffer was sized correctly but logical dimensions used in cell math were wrong, producing non-square cells.
- **Fix:** `src/styles/index.css` — changed `.canvas-container` height from `70vh` to `100%` so the CSS display size matches the container's flex-allocated height (what `clientHeight` reports).

**Bug 2: Canvas shifted horizontally when panel opened/closed (layout shift)**

- **Root cause:** The `cell-panel-wrapper` was toggled between `display:none` and `display:flex` via `className` on panel open/close. `display:none` collapses the element to zero width, so the flex layout recalculated and the canvas area grew/shrank by 240px each toggle.
- **Fix (two-part):**
  - `src/App.tsx` — replaced `display:none`/`display:flex` toggling with `visibility:hidden`/`visibility:visible`. The wrapper remains in the flex flow at full 240px width whether visible or not.
  - `src/styles/index.css` — `display:flex` moved permanently into `.cell-panel-wrapper` CSS rule (was previously set inline by the toggle).
  - `src/components/CanvasContainer.tsx` — minor related adjustment to the `panelOpen` class application.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add selectionStore subscription and drawSelection to canvasEngine | 0eadce9 | src/engine/canvasEngine.ts |
| 2 (checkpoint) | Human verification — all Phase 3 behaviors confirmed | — | (no files; verification only) |
| Post-verify fix | Fix canvas layout — prevent resize on panel toggle, fix oval circles | 371c18e | src/App.tsx, src/components/CanvasContainer.tsx, src/styles/index.css |

## Verification Results

**Automated (pre-checkpoint):**
- `npx vitest run src/engine/canvasEngine.test.ts` — all existing canvas engine tests passed
- All acceptance criteria from Task 1 confirmed present in `canvasEngine.ts`

**Human verification (Phase 3 full flow):**
All 8 behaviors confirmed in the browser:
1. Selection highlight — 2px indigo border visible on clicked cell
2. Add Shape — circle appears in cell, audio tone starts
3. Remove Shape via button — shape disappears, audio stops (no pop)
4. Remove via keyboard (Delete/Backspace) — shape removed, panel closes
5. Escape — panel closes, highlight disappears
6. Switch selection — highlight moves to newly clicked cell
7. Panel toggle — canvas width stable (no horizontal jump) — FAILED initially, fixed by orchestrator
8. No audio click artifact — silent removal confirmed

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Second subscription follows dirty-flag pattern | Consistent with shapeStore subscription — both stores set `dirty = true`; RAF loop handles rendering |
| drawSelection reads getState() in render() | Synchronous read inside RAF loop — no stale closure, no extra hook needed (RESEARCH.md Pattern 3) |
| strokeRect inset by 1px | Prevents 2px stroke from bleeding onto adjacent cell; stays inside cell boundary regardless of lineWidth |
| visibility:hidden for panel toggle | Reserves 240px column in flex layout at all times — canvas area is stable regardless of panel state |
| canvas height:100% | Aligns CSS display dimensions with what ResizeObserver.clientHeight reads — both must agree for correct cell math |

## Deviations from Plan

### Post-checkpoint layout fixes

**1. [Rule 1 - Bug] Fixed oval circles caused by canvas height CSS/buffer mismatch**
- **Found during:** Task 2 human verification checkpoint
- **Issue:** Canvas CSS height was `70vh`; `ResizeObserver` measured `clientHeight` which differed, making cells non-square and circles oval
- **Fix:** Changed `.canvas-container` CSS height to `100%`
- **Files modified:** `src/styles/index.css`
- **Commit:** 371c18e

**2. [Rule 1 - Bug] Fixed canvas layout shift on panel open/close**
- **Found during:** Task 2 human verification checkpoint (behavior 7)
- **Issue:** `display:none` on `.cell-panel-wrapper` collapsed the 240px column, causing canvas to reflow and shift on every panel toggle
- **Fix:** Switched to `visibility:hidden`/`visibility:visible`; `display:flex` moved permanently into CSS
- **Files modified:** `src/App.tsx`, `src/components/CanvasContainer.tsx`, `src/styles/index.css`
- **Commit:** 371c18e

Both bugs were identified by the human verifier and fixed by the orchestrator before the plan was marked complete. Not pre-existing issues — both were introduced by earlier Phase 3 plans.

## Known Stubs

None — no placeholder data or TODO stubs in the delivered files.

## Threat Flags

No new security-relevant surface beyond the plan's threat model:

- `T-03-10`: `drawSelection` cell coordinates clamped upstream by `cellAtPoint`; canvas math stays within grid area
- `T-03-11`: `selectionStore.subscribe` callback is a single `dirty = true` assignment; O(1), no RAF starvation possible

## Self-Check: PASSED

- [x] `src/engine/canvasEngine.ts` contains `import { selectionStore } from '../store/selectionStore'`
- [x] `src/engine/canvasEngine.ts` contains `function drawSelection(`
- [x] `src/engine/canvasEngine.ts` contains `ctx.strokeStyle = 'rgba(99, 102, 241, 0.90)'`
- [x] `src/engine/canvasEngine.ts` contains `ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)`
- [x] `src/engine/canvasEngine.ts` contains `selectionStore.getState().selectedCell` inside `render()`
- [x] `src/engine/canvasEngine.ts` contains `const unsubscribeShape = shapeStore.subscribe`
- [x] `src/engine/canvasEngine.ts` contains `const unsubscribeSelection = selectionStore.subscribe`
- [x] `src/engine/canvasEngine.ts` contains `unsubscribeShape()` in destroy
- [x] `src/engine/canvasEngine.ts` contains `unsubscribeSelection()` in destroy
- [x] `src/engine/canvasEngine.ts` does NOT contain bare `unsubscribe()` in destroy
- [x] Commit 0eadce9 exists (Task 1 — drawSelection)
- [x] Commit 371c18e exists (layout fix — oval circles + panel shift)
- [x] Human verified all 8 Phase 3 behaviors; human typed "approved"
