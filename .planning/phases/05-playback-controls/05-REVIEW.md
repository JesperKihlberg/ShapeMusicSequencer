---
phase: 05-playback-controls
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/store/playbackStore.ts
  - src/store/shapeStore.ts
  - src/engine/audioEngine.ts
  - src/engine/canvasEngine.ts
  - src/components/PlaybackControls.tsx
  - src/components/CellPanel.tsx
  - src/App.tsx
  - src/styles/index.css
findings:
  critical: 2
  warning: 2
  info: 2
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 5 added a vanilla Zustand `playbackStore`, migrated `Shape.animRate` from raw Hz to `BeatFraction`, wired both engines to playback state, and built the `PlaybackControls` toolbar component plus a beat-fraction selector in `CellPanel`. The subscription architecture is sound — the AudioContext creation guard (`if (!audioCtx) return` vs `getAudioContext()`) is correctly observed in the main playback subscriber, and all three unsubscribe handles are cleaned up in `destroy()`. The BPM input's local-state pattern avoids mid-type resets correctly.

Two critical issues require attention before ship. The `computeLfoHz` formula produces LFO rates in the audible tone range (up to 32 Hz) for high beat-fraction values, which will cause amplitude modulation that sounds like a bass buzz rather than a pulse. Separately, `recreateLfo` calls `getAudioContext()` rather than using the direct module-level `audioCtx` reference, which can resume a suspended AudioContext when the user has explicitly stopped playback.

---

## Critical Issues

### CR-01: `computeLfoHz` formula produces audible-frequency LFO for high BeatFraction values

**File:** `src/store/playbackStore.ts:22`

**Issue:** The implemented formula is `(bpm / 60) * fraction`. With `fraction=16` (the "1/16" / Sixteenth note button) and `bpm=120`, this yields 32 Hz. With `fraction=8` at 120 BPM it yields 16 Hz. Both values fall within the audible bass frequency range. When the audio engine's `lfoOscillator` runs at 32 Hz modulating the `gainNode.gain`, the listener hears amplitude modulation at 32 Hz — a buzzing/ring artifact — not a visual pulse. The canvas `pulseScale` formula likewise oscillates at 32 Hz, which is faster than display refresh rate and will appear as a frozen shape rather than a pulse.

The 05-01-PLAN.md specified the formula as `(bpm / 60) * (1 / fraction)` and gave these expected test values: `computeLfoHz(4, 120) = 0.5`, `computeLfoHz(2, 120) = 1.0`, `computeLfoHz(16, 120) = 0.125`. The current implementation returns 8, 4, and 32 respectively — none match the plan's acceptance criteria. The plan comment reads "Stored as numeric denominator so the formula is clean: (bpm / 60) * (1 / fraction)." The description at line 13 of `playbackStore.ts` also says "D-07: BeatFraction represents the denominator of 1/N" — a denominator semantics requires division, not multiplication.

The comment block at lines 18–20 was also rewritten to declare the fraction a "beat multiplier", but this contradicts both the type name (`BeatFraction`), the UI labels (`1/1`, `1/2`, `1/4`, `1/8`, `1/16`), and the plan's test expectations.

**Fix:** Restore the denominator formula. Change line 22:

```typescript
// Before
export function computeLfoHz(fraction: BeatFraction, bpm: number): number {
  return (bpm / 60) * fraction
}

// After
export function computeLfoHz(fraction: BeatFraction, bpm: number): number {
  return (bpm / 60) * (1 / fraction)
}
```

Also update the comment block at lines 18–20 to match:

```typescript
// D-06: LFO Hz formula — (bpm / 60) * (1 / fraction)
// fraction is the denominator: 1 = 1 bar (slowest), 16 = 16th note (fastest).
// Examples: computeLfoHz(4, 120) = 0.5 Hz; computeLfoHz(2, 120) = 1.0 Hz; computeLfoHz(16, 120) = 0.125 Hz
```

With this formula, all BeatFraction values produce LFO rates between 0.06 Hz (fraction=16, bpm=60) and 3 Hz (fraction=1, bpm=180) — appropriate LFO territory for both audio modulation and visible canvas animation.

---

### CR-02: `recreateLfo` calls `getAudioContext()`, which resumes a suspended AudioContext when playback is stopped

**File:** `src/engine/audioEngine.ts:319`

**Issue:** `recreateLfo` (called from the `shapeStore.subscribe` callback at line 382) calls `getAudioContext()` to obtain the audio context. The `getAudioContext()` function unconditionally calls `audioCtx.resume()` if the context is in the `'suspended'` state (lines 117–119):

```typescript
if (audioCtx.state === 'suspended') {
  void audioCtx.resume()
}
```

When the user presses Stop, the playback subscriber correctly calls `ctx.suspend()`. If the user then changes a shape's `animRate` while stopped (clicking a beat-fraction button in CellPanel), `recreateLfo` is triggered, `getAudioContext()` resumes the context, and audio unexpectedly restarts. This silently overrides the user's explicit Stop action and contradicts D-01 (isPlaying gate).

The 05-02-PLAN.md explicitly warned: "Critical guard: do NOT call getAudioContext() inside playbackStore.subscribe callback — Use: if (!audioCtx) return". While that warning targets the playback subscriber, the same principle applies here: any code in a store subscribe callback must not call `getAudioContext()` because it can create or resume an AudioContext as a side effect.

**Fix:** Replace the `getAudioContext()` call in `recreateLfo` with a direct null-check on the module-level `audioCtx`:

```typescript
// Before
function recreateLfo(shapeId: string, animRate: BeatFraction): void {
  const voice = voices.get(shapeId)
  const ctx = getAudioContext()
  if (!voice || !ctx) return
  // ...
}

// After
function recreateLfo(shapeId: string, animRate: BeatFraction): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx  // Direct module-level check — do NOT use getAudioContext() (same guard as playback subscriber)
  if (!voice || !ctx) return
  // ...
}
```

The same fix should also be applied to `updateVoiceColor` (line 285) and `updateVoiceSize` (line 303), which also call `getAudioContext()`. While those are currently only called from the `shapeStore.subscribe` callback (not directly exposed to user actions in a stopped state), they would exhibit the same resume-on-update behaviour if triggered while stopped. Using the direct `audioCtx` reference is consistent with the design contract established in the playback subscriber.

---

## Warnings

### WR-01: `handleBpmBlur` does not commit a valid typed value when the user types a number and blurs

**File:** `src/components/PlaybackControls.tsx:36`

**Issue:** `handleBpmBlur` reads `bpmInput` and only calls `setBpm` when `bpmInput !== null && !isNaN(v) && bpmInput.trim() !== ''`. However, if the user types "150" and blurs without pressing Enter, `handleBpmChange` has been setting `bpmInput` to the typed string. On blur, `bpmInput` is "150", `Number("150")` is 150, `!isNaN(150)` is true, and `bpmInput.trim() !== ''` is true — so `setBpm(150)` is correctly called.

The actual issue is the opposite edge: if the user types a non-numeric string like "abc", `Number("abc")` is `NaN`, the guard `!isNaN(v)` is false, so `setBpm` is not called and `setBpmInput(null)` resets to the previous store value. This is the correct designed behaviour. However, there is no user feedback that the entered value was invalid — the field silently reverts. For a PoC this is acceptable, but it creates a confusing UX when a user types a non-numeric value and it disappears on blur with no indication.

More concretely: the `handleBpmBlur` guard `bpmInput !== null` means that if somehow `bpmInput` is `null` at blur time (e.g. due to React's synthetic event timing), `setBpm` is never called and the field just snaps to the store value. This is safe but means a blur without any typing has no side effects. Acceptable.

**Fix:** No code change required for correctness — the existing guard logic is safe. Consider adding a visual invalid state for non-numeric input, but this is a UX enhancement for v2:

```tsx
// Optional: set a CSS class or local error flag when isNaN(Number(bpmInput))
// to signal invalid input to the user before they blur.
```

---

### WR-02: `dcOffset.offset.value` read in `recreateLfo` may not reflect the current ramp state

**File:** `src/engine/audioEngine.ts:328`

**Issue:** `recreateLfo` reads `voice.dcOffset.offset.value` to get `baseGain` for sizing the new LFO:

```typescript
const baseGain = voice.dcOffset.offset.value
```

`AudioParam.value` returns the nominal value at the time of the call, but when a `linearRampToValueAtTime` or `setTargetAtTime` is in progress (as set in `createLfo` at lines 172–173), reading `.value` returns the **current instantaneous value at the current audio timestamp**, not the target value. If `recreateLfo` is called very shortly after a shape is created (within the 10ms ramp-in window set by `linearRampToValueAtTime(baseGain, ctx.currentTime + 0.01)`), `baseGain` could be close to 0 rather than the target gain, and the new LFO amplitude would be computed as `0 * 0.4 = 0`, causing the shape to silently lose all volume until the voice is rebuilt.

This is a narrow timing window (10ms) but it is a real edge case triggered whenever a user rapidly changes `animRate` immediately after adding a shape.

**Fix:** Derive `baseGain` from the shape's `size` property rather than reading it from the running AudioParam:

```typescript
// Before
const baseGain = voice.dcOffset.offset.value

// After — compute from size, same formula as createLfo (avoids AudioParam ramp race)
// Requires passing the shape or its size to recreateLfo.
// Option 1: look up shape from shapeStore
const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
const baseGain = shape ? (shape.size / 100) * 0.8 : voice.dcOffset.offset.value

// Option 2: change recreateLfo signature to accept size as a parameter
// function recreateLfo(shapeId: string, animRate: BeatFraction, size: number): void
```

---

## Info

### IN-01: `computeLfoHz` in `canvasEngine.ts` performs redundant `as BeatFraction` cast

**File:** `src/engine/canvasEngine.ts:128`

**Issue:** `shape.animRate` is already typed as `BeatFraction` after the Wave 1 migration in `shapeStore.ts`. The cast `shape.animRate as BeatFraction` is unnecessary and adds noise:

```typescript
const lfoHz = computeLfoHz(shape.animRate as BeatFraction, playbackStore.getState().bpm)
```

The same redundant cast appears in `audioEngine.ts` at line 179:

```typescript
lfoOscillator.frequency.value = computeLfoHz(shape.animRate as BeatFraction, playbackStore.getState().bpm)
```

Both casts suggest the TypeScript types may not be flowing correctly from `shapeStore.ts` to the engine files. If `shape` is typed as `Shape` (which it is in both locations), `shape.animRate` should already be `BeatFraction` without needing a cast.

**Fix:** Remove the redundant casts. If TypeScript complains, investigate whether the `Shape` import is resolving the updated `shapeStore.ts` interface:

```typescript
// canvasEngine.ts line 128
const lfoHz = computeLfoHz(shape.animRate, playbackStore.getState().bpm)

// audioEngine.ts line 179
lfoOscillator.frequency.value = computeLfoHz(shape.animRate, playbackStore.getState().bpm)
```

---

### IN-02: `src/store/playbackStore.ts` comment mismatch with plan decision log

**File:** `src/store/playbackStore.ts:18`

**Issue:** The comment block at lines 18–20 describes `fraction` as a "beat multiplier: 1 = 1 pulse/beat (slow), 16 = 16 pulses/beat (fast)". This is internally inconsistent with the type definition comment at lines 12–15 which says "D-07: BeatFraction represents the denominator of 1/N". If CR-01 is fixed (restoring the denominator formula), the comment block should be updated to remove the "multiplier" description. Even if the multiplier formula is intentionally kept, the contradictory documentation between lines 12–15 and lines 18–20 will confuse future maintainers.

**Fix:** After resolving CR-01, align the comment with whichever formula is chosen. If the denominator formula is restored:

```typescript
// D-06: LFO Hz formula — (bpm / 60) * (1 / fraction)
// fraction is the denominator of 1/N: 1 = 1 bar (slowest, 2 Hz at 120 BPM),
// 16 = 16th note (fastest, 0.125 Hz at 120 BPM).
// Examples: computeLfoHz(4, 120) = 0.5 Hz; computeLfoHz(2, 120) = 1.0 Hz; computeLfoHz(16, 120) = 0.125 Hz
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
