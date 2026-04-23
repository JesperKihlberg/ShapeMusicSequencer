---
phase: 06-full-visual-language
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/engine/audioEngine.ts
  - src/engine/audioEngine.test.ts
  - src/store/scaleStore.ts
  - src/store/scaleStore.test.ts
  - src/components/ScaleSelector.tsx
  - src/components/ScaleSelector.test.tsx
  - src/components/PlaybackControls.tsx
  - src/App.tsx
  - src/styles/index.css
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Nine files were reviewed covering the Phase 6 additions: scale quantization engine
(`audioEngine.ts`), the new `scaleStore`, the `ScaleSelector` component, and supporting
files (`PlaybackControls`, `App`, CSS, and all tests). The codebase is well-structured
with thorough comments and clear separation of concerns. No security vulnerabilities or
crashes were found.

Two logic bugs were identified in `audioEngine.ts`: a stale-snapshot race in the
type-change path that can cause change detection to miss subsequent property updates, and
an incorrect AudioParam value read in `recreateLfo` that results in a wrong LFO amplitude
when a shape's `animRate` is changed shortly after its `size`. The remaining findings are
informational.

---

## Warnings

### WR-01: Stale snapshot written back to `prevShapes` after 60ms type-change timeout

**File:** `src/engine/audioEngine.ts:488`

**Issue:** When a shape's `type` changes, `shapeSnapshot` is captured synchronously and
`prevShapes` is updated to the current shape on line 493 immediately after the type-change
block. Sixty milliseconds later the `setTimeout` callback fires and overwrites
`prevShapes.set(idToRecreate, shapeSnapshot)` with the stale snapshot (line 488). If the
user changes any other property of the same shape within those 60 ms (e.g., moves the
color slider), the next store subscription callback will compare the new shape against the
60ms-old snapshot rather than the actual previous state. The diff check will therefore see
a spurious "change" (or miss a real change) on the next tick.

**Fix:** Remove the `prevShapes.set` call inside the timeout entirely. The synchronous
`prevShapes.set(shape.id, shape)` on line 493 already records the correct post-change
state. The timeout's only responsibility is tearing down old audio nodes and calling
`createVoice` — `prevShapes` bookkeeping should stay synchronous.

```typescript
setTimeout(() => {
  const v = voices.get(idToRecreate)
  if (v) {
    try { v.oscillator.stop() } catch { /* already stopped */ }
    if (v.noiseSource) try { v.noiseSource.stop() } catch { /* already stopped */ }
    try { v.lfoOscillator.stop() } catch { /* already stopped */ }
    try { v.dcOffset.stop() } catch { /* already stopped */ }
    v.gainNode.disconnect()
    v.panner.disconnect()
    v.lfoGain.disconnect()
    v.dcOffset.disconnect()
    voices.delete(idToRecreate)
    if (audioCtx && audioCtx.state === 'running') {
      createVoice(shapeSnapshot)
    }
    // REMOVED: prevShapes.set(idToRecreate, shapeSnapshot)
    //          prevShapes is already up-to-date from the synchronous set on line 493.
  }
}, 60)
```

---

### WR-02: `recreateLfo` reads stale AudioParam value after a scheduled ramp

**File:** `src/engine/audioEngine.ts:400`

**Issue:** `recreateLfo` reads `voice.dcOffset.offset.value` to derive the base gain for
the new LFO amplitude. In the Web Audio API, `AudioParam.value` returns the param's
*intrinsic* value — the value set by the last direct assignment — not the current
scheduled/ramped value. `updateVoiceSize` uses `setTargetAtTime` (line 378), which
schedules a ramp but does not update `.value`. If `animRate` is changed within the ~60ms
ramp window after a `size` change, `recreateLfo` will read the pre-ramp `.value` and set
`newLfoGain.gain.value` to `oldBase * 0.4` instead of `newBase * 0.4`, causing the LFO
swing depth to be incorrect until the next `updateVoiceSize` call.

**Fix:** Derive `baseGain` from the shape's current `size` property rather than reading
the live AudioParam, which is always the authoritative source of truth for the intended
base gain:

```typescript
function recreateLfo(shapeId: string, animRate: BeatFraction): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx
  if (!voice || !ctx) return

  try { voice.lfoOscillator.stop() } catch { /* already stopped */ }
  voice.lfoGain.disconnect()
  voice.lfoOscillator.disconnect()

  // Derive intended base gain from the shape definition, not the live AudioParam.
  // AudioParam.value reflects the last direct assignment, not a setTargetAtTime target.
  const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
  const baseGain = shape ? (shape.size / 100) * 0.8 : voice.dcOffset.offset.value

  // ... rest unchanged
}
```

---

## Info

### IN-01: Magic number `3` encodes grid column count assumption in two places

**File:** `src/engine/audioEngine.ts:301,325`

**Issue:** The pan formula `(shape.col / 3) * 2 - 1` appears identically on line 301
(blob path) and line 325 (standard oscillator path). The literal `3` encodes the
assumption that the grid has exactly 4 columns (indices 0–3). If the grid size changes
this must be updated in both places, and neither site documents where the `3` comes from.

**Fix:** Extract a named constant (or import from the grid/shape store) and centralise
the formula:

```typescript
// Near top of file, alongside other constants
const GRID_COLS = 4  // 4×4 grid; col indices 0..GRID_COLS-1
function colToPan(col: number): number {
  return (col / (GRID_COLS - 1)) * 2 - 1
}
```

Then replace both occurrences:

```typescript
panner.pan.value = colToPan(shape.col)
```

---

### IN-02: `handleBpmBlur` silently discards out-of-range input with no user feedback

**File:** `src/components/PlaybackControls.tsx:38`

**Issue:** When the user types a BPM value outside `[60, 180]` and blurs the input, the
value is silently dropped and the field resets to the previous store value. There is no
visual indication that the input was rejected. A user typing "200" or "30" will see their
input disappear without explanation.

**Fix:** This is a PoC and polish is deferred to v2 per project scope. However, even a
minimal indicator improves usability. One low-effort approach: clamp instead of reject.

```typescript
function handleBpmBlur(): void {
  const v = Number(bpmInput)
  if (bpmInput !== null && !isNaN(v) && v > 0) {
    // Clamp to valid range rather than silently discard
    playbackStore.getState().setBpm(Math.max(60, Math.min(180, Math.round(v))))
  }
  setBpmInput(null)
}
```

Alternatively, keep the current rejection behaviour but add an `aria-invalid` attribute
or a brief tooltip to communicate the constraint.

---

### IN-03: Scale selector `onChange` uses an unsafe type cast

**File:** `src/components/ScaleSelector.tsx:36`

**Issue:** `e.target.value as ScaleName` casts the raw DOM string to `ScaleName` without
validation. This is currently safe because the options are generated from
`Object.keys(SCALE_INTERVALS) as ScaleName[]`, so the cast and the options stay in sync
as long as `SCALE_INTERVALS` and `ScaleName` are updated together. However, if a new
entry is added to `SCALE_INTERVALS` without updating the `ScaleName` union type (or vice
versa), the cast would silently pass an invalid value into the store and then into the
audio engine's `SCALE_INTERVALS[scale]` lookup, returning `undefined` and causing a
runtime error in `quantizeSemitone`.

**Fix:** Add a guard that validates the value against known keys before casting, or add a
type-level exhaustiveness check to ensure `SCALE_INTERVALS` and `ScaleName` cannot
diverge:

```typescript
// In scaleStore.ts — ensures the Record key set equals the ScaleName union at compile time
export const SCALE_INTERVALS: { [K in ScaleName]: number[] } = { ... }
// (change Record<ScaleName, number[]> to { [K in ScaleName]: number[] })
// This already holds — just document the constraint or add a comment.
```

At minimum, the `onChange` handler can validate at runtime:

```typescript
onChange={(e) => {
  const value = e.target.value
  if (value in SCALE_INTERVALS) {
    scaleStore.getState().setScale(value as ScaleName)
  }
}}
```

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
