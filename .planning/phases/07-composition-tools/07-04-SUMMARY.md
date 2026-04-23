---
phase: 07-composition-tools
plan: "04"
subsystem: ui
tags: [react, animation, canvas, spline, drag-handle, zustand, phase-7]

dependency_graph:
  requires:
    - plan: 07-01
      provides: animationStore (setCurve, removeCurve, useAnimationStore, SplineCurve types)
    - plan: 07-02
      provides: audioEngine curve modulation wired
    - plan: 07-03
      provides: canvasEngine pulseScale removed, animationStore-driven rendering
  provides:
    - CellPanel Animate button replacing beat-fraction selector
    - AnimationPanel component with drag handle, header, lane list
    - Per-lane canvas with polyline + draggable control points
    - App.tsx animation-panel-host wired with panelHeight state
    - Complete Phase 7 CSS classes in index.css
  affects:
    - src/components/CellPanel.tsx
    - src/components/AnimationPanel.tsx
    - src/App.tsx
    - src/styles/index.css

tech-stack:
  added: []
  patterns:
    - Module-level EMPTY_CURVES sentinel for stable Zustand selector reference (prevents infinite re-render)
    - ResizeObserver for canvas pixel-dimension sizing (same pattern as CanvasContainer)
    - setPointerCapture/releasePointerCapture on drag handle for fast-mouse robustness (UI-SPEC Pitfall 3)
    - panelHeight lifted to App.tsx so CellPanel's onAnimate callback can restore collapsed panel (D-12)

key-files:
  created:
    - src/components/AnimationPanel.tsx
  modified:
    - src/components/CellPanel.tsx
    - src/App.tsx
    - src/styles/index.css
    - vitest.setup.ts

key-decisions:
  - "EMPTY_CURVES must be module-level constant — inline {} literal in Zustand selector returns new reference each render, causing infinite re-render loop"
  - "panelHeight state lifted to App.tsx (not AnimationPanel) — allows CellPanel onAnimate callback to read/write it without prop drilling or context"
  - "useEffect draw loop has no deps array — canvas 2D API calls don't trigger React state changes so this is safe in browser; EMPTY_CURVES fix resolved the actual re-render root cause"
  - "+ Add Curve disabled when no shape selected (in addition to all-properties-animated case) — prevents null dereference on shape.id"

patterns-established:
  - "Stable selector sentinel pattern: module-level const EMPTY = {} for Zustand selectors that return empty containers"
  - "Drag handle pattern: onPointerDown sets pointer capture, onPointerMove checks isDragging ref, onPointerUp releases capture"

requirements-completed: [ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06]

duration: "25 min"
completed: "2026-04-23"
---

# Phase 7 Plan 04: Wave 3 — UI Layer Summary

**AnimationPanel with draggable resize handle, per-property spline lanes, and CellPanel Animate button replacing the beat-fraction selector**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-23T12:10:00Z
- **Completed:** 2026-04-23T12:35:00Z
- **Tasks:** 2 auto tasks + 1 checkpoint
- **Files modified:** 5

## Accomplishments

- CellPanel occupied mode now shows a single "Animate" button (btn--accent) with correct aria-label, replacing the 5-button beat-fraction selector and removing all BeatFraction/computeLfoHz imports
- AnimationPanel renders below canvas area with 8px drag handle (ns-resize), 36px header ("Animation" title, shape label, "+ Add Curve" button), and scrollable lane list with per-property canvas rows
- Each AnimLane uses ResizeObserver for crisp canvas sizing, pointer-capture drag for control point editing, double-click removal (≥3 points only), and duration input with blur validation
- App.tsx lifted panelHeight state with handleAnimate callback restoring panel from ≤40px collapsed state (D-12)
- All 9 AnimationPanel tests pass; Phase 7 CellPanel tests pass; 2 legacy beat-fraction tests correctly RED

## Task Commits

1. **Task 1: CellPanel Animate button** — `b10be3a` (feat)
2. **Task 2: AnimationPanel + App.tsx + CSS** — `c34a15e` (feat)

## Files Created/Modified

- `src/components/CellPanel.tsx` — removed FRACTIONS, BeatFraction/computeLfoHz imports, bpm hook, beat-selector block; added CellPanelProps with onAnimate; added Animate button
- `src/components/AnimationPanel.tsx` (new) — full animation panel with drag handle, header, property picker, AnimLane sub-component, drawLaneCanvas helper
- `src/App.tsx` — added panelHeight state, handleAnimate callback, animation-panel-host div with AnimationPanel
- `src/styles/index.css` — Phase 7 CSS section: animation-panel-host, drag-handle, header, add-btn, lanes, empty state, property picker, anim-lane, canvas column
- `vitest.setup.ts` — added setLineDash/getLineDash to canvas mock (required for AnimationPanel draw effect in jsdom)

## Decisions Made

- **EMPTY_CURVES module-level sentinel:** The Zustand selector `(s) => shape ? s.curves[shape.id] ?? {} : {}` returned a new `{}` object every render, causing an infinite re-render loop. Fixed by hoisting `const EMPTY_CURVES = {} as const` to module scope so the selector returns the same reference when no curves exist.
- **panelHeight lifted to App.tsx:** Allows the CellPanel's `onAnimate` callback (passed from App) to restore the panel height without needing a shared store or React context.
- **+ Add Curve disabled when no shape:** Added `|| !shape` to the disabled condition in addition to `allAnimated` — prevents null dereference on `shape!.id` when the button is clicked before a shape is selected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed infinite re-render loop from unstable Zustand selector reference**
- **Found during:** Task 2 (AnimationPanel tests)
- **Issue:** `useAnimationStore((s) => shape ? s.curves[shape.id] ?? {} : {})` returns a new `{}` object on every render. Zustand uses reference equality (`Object.is`) on selector results — a new `{}` always differs, triggering re-render, which calls selector again, causing an infinite loop. Manifested as "Maximum update depth exceeded" in tests.
- **Fix:** Hoisted `const EMPTY_CURVES = {} as const` to module scope. Selector now returns the same object reference when no curves exist.
- **Files modified:** `src/components/AnimationPanel.tsx`
- **Verification:** All 9 AnimationPanel tests pass; no "Maximum update depth" error
- **Committed in:** c34a15e

**2. [Rule 2 - Missing Critical] Added setLineDash/getLineDash to canvas mock**
- **Found during:** Task 2 (AnimationPanel tests — first run)
- **Issue:** `vitest.setup.ts` canvas mock was missing `setLineDash`. `drawLaneCanvas` calls `ctx.setLineDash([4, 4])` for the dashed baseline. Error: `ctx.setLineDash is not a function`.
- **Fix:** Added `setLineDash: () => {}` and `getLineDash: () => []` to the canvas context mock in `vitest.setup.ts`.
- **Files modified:** `vitest.setup.ts`
- **Verification:** AnimationPanel tests no longer throw canvas errors
- **Committed in:** c34a15e

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 2 missing mock method)
**Impact on plan:** Both fixes required for tests to pass. No scope creep — fixes are localized to AnimationPanel rendering and its test environment.

## Known Stubs

None — AnimationPanel fully wired to animationStore. Curve evaluation (audio/visual) was implemented in plans 07-02 and 07-03. No placeholder data paths.

## Threat Flags

No new security-relevant surface introduced. All threat register mitigations from the plan are implemented:
- T-07-04-01: duration input clamped (min=0.25 max=64) with onBlur restore
- T-07-04-02: pixelToPoint clamps beat to [0, duration] and value to property range
- T-07-04-03: handleCanvasDoubleClick returns early when points.length <= 2
- T-07-04-04: clearShape on removeShape was implemented in 07-01 (verified)

## Checkpoint Status

Tasks 1 and 2 are committed and verified. The plan ends with a `checkpoint:human-verify` requiring the user to visually confirm the animation panel in a running browser. The human checkpoint is the final gate before Phase 7 is considered complete.

## Self-Check: PASSED
