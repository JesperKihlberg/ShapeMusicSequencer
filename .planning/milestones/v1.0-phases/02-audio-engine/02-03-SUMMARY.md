---
phase: 02-audio-engine
plan: 03
subsystem: audio
tags: [typescript, web-audio, oscillator, voice-lifecycle, zustand, xstate]

# Dependency graph
requires:
  - phase: 02-audio-engine
    plan: 01
    provides: ShapeColor { h, s, l } and ShapeType union from shapeStore.ts
  - phase: 02-audio-engine
    plan: 02
    provides: colorToFrequency, makeDistortionCurve, lightnessToFilterCutoff, shapeTypeToWave pure functions
provides:
  - AudioVoice interface: oscillator, waveshaper, filter, gainNode, noiseSource? per shape
  - initAudioEngine: shapeStore subscriber that creates Web Audio voices on shape placement
  - voices Map<string, AudioVoice>: per-shape signal chain registry
  - masterGain singleton at 0.15 for 16-voice headroom
  - sequencerMachine boots in 'playing' state (D-13)
affects: [02-audio-engine checkpoint (human-verify), Phase 3 shape removal, Phase 5 PLAY/STOP transitions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AudioContext lazy-init: created on first shapeStore subscriber callback (user-gesture path via click)"
    - "Voice signal chain: OscillatorNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain → destination"
    - "Blob topology: [noiseSource + sineOsc] → mixer → WaveShaperNode → BiquadFilterNode → GainNode → masterGain"
    - "Gain ramp-in: 0→0.4 in 10ms via linearRampToValueAtTime to prevent click artifacts"
    - "AudioContext availability guard: typeof AudioContext === 'undefined' check prevents jsdom crash"
    - "initAudioEngine mirrors initCanvasEngine pattern: subscribe once, return destroy() for React cleanup"

key-files:
  created: []
  modified:
    - src/engine/audioEngine.ts
    - src/components/CanvasContainer.tsx
    - src/machine/sequencerMachine.ts

key-decisions:
  - "AudioContext availability guard in getAudioContext(): typeof AudioContext === 'undefined' check — createVoice returns early in jsdom where Web Audio API is absent, prevents unhandled ReferenceError in CanvasContainer integration tests"
  - "masterGain.gain.value = 0.15: provides headroom for up to 16 simultaneous voices before clipping"
  - "Blob uses AudioBufferSourceNode (noiseSource) stored as 'oscillator' field in AudioVoice: sineOsc is the oscillator field, noiseSource stored separately for independent stop() in destroy()"

patterns-established:
  - "Dual-engine cleanup: CanvasContainer useEffect returns arrow function calling both destroyCanvas() and destroyAudio() — not a single destroy reference"
  - "Voice lifecycle gated on voices.has(shape.id): idempotent createVoice calls safe across React StrictMode double-invoke"

requirements-completed: [SHPE-01, AUDI-01, AUDI-02]

# Metrics
duration: 12min
completed: 2026-04-15
---

# Phase 02 Plan 03: Audio Voice Lifecycle Engine Summary

**Full Web Audio API voice lifecycle wired into the app: placing any shape on the canvas immediately creates an isolated oscillator→waveshaper→filter→gain signal chain producing audible sound, with all six shape types producing their characteristic waveforms**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-15T13:45:00Z
- **Completed:** 2026-04-15T13:57:00Z
- **Tasks:** 2 (auto) + 1 checkpoint (human-verify, pending)
- **Files modified:** 3

## Accomplishments

- Exported `AudioVoice` interface with `oscillator`, `waveshaper`, `filter`, `gainNode`, and optional `noiseSource` fields
- Added module-level `voices Map<string, AudioVoice>` tracking all active voice signal chains
- Added `getAudioContext()` lazy-init with availability guard (`typeof AudioContext === 'undefined'`) for jsdom safety
- Added `masterGain` singleton at 0.15 gain (headroom for 16 simultaneous voices)
- Added `createVoice()` building full signal chain for all 6 shape types:
  - Standard path (circle, triangle, square, star, diamond): OscillatorNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain
  - Blob path: [AudioBufferSourceNode(noise) + OscillatorNode(sine)] → mixer → WaveShaperNode(bandpass) → BiquadFilterNode → GainNode → masterGain
  - Pulse wave (diamond) uses Fourier-series PeriodicWave with 25% duty cycle
  - Gain ramp 0→0.4 in 10ms on all voices (no click artifact)
- Exported `initAudioEngine()` subscribing to `shapeStore`, calling `createVoice` for each new shape, returning `destroy()` for React cleanup
- Updated `CanvasContainer.tsx` useEffect to call `initAudioEngine()` alongside `initCanvasEngine()`, both destroy functions invoked on cleanup
- Changed `sequencerMachine` `initial` from `'idle'` to `'playing'` per D-13
- All 34 tests pass; zero TypeScript errors

## Task Commits

Each task committed atomically:

1. **Task 1: Voice lifecycle + CanvasContainer wiring** — `6f7e300` (feat)
2. **Task 2: sequencerMachine initial state → 'playing'** — `e550471` (feat)

## Files Created/Modified

- `src/engine/audioEngine.ts` — Added AudioVoice interface, voices Map, getAudioContext, getPulseWave, createNoiseBuffer, createVoice, initAudioEngine; also added Shape import and shapeStore import
- `src/components/CanvasContainer.tsx` — Added initAudioEngine import; updated useEffect to call both initCanvasEngine and initAudioEngine with dual-destroy cleanup
- `src/machine/sequencerMachine.ts` — Changed initial: 'idle' to initial: 'playing'; updated state comments

## Decisions Made

- **AudioContext availability guard:** The `CanvasContainer.test.tsx` integration test calls `addShape` which fires the `shapeStore.subscribe` callback registered by `initAudioEngine`. In jsdom, `AudioContext` is undefined — without a guard, `new AudioContext()` throws `ReferenceError`. Added `typeof AudioContext === 'undefined'` check in `getAudioContext()`, with `createVoice` returning early on null. This is correct production behavior (graceful degradation in headless/non-audio environments).
- **masterGain at 0.15:** With 16 simultaneous voices each at gainNode=0.4, summed output could clip. Master gain of 0.15 keeps peak well within [-1, 1] for all 16 voices active simultaneously.
- **Blob sineOsc stored as `oscillator` field:** AudioVoice.oscillator is typed as `OscillatorNode | AudioBufferSourceNode`. For blob, the sine oscillator is the "pitch voice" — stored as `oscillator`. The noise buffer source is stored as `noiseSource`. Both are stopped independently in destroy().

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] AudioContext availability guard for jsdom**
- **Found during:** Task 1 verification (vitest run)
- **Issue:** `CanvasContainer.test.tsx` renders `CanvasContainer`, which mounts `initAudioEngine`. When the test fires `addShape`, the `shapeStore.subscribe` callback executes `createVoice`, which calls `getAudioContext()` → `new AudioContext()`. jsdom does not implement `AudioContext`, throwing `ReferenceError: AudioContext is not defined` as an unhandled exception during the test run.
- **Fix:** Added `if (typeof AudioContext === 'undefined') return null` guard at the top of `getAudioContext()`. Changed return type to `AudioContext | null`. Added `if (!ctx) return` early exit at the top of `createVoice`. This is both a correctness fix (tests pass cleanly) and correct production behavior (audio silently disabled in environments without Web Audio API).
- **Files modified:** `src/engine/audioEngine.ts`
- **Commit:** `6f7e300`

## Known Stubs

None — all voice creation paths produce real Web Audio API nodes. No hardcoded silence, no placeholder return values. The `prevShapeIds` tracking in `initAudioEngine` is scaffolding for Phase 3 voice removal (shape deletion not yet implemented), clearly commented as deferred.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary crossings beyond those already in the plan's threat model (T-02-03-01 through T-02-03-06, all `accept` disposition). The AudioContext availability guard (T-02-03-06 mitigation for React StrictMode) is implemented as specified.

## Self-Check: PASSED

- FOUND: src/engine/audioEngine.ts
- FOUND: src/components/CanvasContainer.tsx
- FOUND: src/machine/sequencerMachine.ts
- FOUND: .planning/phases/02-audio-engine/02-03-SUMMARY.md
- FOUND commit 6f7e300: feat(02-03): add voice lifecycle to audioEngine and wire into CanvasContainer
- FOUND commit e550471: feat(02-03): change sequencerMachine initial state to 'playing' (D-13)
