---
phase: "04-shape-panel-animation"
plan: "02"
subsystem: "canvas-engine"
tags: [canvasEngine, animation, pulseScale, drawShape, tdd, wave-2]
dependency_graph:
  requires:
    - "04-01 (Wave 1 — drawShape helper + shapeStore size/animRate fields)"
  provides:
    - "canvasEngine.ts uses drawShape for all 6 shape types"
    - "pulseScale formula (D-12) applied per shape each RAF frame"
    - "dirty-flag fix for continuous animation when shapes are present"
  affects:
    - "04-03 (Wave 3 — audioEngine LFO + CellPanel controls)"
tech_stack:
  added: []
  patterns:
    - "pulseScale per-shape time-based animation: 1 + 0.4 * sin(2π * animRate * t)"
    - "dirty-flag always-true pattern when shapes.length > 0 for continuous RAF animation"
    - "cellSize rename to avoid shadowing shape.size in drawShapes scope"
key_files:
  created: []
  modified:
    - src/engine/canvasEngine.ts
decisions:
  - "Renamed local 'size' to 'cellSize' in drawShapes() to avoid variable shadowing — shape.size is now readable within the loop without ambiguity"
  - "dirty-flag set true every frame when shapes.length > 0 — store subscriptions alone were insufficient for continuous pulseScale animation"
  - "drawShape call uses ctx (non-null asserted by the if (!ctx) return guard above) — no ctx! non-null assertion needed"
metrics:
  duration: "5 min"
  completed: "2026-04-16"
  tasks_completed: 1
  files_changed: 1
---

# Phase 04 Plan 02: Wave 2 Canvas Engine Summary

canvasEngine updated to use drawShape helper for all 6 shape types; pulseScale formula (1 + 0.4 * sin(2π * animRate * t)) applied per shape every RAF frame; dirty-flag ensures continuous animation when any shape is present.

## What Was Built

### Task 1: Update canvasEngine — drawShape import, pulseScale formula, dirty-flag fix

**src/engine/canvasEngine.ts** — four targeted changes:

1. **Import drawShape**: Added `import { drawShape } from './drawShape'` at line 11, after existing store/machine imports. This wires the Wave 1 pure helper into the canvas engine.

2. **Replaced drawShapes() body**: The previous implementation hardcoded a circle arc for every shape. The new implementation:
   - Renames local `size` → `cellSize` to avoid shadowing `shape.size` within the loop
   - Computes `const t = performance.now() / 1000` once before the shape loop
   - Per shape: computes `pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t)`
   - Per shape: computes `radius = Math.floor(cellSize * 0.35 * (shape.size / 50) * pulseScale)`
   - Calls `drawShape(ctx, cx, cy, radius, shape.type, shape.color)` — renders all 6 types
   - At default `size=50` and `animRate=1.0`, the formula reduces to `cellSize * 0.35 * 1.0 * pulseScale`, which at `t=0` gives the same static radius as the Phase 3 circle (no visual regression at rest)

3. **Dirty-flag fix**: Added `if (shapeStore.getState().shapes.length > 0) dirty = true` at the top of `render()`, before the `if (!dirty) return` guard. This ensures continuous redraws every RAF frame when shapes are present — without it, `pulseScale` would only update when the user interacts with the store (shapes would freeze between interactions).

4. **Preserved invariants**: Grid drawing code, selection highlight code, `ctx.setTransform(dpr, ...)`, and `void sequencerActor` are all unchanged.

## Test Results After Wave 2

| File | Tests | Status |
|------|-------|--------|
| src/engine/canvasEngine.test.ts | 8 | 8 pass |
| src/engine/drawShape.test.ts | 8 | 8 pass |
| src/store/shapeStore.test.ts | 17 | 17 pass |
| src/components/CellPanel.test.tsx | 13 | 9 pass, 4 RED (intentional Wave 3 stubs) |
| src/engine/audioEngine.test.ts | 19 | 19 pass (2 skip via typeof guard — Wave 3 pending) |
| src/components/HsvSliders.test.tsx | 7 | 7 pass (all skip — Wave 3 pending) |
| src/components/ShapeTypeSelector.test.tsx | 5 | 5 pass (all skip — Wave 3 pending) |

**Total: 89 pass, 4 RED (all intentional Wave 3 stubs). TypeScript: 0 errors.**

## Deviations from Plan

None — plan executed exactly as written. The exact code specified in the plan's `<action>` block was applied without modification.

## Known Stubs

No new stubs introduced by this plan. The 4 RED CellPanel tests remain from Wave 0 (intentional — Wave 3 pending). No unintentional stubs.

## Commits

| Hash | Task | Message |
|------|------|---------|
| 328f42a | Task 1 | feat(04-02): update canvasEngine — drawShape import, pulseScale formula, dirty-flag fix |

## Self-Check: PASSED

- [x] src/engine/canvasEngine.ts contains `import { drawShape } from './drawShape'`
- [x] src/engine/canvasEngine.ts contains `const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t)`
- [x] src/engine/canvasEngine.ts contains `const radius = Math.floor(cellSize * 0.35 * (shape.size / 50) * pulseScale)`
- [x] src/engine/canvasEngine.ts contains `drawShape(ctx, cx, cy, radius, shape.type, shape.color)` (no more hardcoded arc)
- [x] src/engine/canvasEngine.ts does NOT contain `ctx.arc(cx, cy, radius, 0` in drawShapes function
- [x] src/engine/canvasEngine.ts contains `if (shapeStore.getState().shapes.length > 0) dirty = true` in render()
- [x] src/engine/canvasEngine.ts does NOT contain `const radius = Math.floor(size * 0.35)`
- [x] `npx vitest run src/engine/canvasEngine.test.ts` exits 0 — 8/8 pass
- [x] `npx vitest run src/store/shapeStore.test.ts` exits 0 — 17/17 pass
- [x] `npx tsc --noEmit` exits 0 — 0 TypeScript errors
- [x] Commit 328f42a exists in git log
