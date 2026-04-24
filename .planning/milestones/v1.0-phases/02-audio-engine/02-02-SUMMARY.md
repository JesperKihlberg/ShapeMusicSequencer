---
phase: 02-audio-engine
plan: 02
subsystem: audio
tags: [typescript, web-audio, color-mapping, pure-functions, tdd]

# Dependency graph
requires:
  - phase: 02-audio-engine
    plan: 01
    provides: ShapeColor { h, s, l } and ShapeType union from shapeStore.ts
provides:
  - colorToFrequency: hue+lightness → Hz via MIDI formula (COLR-01)
  - makeDistortionCurve: saturation → Float32Array WaveShaper curve (COLR-02)
  - lightnessToFilterCutoff: lightness → exponential filter cutoff Hz (COLR-03)
  - shapeTypeToWave: ShapeType → WaveDescriptor string (SHPE-01)
affects: [02-audio-engine plan 03 (AudioContext wiring uses all four functions), all downstream audio synthesis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure audio mapping functions: no AudioContext, no side effects — fully testable in jsdom"
    - "MIDI frequency formula: 440 * Math.pow(2, (midiNote - 69) / 12)"
    - "Exponential filter range: minHz * Math.pow(maxHz/minHz, t) where t = l/100"
    - "Soft-clip distortion: ((PI+k)*x)/(PI+k*|x|), k = saturation/100 * 200"
    - "Math.floor for octave mapping: ensures l=50 gives octave 4 (C4), not octave 5"

key-files:
  created:
    - src/engine/audioEngine.ts
    - src/engine/audioEngine.test.ts
  modified: []

key-decisions:
  - "Math.floor in lightnessToOctave (not Math.round): Math.round(3.5)=4 gives octave 5 (C5=523 Hz); Math.floor(3.5)=3 gives correct octave 4 (C4=261 Hz)"
  - "Distortion test checks mid-range compression (index 64, x=-0.5 → -0.985) not endpoints: at x=±1 the soft-clip formula yields exactly ±1 regardless of k — non-linearity is only observable in the interior"
  - "WaveDescriptor type extends OscillatorType with 'pulse' and 'blob': these are handled specially in Plan 03 createVoice; keeping them typed prevents unhandled switch cases"

patterns-established:
  - "Separate pure math functions from AudioContext wiring — enables jsdom testing without Web Audio API"

requirements-completed: [COLR-01, COLR-02, COLR-03, SHPE-01]

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 02 Plan 02: Color-to-Audio Mapping Functions Summary

**Four pure functions implement COLR-01/02/03 and SHPE-01: hue→frequency, saturation→distortion curve, lightness→filter cutoff, shape type→waveform descriptor — all tested via TDD in jsdom without AudioContext**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-15T13:38:00Z
- **Completed:** 2026-04-15T13:42:00Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files created:** 2

## Accomplishments

- Exported `colorToFrequency(color: ShapeColor): number` — hue→semitone (30°/semitone), lightness→octave (1–8), MIDI note formula 440*2^((n-69)/12). C4 at h=0,l=50 = 261.63 Hz.
- Exported `makeDistortionCurve(saturation: number): Float32Array` — 256-sample WaveShaper curve. Identity passthrough at sat=0; soft-clip saturation at sat=100 with k=200 drive.
- Exported `lightnessToFilterCutoff(l: number): number` — exponential mapping 100–8000 Hz. l=0 → 100 Hz (muffled), l=100 → 8000 Hz (bright), l=50 → ~894 Hz (geometric midpoint).
- Exported `shapeTypeToWave(type: ShapeType): WaveDescriptor` — exhaustive switch over all 6 shape types, returning standard OscillatorType strings plus 'pulse' and 'blob' as special discriminants.
- Exported `WaveDescriptor` type extending `OscillatorType | 'pulse' | 'blob'`.
- 17 new tests; 34 total tests passing; zero TypeScript errors.

## Task Commits

Each TDD phase committed atomically:

1. **RED — Failing tests for color-to-audio pure functions** — `4628736` (test)
2. **GREEN — Implement all four pure functions** — `dcbbd29` (feat)

## Files Created/Modified

- `src/engine/audioEngine.ts` — Four exported pure functions + WaveDescriptor type. No AudioContext, no side effects. All math documented with inline references to D-02/D-03/D-04/D-05.
- `src/engine/audioEngine.test.ts` — 17 tests across 4 describe blocks covering all behavioral specs.

## Decisions Made

- **Math.floor for lightnessToOctave:** The plan's `Math.round` formula was incorrect — `Math.round((50/100)*7) = Math.round(3.5) = 4` gives octave 5 (C5=523 Hz), failing the C4 must-have. Switching to `Math.floor` gives octave 4 (C4=261 Hz) as specified.
- **Distortion test targets mid-range (index 64), not endpoint (index 0):** The soft-clip formula `((PI+k)*x)/(PI+k*|x|)` always yields exactly -1.0 when x=-1.0, regardless of k. Non-linearity is visible at mid-range inputs (x=-0.5 → -0.985). Test updated to assert `|curve[64]| > 0.9`.
- **WaveDescriptor type with 'pulse' and 'blob':** Typing these as non-standard strings now (rather than using `string`) makes Plan 03 createVoice exhaustive and prevents unhandled cases at compile time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Math.floor vs Math.round in lightnessToOctave**
- **Found during:** GREEN phase (first test run)
- **Issue:** Plan specified `1 + Math.round((clamped / 100) * 7)`. At l=50 this gives `Math.round(3.5) = 4`, so octave 5 (MIDI 72 = C5 = 523 Hz). The must-have requires C4 = 261 Hz at l=50.
- **Fix:** Changed to `1 + Math.floor((clamped / 100) * 7)`. At l=50: `Math.floor(3.5) = 3`, octave 4 (MIDI 60 = C4 = 261.63 Hz). Endpoints unchanged: l=0 → octave 1, l=100 → octave 8.
- **Files modified:** `src/engine/audioEngine.ts`
- **Commit:** dcbbd29

**2. [Rule 1 - Bug] Distortion curve test assertion for non-linearity**
- **Found during:** GREEN phase (first test run)
- **Issue:** Test checked `|curve[0]| < 0.999` (expecting compression at x=-1). The soft-clip formula yields exactly -1.0 when x=-1.0, making this assertion always false regardless of k. The plan's "first and last values are NOT ±1.0" was incorrect for the given x-mapping.
- **Fix:** Revised test to check `|curve[64]| > 0.9` where x=-0.5 (identity) gets compressed to -0.985 (distorted). This correctly observes the formula's non-linear behavior in the mid-range where compression is evident.
- **Files modified:** `src/engine/audioEngine.test.ts`
- **Commit:** dcbbd29

## Known Stubs

None — all four functions produce real computed values. No hardcoded frequencies, no placeholder return values.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary crossings. All inputs are TypeScript-typed numerics from internal store. Range clamping present in `lightnessToOctave` and `lightnessToFilterCutoff`. T-02-02-01 through T-02-02-03 from the threat model are fully addressed as `accept` with mitigations in place.

## Next Phase Readiness

- `colorToFrequency`, `makeDistortionCurve`, `lightnessToFilterCutoff`, `shapeTypeToWave` are exported and tested — ready for Plan 03 AudioContext wiring
- `WaveDescriptor` type discriminates 'pulse' and 'blob' from standard OscillatorType — Plan 03 createVoice can branch on these safely
- No blockers for Phase 02 Plan 03

---
*Phase: 02-audio-engine*
*Completed: 2026-04-15*

## Self-Check: PASSED

- FOUND: src/engine/audioEngine.ts
- FOUND: src/engine/audioEngine.test.ts
- FOUND: .planning/phases/02-audio-engine/02-02-SUMMARY.md
- FOUND commit 4628736: test(02-02): add failing tests for color-to-audio pure functions
- FOUND commit dcbbd29: feat(02-02): implement colorToFrequency, makeDistortionCurve, lightnessToFilterCutoff, shapeTypeToWave
