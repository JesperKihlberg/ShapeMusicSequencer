---
phase: "05-playback-controls"
plan: "02"
subsystem: "audio-engine"
tags: ["web-audio", "playback", "beat-fraction", "lfo", "zustand-subscribe"]
dependency_graph:
  requires: ["05-01"]
  provides: ["audioEngine-playbackStore-subscription", "BeatFraction-aware-LFO"]
  affects: ["src/engine/audioEngine.ts"]
tech_stack:
  added: []
  patterns: ["playbackStore.subscribe inside initAudioEngine", "setTargetAtTime for live BPM LFO update", "module-level audioCtx null guard in subscribe callback"]
key_files:
  created: []
  modified:
    - src/engine/audioEngine.ts
decisions:
  - "audioCtx module-level null guard (if (!audioCtx) return) used in subscribe callback — prevents AudioContext creation outside user gesture"
  - "BPM change updates live LFO frequencies via setTargetAtTime(newHz, t, 0.015) — no full oscillator rebuild; AudioParam supports scheduled changes"
  - "volume maps to masterGain.gain * 0.15 to preserve 16-voice headroom ceiling established in getAudioContext()"
  - "unsubscribePlayback() added to destroy() — prevents double-subscription in React StrictMode"
metrics:
  duration: "6 min"
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_changed: 1
---

# Phase 5 Plan 02: Audio Engine Playback Wiring Summary

**One-liner:** `audioEngine.ts` wired to `playbackStore` via subscribe — `ctx.suspend/resume` on isPlaying, `masterGain.gain.setTargetAtTime` on volume, live LFO `setTargetAtTime` on BPM, all guarded against pre-gesture AudioContext creation.

## What Was Built

### Task 1: Update createLfo and recreateLfo to use BeatFraction + computeLfoHz

Three targeted changes to `src/engine/audioEngine.ts`:

1. Added import: `import { playbackStore, computeLfoHz, type BeatFraction } from '../store/playbackStore'`
2. `createLfo` (line 179): changed `lfoOscillator.frequency.value = shape.animRate` to `computeLfoHz(shape.animRate as BeatFraction, playbackStore.getState().bpm)` — animRate denominator now converts to Hz via BPM formula
3. `recreateLfo` (line 317): changed signature from `animRate: number` to `animRate: BeatFraction` and changed frequency assignment to `computeLfoHz(animRate, playbackStore.getState().bpm)`

### Task 2: Add playbackStore subscription in initAudioEngine (suspend/resume/volume/BPM)

Added a `playbackStore.subscribe()` block inside `initAudioEngine()` after the existing `shapeStore.subscribe()` closure:

- **isPlaying change** (D-01): `void ctx.resume()` when true, `void ctx.suspend()` when false — AudioContext fully suspended/resumed
- **volume change** (D-11, Pitfall 6): `masterGain.gain.setTargetAtTime(state.volume * 0.15, ctx.currentTime, 0.05)` — τ=0.05 for smooth fade; 0.15 scalar preserves headroom for 16 voices
- **BPM change**: iterates all active `voices` entries, reads each shape's `animRate`, computes `computeLfoHz(shape.animRate, state.bpm)`, updates `voice.lfoOscillator.frequency.setTargetAtTime(newHz, ctx.currentTime, 0.015)` — in-place, no rebuild
- **Critical guard**: `const ctx = audioCtx; if (!ctx) return` — direct module-level null check, not `getAudioContext()`, preventing AudioContext creation outside user gesture (T-05-02-01)

Updated `destroy()` to call `unsubscribePlayback()` immediately after `unsubscribe()` (T-05-02-02).

## Test Results

| File | Tests | Status |
|------|-------|--------|
| `src/engine/audioEngine.test.ts` | 19 passed | GREEN |

TypeScript: `npx tsc --noEmit` — no errors.

Pre-existing failures (out of scope, Wave 0 stubs): `src/components/CellPanel.test.tsx` (2 failures for beat-fraction buttons not yet in CellPanel) and `src/components/PlaybackControls.test.tsx` (component not yet built) — both existed before Plan 02 and are addressed in Plans 03/04.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-05-02-01: Tampering — AudioContext outside user gesture | `if (!audioCtx) return` guard in subscribe; never calls `getAudioContext()` | Code inspection + test pass |
| T-05-02-02: DoS — unsubscribePlayback leak in StrictMode | `unsubscribePlayback()` added to `destroy()` closure | Code inspection (line 489) |
| T-05-02-03: Tampering — masterGain gain overflow | `state.volume * 0.15` caps max gain at 0.15 regardless of slider position | Code inspection (line 469) |

## Known Stubs

None — all audio engine wiring is fully functional. The subscription is live; suspend/resume, volume ramp, and BPM LFO update all operate on real audio nodes when `audioCtx` is initialized.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `4282302` | feat(05-02): update createLfo and recreateLfo to use BeatFraction + computeLfoHz |
| Task 2 | `35be67c` | feat(05-02): add playbackStore subscription in initAudioEngine |

## Self-Check: PASSED

- `src/engine/audioEngine.ts` — EXISTS (modified)
- Commit `4282302` — VERIFIED
- Commit `35be67c` — VERIFIED
- All 19 audioEngine tests pass — VERIFIED
- TypeScript clean — VERIFIED
- `playbackStore.subscribe` present — VERIFIED (line 450)
- `if (!ctx) return` guard present — VERIFIED (line 452)
- `void ctx.resume()` and `void ctx.suspend()` present — VERIFIED (lines 458, 460)
- `masterGain.gain.setTargetAtTime(state.volume * 0.15` present — VERIFIED (line 469)
- `state.bpm !== prevBpm` BPM handler present — VERIFIED (line 475)
- `unsubscribePlayback()` in destroy() — VERIFIED (line 489)
- `computeLfoHz(shape.animRate` in createLfo — VERIFIED (line 179)
- `recreateLfo` signature `animRate: BeatFraction` — VERIFIED (line 317)
- `computeLfoHz(animRate,` in recreateLfo — VERIFIED (line 333)
