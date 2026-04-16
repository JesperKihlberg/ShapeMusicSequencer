---
phase: 03-canvas-interaction
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/App.tsx
  - src/components/CanvasContainer.test.tsx
  - src/components/CanvasContainer.tsx
  - src/components/CellPanel.test.tsx
  - src/components/CellPanel.tsx
  - src/engine/audioEngine.ts
  - src/engine/canvasEngine.ts
  - src/store/selectionStore.test.ts
  - src/store/selectionStore.ts
  - src/store/shapeStore.test.ts
  - src/store/shapeStore.ts
  - src/styles/index.css
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 3 implements click-to-select interaction, CellPanel sidebar (add/remove shapes), keyboard shortcuts (Escape, Delete/Backspace), and audio voice lifecycle (create on add, ramp-out and stop on remove). The architecture is sound — vanilla Zustand stores accessed synchronously outside React, dirty-flag RAF loop, and correct use-gesture AudioContext initialization.

Three warnings are worth addressing before the next phase: the canvas engine initialization can throw an unhandled error that crashes the React tree; all shapes are rendered as circles regardless of their `type` field; and the audio engine's voice-removal `setTimeout` fires after `destroy()` can be called, leaving a small window where disconnect/stop operations run on a cleaned-up engine. Four lower-priority info items round out the findings.

---

## Warnings

### WR-01: Unhandled throw from `initCanvasEngine` crashes the React tree

**File:** `src/components/CanvasContainer.tsx:20`

**Issue:** `initCanvasEngine` explicitly throws when it cannot acquire a 2D rendering context (line 73 of canvasEngine.ts). The `useEffect` in `CanvasContainer` calls it without a try/catch. React does not catch errors thrown inside `useEffect` via an Error Boundary — they bubble to the global unhandled-error handler and crash the component tree with no user-facing message or recovery path.

**Fix:**
```tsx
useEffect(() => {
  const canvas = canvasRef.current
  const container = containerRef.current
  if (!canvas || !container) return
  let destroyCanvas: (() => void) | undefined
  let destroyAudio: (() => void) | undefined
  try {
    destroyCanvas = initCanvasEngine({ canvas, container })
    destroyAudio = initAudioEngine()
  } catch (err) {
    console.error('[CanvasContainer] Engine init failed:', err)
    // Optionally surface a fallback UI via state
    return
  }
  return () => {
    destroyCanvas?.()
    destroyAudio?.()
  }
}, [])
```

---

### WR-02: All shapes rendered as circles — `shape.type` is never consulted in the canvas renderer

**File:** `src/engine/canvasEngine.ts:119-131`

**Issue:** `drawShapes` unconditionally draws every shape using `ctx.arc` (a circle), regardless of `shape.type`. The `ShapeType` union (`circle | triangle | square | diamond | star | blob`) exists in the store and drives audio waveform selection in `audioEngine.ts`, but the canvas renderer ignores it entirely. As a result, placing a `triangle` or `square` shape looks identical to placing a `circle`, breaking the project's core contract: "Any change to the visual canvas is an immediate, audible change to the music — seeing and hearing are the same act." The disconnect also means the six different waveforms in `shapeTypeToWave` have no visual differentiation.

Note: if this is a deliberate PoC staging decision (shapes render as circles until Phase N), a comment explicitly documenting this limitation would prevent future confusion.

**Fix (minimal — document the stub):**
```ts
// TODO(Phase N): render shape geometry by type (triangle, square, star, diamond, blob).
// Currently all types render as a circle. The type field drives audio waveform only.
for (const shape of shapes) {
  // ... existing arc drawing ...
}
```

**Fix (functional):** Add a dispatch on `shape.type` before `ctx.beginPath()` that calls dedicated draw helpers (e.g., `drawCircle`, `drawTriangle`, `drawSquare`, etc.).

---

### WR-03: `setTimeout` voice-cleanup callback can fire after `destroy()` is called

**File:** `src/engine/audioEngine.ts:263-270`

**Issue:** When a shape is removed, the engine schedules a 60 ms `setTimeout` to stop/disconnect the audio nodes after the gain ramp-out. If `destroy()` is called (e.g., React StrictMode double-invoke, fast component unmount) before the 60 ms elapses, `destroy()` calls `voice.oscillator.stop()` and `voices.clear()`. When the timeout fires it then calls `voice.oscillator.stop()` again (caught by `try/catch` — fine) and `voice.gainNode.disconnect()` (no guard, may throw `InvalidStateError` in some browsers if already disconnected), then `voices.delete(id)` on the now-empty map (no-op, harmless).

The immediate risk is a potential `InvalidStateError` from `gainNode.disconnect()` after `destroy()` has already cleaned up, which is unguarded.

**Fix:**
```ts
// Track pending cleanup timers so destroy() can cancel them
const pendingCleanups = new Set<ReturnType<typeof setTimeout>>()

// In the removal loop:
const timerId = setTimeout(() => {
  pendingCleanups.delete(timerId)
  try { voice.oscillator.stop() } catch { /* already stopped */ }
  if (voice.noiseSource) {
    try { voice.noiseSource.stop() } catch { /* already stopped */ }
  }
  try { voice.gainNode.disconnect() } catch { /* already disconnected */ }
  voices.delete(id)
}, 60)
pendingCleanups.add(timerId)

// In destroy():
for (const id of pendingCleanups) clearTimeout(id)
pendingCleanups.clear()
```

---

## Info

### IN-01: No bounds validation in `selectionStore.setSelectedCell`

**File:** `src/store/selectionStore.ts:15`

**Issue:** `setSelectedCell` accepts any `{ col, row }` object with no validation. A caller could pass `{ col: -1, row: 99 }`. The `drawSelection` function in `canvasEngine.ts` would then render a highlight at computed canvas coordinates outside the visible grid — potentially at a negative pixel offset or far offscreen. The `cellAtPoint` function correctly constrains click-derived values to 0–3, but direct store writes (e.g., from tests, future keyboard navigation, or bugs in callers) bypass this.

**Fix:**
```ts
setSelectedCell: (cell) => set({
  selectedCell: cell === null ? null : {
    col: Math.max(0, Math.min(3, cell.col)),
    row: Math.max(0, Math.min(3, cell.row)),
  },
}),
```

---

### IN-02: `shapeTypeToWave` switch has no exhaustiveness guard

**File:** `src/engine/audioEngine.ts:72-81`

**Issue:** The `switch` over `ShapeType` has no `default` branch and no explicit `never` assertion. TypeScript currently infers the return type as `WaveDescriptor` from the explicit cases, but if a new `ShapeType` variant is added to the union in `shapeStore.ts` without updating this function, the TypeScript compiler will not necessarily catch the omission (it depends on whether `noImplicitReturns` is enabled). Adding a `never` assertion makes the exhaustiveness contract explicit and compiler-enforced.

**Fix:**
```ts
export function shapeTypeToWave(type: ShapeType): WaveDescriptor {
  switch (type) {
    case 'circle':   return 'sine'
    case 'triangle': return 'triangle'
    case 'square':   return 'square'
    case 'star':     return 'sawtooth'
    case 'diamond':  return 'pulse'
    case 'blob':     return 'blob'
    default: {
      const _exhaustive: never = type
      throw new Error(`[audioEngine] Unhandled ShapeType: ${_exhaustive}`)
    }
  }
}
```

---

### IN-03: `CellPanel.tsx` imports both vanilla store and hook from the same modules

**File:** `src/components/CellPanel.tsx:6-9`

**Issue:** The file imports `useSelectionStore` and `selectionStore` from `selectionStore.ts`, and `useShapeStore` and `shapeStore` from `shapeStore.ts` — four named imports covering two pairs of hook/vanilla-store from two modules. The pattern is valid (hooks for reactive reads, vanilla stores for imperative writes in event handlers), but the dual-import from the same file is easy to misread. A comment on this pattern would aid future contributors.

**Fix (documentation only):**
```ts
// React hooks for reactive reads (re-render on state change)
import { useSelectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
// Vanilla stores for imperative writes in event handlers (no stale closure risk)
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'
```

---

### IN-04: Default shape color and type are hardcoded — all shapes are identical in appearance and sound

**File:** `src/store/shapeStore.ts:46-49`

**Issue:** Every shape added via `addShape` is assigned `color: { h: 220, s: 70, l: 30 }` and `type: 'circle'`. With these fixed values, all 16 cells on the 4x4 grid produce the same waveform (`sine`) and the same pitch (hue 220 → semitone 7 = G; lightness 30 → octave 3 → G3, ~196 Hz). The "visual composition = sonic composition" core value depends on shapes being distinguishable. This is presumably intentional for the current PoC phase, but the limitation should be documented with a TODO.

**Fix (documentation only):**
```ts
state.shapes.push({
  id: crypto.randomUUID(),
  col,
  row,
  // TODO(Phase N): derive initial color and type from grid position or user palette.
  // Currently all shapes default to the same color/type, producing identical audio voices.
  color: { h: 220, s: 70, l: 30 },
  type: 'circle',
})
```

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
