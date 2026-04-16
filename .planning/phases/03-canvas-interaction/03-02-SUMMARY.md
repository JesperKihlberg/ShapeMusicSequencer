---
phase: 03-canvas-interaction
plan: "02"
subsystem: ui
tags: [react, zustand, cell-panel, sidebar, tdd, css]
dependency_graph:
  requires:
    - 03-01-PLAN.md (selectionStore, shapeStore.removeShape)
  provides:
    - CellPanel component (empty/occupied modes, Add Shape, Remove Shape)
    - App.tsx flex-row canvas area layout with panel wrapper
    - CSS classes for panel, buttons, and property rows
  affects:
    - src/components/CellPanel.tsx
    - src/components/CellPanel.test.tsx
    - src/App.tsx
    - src/styles/index.css
tech_stack:
  added: []
  patterns:
    - TDD (RED→GREEN) for React component with store interactions
    - useMemo on Zustand selector to avoid unnecessary re-renders
    - display:none toggle on panel wrapper to prevent layout shift (Pitfall 4)
    - shapeStore.getState() / selectionStore.getState() called directly in button handlers (not closures)
key_files:
  created:
    - src/components/CellPanel.tsx
    - src/components/CellPanel.test.tsx
  modified:
    - src/App.tsx
    - src/styles/index.css
decisions:
  - useMemo wraps selectShapeAt selector to stabilize function reference across renders
  - display:none on cell-panel-wrapper (not conditional rendering) per UI-SPEC Pitfall 4 — prevents canvas layout shift
  - handleRemoveShape calls removeShape then setSelectedCell(null) in that order (D-10)
  - CellPanel returns null when selectedCell is null (guard even though wrapper has display:none)
metrics:
  duration: "3 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 02: CellPanel Component + App Layout Summary

**One-liner:** CellPanel React sidebar with empty/occupied modes wired to selectionStore and shapeStore, App.tsx updated to flex-row canvas area with display:none panel wrapper.

## What Was Built

1. **CellPanel component** (`src/components/CellPanel.tsx`) — Right sidebar panel that reads `selectionStore.selectedCell` and `shapeStore` to render one of three states:
   - **null state:** returns `null` (no render) when no cell is selected
   - **Empty-cell mode:** shows "This cell is empty." text and `+ Add Shape` button with accent border
   - **Occupied-cell mode:** shows Type/Hue/Saturation/Lightness property rows and `Remove Shape` danger button

   Button handlers use `shapeStore.getState()` and `selectionStore.getState()` directly (not closures) to avoid stale state. `useMemo` stabilizes the `selectShapeAt` selector function reference. Remove Shape calls `removeShape` then `setSelectedCell(null)` per D-10.

2. **CellPanel tests** (`src/components/CellPanel.test.tsx`) — 8 tests covering all modes, both button handlers, aria-labels, and property value display. Written TDD (RED commit before GREEN implementation).

3. **App.tsx layout update** — Added `CellPanel` import and `useSelectionStore` hook. `main.canvas-area` now contains `CanvasContainer` and a `cell-panel-wrapper` div. The wrapper uses an inline `display` style toggled by `selectedCell` state to avoid layout shift on the canvas.

4. **CSS additions** (`src/styles/index.css`) — Updated `.canvas-area` to `display: flex; flex-direction: row`. Added all panel classes: `.cell-panel-wrapper` (240px fixed), `.cell-panel`, `.cell-panel__header`, `.cell-panel__title`, `.cell-panel__body`, `.cell-panel__props`, `.cell-panel__prop-row`, `.cell-panel__prop-label`, `.cell-panel__prop-value`, `.cell-panel__divider`, `.cell-panel__empty-text`. Added `.btn`, `.btn--accent`, `.btn--danger` with exact UI-SPEC colors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for CellPanel | af4df9c | src/components/CellPanel.test.tsx |
| 1 (GREEN) | Implement CellPanel component | ffa03ed | src/components/CellPanel.tsx |
| 2 | Update App.tsx layout and add CellPanel CSS | fd4e12e | src/App.tsx, src/styles/index.css |

## Test Results

- `npx vitest run` — 52 tests across 6 files, all passing
- 8 new CellPanel tests: all pass (both modes, button handlers, aria-labels, property values)
- 44 prior tests: all still pass (no regressions)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `useMemo` wraps `selectShapeAt` selector | Prevents new function reference each render; RESEARCH.md open question resolved by applying useMemo |
| `display:none` on wrapper (not conditional rendering) | Prevents canvas layout shift per UI-SPEC Pitfall 4; 240px panel stays in DOM |
| `shapeStore.getState()` in button handlers | Reads current store state synchronously — no stale closure, consistent with RESEARCH.md Pattern 6/7 |
| `CellPanel` returns `null` when no cell selected | Redundant guard alongside display:none wrapper — defensive coding practice |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — CellPanel reads real data from shapeStore and selectionStore. Property values (Type, Hue, Saturation, Lightness) display actual shape data.

## Threat Flags

No new security-relevant surface introduced. CellPanel is a pure read/write component operating on in-memory client-only state. All col/row values come from selectionStore which is set by cellAtPoint (0-3 range clamped). No network calls, no user-supplied free-text, no PII.

## Self-Check: PASSED

- [x] `src/components/CellPanel.tsx` exists and contains `export function CellPanel`
- [x] `src/components/CellPanel.tsx` contains `role="complementary"` and `aria-label="Cell editor"`
- [x] `src/components/CellPanel.tsx` contains `useSelectionStore`
- [x] `src/components/CellPanel.tsx` contains `shapeStore.getState().removeShape`
- [x] `src/components/CellPanel.tsx` contains `selectionStore.getState().setSelectedCell(null)`
- [x] `src/components/CellPanel.tsx` contains `+ Add Shape` and `Remove Shape` button labels
- [x] `src/App.tsx` contains `import { CellPanel } from './components/CellPanel'`
- [x] `src/App.tsx` contains `import { useSelectionStore } from './store/selectionStore'`
- [x] `src/App.tsx` contains `<CellPanel />`
- [x] `src/App.tsx` contains `cell-panel-wrapper`
- [x] `src/styles/index.css` contains `.canvas-area` with `display: flex` and `flex-direction: row`
- [x] `src/styles/index.css` contains `.cell-panel-wrapper` with `width: 240px`
- [x] `src/styles/index.css` contains `.btn--accent` and `.btn--danger`
- [x] `src/styles/index.css` contains `.cell-panel__prop-row`
- [x] Commit af4df9c exists (TDD RED — test file)
- [x] Commit ffa03ed exists (TDD GREEN — implementation)
- [x] Commit fd4e12e exists (Task 2 — App.tsx + CSS)
- [x] `npx vitest run` exits 0 — 52 tests passing
