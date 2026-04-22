---
phase: 06-full-visual-language
slug: full-visual-language
status: ready-for-planning
gathered: 2026-04-22
---

# Phase 6: Full Visual Language — Context

## Domain

This phase completes the visual-to-audio mapping: saturation drives harmonic richness via a redesigned WaveShaper curve, column position drives stereo panning via StereoPannerNode, and the key/scale selector constrains pitch to musical scales. Star shape percussion and multi-shape-per-cell are deferred to Phase 7.

Phase boundary is FIXED from ROADMAP.md. Features not listed above are out of scope.

---

## Decisions

### 1. WaveShaper Harmonic Richness (COLR-02 upgrade)

**Chosen approach:** Two-stage transfer curve — Chebyshev harmonic stage feeding into a soft-clip limiter.

- Low saturation (0–30): Chebyshev T2/T3 terms predominate — warm 2nd/3rd harmonics, organ-pad character
- Mid saturation (30–70): Harmonics stack builds, feeding a gentle soft-clip — increasingly rich timbre
- High saturation (70–100): Full harmonic stack + soft-clip limiting — dense, textured, character-rich

**At saturation = 0:** Identity passthrough (perfectly clean). The curve must produce a linear identity at s=0 exactly.

**Implementation note:** Replace `makeDistortionCurve(saturation)` with a new function — same signature, new algorithm. The `WaveShaperNode` stays in the same position in the signal chain (between OscillatorNode and BiquadFilter). `oversample = '2x'` is retained. The function is pure and testable (same as current). Live updates via `voice.waveshaper.curve` reassignment continue to work.

**Curve design reference:**
- Chebyshev T2: `2x² - 1`, T3: `4x³ - 3x`, blended by saturation ratio
- Soft-clip: existing `((π + k) × x) / (π + k × |x|)` with reduced k (0–50 range instead of 0–200)
- Blend parameter: `const blend = Math.min(1, saturation / 50)` — full harmonics by s=50, then clip increases

### 2. Stereo Panning from Column (AUDI-03)

**Chosen approach:** `StereoPannerNode` inserted between the voice's GainNode and `masterGain`. Set once at voice creation — col never changes after placement.

**Formula:** `pan = (shape.col / 3) * 2 - 1`
- col 0 → -1.0 (hard left)
- col 1 → -0.33
- col 2 → +0.33
- col 3 → +1.0 (hard right)

**Signal chain change:** `GainNode → StereoPannerNode → masterGain.destination`

**AudioVoice interface update:** Add `panner: StereoPannerNode` field.

**No pan update function needed** — col is immutable on a placed shape.

**Blob voice:** Same chain extension applies — the mixer GainNode (before waveshaper) connects through StereoPannerNode to masterGain.

### 3. Key/Scale Selector (PLAY-05, PLAY-06)

**UI placement:** Toolbar, to the right of Volume slider and left of Start/Stop button. Two compact controls inline:
- Root key dropdown: 12 chromatic roots (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Scale dropdown: 7 options — Major, Natural Minor, Pentatonic Major, Pentatonic Minor, Dorian, Mixolydian, Chromatic

**Chromatic mode:** "Chromatic" is one option in the scale dropdown (no separate toggle). When "Chromatic" selected, no quantization applied — raw hue-to-semitone as today.

**Live re-pitch on change:** When root key or scale changes, all placed shapes immediately recalculate their oscillator frequency using the new scale. This means changing key transposes the entire composition in real time.

**Quantization algorithm:**
1. Compute raw semitone from hue: existing `hueToSemitone(h)` — returns 0–11
2. If scale = Chromatic: use raw semitone unchanged
3. If scale ≠ Chromatic: find nearest semitone in `[rootSemitone + scaleIntervals]` set; snap to it
4. Final frequency: existing octave formula using `shape.color.l` for octave selection

**Store:** New `scaleStore` (Zustand vanilla, same pattern as `playbackStore`):
```typescript
interface ScaleState {
  rootKey: number       // 0–11, default 0 (C)
  scale: ScaleName      // default 'major'
  setRootKey: (key: number) => void
  setScale: (scale: ScaleName) => void
}
type ScaleName = 'major' | 'natural-minor' | 'pentatonic-major' | 'pentatonic-minor' | 'dorian' | 'mixolydian' | 'chromatic'
```

**Scale intervals (semitones from root):**
- Major: [0, 2, 4, 5, 7, 9, 11]
- Natural Minor: [0, 2, 3, 5, 7, 8, 10]
- Pentatonic Major: [0, 2, 4, 7, 9]
- Pentatonic Minor: [0, 3, 5, 7, 10]
- Dorian: [0, 2, 3, 5, 7, 9, 10]
- Mixolydian: [0, 2, 4, 5, 7, 9, 10]
- Chromatic: [0,1,2,3,4,5,6,7,8,9,10,11] (identity — no snapping)

**audioEngine subscription:** `scaleStore.subscribe` fires `updateVoiceColor(id, shape.color)` for all active voices when rootKey or scale changes. Same pattern as the existing `playbackStore` subscription.

**New exported function:** `quantizeSemitone(rawSemitone: number, rootKey: number, scaleIntervals: number[]): number` — pure, testable.

### 4. Deferred from Phase 6

**Star shape percussion:** Deferred to Phase 7. Star keeps its current `'sawtooth'` oscillator behaviour. Final design (bandpass-filtered noise, hue → filter centre, animation-curve-gated bursts) depends on Phase 7's spline animation system.

**Multi-shape per cell (SHPE-06):** Deferred to a later phase. One-shape-per-cell constraint is unchanged.

### Claude's Discretion

- WaveShaper curve buffer size: 256 samples (unchanged from current)
- `quantizeSemitone` snapping: nearest in-scale semitone using `Math.abs(raw - candidate) % 12` min-distance; ties go to lower candidate
- scaleStore default state: `{ rootKey: 0, scale: 'major' }` — starts in C major
- StereoPanner inserted as named field on AudioVoice; teardown calls `panner.disconnect()` before all other disconnections
- ScaleSelector component uses two `<select>` elements in a `.scale-selector` wrapper; no custom dropdown — matches the existing toolbar aesthetic

---

## Canonical Refs

### Planning documents
- `.planning/REQUIREMENTS.md` — AUDI-03, COLR-02, PLAY-05, PLAY-06, SHPE-06 (deferred)
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, dependencies
- `.planning/INGEST-CONFLICTS.md` — Bucket 1 (auto-resolved): stereo pan decision; Bucket 2 (resolved): saturation → WaveShaper confirmed

### Phase 5 context (pattern source)
- `.planning/phases/05-playback-controls/05-CONTEXT.md` — playbackStore pattern, toolbar layout decisions, BeatFraction animRate
- `.planning/phases/05-playback-controls/05-PLAN.md` files — store + audio + canvas + UI wave structure

### Prior phase audio context
- `.planning/phases/02-audio-engine/` — original WaveShaper and color-to-audio function design

---

## Code Context

### Reusable assets
- `makeDistortionCurve(saturation: number): Float32Array` in `src/engine/audioEngine.ts` — replace algorithm, keep signature and call sites
- `playbackStore.subscribe` pattern in `audioEngine.ts` (lines ~447–490) — copy for `scaleStore.subscribe`
- `computeLfoHz` and `BeatFraction` in `src/store/playbackStore.ts` — not modified but referenced
- `hueToSemitone(h: number)` in `src/engine/audioEngine.ts` — called by `updateVoiceColor`; new `quantizeSemitone` wraps its output
- `createNoiseBuffer(ctx)` — not used in Phase 6 (star deferred)

### Integration points
- `createVoice(shape, ctx, masterGain)` in `audioEngine.ts` — insert `StereoPannerNode` here; connect `gainNode → panner → masterGain` instead of `gainNode → masterGain`
- `updateVoiceColor(id, color)` in `audioEngine.ts` — add `quantizeSemitone` call here before frequency calculation
- `AudioVoice` interface — add `panner: StereoPannerNode`
- `App.tsx` toolbar — add `<ScaleSelector />` component; toolbar order: Title | spacer | Scale | BPM | Volume | Start/Stop
- `src/store/` — add `scaleStore.ts` following `playbackStore.ts` pattern

### Signal chain change (per voice)
Before: `gainNode.connect(masterGain)`
After: `gainNode.connect(panner); panner.connect(masterGain)`

Teardown order: `gainNode.disconnect(); panner.disconnect(); panner = null`

---

## Specifics

- The user said star percussion should ultimately be "controlled by animation properties" — this confirms the deferred path; star sound in Phase 6 is unchanged (sawtooth).
- Key/scale selector goes in the toolbar inline with the existing Phase 5 controls — compact, always visible.
- Chromatic as a scale option (not a toggle) keeps the toolbar minimal — one `<select>` handles both named scales and chromatic mode.
- Re-pitching all shapes immediately on scale change is intentional — it's the "visual canvas = audible composition" core value applied to key changes.

---

## Deferred

- **Star percussion** (SHPE-04 pattern): Bandpass noise burst, hue → bandpass centre, animation-curve-gated rhythm. Requires Phase 7 spline system. When Phase 7 is discussed, revisit `createNoiseBuffer` and `AudioVoice.noiseSource` extension for star.
- **Multi-shape per cell** (SHPE-06): Flat array + occupancy guard redesign, CellPanel tab strip, voice count impact on PERF-03. Deferred to a later phase.
- **Performance tuning** (PERF-01–05): 60fps, <20ms latency, 32-voice ceiling. These are non-functional requirements to track during Phase 6 execution but no specific design changes are decided here.
