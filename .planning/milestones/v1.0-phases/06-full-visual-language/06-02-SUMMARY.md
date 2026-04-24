---
phase: 06-full-visual-language
plan: "02"
subsystem: audio-engine
tags: [web-audio, stereo-panning, distortion-curve, scale-quantization, zustand, vitest]

# Dependency graph
requires:
  - phase: 06-full-visual-language
    plan: "01"
    provides: scaleStore, SCALE_INTERVALS, quantizeSemitone
provides:
  - StereoPannerNode per voice with column-based pan in AudioVoice interface
  - Updated makeDistortionCurve two-stage Chebyshev+soft-clip algorithm
  - quantizeSemitone threaded into updateVoiceColor before colorToFrequency
  - scaleStore.subscribe in initAudioEngine re-pitching all voices on key/scale change
  - unsubscribeScale in destroy()
affects: [06-03-wave3]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StereoPannerNode inserted between GainNode and masterGain: gainNode.connect(panner); panner.connect(mg)"
    - "Column-to-pan formula: (shape.col / 3) * 2 - 1 maps col 0→-1.0, col 3→+1.0"
    - "Two-stage distortion: Chebyshev T2/T3 harmonic blend (s 0-50) then soft-clip k=0-50 (s 50-100)"
    - "Semitone back-conversion for colorToFrequency: quantized * 30 = hue (exact, no rounding error)"
    - "scaleStore.subscribe uses const ctx = audioCtx (not getAudioContext()) — autoplay policy guard"

key-files:
  created: []
  modified:
    - src/engine/audioEngine.ts
    - src/engine/audioEngine.test.ts

key-decisions:
  - "Test threshold updated from 0.9 to 0.7 for new k=50 soft-clip: the two-stage algorithm produces ~0.85 at i=64 (vs ~0.985 with old k=200 single-stage). The threshold still validates non-linearity but correctly matches the new algorithm's softer compression."

# Metrics
duration: 5min
completed: 2026-04-23T08:02:00Z
---

# Phase 06 Plan 02: Audio Engine — StereoPanner, Distortion Curve, Scale Subscription Summary

**StereoPannerNode per voice with column-based pan, two-stage Chebyshev+soft-clip distortion curve, and scaleStore subscription that live-repitches all voices on key/scale change — all 46 tests GREEN**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-23T07:58:00Z
- **Completed:** 2026-04-23T08:02:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

### Task 1: StereoPannerNode insertion

- Added `panner: StereoPannerNode` field to `AudioVoice` interface (AUDI-03)
- Blob voice path: replaced `gainNode.connect(mg)` with `gainNode.connect(panner); panner.connect(mg)` and added panner to `voices.set()` call
- Standard oscillator path: same panner chain insertion with pan formula `(shape.col / 3) * 2 - 1`
- Type-change setTimeout teardown: added `v.panner.disconnect()` after `v.gainNode.disconnect()`
- Removal setTimeout teardown: added `voice.panner.disconnect()` after `voice.gainNode.disconnect()`
- Zero instances of old `gainNode.connect(mg)` remain

### Task 2: makeDistortionCurve + quantizeSemitone + scaleStore subscription

- Added `import { scaleStore, SCALE_INTERVALS } from '../store/scaleStore'` at top of audioEngine.ts
- Replaced `makeDistortionCurve` body with two-stage Chebyshev+soft-clip algorithm:
  - Stage 1 (s=0–50): Chebyshev T2/T3 blend (`blend = Math.min(1, t/0.5)`); identity at s=0 by construction (blend=0 → pure T1=x)
  - Stage 2 (s=50–100): soft-clip with `k = Math.max(0, (t-0.5)/0.5) * 50`; no clip below s=50 (k=0)
  - All curve values clamped to [-1,+1]; function is monotonically non-decreasing
  - Removed old `intensity`/`k=200` approach entirely (no `smoothstep` helper was present to remove)
- Threaded `quantizeSemitone` in `updateVoiceColor`: reads `scaleStore.getState()`, calls `quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])`, back-converts via `quantized * 30` before passing to `colorToFrequency`
- Added `scaleStore.subscribe` in `initAudioEngine` before `return function destroy()`:
  - Guards with `const ctx = audioCtx` (NOT `getAudioContext()`) per threat model T-06-02-01
  - Re-pitches all active voices via `updateVoiceColor` when `rootKey` or `scale` changes
- `destroy()` calls `unsubscribeScale()` to clean up subscription

## Task Commits

1. **Task 1: StereoPannerNode insertion** — `d5e8c74` (feat)
2. **Task 2: makeDistortionCurve + quantizeSemitone + scaleStore subscription** — `fbe955f` (feat)

## Files Created/Modified

- `src/engine/audioEngine.ts` — Modified: AudioVoice interface (panner field), createVoice blob+standard paths (panner chain), both teardown sites (panner.disconnect), makeDistortionCurve (two-stage algorithm), updateVoiceColor (quantizeSemitone threading), initAudioEngine (scaleStore.subscribe + prevRootKey/prevScale tracking), destroy() (unsubscribeScale call)
- `src/engine/audioEngine.test.ts` — Modified: soft-clip test threshold updated from 0.9 to 0.7 (Rule 1 auto-fix for new k=50 algorithm)

## Decisions Made

- **Test threshold lowered from 0.9 to 0.7 (Rule 1 auto-fix):** The existing test `'returns a non-linear (soft-clipping) curve at saturation=100'` checked `Math.abs(curve[64]) > 0.9`, which was calibrated for the old `k=200` single-stage soft-clip (yielding ~0.985). The new two-stage algorithm at s=100 uses `k=50`, producing ~0.8495 at i=64 (x=-0.5). The threshold was updated to 0.7, which still definitively validates non-linearity (identity would be 0.5) while matching the new algorithm's intentionally softer compression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Soft-clip test threshold incompatible with new two-stage algorithm**
- **Found during:** Task 2 verification (`npx vitest run`)
- **Issue:** Test `'returns a non-linear (soft-clipping) curve at saturation=100'` expected `Math.abs(curve[64]) > 0.9`. The old `k=200` algorithm gave ~0.985 at this index. The new two-stage `k=50` algorithm gives ~0.8495 — correct per spec but failing the old threshold.
- **Fix:** Updated threshold from 0.9 to 0.7. Updated comment to explain two-stage algorithm behavior.
- **Files modified:** `src/engine/audioEngine.test.ts`
- **Commit:** `fbe955f`

## Known Stubs

None — all three features are fully wired:
- StereoPannerNode: created and connected in both createVoice paths; disconnected in both teardown paths
- makeDistortionCurve: new algorithm active; called by updateVoiceColor and createVoice unchanged
- scaleStore subscription: live in initAudioEngine; re-pitches on every rootKey/scale change

The UI controls (ScaleSelector component) that drive scaleStore are Wave 3 work (06-03). Until Wave 3, the store defaults to `{ rootKey: 0, scale: 'major' }` (C major), so all voices quantize to C major automatically.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes.

The threat model mitigations were applied:
- T-06-02-01 (Denial of Service — autoplay policy): `const ctx = audioCtx` direct null check in `scaleStore.subscribe` — confirmed, `getAudioContext()` is NOT called inside the callback
- T-06-02-02 (Tampering — pan formula): `(col/3)*2-1` bounded to [-1,+1] for all valid col values 0–3 — confirmed
- T-06-02-03 (Denial of Service — curve clamp): `Math.max(-1, Math.min(1, ...))` applied to every curve sample — confirmed

## Self-Check: PASSED

- `src/engine/audioEngine.ts` contains `panner: StereoPannerNode`: FOUND (line 122)
- `src/engine/audioEngine.ts` contains `panner.pan.value = (shape.col / 3) * 2 - 1`: FOUND (2 occurrences — lines 278, 302)
- `src/engine/audioEngine.ts` contains `panner.connect(mg)`: FOUND (2 occurrences)
- `src/engine/audioEngine.ts` does NOT contain `gainNode.connect(mg)`: CONFIRMED (0 matches)
- `src/engine/audioEngine.ts` contains `v.panner.disconnect()`: FOUND (line 447)
- `src/engine/audioEngine.ts` contains `voice.panner.disconnect()`: FOUND (line 488)
- `src/engine/audioEngine.ts` contains `import { scaleStore, SCALE_INTERVALS }`: FOUND (line 9)
- `src/engine/audioEngine.ts` does NOT contain `smoothstep`: CONFIRMED (0 matches)
- `src/engine/audioEngine.ts` contains `const blend = Math.min(1, t / 0.5)`: FOUND
- `src/engine/audioEngine.ts` contains `const k = Math.max(0, (t - 0.5) / 0.5) * 50`: FOUND
- `src/engine/audioEngine.ts` contains `const softClip`: FOUND
- `src/engine/audioEngine.ts` contains `quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])`: FOUND
- `src/engine/audioEngine.ts` contains `const quantizedHue = quantized * 30`: FOUND
- `src/engine/audioEngine.ts` contains `scaleStore.subscribe`: FOUND
- `src/engine/audioEngine.ts` contains `unsubscribeScale()` in destroy(): FOUND
- `scaleStore.subscribe` uses `const ctx = audioCtx` (NOT `getAudioContext()`): CONFIRMED
- Commit `d5e8c74` exists: FOUND
- Commit `fbe955f` exists: FOUND
- `npx vitest run src/engine/audioEngine.test.ts src/store/scaleStore.test.ts`: 46/46 PASSED

## Next Phase Readiness

- Wave 3 (06-03) can import `useScaleStore`, `scaleStore`, `SCALE_INTERVALS`, and `ScaleName` for `ScaleSelector.tsx`
- The `scaleStore.subscribe` callback in `audioEngine.ts` is already live — changing the store from the UI will immediately re-pitch all active voices
- No further audioEngine.ts changes needed for Phase 6

---
*Phase: 06-full-visual-language*
*Completed: 2026-04-23*
