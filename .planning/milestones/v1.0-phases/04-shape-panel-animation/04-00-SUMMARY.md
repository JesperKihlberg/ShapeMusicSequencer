---
phase: "04-shape-panel-animation"
plan: "00"
subsystem: "test-infrastructure"
tags: [vitest, test-scaffold, wave-0, tdd]
dependency_graph:
  requires: []
  provides:
    - vitest.setup.ts canvas mock with roundRect
    - src/engine/drawShape.test.ts scaffold
    - src/components/HsvSliders.test.tsx scaffold
    - src/components/ShapeTypeSelector.test.tsx scaffold
    - src/store/shapeStore.test.ts Phase 4 extension
    - src/components/CellPanel.test.tsx Phase 4 extension
    - src/engine/audioEngine.test.ts Phase 4 extension
  affects:
    - "04-01 (Wave 1 — drawShape + shapeStore implementation)"
    - "04-02 (Wave 2 — audioEngine LFO)"
    - "04-03 (Wave 3 — React panel components)"
tech_stack:
  added: []
  patterns:
    - "Null-stub pattern for Wave 0 scaffolds: test variables set to null, tests skip with `if (!X) return`, avoids Vite transform-time import analysis failure on non-existent files"
key_files:
  created:
    - src/engine/drawShape.test.ts
    - src/components/HsvSliders.test.tsx
    - src/components/ShapeTypeSelector.test.tsx
  modified:
    - vitest.setup.ts
    - src/store/shapeStore.test.ts
    - src/components/CellPanel.test.tsx
    - src/engine/audioEngine.test.ts
decisions:
  - "Null-stub pattern instead of dynamic import: Vite's vite:import-analysis plugin resolves dynamic imports at transform time — `await import('./NonExistent')` crashes even inside try/catch. Use `const X = null` stub instead; tests skip via `if (!X) return`."
  - "drawShape.test.ts shape-type tests pass immediately (skip gracefully with null stub): all 6 type tests return early since drawShape is null, preventing false failures"
  - "audioEngine Phase 4 stubs use `typeof fn !== 'function'` guard: `updateVoiceColor`/`updateVoiceSize` not exported yet — dynamic import of existing file succeeds but named exports are undefined until Wave 2"
metrics:
  duration: "8 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 7
---

# Phase 04 Plan 00: Wave 0 Test Infrastructure Summary

Wave 0 test harness for Phase 4 shape-panel-animation — null-stub scaffolds for all 7 test files with roundRect canvas mock and pulseScale formula tests passing immediately.

## What Was Built

### Task 1: vitest.setup.ts + drawShape + shapeStore scaffolds

- **vitest.setup.ts**: Added `roundRect: () => {}` to the canvas mock object. Required by the `square` shape drawing case in `drawShape.ts` (Wave 1). Without this, any test running `drawShape` with type `'square'` would throw `ctx.roundRect is not a function`.

- **src/engine/drawShape.test.ts** (new file): Wave 0 scaffold with:
  - 6 shape-type no-throw tests (circle, square, triangle, diamond, star, blob) — skip gracefully with `if (!drawShape) return` until Wave 1 creates the file
  - `pulseScale formula` describe block with 2 pure-math tests — pass immediately (no dependency on production code)

- **src/store/shapeStore.test.ts** (extended): New `describe('shapeStore — Phase 4 fields and updateShape')` block with 6 tests covering `size=50` default, `animRate=1.0` default, `updateShape` color/size/animRate patches, and no-op behavior for unknown ids. RED until Wave 1 adds `size`, `animRate`, and `updateShape` to the store.

### Task 2: HsvSliders, ShapeTypeSelector, CellPanel, audioEngine scaffolds

- **src/components/HsvSliders.test.tsx** (new file): 7 tests for label rendering, range input count, min/max attributes, and onChange callbacks. All skip via `if (!HsvSliders) return` until Wave 3.

- **src/components/ShapeTypeSelector.test.tsx** (new file): 5 tests for button count, aria-labels, aria-pressed, and onClick. All skip until Wave 3.

- **src/components/CellPanel.test.tsx** (extended): New `describe('CellPanel — Phase 4 occupied mode controls')` block with 5 tests covering Hue/Size/Rate sliders, 6 shape type buttons, and Remove Shape button. 4 are RED until Wave 3; 1 (Remove Shape) passes immediately.

- **src/engine/audioEngine.test.ts** (extended): Two new describe blocks for `updateVoiceColor (Phase 4)` and `updateVoiceSize (Phase 4)`. Each has one test that guards with `typeof fn !== 'function'` — skips until Wave 2 adds the exports.

## Test Results After Wave 0

| File | Tests | Status |
|------|-------|--------|
| vitest.setup.ts | (mock, no tests) | — |
| src/engine/drawShape.test.ts | 8 | 8 pass (6 skip via null guard, 2 pure math pass) |
| src/store/shapeStore.test.ts | 17 | 11 pass (pre-existing), 6 RED (Wave 1 pending) |
| src/components/HsvSliders.test.tsx | 7 | 7 pass (all skip via null guard) |
| src/components/ShapeTypeSelector.test.tsx | 5 | 5 pass (all skip via null guard) |
| src/components/CellPanel.test.tsx | 13 | 9 pass, 4 RED (Wave 3 pending) |
| src/engine/audioEngine.test.ts | 19 | 19 pass (2 skip via typeof guard) |

**Pre-existing tests: all 83 pass. New RED tests: 10 (all intentional — Wave 1/2/3 pending).**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Null-stub pattern instead of dynamic import for Vite compatibility**
- **Found during:** Task 1 (drawShape.test.ts initial implementation), Task 2 (HsvSliders/ShapeTypeSelector)
- **Issue:** Plan specified `beforeAll(async () => { const mod = await import('./NonExistentFile') })`. Vite's `vite:import-analysis` plugin resolves all dynamic imports at transform time — even inside try/catch — and throws `Error: Failed to resolve import` before any test runs. This makes the entire test file crash rather than tests skipping gracefully.
- **Fix:** Replaced dynamic import pattern with `const X = null` stub. Tests skip with `if (!X) return`. Once Wave 1/3 creates the files, the stub is replaced with a real static import.
- **Files modified:** `src/engine/drawShape.test.ts`, `src/components/HsvSliders.test.tsx`, `src/components/ShapeTypeSelector.test.tsx`
- **Commits:** `1935fdc`, `e581501`

**2. [Rule 1 - Bug] audioEngine Phase 4 stubs use typeof guard instead of destructuring**
- **Found during:** Task 2 first verification run
- **Issue:** `const { updateVoiceColor } = await import('./audioEngine')` destructures to `undefined` when the named export doesn't exist, then `expect(() => updateVoiceColor(...)).not.toThrow()` throws `TypeError: updateVoiceColor is not a function`.
- **Fix:** Import as `const mod = await import('./audioEngine') as any` then `if (typeof mod.updateVoiceColor !== 'function') return` to skip gracefully.
- **Files modified:** `src/engine/audioEngine.test.ts`
- **Commit:** `e581501`

## Known Stubs

All Phase 4 scaffold tests are intentional stubs — they represent the TDD contract for Waves 1–3. No unintentional stubs.

| Stub | File | Reason |
|------|------|--------|
| `const drawShape = null` | src/engine/drawShape.test.ts | Wave 1 creates src/engine/drawShape.ts |
| `const HsvSliders = null` | src/components/HsvSliders.test.tsx | Wave 3 creates HsvSliders.tsx |
| `const ShapeTypeSelector = null` | src/components/ShapeTypeSelector.test.tsx | Wave 3 creates ShapeTypeSelector.tsx |
| Phase 4 shapeStore tests RED | src/store/shapeStore.test.ts | Wave 1 adds size/animRate/updateShape |
| CellPanel Phase 4 tests RED | src/components/CellPanel.test.tsx | Wave 3 replaces occupied mode |
| audioEngine Phase 4 tests skip | src/engine/audioEngine.test.ts | Wave 2 adds updateVoiceColor/updateVoiceSize |

## Commits

| Hash | Task | Message |
|------|------|---------|
| 1935fdc | Task 1 | test(04-00): Wave 0 scaffold — vitest.setup.ts roundRect + drawShape + shapeStore stubs |
| e581501 | Task 2 | test(04-00): Wave 0 scaffold — HsvSliders, ShapeTypeSelector, CellPanel, audioEngine stubs |

## Self-Check: PASSED

- [x] vitest.setup.ts contains `roundRect: () => {}`
- [x] src/engine/drawShape.test.ts exists and contains `describe('drawShape'`
- [x] src/engine/drawShape.test.ts contains `describe('pulseScale formula'`
- [x] src/store/shapeStore.test.ts contains `describe('shapeStore — Phase 4 fields and updateShape'`
- [x] src/components/HsvSliders.test.tsx exists and contains `describe('HsvSliders'`
- [x] src/components/ShapeTypeSelector.test.tsx exists and contains `describe('ShapeTypeSelector'`
- [x] src/components/CellPanel.test.tsx contains `describe('CellPanel — Phase 4 occupied mode controls'`
- [x] src/engine/audioEngine.test.ts contains `describe('updateVoiceColor (Phase 4)'`
- [x] src/engine/audioEngine.test.ts contains `describe('updateVoiceSize (Phase 4)'`
- [x] Commits 1935fdc and e581501 exist in git log
- [x] pulseScale formula tests pass (pure math, no dependency)
- [x] All 83 pre-existing tests pass
