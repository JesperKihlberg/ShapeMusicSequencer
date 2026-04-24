---
phase: 01-scaffold
fixed_at: 2026-04-14T00:00:00Z
review_path: .planning/phases/01-scaffold/01-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-14
**Source review:** .planning/phases/01-scaffold/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: ctx.scale(dpr, dpr) accumulates on every resize

**Files modified:** `src/engine/canvasEngine.ts`
**Commit:** 4ad0317
**Applied fix:** Removed `ctx.scale(dpr, dpr)` from `resize()` entirely. Added `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` at the top of `render()` so the transform is reset to an absolute value on every frame, preventing accumulation across repeated resize calls (including React StrictMode's double-invoke in development).

---

### WR-02: handleClick passes canvas-pixel coordinates to cellAtPoint

**Files modified:** `src/components/CanvasContainer.tsx`, `src/engine/canvasEngine.ts`
**Commit:** 82f79cc
**Applied fix:** Rewrote `handleClick` to use logical (CSS) pixel coordinates: `logicalX = e.clientX - rect.left`, `logicalY = e.clientY - rect.top`, `logicalW = rect.width`, `logicalH = rect.height` — eliminating the DPR scale factors entirely. Updated `cellAtPoint` JSDoc to explicitly state that all arguments must be in logical (CSS) pixels, preventing future callers from passing DPR-scaled values.

---

### WR-03: Non-null assertion canvas.getContext('2d')!

**Files modified:** `src/engine/canvasEngine.ts`
**Commit:** ea39e03
**Applied fix:** Replaced `canvas.getContext('2d')!` with an explicit null guard that throws `Error('[canvasEngine] Failed to acquire 2D rendering context. Hardware acceleration may be disabled.')`, giving a clear diagnostic message instead of a cryptic downstream `TypeError`.

---

### WR-04: No test script in package.json

**Files modified:** `package.json`
**Commit:** 1cb6192
**Applied fix:** Added `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` block. `npm test` now invokes Vitest in single-run mode; `npm run test:watch` runs in interactive watch mode.

---

_Fixed: 2026-04-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
