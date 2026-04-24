---
phase: 03-canvas-interaction
plan: "03"
subsystem: input-layer
tags: [click-routing, keyboard-shortcuts, audio-cleanup, selectionStore, TDD]
dependency_graph:
  requires:
    - 03-01-PLAN.md (selectionStore, removeShape)
    - 03-02-PLAN.md (CellPanel — consumes selectionStore)
  provides:
    - CanvasContainer click routing to selectionStore
    - Document-level keyboard shortcuts (Escape, Delete, Backspace)
    - audioEngine voice removal with gain ramp-out
  affects:
    - src/components/CanvasContainer.tsx
    - src/components/CanvasContainer.test.tsx
    - src/engine/audioEngine.ts
tech_stack:
  added: []
  patterns:
    - Document-level keydown useEffect with [] deps reads store synchronously (no stale closure)
    - Gain ramp-out via setTargetAtTime(0, t, τ=0.015) + setTimeout(60ms) to prevent click artifact
    - prevShapeIds Set diff for removal detection in subscribe callback
key_files:
  created: []
  modified:
    - src/components/CanvasContainer.tsx
    - src/components/CanvasContainer.test.tsx
    - src/engine/audioEngine.ts
decisions:
  - Click handler routes to selectionStore.setSelectedCell instead of shapeStore.addShape — decouples input from shape creation
  - Same-cell click guard uses synchronous getState().selectedCell read — no stale closure risk
  - Keyboard handler mounted in useEffect([]) reads store synchronously inside handler — Pitfall 1 avoided
  - gain.setTargetAtTime(τ=0.015) + setTimeout(60ms) for voice removal — 4τ ≈ 60ms reduces gain to <2% before stop
  - prevShapeIds updated using already-built currIds Set (not re-computed via .map) — minor efficiency
metrics:
  duration: "2 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 03: Input Layer (CanvasContainer Refactor + Audio Voice Removal) Summary

**One-liner:** Click routing redirected from addShape to selectionStore with document-level Escape/Delete/Backspace shortcuts and gain-ramp-out voice destruction in audioEngine.

## What Was Built

Two targeted changes completing the Phase 3 input layer:

1. **CanvasContainer refactor** (`src/components/CanvasContainer.tsx`) — `handleClick` now calls `selectionStore.getState().setSelectedCell(cell)` instead of `shapeStore.getState().addShape`. A same-cell guard prevents redundant store updates. A new `useEffect([], [])` mounts a document-level `keydown` handler that reads the store synchronously (no stale closure): `Escape` clears selection, `Delete`/`Backspace` removes the shape at the selected cell and clears selection, empty-cell delete is a no-op. Hint text updated to "Click any cell to select it".

2. **audioEngine voice removal** (`src/engine/audioEngine.ts`) — The `shapeStore.subscribe` callback now diffs `prevShapeIds` against the new `currIds` Set. For each removed ID, `voice.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015)` ramps gain to near-zero over ~60ms, then a `setTimeout(60ms)` stops the oscillator/noiseSource, disconnects the gainNode, and deletes the entry from the `voices` Map. This prevents the audible click artifact that occurs when audio nodes are stopped abruptly.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor CanvasContainer — click routing + keyboard handler | 9c56220 | src/components/CanvasContainer.tsx, src/components/CanvasContainer.test.tsx |
| 2 | Extend audioEngine to detect and destroy removed voices | b86938c | src/engine/audioEngine.ts |

## Test Results

- `npx vitest run` — 60 tests across 6 files, all passing
- 10 CanvasContainer tests: all pass (click-to-select + keyboard shortcuts suite)
- 17 audioEngine tests: all pass (existing tests unmodified, still green)
- Full suite: 60/60 green

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Route clicks to selectionStore not addShape | Decouples input from shape creation — selection is now a first-class concept per Phase 3 design |
| keydown useEffect reads store synchronously | Avoids stale closure (RESEARCH.md Pitfall 1) — `selectionStore.getState()` always returns current state at event time |
| gain.setTargetAtTime(τ=0.015) + 60ms timeout | RC decay prevents click artifact (RESEARCH.md Pitfall 2, Pattern 5) — 4τ=60ms brings gain below 2% before stop |
| Delete on empty cell is no-op (no selection clear) | Consistent with expectation: if nothing to remove, no state change |
| prevShapeIds = new Set(currIds) not .map re-computation | currIds already built above — reuse avoids redundant iteration |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or TODO stubs in the delivered files.

## Threat Flags

No new security-relevant surface introduced beyond the threat model documented in the plan:

- `T-03-07`: document keydown handler — only hardcoded key strings trigger mutations; no user-controlled string evaluated
- `T-03-08`: audioEngine setTimeout (16 max timers at 60ms) — bounded by polyphony limit, negligible
- `T-03-09`: voice removal keyed by crypto.randomUUID() IDs — not externally injectable

## Self-Check: PASSED

- [x] `src/components/CanvasContainer.tsx` exists and contains `selectionStore.getState().setSelectedCell(cell)` in handleClick
- [x] `src/components/CanvasContainer.tsx` does NOT contain `shapeStore.getState().addShape` in handleClick
- [x] `src/components/CanvasContainer.tsx` contains `document.addEventListener('keydown', handleKeyDown)`
- [x] `src/components/CanvasContainer.tsx` contains `e.key === 'Escape'` and `e.key === 'Delete' || e.key === 'Backspace'`
- [x] `src/components/CanvasContainer.tsx` hint text is "Click any cell to select it"
- [x] `src/engine/audioEngine.ts` contains `for (const id of prevShapeIds)` removal loop
- [x] `src/engine/audioEngine.ts` contains `voice.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015)`
- [x] `src/engine/audioEngine.ts` contains `setTimeout(` with 60ms and `voices.delete(id)` inside
- [x] `src/engine/audioEngine.ts` uses `new Set(currIds)` (not `.map` re-computation) for prevShapeIds update
- [x] Commit 9c56220 exists (Task 1)
- [x] Commit b86938c exists (Task 2)
- [x] `npx vitest run` exits 0 — 60 tests passing
