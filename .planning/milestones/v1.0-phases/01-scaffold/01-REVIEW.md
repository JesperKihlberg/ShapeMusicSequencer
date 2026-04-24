---
phase: 01-scaffold
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .gitignore
  - eslint.config.js
  - index.html
  - package.json
  - src/App.tsx
  - src/components/CanvasContainer.test.tsx
  - src/components/CanvasContainer.tsx
  - src/engine/canvasEngine.test.ts
  - src/engine/canvasEngine.ts
  - src/machine/sequencerMachine.ts
  - src/main.tsx
  - src/store/selectors.ts
  - src/store/shapeStore.test.ts
  - src/store/shapeStore.ts
  - src/styles/index.css
  - tsconfig.app.json
  - tsconfig.json
  - tsconfig.node.json
  - vite.config.ts
  - vitest.setup.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 1 scaffolding is well-structured. The React/canvas boundary is cleanly respected — the engine subscribes to the vanilla store directly without touching React hooks, and `CanvasContainer` is the sole integration point. TypeScript strict mode is enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, which is the right posture for a PoC that will grow. The cell math in `cellAtPoint` is correct and thoroughly tested.

Four warnings are raised: a DPR-scaling accumulation bug in `resize()` that will cause incorrect rendering on repeated resizes, a coordinate mismatch between `handleClick` and `cellAtPoint` (canvas-pixel vs. logical-pixel space), a non-null assertion on `getContext('2d')` that will throw an opaque error in unsupported environments, and a missing `test` script in `package.json`. Five info items cover hardcoded magic values, a dead spy setup in one test, missing out-of-bounds input validation in the store, and minor config observations.

---

## Warnings

### WR-01: `ctx.scale(dpr, dpr)` accumulates on every resize — canvas renders at wrong scale after first resize

**File:** `src/engine/canvasEngine.ts:79`

**Issue:** The `resize()` function calls `ctx.scale(dpr, dpr)` directly on the context each time it fires. The canvas 2D context transform is cumulative — it is not reset when `canvas.width` and `canvas.height` are reassigned. Assigning a new pixel size resets the backing store dimensions but does NOT reset the context transform matrix. After two resize events (which happen in development under React StrictMode's double-invoke, or any real window resize), the scale transform doubles, causing the grid and all shapes to render at `dpr²` scale instead of `dpr`. Visually this appears as everything being drawn at 4x scale (on a 2x DPR display), cropped to the top-left corner.

The correct fix is to save/restore around the scale, or — the idiomatic approach — apply the DPR scale inside `render()` rather than in `resize()`, using `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` to set an absolute transform before drawing each frame.

**Fix:**
```typescript
// In render(), replace the bare fillRect block at the top:
function render(): void {
  if (!dirty) return
  dirty = false
  const dpr = window.devicePixelRatio || 1
  const logicalW = canvas.width / dpr
  const logicalH = canvas.height / dpr
  // Reset transform to identity then apply DPR scale — prevents accumulation
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#111113'
  ctx.fillRect(0, 0, logicalW, logicalH)
  drawGrid(logicalW, logicalH)
  drawShapes(shapeStore.getState().shapes, logicalW, logicalH)
}

// In resize(), remove the ctx.scale call:
function resize(): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = container.clientWidth * dpr
  canvas.height = container.clientHeight * dpr
  // Do NOT call ctx.scale here — render() sets the transform each frame
  dirty = true
}
```

---

### WR-02: `handleClick` passes canvas-pixel coordinates to `cellAtPoint` but uses canvas-pixel canvas dimensions — mismatch with engine's logical-pixel expectation

**File:** `src/components/CanvasContainer.tsx:36`

**Issue:** `handleClick` correctly scales the click position to canvas pixels (`canvasX = (e.clientX - rect.left) * scaleX`), and then passes `canvas.width` / `canvas.height` as the canvas dimensions to `cellAtPoint`. This is internally consistent in isolation. However, it creates a subtle coupling assumption: `cellAtPoint` is called from two distinct contexts — the click handler (canvas-pixel space) and potentially the engine (logical-pixel space in `drawGrid`/`drawShapes`). Right now this works because both the coordinates and the dimensions are in the same space (canvas pixels), but the comment on line 35 says "cellAtPoint works in canvas-pixel space; canvas dimensions already include DPR," which is true. The risk is lower than WR-01, but there is a latent inconsistency: `drawGrid` and `drawShapes` compute cell geometry in logical pixels (`logicalW`, `logicalH`), whereas `cellAtPoint` when called from `handleClick` operates in physical pixels. If a future caller passes logical dimensions (which would be the natural thing to do from the engine), the cell boundaries would be off by a factor of DPR.

The fix is to document the expected coordinate space in `cellAtPoint`'s JSDoc, or to convert the click coordinates to logical pixels before passing them in, making the function unambiguously logical-pixel-only.

**Fix:**
```typescript
// In handleClick, convert to logical pixels before calling cellAtPoint:
function handleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
  const canvas = canvasRef.current
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  // rect dimensions are already in CSS (logical) pixels — no scaling needed
  const logicalX = e.clientX - rect.left
  const logicalY = e.clientY - rect.top
  const logicalW = rect.width
  const logicalH = rect.height
  const cell = cellAtPoint(logicalX, logicalY, logicalW, logicalH)
  if (!cell) return
  shapeStore.getState().addShape(cell.col, cell.row)
}

// Update cellAtPoint JSDoc to specify: all arguments are in logical (CSS) pixels.
```

---

### WR-03: Non-null assertion `canvas.getContext('2d')!` will throw an unreadable runtime error in unsupported environments

**File:** `src/engine/canvasEngine.ts:70`

**Issue:** `const ctx = canvas.getContext('2d')!` uses a TypeScript non-null assertion to suppress the `null` return type. If `getContext` returns `null` (browser with hardware acceleration disabled, some mobile WebViews, certain CI environments), all subsequent `ctx.*` calls will throw `TypeError: Cannot read properties of null`, with no indication of what went wrong. The `!` operator silences the compiler check without providing a runtime safeguard.

**Fix:**
```typescript
const ctx = canvas.getContext('2d')
if (!ctx) {
  // Engine cannot function without a 2D context — fail loudly with a clear message
  throw new Error('[canvasEngine] Failed to acquire 2D rendering context. Hardware acceleration may be disabled.')
}
```

---

### WR-04: No `test` script in `package.json` — `npm test` does not work

**File:** `package.json:6-10`

**Issue:** The `scripts` block contains `dev`, `build`, `lint`, and `preview` but no `test` entry. Running `npm test` falls through to npm's built-in behavior and prints a "no test specified" warning without running Vitest. Any CI pipeline or developer muscle-memory using `npm test` will silently do nothing. The Vitest binary is present as a dev dependency.

**Fix:**
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "preview": "vite preview"
}
```

---

## Info

### IN-01: `'#111113'` background color is a magic string duplicated between CSS tokens and canvas engine

**File:** `src/engine/canvasEngine.ts:136`

**Issue:** The canvas background fill color `'#111113'` is hardcoded directly in `render()`. The same value is defined as `--color-bg-primary: #111113` in `src/styles/index.css`. When the design token is updated in CSS, the canvas background will not follow. For a PoC this is low risk, but as the color system grows this divergence will become a maintenance burden.

**Fix:** Define a shared constant (e.g., in a `src/constants.ts` or `src/theme.ts`) and import it in both the engine and any CSS-in-JS layers. Alternatively, use `getComputedStyle(document.body).getPropertyValue('--color-bg-primary')` in `resize()` to read the token at runtime, though that has a minor perf cost.

---

### IN-02: `color` on `Shape` is hardcoded to `'hsl(220, 70%, 60%)'` for every shape — no variation

**File:** `src/store/shapeStore.ts:40`

**Issue:** Every shape placed by `addShape` receives the same color string. This is expected for Phase 1, but the `color` field on the `Shape` interface signals that per-shape color is part of the design. The hardcoded value means all 16 shapes will be visually identical, making it harder to demonstrate the canvas during Phase 1 reviews. A trivial hue rotation (e.g., `hsl(${(shapes.length * 30) % 360}, 70%, 60%)`) would show the data variation without touching the interface contract.

**Fix:** Not blocking for Phase 1 — document as a Phase 2 task or add a hue-rotation based on current shape count to give visual feedback during PoC demos.

---

### IN-03: Dead spy setup in `CanvasContainer.test.tsx` — `addShapeSpy` is created but its expectations are never checked

**File:** `src/components/CanvasContainer.test.tsx:39-41`

**Issue:** The first test creates `addShapeSpy = vi.spyOn(state, 'addShape')` and calls `shapeStore.setState(state)` to wire the spy in, but then only checks `shapeStore.getState().shapes` rather than asserting `addShapeSpy.toHaveBeenCalledWith(0, 0)`. The spy is unused — the real `addShape` runs (confirmed by the shape count assertion passing), but the spy creation adds noise and suggests a half-completed assertion. Additionally, the `shapeStore.setState(state)` call after spying on a method of `state` is fragile: Zustand's `setState` merges, so whether the spy actually intercepts the component's call depends on whether `getState()` returns the same object reference that was spied on, which is not guaranteed after an Immer mutation.

**Fix:** Either assert on the spy call or remove the spy setup entirely and rely solely on the shape count and `toMatchObject` assertions, which are already sufficient:
```typescript
// Remove lines 39-42 (spy setup) — the assertions on lines 46-48 are complete on their own.
fireEvent.click(canvas, { clientX: 50, clientY: 50 })
expect(shapeStore.getState().shapes).toHaveLength(1)
expect(shapeStore.getState().shapes[0]).toMatchObject({ col: 0, row: 0 })
```

---

### IN-04: `addShape` does not validate that `col`/`row` are within `[0, 3]`

**File:** `src/store/shapeStore.ts:30-44`

**Issue:** `addShape(col, row)` accepts any integer. Calling `addShape(-1, 5)` pushes a shape with out-of-range coordinates into the store. The canvas engine will compute a negative `cx`/`cy` center, drawing the shape partially or entirely off-screen without error. Because `cellAtPoint` already enforces the boundary before dispatching, this cannot be triggered through normal UI interaction in Phase 1. However, once the FSM wires additional event paths (drag, keyboard, undo/redo), callers other than `handleClick` may bypass the boundary check.

**Fix:**
```typescript
addShape: (col: number, row: number) =>
  set((state) => {
    if (col < 0 || col > 3 || row < 0 || row > 3) return  // guard out-of-bounds
    const occupied = state.shapes.some((s) => s.col === col && s.row === row)
    if (!occupied) {
      state.shapes.push({ id: crypto.randomUUID(), col, row, color: 'hsl(220, 70%, 60%)', type: 'circle' })
    }
  }),
```

---

### IN-05: `sequencerActor` is imported and immediately voided — the import is inert in Phase 1

**File:** `src/engine/canvasEngine.ts:9,68`

**Issue:** `sequencerActor` is imported from `'../machine/sequencerMachine'` and suppressed with `void sequencerActor` on line 68. This keeps the import from triggering `noUnusedLocals`, but it also means the actor is imported (and thus started via the module's top-level `sequencerActor.start()` call) simply as a side-effect placeholder. The comment accurately describes the intent, but `void sequencerActor` is an unusual pattern that may confuse contributors unfamiliar with the codebase.

**Fix:** This is acceptable for Phase 1 given the stated intent. For clarity, replace `void sequencerActor` with a named reference comment, or use an eslint-disable-next-line comment with an explanation:
```typescript
// sequencerActor will be read in Phase 2 (getSnapshot().value in RAF loop).
// Reference kept to ensure module is initialized and tsc does not prune the import.
const _sequencerActorPhase2 = sequencerActor
```
Alternatively, leave it and add a `// eslint-disable-next-line @typescript-eslint/no-unused-expressions` with the same explanation. Either approach is fine; the current `void` is not wrong, just terse.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
