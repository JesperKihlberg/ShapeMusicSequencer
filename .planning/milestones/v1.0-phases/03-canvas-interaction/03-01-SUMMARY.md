---
phase: 03-canvas-interaction
plan: "01"
subsystem: store
tags: [zustand, vanilla-store, selection, removeShape, TDD]
dependency_graph:
  requires: []
  provides:
    - selectionStore (vanilla Zustand, selectedCell state)
    - shapeStore.removeShape action
  affects:
    - src/store/selectionStore.ts
    - src/store/shapeStore.ts
tech_stack:
  added: []
  patterns:
    - Vanilla Zustand createStore (not create) for engine-subscribable stores
    - Immer splice mutation for array removal
    - React hook wrapper (useSelectionStore) matching useShapeStore pattern
key_files:
  created:
    - src/store/selectionStore.ts
    - src/store/selectionStore.test.ts
  modified:
    - src/store/shapeStore.ts
    - src/store/shapeStore.test.ts
decisions:
  - selectionStore uses createStore from zustand/vanilla (not create from zustand) — required for canvasEngine.ts non-React subscription
  - removeShape uses Immer splice mutation matching existing store patterns
  - useSelectionStore hook wrapper added for React component consumption
metrics:
  duration: "2 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 01: Store Foundation (selectionStore + removeShape) Summary

**One-liner:** Vanilla Zustand selectionStore tracking selectedCell with removeShape action added to shapeStore via Immer splice mutation.

## What Was Built

Two foundational store contracts that all Phase 3 downstream plans depend on:

1. **selectionStore** (`src/store/selectionStore.ts`) — New vanilla Zustand store using `createStore` (not `create`) tracking `selectedCell: { col, row } | null`. Includes `setSelectedCell` action and `useSelectionStore` React hook wrapper. The vanilla pattern is required so `canvasEngine.ts` can subscribe outside React.

2. **removeShape action** (`src/store/shapeStore.ts`) — New `removeShape(col, row)` action added to `ShapeState` interface and immer implementation. Uses `findIndex` + `splice` for correct Immer array mutation. No-op when cell is empty.

3. **Pre-existing test fix** (`src/store/shapeStore.test.ts`) — Fixed color assertion from `l: 60` to `l: 30` to match the Phase 2 store default that was never reflected in tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix pre-existing shapeStore test failure (l: 60 → l: 30) | 7dbbfe3 | src/store/shapeStore.test.ts |
| 2 | Add removeShape to shapeStore + create selectionStore with tests | a290674 | src/store/shapeStore.ts, src/store/shapeStore.test.ts, src/store/selectionStore.ts, src/store/selectionStore.test.ts |

## Test Results

- `npx vitest run` — 44 tests across 5 files, all passing
- 7 original shapeStore tests: all pass (including fixed l:30 assertion)
- 4 new removeShape tests: all pass
- 6 new selectionStore tests: all pass (initial state, set, clear, double-set, subscribe, getState)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| createStore (vanilla) for selectionStore | Required for canvasEngine.ts to subscribe outside React — consistent with existing shapeStore pattern |
| Immer splice mutation in removeShape | Matches existing addShape immer pattern; findIndex + splice is correct within immer draft |
| useSelectionStore hook wrapper | Follows useShapeStore pattern — enables React components to subscribe with selector-based re-renders |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or TODO stubs in the delivered files.

## Threat Flags

No new security-relevant surface introduced. Both stores are in-memory client-only state with no network calls, no persistence, and no user-controlled data beyond pre-validated col/row coordinates (0-3 range enforced by cellAtPoint upstream).

## Self-Check: PASSED

- [x] `src/store/selectionStore.ts` exists
- [x] `src/store/selectionStore.test.ts` exists
- [x] `src/store/shapeStore.ts` contains `removeShape` in interface and implementation
- [x] `src/store/shapeStore.test.ts` contains `l: 30` (not `l: 60`)
- [x] Commit 7dbbfe3 exists (Task 1)
- [x] Commit a290674 exists (Task 2)
- [x] `npx vitest run` exits 0 — 44 tests passing
