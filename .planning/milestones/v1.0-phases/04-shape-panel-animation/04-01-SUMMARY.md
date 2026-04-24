---
phase: "04-shape-panel-animation"
plan: "01"
subsystem: "data-layer"
tags: [shapeStore, drawShape, immer, tdd, wave-1]
dependency_graph:
  requires:
    - "04-00 (Wave 0 test scaffolds)"
  provides:
    - "Shape interface with size and animRate fields"
    - "ShapeState.updateShape Immer action"
    - "src/engine/drawShape.ts pure helper for all 6 shape types"
  affects:
    - "04-02 (Wave 2 — audioEngine LFO reads shape.size and shape.animRate)"
    - "04-03 (Wave 3 — CellPanel/ShapeTypeSelector import drawShape for previews)"
    - "src/engine/canvasEngine.ts (Wave 2 will use shape.size to compute radius)"
tech_stack:
  added: []
  patterns:
    - "Immer Object.assign mutation on draft array element — shapeStore updateShape pattern"
    - "Pure canvas helper function — no store/audio imports, usable by both engine and UI"
    - "TDD RED->GREEN: Wave 0 null-stub tests replaced with real static imports after file creation"
key_files:
  created:
    - src/engine/drawShape.ts
  modified:
    - src/store/shapeStore.ts
    - src/engine/drawShape.test.ts
decisions:
  - "Immer Object.assign on draft accepted: Immer wraps the found shape in a proxy draft, so Object.assign(shape, patch) mutates it correctly without needing manual field-by-field assignment"
  - "drawShape test updated from null-stub to real static import: Wave 0 null-stub pattern replaced with `import { drawShape as importedDrawShape } from './drawShape'` — tests now fully execute (no skip guards triggered)"
metrics:
  duration: "5 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 3
---

# Phase 04 Plan 01: Wave 1 Data Layer Summary

Shape interface extended with size/animRate fields and updateShape Immer action; new pure drawShape helper rendering all 6 shape types via canvas path operations.

## What Was Built

### Task 1: Extend Shape interface and add updateShape to shapeStore

**src/store/shapeStore.ts** — three targeted changes:

1. `Shape` interface gains `size: number` (0-100, default 50) and `animRate: number` (0.1-10, default 1.0). These are the per-shape data fields that Wave 2 (canvasEngine radius multiplier, audioEngine LFO) and Wave 3 (CellPanel sliders) will read and write.

2. `ShapeState` interface gains `updateShape: (id: string, patch: Partial<Shape>) => void`. This is the single mutation point for all per-shape property changes from the CellPanel.

3. `addShape` push now includes `size: 50` and `animRate: 1.0` in the pushed object literal. Ensures all new shapes start with correct defaults.

4. `updateShape` implementation: Immer `set((state) => { const shape = state.shapes.find(s => s.id === id); if (shape) Object.assign(shape, patch) })`. The `if (shape)` guard makes unknown IDs a no-op.

All 17 shapeStore tests pass (11 pre-existing + 6 new Phase 4 tests from Wave 0).

### Task 2: Create drawShape pure helper for all 6 shape types

**src/engine/drawShape.ts** (new file) — exports a single `drawShape(ctx, cx, cy, radius, type, color)` function:

- `circle`: `ctx.arc` full 2π rotation
- `square`: `ctx.roundRect` with corner radius `radius * 0.15` (Chrome 99+/FF112+/Safari 15.4+)
- `triangle`: equilateral triangle using 0.866 (sin 60°) and 0.5 (cos 60°) factors
- `diamond`: 4-point path with narrower width (`radius * 0.6`) vs height
- `star`: 10-point alternating outer/inner radius loop (inner = `radius * 0.4`)
- `blob`: 60-point lobe path using `r * (1 + 0.25 * sin(6θ))` formula (UI-SPEC Section 6)

Fill: `hsla(h, s%, l%, 0.85)`. Stroke: `hsl(h, s%, l%)` at `lineWidth 1.5`. No save/restore — callers manage transforms.

**src/engine/drawShape.test.ts** updated from null-stub to real static import. All 8 tests now fully execute and pass (6 no-throw type tests + 2 pulseScale formula tests).

## Test Results After Wave 1

| File | Tests | Status |
|------|-------|--------|
| src/store/shapeStore.test.ts | 17 | 17 pass (6 new Phase 4 tests GREEN) |
| src/engine/drawShape.test.ts | 8 | 8 pass (6 type tests now fully execute, not skipping) |
| src/components/CellPanel.test.tsx | 13 | 9 pass, 4 RED (intentional Wave 3 stubs) |
| src/engine/audioEngine.test.ts | 19 | 19 pass (2 skip via typeof guard — Wave 2 pending) |
| src/components/HsvSliders.test.tsx | 7 | 7 pass (all skip — Wave 3 pending) |
| src/components/ShapeTypeSelector.test.tsx | 5 | 5 pass (all skip — Wave 3 pending) |

**Total: 89 pass, 4 RED (all intentional Wave 3 stubs). TypeScript: 0 errors.**

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the exact code specified in the plan's `<action>` blocks. Test infrastructure from Wave 0 worked as designed.

## Known Stubs

No new stubs introduced by this plan. The 4 RED CellPanel tests remain from Wave 0 (intentional — Wave 3 pending).

## Commits

| Hash | Task | Message |
|------|------|---------|
| 9403f63 | Task 1 | feat(04-01): extend Shape interface with size/animRate and add updateShape action |
| 4bd03f3 | Task 2 | feat(04-01): create drawShape pure helper for all 6 shape types |

## Self-Check: PASSED

- [x] src/store/shapeStore.ts contains `size: number` in Shape interface
- [x] src/store/shapeStore.ts contains `animRate: number` in Shape interface
- [x] src/store/shapeStore.ts contains `updateShape: (id: string, patch: Partial<Shape>) => void` in ShapeState
- [x] src/store/shapeStore.ts contains `size: 50,` in addShape push call
- [x] src/store/shapeStore.ts contains `animRate: 1.0,` in addShape push call
- [x] src/store/shapeStore.ts contains `Object.assign(shape, patch)` in updateShape
- [x] src/engine/drawShape.ts exists with `export function drawShape(`
- [x] src/engine/drawShape.ts contains all 6 switch cases
- [x] src/engine/drawShape.ts contains `ctx.roundRect` in square case
- [x] src/engine/drawShape.ts contains `ctx.closePath()` in blob case
- [x] `npx vitest run src/store/shapeStore.test.ts` exits 0 — 17/17 pass
- [x] `npx vitest run src/engine/drawShape.test.ts` exits 0 — 8/8 pass
- [x] `npx tsc --noEmit` exits 0 — 0 TypeScript errors
- [x] Commits 9403f63 and 4bd03f3 exist in git log
