---
phase: quick
plan: 260417-klm
subsystem: input-handling
tags: [bug-fix, keyboard, input-guard, tdd]
dependency_graph:
  requires: []
  provides: [input-element-keyboard-guard]
  affects: [CanvasContainer]
tech_stack:
  added: []
  patterns: [early-return guard on e.target instanceof HTMLInputElement]
key_files:
  modified:
    - src/components/CanvasContainer.tsx
    - src/components/CanvasContainer.test.tsx
decisions:
  - Guard placed as first statement in handleKeyDown, before selectedCell check — ensures all key shortcuts are suppressed when an input has focus regardless of selection state
metrics:
  duration: "3 min"
  completed: "2026-04-17T12:53:19Z"
  tasks: 1
  files: 2
---

# Quick Task 260417-klm Summary

## One-liner

Input-element guard in handleKeyDown blocks Backspace/Delete/Escape when focus is on HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, or contentEditable targets.

## What Was Done

Fixed the bug where pressing Backspace while editing the BPM input (or any other text input) deleted the currently selected shape from the grid.

The global `keydown` listener in `CanvasContainer` was firing on all document key events without checking whether the event originated from a form element. When a user had a cell selected and then typed in the BPM input, pressing Backspace would both edit the input value AND call `removeShape` on the selected cell.

**Fix:** Added an early-return guard at the top of `handleKeyDown` that checks `e.target` against `HTMLInputElement`, `HTMLTextAreaElement`, `HTMLSelectElement`, and `isContentEditable`. If any of these match, the function returns immediately — no keyboard shortcuts fire.

**Guard placement:** Before the `if (!selected) return` check, so the guard applies regardless of whether a cell is currently selected.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 — Guard handleKeyDown | dc50484 | fix(quick-260417-klm): guard handleKeyDown against input-element focus |

## Tests

4 new tests added in `CanvasContainer.test.tsx` under `CanvasContainer — input-element guard (quick-260417-klm)`:

1. Backspace with a non-input div target → `removeShape` IS called (existing behavior preserved)
2. Backspace with `HTMLInputElement` as target → `removeShape` NOT called
3. Delete with `HTMLTextAreaElement` as target → `removeShape` NOT called
4. Escape with `HTMLInputElement` as target → `setSelectedCell(null)` NOT called

All 14 tests pass (11 pre-existing + 4 new). No TypeScript errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes introduced.

## Self-Check: PASSED

- [x] `src/components/CanvasContainer.tsx` exists and contains guard
- [x] `src/components/CanvasContainer.test.tsx` exists and contains 4 new guard tests
- [x] Commit dc50484 exists
- [x] `npx vitest run src/components/CanvasContainer.test.tsx` — 14/14 passed
- [x] `npx tsc --noEmit` — no errors
