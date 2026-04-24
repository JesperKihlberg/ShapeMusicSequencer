---
phase: 01-scaffold
plan: 03
subsystem: canvas-engine
tags: [canvas, tdd, raf-loop, dpr, cell-math, zustand, xstate, react]

# Dependency graph
requires:
  - 01-01 (Vite scaffold, Vitest infra, jsdom mocks)
  - 01-02 (shapeStore vanilla store, sequencerActor singleton)
provides:
  - canvasEngine.ts: initCanvasEngine (RAF loop, DPR-aware resize, store subscription)
  - cellAtPoint: exported pure function for hit-detection and unit testing
  - CanvasContainer.tsx: React wrapper that mounts engine, handles click-to-cell
affects:
  - 01-04 (CanvasContainer.test.tsx integration tests build on this)
  - All subsequent phases extending the canvas engine

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED→GREEN: failing test commit (9de6068) before implementation (af15b5c)"
    - "cellAtPoint exported as named export for isolated unit testing (no DOM needed)"
    - "DPR-aware resize: canvas.width = clientWidth * dpr, ctx.scale(dpr, dpr)"
    - "Dirty-flag RAF loop: only redraws when dirty===true (set by store.subscribe)"
    - "void sequencerActor — keeps import live for tsc; Phase 2+ will read getSnapshot().value"
    - "Static import of shapeStore in CanvasContainer (not dynamic — Pitfall 5 fix)"
    - "useEffect([], []) mount pattern — engine initialized once, destroy returned as cleanup"

key-files:
  created:
    - src/engine/canvasEngine.ts (cellAtPoint, initCanvasEngine, drawGrid, drawShapes)
    - src/components/CanvasContainer.tsx (React wrapper, click handler, hint overlay)
  modified:
    - src/engine/canvasEngine.test.ts (replaced 3 it.todo stubs with 8 real tests)
    - src/App.tsx (replaced placeholder <main> with <CanvasContainer />)

key-decisions:
  - "cellAtPoint exported as named export — pure function enables isolated testing without DOM"
  - "DPR handling included in Phase 1 — two lines, prevents blurry canvas on Retina (RESEARCH.md Pitfall 1)"
  - "void sequencerActor preserves import for Phase 2+ without triggering noUnusedLocals"
  - "cellAtPoint boundary uses >= gridPx (exclusive) — right/bottom edge returns null, matches UI-SPEC"

# Metrics
duration: 3min
completed: 2026-04-14
---

# Phase 01 Plan 03: canvasEngine + CanvasContainer Summary

**Canvas engine with dirty-flag RAF loop, DPR-aware resize, and cellAtPoint pure function — 8 TDD tests green, CanvasContainer wired into App, tsc --noEmit clean**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-14T13:31:40Z
- **Completed:** 2026-04-14T13:34:33Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- Implemented `cellAtPoint` as a named export — pure function (no DOM, no React) enabling isolated unit testing of the entire grid hit-detection math
- Implemented `initCanvasEngine` with DPR-aware resize (`canvas.width = clientWidth * dpr; ctx.scale(dpr, dpr)`), dirty-flag RAF loop driven by `shapeStore.subscribe()`, `drawGrid` and `drawShapes` using integer cell sizing per RESEARCH.md Pitfall 2
- Kept `sequencerActor` import live via `void sequencerActor` — tsc stays clean, import ready for Phase 2+ `getSnapshot().value` reads
- Implemented `CanvasContainer.tsx` as a React wrapper with `useEffect([], [])` mount, DPR-aware click coordinate scaling, `cellAtPoint` hit detection, and static `shapeStore` dispatch (Pitfall 5 fix)
- Updated `App.tsx` to replace the placeholder `<main>` with `<CanvasContainer />`
- Replaced 3 `it.todo` stub tests with 8 real assertions; full suite: 15 tests pass, 2 todo; `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for cellAtPoint** - `9de6068` (test)
2. **Task 1 GREEN: canvasEngine.ts implementation** - `af15b5c` (feat)
3. **Task 2: CanvasContainer + App wiring** - `8c35f2b` (feat)

## Files Created/Modified

- `src/engine/canvasEngine.ts` — `cellAtPoint` pure export; `initCanvasEngine` with DPR resize, dirty-flag RAF loop, grid + shape drawing
- `src/components/CanvasContainer.tsx` — React wrapper: `useEffect` mount, DPR-aware click handler, hint overlay
- `src/engine/canvasEngine.test.ts` — 8 real tests: square canvas, non-square offsets, boundary exclusion, fractional dimensions, clamping
- `src/App.tsx` — imports and renders `<CanvasContainer />` in canvas-area `<main>`

## Decisions Made

- Exported `cellAtPoint` as a named export from `canvasEngine.ts` — pure function (no canvas context needed) enables the full TDD test suite without any DOM setup
- Included DPR handling in Phase 1 — RESEARCH.md Pitfall 1 notes it's "two lines" and prevents blurry canvas on Retina displays; cost is negligible
- Used `void sequencerActor` to suppress `noUnusedLocals` while preserving the import — Phase 2+ will replace with `sequencerActor.getSnapshot().value` reads inside the RAF loop
- Boundary condition for `cellAtPoint`: `localX >= gridPx` (exclusive) matches the UI-SPEC hit-detection contract — the pixel at exactly `gridPx` is outside the grid

## Deviations from Plan

None — plan executed exactly as written. All patterns from key_context applied correctly:
- `cellAtPoint` signature matches: `(canvasX, canvasY, canvasW, canvasH) → {col, row} | null`
- Cell math contract implemented verbatim
- Engine subscribes to `shapeStore.subscribe()` (not `useShapeStore` hook)
- `CanvasContainer` uses `useEffect([], [])` with `destroy` cleanup
- `sequencerActor` import kept and live

## Known Stubs

None — this plan's goal (canvas engine + React wrapper) is fully achieved. The canvas renders the grid and places shapes on click.

The following are intentional Phase 1 limitations (not stubs):
- No cursor feedback (crosshair/pointer per UI-SPEC Section 6) — deferred to Plan 04 or Phase 3
- `sequencerActor.getSnapshot().value` not yet used in RAF loop — Phase 2+ will add behavioral branching

## Self-Check: PASSED

- `src/engine/canvasEngine.ts` — FOUND
- `src/components/CanvasContainer.tsx` — FOUND
- `src/engine/canvasEngine.test.ts` — FOUND (8 tests, all pass)
- `src/App.tsx` — FOUND (imports CanvasContainer)
- Commit `9de6068` — FOUND (RED test commit)
- Commit `af15b5c` — FOUND (GREEN canvasEngine)
- Commit `8c35f2b` — FOUND (CanvasContainer + App)

---
*Phase: 01-scaffold*
*Completed: 2026-04-14*
