---
phase: 07-composition-tools
plan: "02"
status: complete
wave: 2
completed: 2026-04-23
subsystem: audio-engine
tags: [audio, lfo-removal, animation, spline, modulation]
dependency_graph:
  requires:
    - 07-01
  provides:
    - animationStore-driven audio modulation
    - evalCurveAtBeat (exported, tested)
  affects:
    - src/engine/audioEngine.ts
tech_stack:
  added: []
  patterns:
    - setInterval at 16ms for curve evaluation (~60fps)
    - linear interpolation with modular beat wrapping
key_files:
  modified:
    - src/engine/audioEngine.ts
    - src/engine/audioEngine.test.ts
decisions:
  - "setInterval at 16ms (not rAF) — runs independently of React render; decoupled from display frame rate"
  - "evalCurveAtBeat placed at module level (not inside initAudioEngine) so it can be exported and tested"
  - "Curves freeze when isPlaying=false — consistent with D-02 (context suspended = no audio tick)"
  - "NaN/Infinity not guarded explicitly — setTargetAtTime clamps internally; values come from validated UI inputs (T-07-02-02)"
metrics:
  duration: "12 min"
  completed: "2026-04-23"
  tasks: 2
  files_modified: 2
requirements:
  - ANIM-02
  - ANIM-03
  - ANIM-04
---

# Phase 7 Plan 02: Wave 2a — LFO Removal + animationStore Modulation Summary

## What Was Built

LFO infrastructure fully removed from audioEngine.ts and replaced with animationStore-driven spline curve modulation. Voices play at a steady gain (direct gainNode.gain ramp-in, no pulsing) until a SplineCurve drives them. A 16ms setInterval inside `initAudioEngine` evaluates all active curves at the current beat position and applies interpolated values to the corresponding AudioParams.

## Files Created/Modified

- **src/engine/audioEngine.ts** (modified) — LFO removed; animationStore subscription added; `evalCurveAtBeat` exported
- **src/engine/audioEngine.test.ts** (modified) — `evalCurveAtBeat` imported and tested (3 new tests; 33/33 total pass)

## Task Summary

### Task 1: Remove LFO infrastructure (commit `3be3886`)

- Deleted `createLfo` and `recreateLfo` functions entirely
- Removed `lfoOscillator`, `lfoGain`, `dcOffset` from `AudioVoice` interface
- Replaced LFO-driven gain with direct `gainNode.gain` ramp-in in both `createVoice` paths (blob + standard)
- Rewrote `updateVoiceSize` to use `gainNode.gain.setTargetAtTime` directly (τ=0.015)
- Removed `animRate` change detection block from shapeStore subscriber
- Removed BPM→LFO update block from playbackStore subscriber (`prevBpm` var removed)
- Removed LFO node cleanup from type-change and removal setTimeout blocks
- Replaced `computeLfoHz`/`BeatFraction` import with `animationStore`/`SplineCurve` imports

### Task 2: Add animationStore curve evaluator (commit `1aa239e`)

- Exported `evalCurveAtBeat(curve, beatPos)` — linear interpolation with loop wrapping (ANIM-04)
- Added 16ms `setInterval` inside `initAudioEngine` evaluating all active shape curves:
  - `size` curve → `gainNode.gain.setTargetAtTime` (τ=0.008 for curve fidelity)
  - `hue` curve → `updateVoiceColor` with patched hue (handles scale quantization)
  - `saturation` curve → `voice.waveshaper.curve = makeDistortionCurve(satVal)`
  - `lightness` curve → `filter.frequency.setTargetAtTime` (τ=0.008)
- `clearInterval(curveIntervalId)` added to `destroy()`
- 3 new `evalCurveAtBeat` tests added — all pass (33/33 total)

## Verification

- `npx tsc --noEmit` — 0 errors
- `grep lfoOscillator|lfoGain|dcOffset|createLfo|recreateLfo` in worktree audioEngine.ts — no matches
- `animationStore` import and subscribe block present
- `evalCurveAtBeat` export declaration present
- `clearInterval(curveIntervalId)` present in `destroy()`
- `npx vitest run src/engine/audioEngine.test.ts` — 33/33 pass

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. setInterval + AudioParam pattern consistent with threat register (T-07-02-01 accepted; T-07-02-02/T-07-02-03 mitigated by existing guards in voices.get() and setTargetAtTime clamping).

## Self-Check: PASSED
