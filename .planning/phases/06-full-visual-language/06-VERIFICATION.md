---
phase: 06-full-visual-language
verified: 2026-04-23T09:22:30Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Toolbar order: confirm 'Shape Music Sequencer' | spacer | Root key dropdown | Scale dropdown | BPM | Volume | Start/Stop (left to right)"
    expected: "Two compact dropdowns appear immediately left of BPM widget"
    why_human: "CSS layout cannot be verified by grep — requires visual inspection in browser"
  - test: "Stereo pan: place a shape in column 0, another in column 3; listen with headphones or speakers"
    expected: "Column 0 shape sounds from left channel, column 3 shape sounds from right channel, with clear stereo separation"
    why_human: "Web Audio StereoPannerNode behavior requires a running AudioContext and audio output device"
  - test: "Scale quantization: place 3-4 shapes with varied hues; switch Scale dropdown between Major, Pentatonic Minor, and Chromatic"
    expected: "All voices immediately re-pitch on dropdown change; Major sounds diatonic, Pentatonic Minor pentatonic, Chromatic uses raw hue-to-pitch with no snapping"
    why_human: "Live audio re-pitch behavior requires a running browser session"
  - test: "Root key transposition: set Scale to Major with root key C, then change root key to G"
    expected: "All voices transpose up a fifth immediately — same scale pattern, different tonal center"
    why_human: "Transposition requires live audio verification"
  - test: "WaveShaper harmonic richness: select a shape, open its panel, sweep saturation 0 → 50 → 100"
    expected: "Saturation 0 = clean tone; saturation 50 = warm harmonic character (organ/pad); saturation 100 = dense soft-clip texture — transition is gradual and musical, not harsh"
    why_human: "Timbre quality assessment requires listening; no programmatic proxy exists"
  - test: "No regressions: confirm BPM increment/decrement, Volume slider, and Start/Stop button still work after Phase 6 changes"
    expected: "All three controls behave identically to pre-Phase-6 behavior"
    why_human: "Interaction regression requires manual UI exercise"
---

# Phase 6: Full Visual Language Verification Report

**Phase Goal:** Full visual language — scale quantization (PLAY-05, PLAY-06), stereo panning (AUDI-03), improved harmonic distortion curve
**Verified:** 2026-04-23T09:22:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | scaleStore defaults to `{ rootKey: 0, scale: 'major' }` | VERIFIED | `scaleStore.ts` line 40-41: `rootKey: 0, scale: 'major'` |
| 2 | scaleStore.setRootKey clamps input to [0,11] and rounds to integer | VERIFIED | `scaleStore.ts` line 43: `Math.round(Math.max(0, Math.min(11, key)))` |
| 3 | scaleStore.setScale accepts all 7 ScaleName values | VERIFIED | `scaleStore.ts` ScaleName union: major, natural-minor, pentatonic-major, pentatonic-minor, dorian, mixolydian, chromatic |
| 4 | SCALE_INTERVALS exported with correct interval arrays for all 7 scales | VERIFIED | `scaleStore.ts` lines 22-30: all 7 entries present including chromatic `[0,1,2,...,11]` |
| 5 | quantizeSemitone exported from audioEngine.ts, snaps raw semitone to nearest in-scale candidate | VERIFIED | `audioEngine.ts` lines 92-110: exported pure function with circular distance algorithm |
| 6 | quantizeSemitone with chromatic intervals [0..11] is identity passthrough | VERIFIED | Test `chromatic intervals are identity passthrough` passes; algorithm returns exact match (dist=0) for every semitone |
| 7 | Every placed shape has a StereoPannerNode between its GainNode and masterGain | VERIFIED | `audioEngine.ts` blob path lines 300-303, standard path lines 324-327: both create panner, wire `gainNode.connect(panner); panner.connect(mg)` |
| 8 | Column 0 shapes are hard left (-1.0), column 3 shapes are hard right (+1.0) | VERIFIED | Both createVoice paths: `panner.pan.value = (shape.col / 3) * 2 - 1`; pan formula tests in audioEngine.test.ts pass |
| 9 | Voice removal and type-change both call panner.disconnect() before GC | VERIFIED | `audioEngine.ts` line 478: `v.panner.disconnect()` in type-change setTimeout; line 519: `voice.panner.disconnect()` in removal setTimeout |
| 10 | makeDistortionCurve uses two-stage Chebyshev+soft-clip algorithm (no smoothstep) | VERIFIED | `audioEngine.ts` lines 46-81: blend/k/softClip algorithm present; no `smoothstep` in file |
| 11 | updateVoiceColor threads quantizeSemitone before colorToFrequency | VERIFIED | `audioEngine.ts` lines 349-357: reads scaleStore, calls `quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])`, back-converts via `quantized * 30` |
| 12 | Changing scale/key in scaleStore immediately re-pitches all active voices | VERIFIED | `audioEngine.ts` lines 583-595: `scaleStore.subscribe` iterates voices and calls `updateVoiceColor` on rootKey/scale change |
| 13 | ScaleSelector renders two select elements with aria-labels "Root key" and "Scale" | VERIFIED | `ScaleSelector.tsx` lines 25, 33: `aria-label="Root key"` and `aria-label="Scale"` |
| 14 | ScaleSelector wired to scaleStore in App.tsx toolbar, left of PlaybackControls | VERIFIED | `App.tsx` lines 19-22: `<div className="toolbar__controls"><ScaleSelector /><PlaybackControls /></div>` |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/scaleStore.ts` | ScaleState, ScaleName, SCALE_INTERVALS, scaleStore, useScaleStore | VERIFIED | All 5 named exports present; substantive implementation |
| `src/engine/audioEngine.ts` | quantizeSemitone, StereoPannerNode, two-stage distortion, scaleStore subscription | VERIFIED | All features implemented; imports scaleStore |
| `src/components/ScaleSelector.tsx` | Two select elements, store wiring | VERIFIED | Full component with 12 root key options and 7 scale options |
| `src/components/PlaybackControls.tsx` | Root element changed to React fragment | VERIFIED | Line 56: returns `<>` not `<div className="toolbar__controls">` |
| `src/App.tsx` | ScaleSelector import, shared toolbar__controls wrapper | VERIFIED | Lines 5 and 19-22 confirm import and wrapper |
| `src/styles/index.css` | .scale-selector CSS block | VERIFIED | Lines 525, 531, 542: three selector blocks present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ScaleSelector.tsx` | `scaleStore.ts` | `useScaleStore` hook reads rootKey/scale; `scaleStore.getState().set*` on change | WIRED | Lines 19-20 (reads); lines 27, 36 (writes) |
| `audioEngine.ts createVoice` | `StereoPannerNode` | `gainNode.connect(panner); panner.connect(mg)` | WIRED | Both blob (lines 302-303) and standard (lines 326-327) paths |
| `audioEngine.ts updateVoiceColor` | `quantizeSemitone` | `scaleStore.getState()` + `quantizeSemitone(rawSemitone, ...)` call | WIRED | Lines 349-356 |
| `audioEngine.ts initAudioEngine` | `scaleStore` | `scaleStore.subscribe` callback re-pitches all voices | WIRED | Lines 583-595; `unsubscribeScale()` called in destroy() line 600 |
| `App.tsx toolbar` | `ScaleSelector + PlaybackControls` | Both inside shared `div.toolbar__controls` | WIRED | Lines 19-22 |
| `scaleStore.subscribe` | audioCtx null-check | `const ctx = audioCtx` (NOT `getAudioContext()`) | WIRED | Line 584: `const ctx = audioCtx` confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ScaleSelector.tsx` | `rootKey`, `scale` | `useScaleStore` reads from `scaleStore` vanilla Zustand store | Yes — store state flows directly to select `value` props | FLOWING |
| `audioEngine.ts updateVoiceColor` | `rootKey`, `scale` | `scaleStore.getState()` synchronous read | Yes — live store state at call time | FLOWING |
| `audioEngine.ts scaleStore.subscribe` | `state.rootKey`, `state.scale` | Zustand subscription callback argument | Yes — fires on every store mutation | FLOWING |

### Behavioral Spot-Checks

All checks verified via `npx vitest run --pool=threads`:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 154 tests pass (scaleStore, audioEngine, ScaleSelector, all pre-existing) | `npx vitest run --pool=threads` | 154 passed (13 files) | PASS |
| quantizeSemitone C major tie-break | audioEngine.test.ts `quantizeSemitone` describe | raw=1→0, raw=6→5 | PASS |
| quantizeSemitone chromatic passthrough | audioEngine.test.ts | raw=0..11 all identity | PASS |
| makeDistortionCurve identity at s=0 | audioEngine.test.ts | curve[128]≈0, curve[0]≈-1 | PASS |
| makeDistortionCurve non-linear at s=100 | audioEngine.test.ts | `Math.abs(curve100[240] - x240) > 0.01` | PASS |
| makeDistortionCurve monotonically non-decreasing | audioEngine.test.ts | verified at s=0, 50, 100 | PASS |
| pan formula: col 0→-1.0, col 3→+1.0 | audioEngine.test.ts pan formula describe | 4/4 pass | PASS |
| scaleStore defaults, clamping, all 7 scale names | scaleStore.test.ts | 16/16 pass | PASS |
| ScaleSelector renders 12 root key + 7 scale options, wires to store | ScaleSelector.test.tsx | 9/9 pass | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AUDI-03 | 06-00, 06-02 | Cell column position maps to stereo pan (StereoPannerNode; left col = hard left, right = hard right) | SATISFIED | StereoPannerNode in both createVoice paths; pan formula `(col/3)*2-1`; both teardown sites disconnect; pan formula tests pass |
| PLAY-05 | 06-00, 06-01, 06-02, 06-03 | Key/scale selector constrains valid pitches (6 named scales) | SATISFIED | scaleStore + SCALE_INTERVALS (6 named scales); quantizeSemitone wired in updateVoiceColor; ScaleSelector UI renders and writes to store; scaleStore.subscribe live-repitches |
| PLAY-06 | 06-00, 06-01, 06-02, 06-03 | Scale mode and chromatic mode selectable per session | SATISFIED | 'chromatic' is a ScaleName value in SCALE_INTERVALS with all 12 intervals — identity passthrough by construction; selectable from ScaleSelector dropdown |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

Scanned files: `audioEngine.ts`, `scaleStore.ts`, `ScaleSelector.tsx`, `PlaybackControls.tsx`, `App.tsx`.

Notable non-issues:
- `return null` / empty returns in audioEngine.ts are early guards (`if (!voice || !ctx) return`) — not stubs; the functions have full implementations that execute when preconditions are met.
- `gainNode.connect(mg)` is NOT present — the old direct connection has been fully replaced by the panner chain.
- No `smoothstep` helper remains — old distortion algorithm fully replaced.
- No `getAudioContext()` inside `scaleStore.subscribe` callback — threat model mitigation T-06-02-01 applied correctly.

### Human Verification Required

The following items require a running browser session with audio output. All automated checks pass; these verify perceptual and behavioral qualities that cannot be programmatically confirmed.

#### 1. Toolbar Visual Layout

**Test:** Run `npm run dev`, open http://localhost:5173. Inspect the toolbar from left to right.
**Expected:** "Shape Music Sequencer" title | flexible spacer | Root key dropdown | Scale dropdown | BPM widget | Volume slider | Start/Stop button
**Why human:** CSS flex layout and visual positioning cannot be verified by static analysis.

#### 2. Stereo Pan Separation

**Test:** Place a shape in column 0 (leftmost) and another in column 3 (rightmost). Listen with headphones or stereo speakers.
**Expected:** Column 0 shape is clearly audible from the left channel; column 3 shape from the right channel. Separation should be pronounced (pan values are -1.0 and +1.0).
**Why human:** StereoPannerNode output requires a real AudioContext and audio hardware.

#### 3. Scale Quantization Live Re-pitch

**Test:** Place 3-4 shapes with varied hues (use color picker to set different hues). With Scale set to "Major" / root "C", listen to the melody. Then switch Scale to "Pentatonic Minor", then "Dorian", then "Chromatic".
**Expected:** Every dropdown change immediately re-pitches all voices. Major sounds diatonic (7-note scale). Pentatonic Minor sounds pentatonic. Chromatic uses raw hue-to-pitch with no snapping — all 12 pitches accessible.
**Why human:** Live audio re-pitch quality requires a running session; can't simulate scaleStore.subscribe firing and AudioParam updates in jsdom.

#### 4. Root Key Transposition

**Test:** Set Scale to "Major", root key to "C". Place shapes. Then change root key to "G".
**Expected:** The entire composition transposes up a fifth immediately — same relative scale pattern, shifted tonal center.
**Why human:** Transposition is a perceptual audio quality that requires listening.

#### 5. WaveShaper Harmonic Richness Sweep

**Test:** Select a shape, open its edit panel. Drag the saturation slider from 0 to 50 to 100.
**Expected:** Saturation 0 = clean, pure tone (identity curve — no coloring). Saturation 50 = warm, harmonic character (Chebyshev T2/T3 adds 2nd/3rd harmonics — organ/pad texture). Saturation 100 = dense, character-rich soft-clip. Transition is gradual and musical, not harsh or buzzy.
**Why human:** Timbral quality assessment requires listening; the two-stage algorithm's perceptual output cannot be verified from the Float32Array values alone.

#### 6. No Regressions in Pre-existing Controls

**Test:** Exercise BPM increment (-/+ buttons), BPM text input (type a value, press Enter), Volume slider, Start/Stop button, shape add/remove.
**Expected:** All controls behave identically to pre-Phase-6 behavior. No crashes, no audio glitches on shape add/remove.
**Why human:** Interaction regression in a live browser cannot be fully covered by unit tests.

---

## Gaps Summary

No automated gaps found. All 14 must-haves are verified in the codebase. All 154 tests pass.

The phase goal is mechanically complete:
- PLAY-05: scaleStore + quantizeSemitone + scaleStore.subscribe + ScaleSelector UI all implemented and tested
- PLAY-06: 'chromatic' as a ScaleName with identity-passthrough SCALE_INTERVALS, selectable from UI
- AUDI-03: StereoPannerNode per voice in both createVoice paths, pan formula `(col/3)*2-1`, both teardown sites clean up, pan formula tests pass
- Harmonic distortion: two-stage Chebyshev+soft-clip replaces old single-stage algorithm

Status is `human_needed` (not `passed`) because 6 behavioral items require live audio verification in a browser. These cover perceptual qualities (stereo separation, timbral progression, scale re-pitch), visual layout (toolbar order), and regression safety — none of which are programmically falsifiable from static analysis or jsdom tests.

---

_Verified: 2026-04-23T09:22:30Z_
_Verifier: Claude (gsd-verifier)_
