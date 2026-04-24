---
phase: 05-playback-controls
verified: 2026-04-17T09:20:34Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Start/Stop audio control"
    expected: "Clicking Stop silences all audio; clicking Start resumes all audio simultaneously"
    why_human: "AudioContext suspend/resume behavior requires a real browser with Web Audio API; jsdom mocks cannot simulate actual audio output"
  - test: "BPM LFO rate change is audible/visible"
    expected: "Changing BPM from 120 to 60 noticeably slows shape pulse animation; changing to 180 noticeably speeds it up"
    why_human: "Requires visual and auditory observation of running animation in browser; cannot be verified programmatically"
  - test: "Volume slider audibly scales output"
    expected: "Moving volume slider left reduces audio loudness; moving right increases it; no clipping distortion at max"
    why_human: "Requires auditory verification in browser with real audio output"
  - test: "Beat-fraction selector visual state and Hz readout"
    expected: "Selected fraction button appears highlighted in accent color; Hz readout updates when BPM changes"
    why_human: "CSS active state rendering and live BPM reactivity require browser visual inspection"
---

# Phase 5: Playback Controls Verification Report

**Phase Goal:** Add playback controls — Start/Stop, BPM, and Volume — so the user can control when music plays and at what tempo and loudness.
**Verified:** 2026-04-17T09:20:34Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can start and stop all audio playback | VERIFIED (code) + human needed (audio) | `PlaybackControls` renders Start/Stop button; `audioEngine` calls `ctx.resume()`/`ctx.suspend()` on `isPlaying` change; all 8 PlaybackControls tests pass |
| 2 | BPM control updates BPM-synced LFO rate of all shape animations | VERIFIED (code) + human needed (visual) | BPM widget with +/- buttons exists; `audioEngine` updates all live `lfoOscillator.frequency` via `setTargetAtTime`; `canvasEngine` uses `computeLfoHz(shape.animRate, bpm)` in `pulseScale` formula |
| 3 | Master volume control audibly scales output | VERIFIED (code) + human needed (audio) | Volume slider exists; `audioEngine` calls `masterGain.gain.setTargetAtTime(volume * 0.15, ctx.currentTime, 0.05)` on volume change |
| 4 | Toolbar shows BPM, Volume, and Start/Stop controls | VERIFIED | `App.tsx` mounts `<PlaybackControls />` in header; toolbar order confirmed: title (left) | .toolbar__controls margin-left:auto (right) containing BPM, Volume, Start/Stop |
| 5 | CellPanel shows beat-fraction selector replacing Hz slider | VERIFIED | 5 FRACTIONS buttons (1/1, 1/2, 1/4, 1/8, 1/16) with `role="group" aria-label="Animation rate"`; old `slider-anim-rate` confirmed absent; Hz readout via `computeLfoHz(shape.animRate, bpm).toFixed(1)` |
| 6 | playbackStore has correct defaults and clamping | VERIFIED | `isPlaying: true`, `bpm: 120`, `volume: 0.8`; `setBpm` clamps 60-180 and rounds; `setVolume` clamps 0-1; all 12 unit tests pass |
| 7 | audioEngine subscription is leak-free | VERIFIED | `unsubscribePlayback()` called in `destroy()` at line 490 |
| 8 | canvasEngine subscription is leak-free | VERIFIED | `unsubscribePlayback()` called in `destroy()` at line 208 |
| 9 | Shape.animRate migrated from number to BeatFraction | VERIFIED | `shapeStore.ts` has `animRate: BeatFraction`, default `animRate: 2`; BeatFraction import is type-only; all 17 shapeStore tests pass |
| 10 | Full test suite passes with no regressions | VERIFIED | `npx vitest run` exits 0; 114/114 tests pass across 11 test files |

**Score:** 10/10 truths verified (programmatically). 4 require human verification for audio/visual confirmation.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/playbackStore.ts` | Vanilla Zustand store + BeatFraction type + computeLfoHz | VERIFIED | Exports `BeatFraction`, `computeLfoHz`, `PlaybackState`, `playbackStore`, `usePlaybackStore`; correct defaults and clamping |
| `src/components/PlaybackControls.tsx` | BPM widget + Volume slider + Start/Stop button | VERIFIED | Exports `PlaybackControls`; uses `usePlaybackStore` + `playbackStore.getState().*`; local `bpmInput` state prevents mid-type snapping |
| `src/components/CellPanel.tsx` | Beat-fraction selector replacing Hz slider | VERIFIED | 5-button FRACTIONS group with role=group; live Hz readout via computeLfoHz |
| `src/App.tsx` | PlaybackControls mounted in toolbar | VERIFIED | Import and `<PlaybackControls />` confirmed at line 4 and 17 |
| `src/styles/index.css` | CSS classes for toolbar controls and beat-fraction selector | VERIFIED | All 11 new Phase 5 CSS classes present including `.toolbar__controls`, `.bpm-widget`, `.btn--start-stop`, `.beat-selector`, `.beat-selector__btn--active` |
| `src/engine/audioEngine.ts` | playbackStore subscription + BeatFraction-aware LFO | VERIFIED | `playbackStore.subscribe` at line 451; isPlaying/volume/BPM handlers all present; `computeLfoHz` used in createLfo and recreateLfo |
| `src/engine/canvasEngine.ts` | isPlaying gate on pulseScale + playbackStore subscription | VERIFIED | `playbackStore.getState().isPlaying` gate and `computeLfoHz` in pulseScale formula; subscription and destroy cleanup present |
| `src/store/shapeStore.ts` | Shape.animRate typed as BeatFraction, default 2 | VERIFIED | `animRate: BeatFraction` in Shape interface; `animRate: 2` in addShape default |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `PlaybackControls.tsx` | `playbackStore.ts` | `usePlaybackStore` hook | WIRED | Line 8-10: `usePlaybackStore((s) => s.isPlaying/bpm/volume)` |
| `CellPanel.tsx` | `playbackStore.ts` | `usePlaybackStore` for BPM readout | WIRED | Line 14 import + line 26 `const bpm = usePlaybackStore((s) => s.bpm)` |
| `App.tsx` | `PlaybackControls.tsx` | import + JSX | WIRED | Line 4 import, line 17 `<PlaybackControls />` |
| `audioEngine.ts` | `playbackStore.ts` | import + subscribe | WIRED | Line 8 import; lines 447-490 `playbackStore.subscribe` block |
| `canvasEngine.ts` | `playbackStore.ts` | import + getState + subscribe | WIRED | Line 12 import; line 127-130 `getState()` in RAF loop; line 191 subscribe |
| `shapeStore.ts` | `playbackStore.ts` | BeatFraction type import | WIRED | Line 10 `import { type BeatFraction } from './playbackStore'` |
| `audioEngine createLfo` | `computeLfoHz` | function call | WIRED | Line 179: `computeLfoHz(shape.animRate as BeatFraction, playbackStore.getState().bpm)` |
| `canvasEngine drawShapes pulseScale` | `computeLfoHz` | function call | WIRED | Line 128: `computeLfoHz(shape.animRate as BeatFraction, playbackStore.getState().bpm)` |
| `audioEngine destroy()` | `unsubscribePlayback` | cleanup call | WIRED | Line 490: `unsubscribePlayback()` |
| `canvasEngine destroy()` | `unsubscribePlayback` | cleanup call | WIRED | Line 208: `unsubscribePlayback()` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `PlaybackControls.tsx` | `isPlaying`, `bpm`, `volume` | `usePlaybackStore` reads from `playbackStore` vanilla store | Yes — store holds live state updated by setters | FLOWING |
| `CellPanel.tsx` | `bpm` (for Hz readout) | `usePlaybackStore((s) => s.bpm)` | Yes — live BPM from store; Hz readout is computed from real `shape.animRate` and `bpm` | FLOWING |
| `audioEngine.ts` | `isPlaying`, `volume`, `bpm` | `playbackStore.subscribe` callback receives new state | Yes — subscription fires on every state change; ctx.suspend/resume called on real AudioContext | FLOWING |
| `canvasEngine.ts` | `isPlaying`, `bpm` | `playbackStore.getState()` called per RAF frame | Yes — synchronous read per frame; `pulseScale` formula uses live values | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| computeLfoHz(1, 120) = 2 (slowest rate) | node inline | 2 | PASS |
| computeLfoHz(16, 120) = 32 (fastest rate) | node inline | 32 | PASS |
| 1/16 is faster than 1/1 | computeLfoHz(16,120) > computeLfoHz(1,120) | true | PASS |
| setBpm(59) clamps to 60 | Math.round(Math.max(60, Math.min(180, 59))) | 60 | PASS |
| setBpm(181) clamps to 180 | Math.round(Math.max(60, Math.min(180, 181))) | 180 | PASS |
| setBpm(100.7) rounds to 101 | Math.round(Math.max(60, Math.min(180, 100.7))) | 101 | PASS |
| setVolume(-0.1) clamps to 0 | Math.max(0, Math.min(1, -0.1)) | 0 | PASS |
| setVolume(1.1) clamps to 1 | Math.max(0, Math.min(1, 1.1)) | 1 | PASS |
| Full test suite passes | npx vitest run | 114/114 passed | PASS |
| TypeScript compilation clean | npx tsc --noEmit | no output (0 errors) | PASS |
| Start/Stop audio in browser | Requires running app | N/A | SKIP — human needed |
| BPM LFO visual effect | Requires running app | N/A | SKIP — human needed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLAY-01 | 05-00, 05-01, 05-02, 05-03, 05-04 | User can start and stop all audio playback | SATISFIED | PlaybackControls Start/Stop button toggles `isPlaying`; audioEngine calls `ctx.suspend/resume`; canvasEngine gates `pulseScale` on `isPlaying`; all PlaybackControls PLAY-01 tests pass |
| PLAY-02 | 05-00, 05-01, 05-02, 05-03, 05-04 | BPM/tempo is configurable via UI control | SATISFIED | BPM widget with +/- buttons and number input in toolbar; audioEngine updates LFO frequencies on BPM change; canvasEngine uses `computeLfoHz(animRate, bpm)` in animation formula; BeatFraction selector in CellPanel shows computed Hz readout |
| PLAY-03 | 05-00, 05-01, 05-02, 05-04 | Master volume control is available | SATISFIED | Volume slider in toolbar (aria-label "Master volume"); audioEngine maps volume to `masterGain.gain.setTargetAtTime(v * 0.15)` with smooth τ=0.05s ramp |

### Anti-Patterns Found

None found across all 7 Phase 5 production files. No TODO/FIXME comments, no placeholder implementations, no empty return values, no hardcoded stubs.

**Formula deviation note (documented, intentional):** The `computeLfoHz` formula was changed from `(bpm/60) * (1/fraction)` to `(bpm/60) * fraction` in commit 14685f7, discovered and fixed during human verification (documented in 05-04-SUMMARY.md as "Bug: 1/16 played slowest instead of fastest"). The new formula makes the denominator act as a speed multiplier, matching user expectation that "1/16" (sixteenth note) is the fastest subdivision. This is a deliberate design decision, not a regression.

### Human Verification Required

#### 1. Start/Stop Audio Control

**Test:** Open `npm run dev` at http://localhost:5173. Place one or more shapes on the grid. The toolbar should show a "Stop" button (default is playing). Click "Stop".
**Expected:** All audio silences immediately. Shapes should freeze at their current visual size. Button label changes to "Start".
**Why human:** AudioContext `suspend()` and `resume()` require a real browser environment with Web Audio API. jsdom cannot simulate actual audio output or verify AudioContext state transitions.

#### 2. BPM LFO Rate Change is Visible and Audible

**Test:** With shapes placed and audio playing (after clicking "Start"), click the "+" BPM button repeatedly to raise BPM from 120 to 180. Then use "−" to lower it to 60.
**Expected:** At 180 BPM, shape pulse animation should visibly speed up. At 60 BPM, animation should slow down noticeably. If audio voices are active, the LFO modulation rate should also change audibly.
**Why human:** The visual animation rate and audio LFO modulation require observation in a running browser. Test suite verifies the wiring and logic but not the perceptual result.

#### 3. Volume Slider Audibly Scales Output

**Test:** With shapes placed and playing, drag the Volume slider all the way left, then slowly right.
**Expected:** At minimum, audio volume is near-silent (masterGain approaches 0). At maximum, audio is audible but not clipping or distorted. The change should be smooth (τ=0.05s ramp).
**Why human:** Requires auditory judgment of loudness and absence of distortion. The 0.15 headroom scalar is designed to prevent clipping — this needs a human to confirm no distortion occurs at max volume with multiple shapes.

#### 4. Beat-Fraction Selector Visual State and Hz Readout

**Test:** Place a shape, click it to open CellPanel. In the Animation section, verify the 5 beat-fraction buttons appear. The "1/2" button should be highlighted (active state). Click "1/16". Then change the BPM value.
**Expected:** "1/16" button highlights in accent color. The Hz readout updates to show a higher value when "1/16" is selected vs "1/2" (at 120 BPM: 1/2 shows 4.0 Hz, 1/16 shows 32.0 Hz). When BPM is changed, the Hz readout updates live.
**Why human:** CSS active state rendering (`.beat-selector__btn--active` with accent background) and live BPM reactivity in the readout require visual inspection in a browser. The test suite confirms the logic but not the rendered visual output.

### Gaps Summary

No gaps found. All programmatically verifiable requirements are satisfied:
- All 10 observable truths verified via code inspection
- All 8 required artifacts exist and pass 3-level verification (exists, substantive, wired)
- All 10 key links confirmed wired
- All data flows producing real data (not stubs)
- PLAY-01, PLAY-02, PLAY-03 requirements satisfied
- 114/114 tests pass; 0 TypeScript errors
- No anti-patterns or placeholder code found

Status is `human_needed` because 4 items require browser verification to confirm audio/visual behavior that cannot be asserted programmatically.

---

_Verified: 2026-04-17T09:20:34Z_
_Verifier: Claude (gsd-verifier)_
