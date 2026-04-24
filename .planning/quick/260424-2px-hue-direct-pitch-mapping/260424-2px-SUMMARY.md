---
phase: quick
plan: 260424-2px
subsystem: audio-engine
tags: [colr-01, pitch, hue, scale, tdd]
dependency_graph:
  requires: []
  provides: [direct-hue-to-pitch-mapping]
  affects: [audioEngine.ts]
tech_stack:
  added: []
  patterns: [linear-midi-mapping, tdd-red-green]
key_files:
  created: []
  modified:
    - src/engine/audioEngine.ts
    - src/engine/audioEngine.test.ts
decisions:
  - "COLR-01 direct linear mapping: hue 0–359° → MIDI 24–108 (C1–C8), formula midiNote = 24 + (h/360)*84"
  - "lightnessToOctave removed — lightness only controls filter cutoff (COLR-03), not pitch"
  - "scaleStore subscription removed from audioEngine — scale UI may remain but has no pitch effect"
metrics:
  duration: "4 min"
  completed: "2026-04-24"
  tasks: 1
  files: 2
---

# Quick Task 260424-2px: Hue Direct Pitch Mapping Summary

**One-liner:** Direct linear hue-to-frequency mapping (MIDI 24–108) replacing the scale-quantized hueToSemitone+lightnessToOctave pipeline.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| RED | Add failing tests for direct hue-to-frequency | a2ec937 | src/engine/audioEngine.test.ts |
| GREEN | Replace scale-quantized hue→pitch with direct linear mapping | cd7dfe3 | src/engine/audioEngine.ts |

## What Was Done

Replaced the two-step scale-quantized pitch pipeline with a direct continuous mapping:

**Before:** `hue → hueToSemitone (0–11) → quantizeSemitone (snapped to scale) → lightnessToOctave → MIDI note → Hz`

**After:** `hue → hueToFrequency (linear MIDI 24–108) → Hz`

Key changes in `src/engine/audioEngine.ts`:
- Added `hueToFrequency(h)`: clamps to [0, 359], maps linearly to MIDI 24–108, converts to Hz
- `colorToFrequency` now delegates entirely to `hueToFrequency(color.h)`
- Removed `hueToSemitone`, `lightnessToOctave`, `quantizeSemitone`
- Removed `scaleStore` import and `unsubscribeScale` subscription from `initAudioEngine`
- `updateVoiceColor` calls `colorToFrequency(color)` directly — no quantization
- Lightness curve handler now only modulates filter cutoff (not oscillator frequency)

Key changes in `src/engine/audioEngine.test.ts`:
- Replaced `colorToFrequency` tests to assert COLR-01 direct mapping behavior
- Removed `quantizeSemitone (Phase 6)` describe block
- Removed `quantizeSemitone` import

## TDD Gate Compliance

- RED gate: commit a2ec937 — 3 failing colorToFrequency tests (old 261 Hz/octave behavior vs new 32.70 Hz/linear behavior)
- GREEN gate: commit cd7dfe3 — all 28 tests pass after implementation
- REFACTOR: not needed — implementation is clean as written

## Verification

- `npx vitest run src/engine/audioEngine.test.ts`: 28 passed
- `npx tsc --noEmit`: no errors
- No references to `quantizeSemitone`, `hueToSemitone`, `lightnessToOctave`, or `scaleStore` remain in `audioEngine.ts`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — `hueToFrequency` clamps input to [0, 359] as specified by T-2px-01.

## Self-Check: PASSED

- `src/engine/audioEngine.ts`: modified, hueToFrequency present, no old functions
- `src/engine/audioEngine.test.ts`: modified, new COLR-01 tests present
- Commit a2ec937: exists (RED)
- Commit cd7dfe3: exists (GREEN)
