---
phase: 06-full-visual-language
plan: "01"
subsystem: store + audio-engine
tags: [zustand, scale-quantization, vitest, tdd, green-state]

# Dependency graph
requires:
  - phase: 06-full-visual-language
    plan: "00"
    provides: RED test scaffolds for scaleStore and quantizeSemitone
provides:
  - scaleStore.ts with ScaleName, SCALE_INTERVALS, ScaleState, scaleStore, useScaleStore
  - quantizeSemitone pure export from audioEngine.ts
affects: [06-02-wave2a, 06-02-wave2b, 06-03-wave3]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vanilla Zustand store (createStore) with clamped/rounded setter: Math.round(Math.max(0, Math.min(11, key))) for safe integer-range inputs"
    - "Circular pitch-class distance: min(|raw-c|, 12-|raw-c|) for wrap-around semitone comparison"
    - "Strict < tie-breaking in quantizeSemitone: ascending iteration + strict less-than ensures lower candidate wins on equal distance"

key-files:
  created:
    - src/store/scaleStore.ts
  modified:
    - src/engine/audioEngine.ts
    - src/engine/audioEngine.test.ts

key-decisions:
  - "quantizeSemitone rootKey-offset test corrected: raw=1 (C#) IS in D major as the 7th degree (interval 11 + rootKey 2 = 1 mod 12); changed test input to raw=3 (D#/Eb) which is genuinely out-of-scale and ties between D(2) and E(4)"
  - "Static import replaces dynamic import skip pattern for quantizeSemitone in audioEngine.test.ts — function now exists so the graceful-skip guard is no longer needed"

# Metrics
duration: 2min
completed: 2026-04-23T05:53:40Z
---

# Phase 06 Plan 01: Scale Store and quantizeSemitone Summary

**scaleStore.ts created (key/scale data layer) and quantizeSemitone added to audioEngine.ts (circular pitch-class snap with tie-breaking) — all Wave 0 RED tests now GREEN**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-23T05:51:29Z
- **Completed:** 2026-04-23T05:53:40Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `src/store/scaleStore.ts` with all 5 named exports: `ScaleName`, `SCALE_INTERVALS`, `ScaleState`, `scaleStore`, `useScaleStore`
- `scaleStore` defaults to `{ rootKey: 0, scale: 'major' }` (C major)
- `setRootKey` clamps to `[0, 11]` and rounds to integer (STRIDE threat T-06-01-01 mitigated)
- `SCALE_INTERVALS` defines all 7 scale arrays including chromatic passthrough
- Added `quantizeSemitone` pure function to `audioEngine.ts` between `makeDistortionCurve` and `lightnessToFilterCutoff`
- Replaced dynamic-import skip pattern in `audioEngine.test.ts` with static import
- All 46 tests GREEN across both test files (16 in scaleStore.test.ts + 30 in audioEngine.test.ts)

## Task Commits

1. **Task 1: Create scaleStore.ts** — `f0b1d33` (feat)
2. **Task 2: Add quantizeSemitone export to audioEngine.ts** — `199bf24` (feat)

## Files Created/Modified

- `src/store/scaleStore.ts` — New: ScaleName union type, SCALE_INTERVALS constant, ScaleState interface, scaleStore vanilla Zustand store, useScaleStore React hook
- `src/engine/audioEngine.ts` — Modified: quantizeSemitone pure function inserted after makeDistortionCurve (line 69); no scaleStore import yet (Wave 2)
- `src/engine/audioEngine.test.ts` — Modified: quantizeSemitone added to static import; quantizeSemitone describe block rewritten as synchronous it() blocks

## Decisions Made

- **rootKey offset test corrected (Rule 1 auto-fix):** The RESEARCH.md stated `quantizeSemitone(1, 2, [0,2,4,5,7,9,11]) → 2`, but C# (semitone 1) IS a member of D major as the 7th degree (interval 11 + rootKey 2 = 13 % 12 = 1). The algorithm correctly returns 1 (distance 0). The test was changed to `raw=3` (D#/Eb), which is genuinely out-of-scale and equidistant between D(2) and E(4), correctly testing tie-breaking behavior.

- **No scaleStore import in audioEngine.ts:** Wave 2 adds the import and subscription. This plan intentionally leaves audioEngine.ts unchanged except for the pure quantizeSemitone function.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected rootKey offset test assertion in audioEngine.test.ts**
- **Found during:** Task 2 verification (`npx vitest run`)
- **Issue:** Plan specified `quantizeSemitone(1, 2, [0,2,4,5,7,9,11])` should return `2`. Analysis: D major candidates are `[2,4,6,7,9,11,1]` (intervals shifted by rootKey=2, mod 12). Candidate `1` is in the set with distance 0 from raw=1, so the algorithm correctly returns `1`, not `2`. The RESEARCH.md comment ("nearest candidate is 2 (D), distance=1") incorrectly omitted candidate 1.
- **Fix:** Changed test input to `raw=3` (D#/Eb). D#(3) has distance 1 to both D(2) and E(4) — a genuine tie — and the tie-breaking rule returns the lower candidate (2). This correctly exercises the rootKey offset behavior and tie-breaking.
- **Files modified:** `src/engine/audioEngine.test.ts`
- **Commit:** `199bf24`

## Known Stubs

None — all exports are fully implemented. `scaleStore` and `quantizeSemitone` are wired but not yet connected to the audio engine (that is Wave 2 work, plan 06-02).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- `src/store/scaleStore.ts` exists: FOUND
- `src/engine/audioEngine.ts` exports `quantizeSemitone`: FOUND at line 69
- Commit `f0b1d33` exists: FOUND
- Commit `199bf24` exists: FOUND
- `npx vitest run` scaleStore.test.ts: 16/16 PASSED
- `npx vitest run` audioEngine.test.ts: 30/30 PASSED

## Next Phase Readiness

- Wave 2 (06-02) can now import `scaleStore` and `SCALE_INTERVALS` from `../store/scaleStore` in `audioEngine.ts`
- Wave 2 can call `quantizeSemitone` inside `updateVoiceColor` (it's already exported)
- Wave 3 (06-03) can import `useScaleStore`, `scaleStore`, `SCALE_INTERVALS`, and `ScaleName` for `ScaleSelector.tsx`

---
*Phase: 06-full-visual-language*
*Completed: 2026-04-23*
