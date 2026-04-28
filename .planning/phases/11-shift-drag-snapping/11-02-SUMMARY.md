---
phase: 11-shift-drag-snapping
plan: 02
subsystem: animation-panel
status: checkpoint
tags: [snap, pointer-events, yViewport, canvas, coordinate-transform, wave-1]

# Dependency graph
requires:
  - phase: 11-shift-drag-snapping
    plan: 01
    provides: snapFormulas.test.ts (17 tests) — automated verification gate for this plan

provides:
  - pixelToPoint yViewport-aware Y transform (D-09)
  - pointToPixel yViewport-aware Y inverse transform (hit-test fix, Pitfall 2)
  - isSnappedRef ephemeral drag-time snap state tracking
  - Shift+drag X snap (all lanes) and Y snap (hue lane) in handleCanvasPointerMove
  - Shift+insert X+Y snap in handleCanvasPointerDown insert branch
  - DrawOptions.isSnapped field passed to drawLaneCanvas
  - Snapped control-point visual: white fill + accent ring (D-10)

affects: [src/components/AnimationPanel.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isSnappedRef = useRef(false) — ephemeral drag-time state in a ref; no Zustand store needed"
    - "scaleStore.getState() read inside pointermove handler — live scale changes reflected per D-07"
    - "DrawOptions.isSnapped propagated from ref to drawLaneCanvas via primaryOptions"
    - "ctx.save/restore wraps accent ring stroke to avoid style leaks"

key-files:
  created: []
  modified:
    - src/components/AnimationPanel.tsx

key-decisions:
  - "isSnappedRef.current = false added to pointerdown non-shift insert path (3rd = false match for acceptance criteria)"
  - "pointToPixel fixed in same commit as pixelToPoint — same root cause, same one-line fix (Pitfall 2)"
  - "Snapped visual: white fill + accent (#6366f1) ring — clearly distinct from normal accent fill"

# Metrics
duration: 5min
completed: 2026-04-28
---

# Phase 11 Plan 02: Shift+Drag Snapping Implementation Summary

**yViewport-aware pixelToPoint/pointToPixel fix + isSnappedRef snap branches + white-fill/accent-ring snapped control-point visual in AnimationPanel.tsx**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-28T13:03:38Z
- **Completed:** 2026-04-28T13:09:07Z
- **Tasks:** 2 of 3 (paused at checkpoint:human-verify Task 3)
- **Files modified:** 1

## Accomplishments

### Task 1: Fix pixelToPoint and pointToPixel to respect yViewport

Both coordinate transform functions in `AnimLane` now use `uiStore.getState().yViewport[property]` for the Y transform, falling back to the full property range when no viewport key is present. This fixes:
- Drag positions being incorrect when the Y-axis is zoomed (D-08/D-09)
- Hit-test (click-to-select) misalignment when Y-axis is zoomed (Pitfall 2)

Key formula changes:
- `pixelToPoint`: `value = yVp.max - (py / canvas.height) * (yVp.max - yVp.min)`
- `pointToPixel`: `py = ((yVp.max - p.value) / (yVp.max - yVp.min)) * h`

### Task 2: isSnappedRef, snap branches, DrawOptions.isSnapped, snapped visual

Five targeted edits to `AnimationPanel.tsx`:

1. **DrawOptions.isSnapped?: boolean** — new optional field on the existing interface (D-11)
2. **isSnappedRef = useRef(false)** — ephemeral ref alongside isDraggingPoint in AnimLane
3. **Snapped visual in control-point loop** — `isSnappedPoint = isSelected && options?.isSnapped`; renders white fill + `#6366f1` accent ring (D-10)
4. **primaryOptions.isSnapped: isSnappedRef.current** — wires ref into the static-draw useEffect
5. **Snap branches in both pointer handlers + pointerUp reset**:
   - `handleCanvasPointerMove`: Shift → snapBeat + snapHue (hue lane); no-Shift → clear ref (D-03)
   - `handleCanvasPointerDown` insert branch: Shift → snap new point before insert (D-04)
   - `handleCanvasPointerUp`: `isSnappedRef.current = false` (Pitfall 1)

## Task Commits

1. **Task 1: Fix pixelToPoint and pointToPixel** — `f6b4cb3`
2. **Task 2: isSnappedRef + snap branches + snapped visual** — `a6885be`

## Files Created/Modified

- `src/components/AnimationPanel.tsx` — pixelToPoint/pointToPixel yViewport fix + all Phase 11 snap additions

## Decisions Made

- Added `isSnappedRef.current = false` to the pointerdown non-shift insert path (else branch) to satisfy acceptance criteria of 3 `= false` occurrences and ensure clean state when a free insert happens after a snapped insert
- Fixed `pointToPixel` in the same commit as `pixelToPoint` (same root cause; Pitfall 2 from RESEARCH.md)
- Snapped visual: white fill + `#6366f1` (accent) ring stroke — visually distinct from normal solid accent fill

## Deviations from Plan

None — plan executed exactly as written. The one minor addition (the `else { isSnappedRef.current = false }` in the pointerdown insert branch) was required by the acceptance criteria and consistent with D-03's intent (non-snap path should always clear snap state).

## Test Results

- `npx vitest run --pool=vmForks src/engine/snapFormulas.test.ts` — 17/17 passed
- `npx vitest run --pool=vmForks` — 216/218 passed; 2 pre-existing CellPanel failures (unrelated to this phase, documented in Wave 0 summary)

## Checkpoint Status

**Paused at Task 3: human-verify**

Task 3 is a `checkpoint:human-verify` gate requiring manual browser testing of 5 behaviors. Tasks 1 and 2 are fully committed. The implementation is complete and ready for visual verification.

## Known Stubs

None — all implemented behaviors write real snap-adjusted values to the store and render correct visuals.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes. All changes are within the existing canvas pointer-event → animationStore flow (T-11-02-01 through T-11-02-03 all accepted in the plan's threat model).

---

## Self-Check

- [x] `src/components/AnimationPanel.tsx` modified and committed
- [x] Commit `f6b4cb3` exists (Task 1)
- [x] Commit `a6885be` exists (Task 2)
- [x] `grep -c "yViewport[property]"` ≥ 2 matches (lines 754, 767)
- [x] `grep -n "yVp.max - (py / canvas.height)"` — 1 match (line 756)
- [x] `grep -n "(yVp.max - p.value) / (yVp.max - yVp.min)"` — 1 match (line 769)
- [x] `grep -c "isSnappedRef.current = true"` = 2
- [x] `grep -c "isSnappedRef.current = false"` = 3
- [x] `grep -c "isSnappedPoint"` = 2
- [x] `grep -c "isSnapped: isSnappedRef.current"` = 1
- [x] `grep -c "scaleNoteHues"` = 4 (≥ 2)
- [x] snapFormulas.test.ts: 17/17 passed
- [x] Full suite: no new failures

## Self-Check: PASSED

*Phase: 11-shift-drag-snapping*
*Completed: 2026-04-28 (checkpoint — awaiting human verification)*
