---
phase: 02-audio-engine
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/store/shapeStore.ts
  - src/store/shapeStore.test.ts
  - src/engine/canvasEngine.ts
  - src/engine/audioEngine.ts
  - src/engine/audioEngine.test.ts
  - src/components/CanvasContainer.tsx
  - src/machine/sequencerMachine.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase delivers the audio engine (pure color-to-audio mapping functions plus Web Audio node graph construction), the canvas rendering engine, the Zustand shape store, the XState sequencer machine, and their React container. The pure math functions in `audioEngine.ts` are well-structured and correctly tested. The store middleware stack and dirty-flag RAF loop are sound. No security vulnerabilities were found.

Five warnings and four info items were identified. The most important is a functional correctness issue: the canvas renders every shape as a circle regardless of `shape.type`, breaking the core visual-audio parity that the project defines as its primary value. Additionally, the `CanvasContainer` effect has a resource-leak path if either engine initializer throws, the `addShape` action has no bounds validation, and the module-level `voices` Map / `cachedPulseWave` cache can behave unexpectedly across React StrictMode double-invocations.

---

## Warnings

### WR-01: All shapes render as circles — `shape.type` ignored in `drawShapes`

**File:** `src/engine/canvasEngine.ts:125-129`
**Issue:** `drawShapes` calls `ctx.arc(...)` unconditionally for every shape regardless of `shape.type`. The six shape types (circle, triangle, square, diamond, star, blob) are acoustically distinct — each type maps to a different waveform — but visually they are identical circles. This violates the project's stated core value: "Any change to the visual canvas is an immediate, audible change to the music — seeing and hearing are the same act."
**Fix:** Add a per-type rendering dispatch inside `drawShapes`. Example skeleton:

```typescript
function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, cx: number, cy: number, radius: number): void {
  ctx.beginPath()
  switch (shape.type) {
    case 'circle':
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      break
    case 'square': {
      const half = radius
      ctx.rect(cx - half, cy - half, half * 2, half * 2)
      break
    }
    case 'triangle':
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * 0.866, cy + radius * 0.5)
      ctx.lineTo(cx - radius * 0.866, cy + radius * 0.5)
      ctx.closePath()
      break
    // ... diamond, star, blob
  }
}
```

---

### WR-02: Resource leak in `CanvasContainer` when either engine initializer throws

**File:** `src/components/CanvasContainer.tsx:17-27`
**Issue:** The `useEffect` calls `initCanvasEngine` then `initAudioEngine` sequentially. If `initCanvasEngine` throws (possible — it throws explicitly when a 2D context is unavailable), the effect body exits before the `return () => {...}` cleanup is ever registered, which is expected React behavior. However if `initCanvasEngine` succeeds and `initAudioEngine` throws, `destroyCanvas` is captured but the effect return is never set, so the canvas RAF loop, store subscription, and ResizeObserver are never cleaned up.

```typescript
// Current — if initAudioEngine() throws, destroyCanvas() is never called on unmount
const destroyCanvas = initCanvasEngine({ canvas, container })
const destroyAudio = initAudioEngine()
return () => {
  destroyCanvas()
  destroyAudio()
}
```

**Fix:** Wrap in try/finally or guard with a flag:

```typescript
const destroyCanvas = initCanvasEngine({ canvas, container })
let destroyAudio: (() => void) | null = null
try {
  destroyAudio = initAudioEngine()
} catch (err) {
  console.error('[CanvasContainer] audio engine init failed:', err)
}
return () => {
  destroyCanvas()
  destroyAudio?.()
}
```

---

### WR-03: No bounds validation on `addShape` — invalid grid coordinates accepted silently

**File:** `src/store/shapeStore.ts:36-50`
**Issue:** `addShape(col, row)` only checks for occupancy; it does not validate that `col` and `row` are within the 0–3 range. Any caller that passes out-of-range values (e.g., `addShape(-1, 5)`) creates a `Shape` that the canvas engine will attempt to render at a negative or off-grid pixel position. `cellAtPoint` always returns values in [0,3] so the current single call-site is safe, but the store makes no contract guarantee.
**Fix:** Add a guard at the top of the `addShape` setter:

```typescript
addShape: (col: number, row: number) =>
  set((state) => {
    if (col < 0 || col > 3 || row < 0 || row > 3) return  // out-of-bounds guard
    const occupied = state.shapes.some((s) => s.col === col && s.row === row)
    ...
  }),
```

---

### WR-04: `cachedPulseWave` tied to old `AudioContext` after destroy/re-init

**File:** `src/engine/audioEngine.ts:123-137`
**Issue:** `cachedPulseWave` is a module-level variable. `destroy()` correctly sets it to `null` and closes the old `AudioContext`. However, if a new `initAudioEngine()` call is made before `destroy()` has run (which happens in React StrictMode: mount → mount → unmount → unmount sequence under dev double-invocation), a race can leave `cachedPulseWave` pointing to a `PeriodicWave` created against a closed context. `getPulseWave` checks `if (cachedPulseWave) return cachedPulseWave` — it does not verify whether the cached wave was created by the current `audioCtx`, so the next diamond-shape voice creation could pass a stale `PeriodicWave` to a fresh `AudioContext`.

**Fix:** Tie the cache to the context instance:

```typescript
let cachedPulseCtx: AudioContext | null = null
let cachedPulseWave: PeriodicWave | null = null

function getPulseWave(ctx: AudioContext): PeriodicWave {
  if (cachedPulseWave && cachedPulseCtx === ctx) return cachedPulseWave
  // ... build wave ...
  cachedPulseCtx = ctx
  cachedPulseWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  return cachedPulseWave
}
```

---

### WR-05: `prevShapeIds` is populated but never read — voice removal is silently unimplemented

**File:** `src/engine/audioEngine.ts:239-251`
**Issue:** The `initAudioEngine` subscriber allocates and updates `prevShapeIds` on every store change, but never uses it. The removal detection comment says "Phase 3" — that is fine as a deferral — but the variable is dead code that consumes allocation and creates confusion. More practically, because there is no removal path at all, shapes placed on the canvas never stop their audio nodes. Every placed shape's oscillator runs indefinitely until `destroy()` is called on the whole engine. If a user fills all 16 cells, all 16 voices play simultaneously with no way to silence individual ones until component unmount.

**Fix (minimal):** Remove the dead variable until the removal feature is built:

```typescript
const unsubscribe = shapeStore.subscribe((state) => {
  const curr = state.shapes
  for (const shape of curr) {
    if (!voices.has(shape.id)) {
      createVoice(shape)
    }
  }
  // TODO Phase 3: detect removed shapes and stop/disconnect their voices
})
```

If leaving the variable is intentional as a Phase 3 scaffold, document that the current behavior is "voices accumulate and are only stopped on full engine destroy."

---

## Info

### IN-01: Duplicate import of `canvasEngine` module in `CanvasContainer`

**File:** `src/components/CanvasContainer.tsx:6-7`
**Issue:** `initCanvasEngine` and `cellAtPoint` are both exported from `'../engine/canvasEngine'` but imported in two separate `import` statements. This is a cosmetic issue (bundlers deduplicate) but should be a single statement.

```typescript
// Current
import { initCanvasEngine } from '../engine/canvasEngine'
import { cellAtPoint } from '../engine/canvasEngine'

// Fix
import { initCanvasEngine, cellAtPoint } from '../engine/canvasEngine'
```

---

### IN-02: `void sequencerActor` no-op reference in `canvasEngine.ts`

**File:** `src/engine/canvasEngine.ts:72`
**Issue:** `void sequencerActor` is used to silence a "declared but never used" TypeScript/lint warning. While the comment explains the intent (preparing for Phase 2), this pattern is fragile — it imports and auto-starts the XState singleton actor as a module side-effect even in unit test environments. Tests of `canvasEngine` will start the sequencer actor as a side effect. Consider instead adding a `// eslint-disable-next-line @typescript-eslint/no-unused-vars` comment, or deferring the import until Phase 2 actually uses the actor.

---

### IN-03: `masterGain!` non-null assertion relies on implicit invariant

**File:** `src/engine/audioEngine.ts:159`
**Issue:** `const mg = masterGain!` assumes that `getAudioContext()` always sets `masterGain` when it returns a non-null context. This invariant holds today, but a future refactor of `getAudioContext()` could violate it without a compile-time error. The non-null assertion suppresses the type guard.

**Fix:** Assert explicitly with an early return:

```typescript
const ctx = getAudioContext()
if (!ctx || !masterGain) return
const mg = masterGain
```

---

### IN-04: Sequencer machine has no transitions — all events are silently swallowed

**File:** `src/machine/sequencerMachine.ts:23-31`
**Issue:** All states have `on: {}`, meaning every dispatched event is silently ignored. The initial `'playing'` state accepts no `PLAY`, `STOP`, or any other event. This is documented as intentional stub work, but it means `sequencerActor.send({ type: 'PLAY' })` is a silent no-op with no console warning. Future phases wiring events to this actor will get no feedback if sends are misconfigured.

No code change needed now (deferred is the right call for a PoC), but when Phase 5 implements transitions, ensure at minimum the `playing` state handles `STOP` and the `idle` state handles `PLAY`.

---

_Reviewed: 2026-04-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
