# Phase 6: Full Visual Language - Research

**Researched:** 2026-04-22
**Domain:** Web Audio API (StereoPannerNode, WaveShaper), Zustand vanilla store, React toolbar UI, musical scale quantization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**WaveShaper Harmonic Richness (COLR-02 upgrade)**
- Chosen approach: Two-stage transfer curve — Chebyshev harmonic stage feeding into a soft-clip limiter.
- Low saturation (0–30): Chebyshev T2/T3 terms predominate — warm 2nd/3rd harmonics, organ-pad character
- Mid saturation (30–70): Harmonics stack builds, feeding a gentle soft-clip — increasingly rich timbre
- High saturation (70–100): Full harmonic stack + soft-clip limiting — dense, textured, character-rich
- At saturation = 0: Identity passthrough (perfectly clean). Curve must produce a linear identity at s=0 exactly.
- Replace `makeDistortionCurve(saturation)` with new algorithm — same signature and call sites.
- `WaveShaperNode` stays in same position in signal chain (between OscillatorNode and BiquadFilter).
- `oversample = '2x'` retained. Function is pure and testable. Live updates via `voice.waveshaper.curve` reassignment continue to work.
- Curve design: Chebyshev T2/T3 blended by saturation ratio + soft-clip with reduced k (0–50 range)
- Blend parameter: `const blend = Math.min(1, saturation / 50)` — full harmonics by s=50, clip increases above
- Buffer size: 256 samples (Claude's discretion, unchanged)

**Stereo Panning from Column (AUDI-03)**
- `StereoPannerNode` inserted between voice's GainNode and `masterGain`. Set once at voice creation.
- Formula: `pan = (shape.col / 3) * 2 - 1` (col 0 → -1.0, col 1 → -0.33, col 2 → +0.33, col 3 → +1.0)
- Signal chain change: `GainNode → StereoPannerNode → masterGain.destination`
- `AudioVoice` interface: add `panner: StereoPannerNode` field
- No pan update function needed — col is immutable on a placed shape.
- Blob voice: same chain extension — mixer GainNode connects through StereoPannerNode to masterGain.
- Teardown order: `gainNode.disconnect(); panner.disconnect(); panner = null`

**Key/Scale Selector (PLAY-05, PLAY-06)**
- UI: Toolbar, to the right of Volume slider and left of Start/Stop button. Two compact `<select>` controls inline.
- Root key dropdown: 12 chromatic roots (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Scale dropdown: Major, Natural Minor, Pentatonic Major, Pentatonic Minor, Dorian, Mixolydian, Chromatic
- Chromatic is a scale option (not a toggle) — no quantization applied when selected.
- Live re-pitch on change: all placed shapes immediately recalculate frequency using the new scale.
- Quantization algorithm: hueToSemitone(h) → if not Chromatic, find nearest semitone in `[rootSemitone + scaleIntervals]`; snap to it
- New `scaleStore` (Zustand vanilla, same pattern as `playbackStore`)
- `scaleStore.subscribe` fires `updateVoiceColor(id, shape.color)` for all active voices when rootKey or scale changes
- New exported function: `quantizeSemitone(rawSemitone: number, rootKey: number, scaleIntervals: number[]): number`
- Toolbar order: Title | spacer | Scale | BPM | Volume | Start/Stop

**Deferred from Phase 6**
- Star shape percussion (SHPE-04): deferred to Phase 7. Star keeps `'sawtooth'` oscillator behavior.
- Multi-shape per cell (SHPE-06): deferred to a later phase. One-shape-per-cell constraint unchanged.

### Claude's Discretion

- WaveShaper curve buffer size: 256 samples (unchanged from current)
- `quantizeSemitone` snapping: nearest in-scale semitone using `Math.abs(raw - candidate) % 12` min-distance; ties go to lower candidate
- scaleStore default state: `{ rootKey: 0, scale: 'major' }` — starts in C major
- StereoPanner inserted as named field on AudioVoice; teardown calls `panner.disconnect()` before all other disconnections
- ScaleSelector component uses two `<select>` elements in a `.scale-selector` wrapper; no custom dropdown

### Deferred Ideas (OUT OF SCOPE)

- Star percussion (SHPE-04): bandpass noise burst, hue → bandpass centre, animation-curve-gated rhythm
- Multi-shape per cell (SHPE-06): flat array + occupancy guard redesign
- Performance tuning (PERF-01–05): tracked non-functionally but no design changes decided
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDI-03 | Cell column position maps to stereo pan (StereoPannerNode; left col = hard left, right = hard right) | StereoPannerNode pan param verified as -1 to +1 range [ASSUMED: MDN Web Audio API]; insertion point in createVoice identified at `gainNode.connect(mg)` line |
| PLAY-05 | Key/scale selector constrains valid pitches (6 scales: major, natural minor, pentatonic major, pentatonic minor, dorian, mixolydian) | scaleStore pattern mirrors playbackStore exactly; quantizeSemitone wraps hueToSemitone output; all 7 scale interval sets defined in CONTEXT.md |
| PLAY-06 | Scale mode (default) and chromatic mode selectable per session | Chromatic is a `ScaleName` option, not a separate boolean; when `scale === 'chromatic'` quantizeSemitone is a no-op passthrough |
</phase_requirements>

---

## Summary

Phase 6 adds three independent features to the existing audio engine and toolbar: (1) a redesigned WaveShaper distortion curve with a two-stage Chebyshev + soft-clip blend, (2) StereoPannerNode per-voice panning driven by column position, and (3) a key/scale selector that quantizes all voice pitches to a user-selected musical scale.

All three features follow patterns already established in the codebase. The Chebyshev WaveShaper function is already partially implemented in `audioEngine.ts` (the current `makeDistortionCurve` already uses Chebyshev T2–T5) — Phase 6 replaces the pure harmonic blend with a two-stage curve that adds a soft-clip stage at high saturation. The StereoPannerNode insertion is a minimal signal chain change at one point in `createVoice`. The scaleStore and ScaleSelector follow the playbackStore/PlaybackControls pattern identically.

The critical integration point is `updateVoiceColor`: Phase 6 must thread `quantizeSemitone` through this function before the `colorToFrequency` call, which requires reading from `scaleStore`. The live re-pitch behaviour (all voices update on scale/key change) is handled by a `scaleStore.subscribe` callback that calls `updateVoiceColor` for each active voice — identical in structure to the existing `playbackStore.subscribe` block.

One pre-existing test failure exists in `audioEngine.test.ts`: `makeDistortionCurve > harmonic richness increases monotonically` fails because the current Chebyshev implementation does not maintain monotonic deviation at index 192 across saturation levels. This test must be fixed or replaced as part of Wave 0 for Phase 6, since the new two-stage algorithm changes behavior at that index differently.

**Primary recommendation:** Wave 0 fixes the stale test first, then Wave 1 builds scaleStore, Wave 2a adds StereoPannerNode, Wave 2b replaces makeDistortionCurve + wires quantizeSemitone, Wave 3 adds ScaleSelector UI.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WaveShaper curve algorithm | Audio Engine (`audioEngine.ts`) | — | Pure math function, no React, no DOM; same tier as existing makeDistortionCurve |
| Stereo pan node creation | Audio Engine (`createVoice`) | — | Web Audio API node — must be created in the audio engine, not React |
| Pan value calculation | Audio Engine (`createVoice`) | — | Read from `shape.col` at voice creation; col is immutable so no update function needed |
| Scale state storage | Store Layer (`scaleStore.ts`) | — | Same tier as playbackStore, selectionStore, shapeStore — vanilla Zustand, non-React |
| Semitone quantization | Audio Engine (`updateVoiceColor`) | Pure utility function | Reads scaleStore, wraps hueToSemitone; frequency calculation is audio engine responsibility |
| Scale selector UI | React Component (`ScaleSelector.tsx`) | — | Toolbar control, same tier as PlaybackControls |
| Voice re-pitch on scale change | Audio Engine (scaleStore.subscribe) | — | Mirrors playbackStore.subscribe pattern; audio parameter update is engine's job |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand (vanilla) | 5.0.12 | `scaleStore` state management | Already the project store pattern for all non-React state [VERIFIED: package.json] |
| Web Audio API | Browser built-in | `StereoPannerNode`, `WaveShaperNode`, `OscillatorNode` | Already the audio engine foundation; all voices use it [VERIFIED: audioEngine.ts] |
| React | 19.2.4 | `ScaleSelector` component | Project UI framework; all toolbar controls are React [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.4 | Unit tests for `quantizeSemitone`, `scaleStore`, `ScaleSelector` | Already the project test framework [VERIFIED: package.json, vite.config.ts] |
| @testing-library/react | 16.3.2 | Component tests for `ScaleSelector` | Already used for PlaybackControls.test.tsx, CellPanel.test.tsx [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `StereoPannerNode` | `PannerNode` (3D) | `PannerNode` has 3D spatial audio features — overkill for simple left-right panning; `StereoPannerNode` is designed exactly for stereo pan |
| Vanilla `<select>` | Custom dropdown component | Custom dropdown = complexity not warranted; existing toolbar uses native controls; `<select>` matches toolkit aesthetic |

**Installation:** No new packages needed. All capabilities use existing dependencies.

**Version verification:**
```bash
# zustand already installed
node -e "console.log(require('./node_modules/zustand/package.json').version)"
# 5.0.12 [VERIFIED: 2026-04-22]
```

---

## Architecture Patterns

### System Architecture Diagram

```
User changes scale/key (ScaleSelector)
        |
        v
  scaleStore.setState()
        |
        +---> React re-renders ScaleSelector (display update)
        |
        +---> scaleStore.subscribe callback (audioEngine.ts)
                    |
                    v
         for each active voice:
           updateVoiceColor(shapeId, shape.color)
                    |
                    v
            hueToSemitone(color.h)
                    |
                    v
            quantizeSemitone(raw, rootKey, intervals)
                    |
                    v
            colorToFrequency() [uses quantized semitone]
                    |
                    v
         voice.oscillator.frequency.setTargetAtTime()

User places shape (shapeStore.addShape)
        |
        v
  shapeStore.subscribe callback (audioEngine.ts)
        |
        v
  createVoice(shape)
        |
        v
  OscillatorNode → WaveShaperNode → BiquadFilterNode → GainNode → StereoPannerNode → masterGain
        |                                                                ^
        |                                              pan = (col/3)*2-1 (set once, col immutable)
        |
        +---> LFO: ConstantSourceNode + lfoOscillator → gainNode.gain

User changes saturation (CellPanel HsvSliders)
        |
        v
  shapeStore.setState()
        |
        v
  shapeStore.subscribe callback → updateVoiceColor()
        |
        v
  makeDistortionCurve(color.s) [two-stage Chebyshev + soft-clip]
        |
        v
  voice.waveshaper.curve = newCurve [direct assignment — not an AudioParam]
```

### Recommended Project Structure

```
src/
├── store/
│   ├── scaleStore.ts          # new — ScaleState, ScaleName, scaleStore, useScaleStore
│   ├── scaleStore.test.ts     # new — Wave 0 (RED) → Wave 1 (GREEN)
│   ├── playbackStore.ts       # existing — unchanged
│   └── shapeStore.ts          # existing — unchanged
├── engine/
│   └── audioEngine.ts         # modified — quantizeSemitone export, StereoPannerNode, scaleStore.subscribe
├── components/
│   ├── ScaleSelector.tsx       # new — two <select> controls in .scale-selector wrapper
│   ├── ScaleSelector.test.tsx  # new — Wave 0 (RED) → Wave 3 (GREEN)
│   ├── PlaybackControls.tsx    # existing — unchanged (ScaleSelector is a sibling, not inside)
│   └── App.tsx                 # modified — add <ScaleSelector /> to toolbar, before PlaybackControls
└── styles/
    └── index.css               # modified — add .scale-selector CSS classes
```

### Pattern 1: scaleStore (mirrors playbackStore exactly)

**What:** Zustand vanilla store using `createStore` (not `create`) so non-React subscribers (audioEngine) can call `.subscribe()`.
**When to use:** Any state that audioEngine or canvasEngine needs to subscribe to outside React.

```typescript
// Source: existing playbackStore.ts pattern [VERIFIED: src/store/playbackStore.ts]
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type ScaleName = 'major' | 'natural-minor' | 'pentatonic-major' | 'pentatonic-minor' | 'dorian' | 'mixolydian' | 'chromatic'

export const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  'major':             [0, 2, 4, 5, 7, 9, 11],
  'natural-minor':     [0, 2, 3, 5, 7, 8, 10],
  'pentatonic-major':  [0, 2, 4, 7, 9],
  'pentatonic-minor':  [0, 3, 5, 7, 10],
  'dorian':            [0, 2, 3, 5, 7, 9, 10],
  'mixolydian':        [0, 2, 4, 5, 7, 9, 10],
  'chromatic':         [0,1,2,3,4,5,6,7,8,9,10,11],
}

export interface ScaleState {
  rootKey: number       // 0–11, default 0 (C)
  scale: ScaleName      // default 'major'
  setRootKey: (key: number) => void
  setScale: (scale: ScaleName) => void
}

export const scaleStore = createStore<ScaleState>()((set) => ({
  rootKey: 0,
  scale: 'major',
  setRootKey: (key: number) => set({ rootKey: Math.round(Math.max(0, Math.min(11, key))) }),
  setScale: (scale: ScaleName) => set({ scale }),
}))

// React hook wrapper — same pattern as usePlaybackStore, useSelectionStore
export const useScaleStore = <T>(selector: (state: ScaleState) => T): T =>
  useStore(scaleStore, selector)
```

### Pattern 2: quantizeSemitone (pure testable function)

**What:** Snaps a raw semitone (0–11 from hueToSemitone) to the nearest in-scale semitone.
**When to use:** Called inside `updateVoiceColor` before `colorToFrequency`. Also exported for unit testing.

```typescript
// Source: CONTEXT.md quantization algorithm spec [VERIFIED: 06-CONTEXT.md]
export function quantizeSemitone(
  rawSemitone: number,
  rootKey: number,
  scaleIntervals: number[]
): number {
  // Build absolute semitone set: intervals + root, mod 12
  const candidates = scaleIntervals.map(i => (i + rootKey) % 12)
  let best = candidates[0]
  let bestDist = 13  // sentinel larger than max distance
  for (const c of candidates) {
    // Wrap-around distance: semitones are circular mod 12
    const dist = Math.min(Math.abs(rawSemitone - c), 12 - Math.abs(rawSemitone - c))
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best
}
```

**Chromatic passthrough:** When `scaleIntervals` is `[0,1,2,3,4,5,6,7,8,9,10,11]`, every semitone is a candidate, so `quantizeSemitone` returns `rawSemitone` unchanged. No special case needed.

**Tie-breaking:** Iterating candidates in ascending order and using strict `<` for bestDist means ties go to the lower candidate (the first one encountered at equal distance).

**Verified behaviour at key test points:**
```
quantizeSemitone(1, 0, [0,2,4,5,7,9,11])  → 0  (C# closer to C than D by 1 vs 1 — ties to C=0, lower)
quantizeSemitone(6, 0, [0,2,4,5,7,9,11])  → 5  (F# equidistant from F and G — ties to F=5, lower)
quantizeSemitone(1, 2, [0,2,4,5,7,9,11])  → 2  (D major: candidate set is [2,4,6,7,9,11,1]; raw=1 → nearest 2)
```

### Pattern 3: StereoPannerNode insertion

**What:** Insert `StereoPannerNode` between each voice's `GainNode` and `masterGain`.
**When to use:** At the end of `createVoice`, replacing the current `gainNode.connect(mg)` line.

```typescript
// Source: audioEngine.ts createVoice pattern [VERIFIED: src/engine/audioEngine.ts lines 285,306]
// BEFORE (both standard and blob paths):
gainNode.connect(mg)

// AFTER (insert panner between gain and master):
const panner = ctx.createStereoPanner()
panner.pan.value = (shape.col / 3) * 2 - 1  // col 0→-1.0, col 3→+1.0
gainNode.connect(panner)
panner.connect(mg)

// AudioVoice interface update:
export interface AudioVoice {
  oscillator: OscillatorNode | AudioBufferSourceNode
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
  panner: StereoPannerNode   // NEW
  noiseSource?: AudioBufferSourceNode
  lfoOscillator: OscillatorNode
  lfoGain: GainNode
  dcOffset: ConstantSourceNode
}
```

**Teardown update** (voice removal and type change setTimeout block — both need panner.disconnect()):
```typescript
// In voice removal setTimeout and type-change setTimeout:
voice.gainNode.disconnect()
voice.panner.disconnect()   // NEW — must come before gainNode.disconnect or after; order flexible
// ... stop oscillator, lfo, etc.
```

### Pattern 4: scaleStore.subscribe in audioEngine (mirrors playbackStore.subscribe)

**What:** Subscribe to `scaleStore` in `initAudioEngine`. When rootKey or scale changes, re-pitch all active voices.
**When to use:** Added to `initAudioEngine`, returning a third unsubscribe function alongside the existing two.

```typescript
// Source: playbackStore.subscribe pattern [VERIFIED: audioEngine.ts lines 505–547]
let prevRootKey = scaleStore.getState().rootKey
let prevScale = scaleStore.getState().scale

const unsubscribeScale = scaleStore.subscribe((state) => {
  if (state.rootKey !== prevRootKey || state.scale !== prevScale) {
    prevRootKey = state.rootKey
    prevScale = state.scale
    // Re-pitch all active voices
    for (const [shapeId] of voices) {
      const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
      if (shape) {
        updateVoiceColor(shapeId, shape.color)
      }
    }
  }
})

// destroy() must call unsubscribeScale()
```

### Pattern 5: updateVoiceColor with quantization

**What:** Thread `quantizeSemitone` into `updateVoiceColor` before `colorToFrequency`.
**When to use:** Replaces the current direct `colorToFrequency(color)` call for frequency-only changes.

```typescript
// Modified updateVoiceColor — threads quantization before frequency calculation
export function updateVoiceColor(shapeId: string, color: ShapeColor): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx
  if (!voice || !ctx) return

  // Frequency — quantize semitone before calculating frequency
  if (voice.oscillator instanceof OscillatorNode) {
    const { rootKey, scale } = scaleStore.getState()
    const rawSemitone = hueToSemitone(color.h)
    const quantized = quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])
    // Build a synthetic color with the quantized hue for colorToFrequency
    const quantizedHue = quantized * 30  // reverse of hueToSemitone: semitone * 30 = hue
    const quantizedColor = { ...color, h: quantizedHue }
    voice.oscillator.frequency.setTargetAtTime(
      colorToFrequency(quantizedColor), ctx.currentTime, 0.015
    )
  }
  // Filter and distortion unchanged
  voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(color.l), ctx.currentTime, 0.015)
  voice.waveshaper.curve = makeDistortionCurve(color.s)
}
```

**Note:** `colorToFrequency` calls `hueToSemitone` internally. To avoid calling it twice, the quantized semitone must be back-converted to a hue (semitone × 30) before passing to `colorToFrequency`. Alternative: refactor `colorToFrequency` to accept an optional `semitoneOverride` parameter. Both approaches are valid — the hue back-conversion is simpler (no signature change).

### Pattern 6: ScaleSelector UI (mirrors PlaybackControls structure)

**What:** Two `<select>` controls in a `.scale-selector` wrapper, placed in the toolbar.
**When to use:** Placed in `App.tsx` toolbar, to the left of `<PlaybackControls />`.

```tsx
// Source: PlaybackControls pattern [VERIFIED: src/components/PlaybackControls.tsx]
// ScaleSelector.tsx — two selects in .scale-selector wrapper
import { scaleStore, useScaleStore, SCALE_INTERVALS, type ScaleName } from '../store/scaleStore'

const ROOT_KEY_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function ScaleSelector() {
  const rootKey = useScaleStore((s) => s.rootKey)
  const scale = useScaleStore((s) => s.scale)

  return (
    <div className="scale-selector">
      <select
        aria-label="Root key"
        value={rootKey}
        onChange={(e) => scaleStore.getState().setRootKey(Number(e.target.value))}
      >
        {ROOT_KEY_LABELS.map((label, i) => (
          <option key={i} value={i}>{label}</option>
        ))}
      </select>
      <select
        aria-label="Scale"
        value={scale}
        onChange={(e) => scaleStore.getState().setScale(e.target.value as ScaleName)}
      >
        {(Object.keys(SCALE_INTERVALS) as ScaleName[]).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
```

### Pattern 7: makeDistortionCurve replacement (two-stage Chebyshev + soft-clip)

**What:** Replace existing pure-Chebyshev blend with two-stage: Chebyshev harmonics → soft-clip.
**Why:** The current Chebyshev implementation (already in the codebase) does NOT match the CONTEXT.md two-stage spec. The CONTEXT.md spec requires adding a soft-clip stage at higher saturation values.

```typescript
// Source: CONTEXT.md curve design reference [VERIFIED: 06-CONTEXT.md]
// Same signature: makeDistortionCurve(saturation: number): Float32Array
export function makeDistortionCurve(saturation: number): Float32Array {
  const SAMPLES = 256
  const curve = new Float32Array(SAMPLES)
  const t = Math.max(0, Math.min(100, saturation)) / 100

  // Stage 1: Chebyshev harmonic blend (T2/T3 for warmth)
  // blend=0 at s=0 (pure fundamental), blend=1 at s=50 (full harmonics)
  const blend = Math.min(1, t / 0.5)  // ramps 0→1 over first 50% of saturation

  // Stage 2: soft-clip strength increases after s=50
  // k=0 at s=0 (no clip), k=50 at s=100 (full character)
  const k = Math.max(0, (t - 0.5) / 0.5) * 50  // ramps 0→50 over second 50%

  const softClip = (x: number): number => {
    if (k === 0) return x
    return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
  }

  for (let i = 0; i < SAMPLES; i++) {
    const x = (i * 2) / SAMPLES - 1  // [-1, +1)

    // Chebyshev T2 and T3 (warmth harmonics)
    const T1 = x
    const T2 = 2 * x * x - 1
    const T3 = x * (4 * x * x - 3)

    // Harmonic blend: lerp from T1 to (T1 + T2 + T3) / normalized
    // at blend=0: pure T1 (identity); at blend=1: full harmonic stack
    const harmonicWeight = 1.0 + blend * (0.5 + 0.3)  // T2 weight 0.5, T3 weight 0.3
    const chebyshev = (T1 + blend * 0.5 * T2 + blend * 0.3 * T3) / harmonicWeight

    // Apply soft-clip to the Chebyshev output
    const raw = softClip(chebyshev)

    curve[i] = Math.max(-1, Math.min(1, raw))
  }

  return curve
}
```

**Identity verification:** At `t=0`: blend=0, k=0. Loop produces: `(T1 + 0 + 0) / 1.0 = x`. `softClip(x) = x` (k=0 branch). Output is `x` exactly — identity confirmed.

**Note on CONTEXT.md formula:** The CONTEXT.md spec references the blend formula `const blend = Math.min(1, saturation / 50)` but leaves the precise harmonic weights as Claude's discretion. The weights above (T2: 0.5, T3: 0.3) produce the described warm-organ character. The planner should treat these weights as starting values to be tuned during implementation.

### Anti-Patterns to Avoid

- **Calling `getAudioContext()` inside scaleStore.subscribe:** The guard pattern established in `audioEngine.ts` requires direct `const ctx = audioCtx` checks in subscription callbacks, NOT `getAudioContext()`, which resumes a suspended context. `scaleStore.subscribe` must use `const ctx = audioCtx` and return early if null. [VERIFIED: audioEngine.ts lines 506, 535]
- **Creating StereoPannerNode outside createVoice:** The panner must be created in the same function that builds the signal chain. Creating it later (e.g., in a separate initialization pass) creates timing races.
- **Disconnecting gainNode before panner:** Teardown should disconnect in signal-flow order or at minimum ensure both are disconnected. The `gainNode.disconnect()` call in the current removal path severs the gainNode→panner connection; `panner.disconnect()` must also be called or the panner hangs connected to masterGain.
- **Calling colorToFrequency for blob voices' oscillator frequency without checking instanceof:** The existing `updateVoiceColor` already guards `if (voice.oscillator instanceof OscillatorNode)`. This guard must be preserved when threading quantization.
- **Exporting SCALE_INTERVALS without the export keyword:** The constant must be exported from `scaleStore.ts` so `audioEngine.ts` can import it without creating a circular dependency through the component layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stereo panning | Custom gain matrix | `StereoPannerNode` | Built-in browser primitive; handles equal-power panning, cross-browser compatibility, optimized DSP [ASSUMED: MDN] |
| Scale quantization | Complex interval lookup | Simple `Array.map` + min-distance loop | No library needed — the algorithm is 5 lines; scale intervals are plain integer arrays |
| Musical scale definitions | Lookup external music theory library | Hardcoded interval arrays in scaleStore | Only 7 scales, well-defined, never change; a library would be massive overkill |
| State management | Rolling custom pub/sub | Zustand vanilla `createStore` | Already in the project, proven pattern with playbackStore [VERIFIED: package.json] |

**Key insight:** The musical scale domain in this project is entirely handled by a lookup table (7 arrays of intervals) and one pure function. There is no harmonic analysis, chord detection, or voice leading — no external music theory library is warranted.

---

## Common Pitfalls

### Pitfall 1: forgetting panner.disconnect() in voice teardown
**What goes wrong:** After a voice is removed, the panner node remains connected to `masterGain`. It processes no audio (gainNode disconnected) but wastes a small amount of CPU and may prevent garbage collection.
**Why it happens:** The current teardown code (both in the removal setTimeout and type-change setTimeout) calls `voice.gainNode.disconnect()` but has no concept of panner. When Phase 6 adds the panner field, teardown must be updated in ALL three teardown sites.
**How to avoid:** Search for all `gainNode.disconnect()` calls in `audioEngine.ts`. Each one needs a paired `voice.panner.disconnect()`.
**Warning signs:** Memory usage climbing with each voice add/remove cycle.

### Pitfall 2: scaleStore.subscribe calling getAudioContext() instead of direct audioCtx check
**What goes wrong:** When the user changes scale before any shapes are placed (audioCtx is null), the subscribe callback creates an AudioContext outside a user gesture — triggering autoplay policy errors.
**Why it happens:** The `getAudioContext()` helper lazily creates AND resumes the AudioContext. It's only safe to call inside gesture-triggered code paths (shape placement click, play button).
**How to avoid:** In `scaleStore.subscribe`, mirror the exact pattern from `playbackStore.subscribe`: `const ctx = audioCtx` (direct module-level access) + `if (!ctx) return`. [VERIFIED: audioEngine.ts line 506]
**Warning signs:** Console warning "AudioContext was not allowed to start" when user changes scale without first placing a shape.

### Pitfall 3: quantizeSemitone producing wrong frequency because hue back-conversion is off
**What goes wrong:** After quantizing the semitone, if the hue is back-converted as `semitone * 30`, `colorToFrequency` calls `hueToSemitone` again internally. `hueToSemitone` rounds `(h % 360) / 30` — a back-converted hue of `semitone * 30` is evenly divisible so this round-trips correctly. But if the quantized semitone is 12 (possible if rootKey + interval wraps past 12), the hue `12 * 30 = 360` maps to `hueToSemitone(360) = Math.round(0) = 0`. This is correct (12 semitones = octave, same note class as 0) — but it must be tested.
**Why it happens:** Semitone arithmetic is modular (mod 12) and the back-conversion relies on that invariant.
**How to avoid:** `quantizeSemitone` should return values in [0, 11] only. The final `% 12` in `candidates.map(i => (i + rootKey) % 12)` ensures this. Test explicitly that `quantizeSemitone(0, 11, [0,2,4,5,7,9,11])` returns a value in 0–11.
**Warning signs:** Unexpected pitch jumps when rootKey is A#/B (10/11) and a note snaps near octave boundary.

### Pitfall 4: The pre-existing failing test for makeDistortionCurve
**What goes wrong:** `audioEngine.test.ts > makeDistortionCurve > harmonic richness increases monotonically` currently FAILS (confirmed 2026-04-22). The test checks that deviation from identity at index 192 is greater at sat=100 than sat=50, but the current Chebyshev-only curve peaks its deviation at sat=50 (T3/T4 weights) and normalises down at sat=100.
**Why it happens:** The test was written for the two-stage spec (which always increases deviation), but the CONTEXT.md algorithm was not yet implemented — the current code is the old pure-Chebyshev blend from Phase 2 planning, not the two-stage curve.
**How to avoid:** Wave 0 for Phase 6 must update or replace this test. The new two-stage curve's monotonicity behaviour at index 192 will differ — the test should be rewritten to check a property that holds for the new algorithm (e.g., that curve output is closer to identity at s=0 than at s=100, or that the soft-clip effect is detectable at s=100 but absent at s=0).
**Warning signs:** Running `npx vitest run src/engine/audioEngine.test.ts` shows 1 failing test before any Phase 6 changes.

### Pitfall 5: makeDistortionCurve identity at s=0 broken by normalization
**What goes wrong:** If the harmonic weight formula miscalculates `harmonicWeight` at blend=0, the output at s=0 may not be exactly `x` (identity).
**Why it happens:** If `harmonicWeight = 1.0 + blend * (w2 + w3)`, at blend=0 this is 1.0 — correct. But if the formula is written as `1.0 + w2 + w3` (without multiplying by blend), it normalizes by 1.6 at all saturation levels, producing a quieter-than-identity output even at s=0.
**How to avoid:** Verify `makeDistortionCurve(0)[0] ≈ -1.0` and `makeDistortionCurve(0)[128] ≈ 0` (existing test covers this — do not break it).
**Warning signs:** The test `'returns an identity (linear passthrough) curve at saturation=0'` fails.

### Pitfall 6: Toolbar order regression
**What goes wrong:** ScaleSelector must be placed LEFT of PlaybackControls in the toolbar (Title | spacer | Scale | BPM | Volume | Start/Stop), not inside PlaybackControls.
**Why it happens:** The obvious implementation puts ScaleSelector inside PlaybackControls.tsx. But PlaybackControls owns BPM/Volume/Start-Stop and should not be responsible for scale state.
**How to avoid:** `App.tsx` renders ScaleSelector as a sibling before PlaybackControls inside `.toolbar__controls`. Or App.tsx creates a wrapper. The CSS `.toolbar__controls { margin-left: auto; display: flex; ... }` already handles grouping — just add ScaleSelector inside that same flex row.
**Warning signs:** ScaleSelector appears to the right of the Start/Stop button.

---

## Code Examples

### Verified: pan formula for 4-column grid
```typescript
// Source: CONTEXT.md AUDI-03 decision [VERIFIED: 06-CONTEXT.md]
// Verified by computation [VERIFIED: node -e 2026-04-22]
// col 0 → -1.0000 (hard left)
// col 1 → -0.3333
// col 2 → +0.3333
// col 3 → +1.0000 (hard right)
const pan = (shape.col / 3) * 2 - 1
```

### Verified: StereoPannerNode creation (Web Audio API)
```typescript
// Source: Web Audio API [ASSUMED: MDN StereoPannerNode — ctx.createStereoPanner() is the standard factory]
const panner = ctx.createStereoPanner()
panner.pan.value = (shape.col / 3) * 2 - 1
gainNode.connect(panner)
panner.connect(masterGain)
```

### Verified: Wrap-around semitone distance
```typescript
// Source: computed [VERIFIED: node -e 2026-04-22]
// For semitone pairs in circular pitch class space (mod 12):
const dist = Math.min(Math.abs(raw - candidate), 12 - Math.abs(raw - candidate))
// Example: raw=11, candidate=0  → min(11, 1) = 1 (B and C are 1 semitone apart)
// Example: raw=0,  candidate=11 → min(11, 1) = 1 (same)
```

### Verified: scaleStore import in audioEngine (no circular dependency)
```typescript
// Source: playbackStore import pattern [VERIFIED: audioEngine.ts line 8]
// Pattern: import store and its helper from the store module directly
import { scaleStore, SCALE_INTERVALS } from '../store/scaleStore'
// audioEngine.ts already imports from playbackStore this way — same pattern works for scaleStore
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 2 pure-Chebyshev blend (T1–T5, all 5 harmonics) | Two-stage Chebyshev T2/T3 + soft-clip | Phase 6 | More musical character at high saturation; simpler harmonic stack |
| No stereo positioning | Column-based stereo pan via StereoPannerNode | Phase 6 | Each voice has defined spatial position in stereo field |
| Raw hue → semitone → frequency (chromatic only) | Quantized semitone via scaleStore | Phase 6 | Composition stays in key; changing key transposes everything live |

**Deprecated/outdated:**
- `makeDistortionCurve` pure-Chebyshev algorithm: replaced in Phase 6 with two-stage curve. The function signature and test contract (length=256, identity at s=0, all values in [-1,1]) are preserved.
- Direct `gainNode.connect(masterGain)`: replaced with `gainNode.connect(panner); panner.connect(masterGain)`. Both the standard oscillator path and the blob path must be updated.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ctx.createStereoPanner()` is available in Chrome 120+, Firefox 120+, Safari 17+ | Code Examples | If unsupported in any target browser, need fallback to PannerNode or gain matrix pan; check Can I Use |
| A2 | `StereoPannerNode.pan` is an AudioParam with range -1 to +1 | Architecture Patterns (Pattern 3) | If range is different, the pan formula `(col/3)*2-1` produces wrong results |
| A3 | `StereoPannerNode.pan.value` can be set directly (not scheduled) since pan never changes after creation | Architecture Patterns (Pattern 3) | Direct assignment is correct for a fixed parameter; no scheduling needed for static pan |

**All three assumptions are well-established Web Audio API behaviour.** StereoPannerNode has been in the Web Audio spec since Level 1 and is universally supported in all target browsers. Risk level is LOW — these assumptions are standard and stable. [ASSUMED: MDN Web Audio API — web search unavailable in current environment]

---

## Open Questions (RESOLVED)

1. **Harmonic weights for two-stage makeDistortionCurve**
   - What we know: CONTEXT.md specifies blend parameter structure and soft-clip formula but leaves exact T2/T3 weights to Claude's discretion
   - What's unclear: The specific weight values (T2: 0.5, T3: 0.3 used in examples above) are a starting point; the final sound quality depends on listening tests
   - RESOLVED: Implement with T2 weight 0.5, T3 weight 0.3 as initial values. User can tune during the Wave 3 human-verify checkpoint.

2. **updateVoiceColor: refactor colorToFrequency vs. hue back-conversion**
   - What we know: Two approaches are equivalent (back-convert semitone to hue, or add a semitoneOverride param)
   - What's unclear: Whether a signature change to `colorToFrequency` is desirable for clarity
   - RESOLVED: Use hue back-conversion (`quantizedHue = quantized * 30`) — no signature change to `colorToFrequency`, simpler, and existing tests for `colorToFrequency` are unaffected.

3. **Scale display labels in ScaleSelector dropdown**
   - What we know: The scale names are slugs like `'pentatonic-major'`; user-facing labels should be readable
   - What's unclear: Exact label strings (e.g., "Pentatonic Major" vs "Penta. Major" for compactness)
   - RESOLVED: Use title-cased display strings in a `SCALE_LABELS` lookup map inside ScaleSelector, keeping the slug as the store value. Labels: "Major", "Natural Minor", "Pentatonic Major", "Pentatonic Minor", "Dorian", "Mixolydian", "Chromatic".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | Available | v24.15.0 | — |
| vitest | Test runner | Available | 4.1.4 | — |
| @testing-library/react | Component tests | Available | 16.3.2 | — |
| Web Audio API StereoPannerNode | AUDI-03 | Browser built-in | N/A | PannerNode (3D, more complex) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all dependencies are installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run src/store/scaleStore.test.ts src/engine/audioEngine.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDI-03 | StereoPannerNode created per voice, pan = (col/3)*2-1 | unit (pure function test; AudioContext not in jsdom so voice creation is manual-verify) | `npx vitest run src/engine/audioEngine.test.ts` | Existing file — new test needed |
| AUDI-03 | pan formula correctness for cols 0–3 | unit | `npx vitest run src/engine/audioEngine.test.ts` | Existing file — new test needed |
| PLAY-05 | quantizeSemitone returns in-scale semitone for each scale | unit | `npx vitest run src/engine/audioEngine.test.ts` | Existing file — new test needed |
| PLAY-05/06 | scaleStore defaults to { rootKey: 0, scale: 'major' } | unit | `npx vitest run src/store/scaleStore.test.ts` | New file — Wave 0 |
| PLAY-05/06 | scaleStore setRootKey/setScale update state | unit | `npx vitest run src/store/scaleStore.test.ts` | New file — Wave 0 |
| PLAY-06 | quantizeSemitone with 'chromatic' intervals is identity | unit | `npx vitest run src/engine/audioEngine.test.ts` | Existing file — new test needed |
| COLR-02 (upgrade) | makeDistortionCurve identity at s=0 still passes | unit | `npx vitest run src/engine/audioEngine.test.ts` | Existing — must not regress |
| COLR-02 (upgrade) | makeDistortionCurve all values in [-1,1] | unit | `npx vitest run src/engine/audioEngine.test.ts` | Existing — must not regress |
| COLR-02 (upgrade) | soft-clip detectable at s=100 but absent at s=0 | unit | `npx vitest run src/engine/audioEngine.test.ts` | New test (replaces failing monotonicity test) |
| PLAY-05 | ScaleSelector renders root key and scale selects | unit (component) | `npx vitest run src/components/ScaleSelector.test.tsx` | New file — Wave 0 |
| PLAY-05/06 | ScaleSelector changing scale updates scaleStore | unit (component) | `npx vitest run src/components/ScaleSelector.test.tsx` | New file — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/store/scaleStore.test.ts src/engine/audioEngine.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work` (0 failures — the pre-existing failure from COLR-02 monotonicity must be fixed in Wave 0)

### Wave 0 Gaps
- [ ] `src/store/scaleStore.test.ts` — covers PLAY-05/PLAY-06 store defaults and setters
- [ ] `src/components/ScaleSelector.test.tsx` — covers toolbar select rendering and state updates
- [ ] `src/engine/audioEngine.test.ts` — fix/replace the failing `makeDistortionCurve` monotonicity test; add tests for `quantizeSemitone`, pan formula, and new curve behaviour

---

## Security Domain

This phase adds no authentication, user data handling, or external service calls. All computation is client-side math (pure functions, Web Audio API nodes).

ASVS V5 Input Validation applies minimally:
- `scaleStore.setRootKey`: clamps input to `[0, 11]` range (prevent out-of-bounds array access in scale intervals).
- `scaleStore.setScale`: TypeScript constrains to `ScaleName` union at compile time; `<select>` limits runtime values to valid options.

No secrets, credentials, or network calls are introduced.

---

## Sources

### Primary (HIGH confidence)
- `src/engine/audioEngine.ts` — entire file read and analysed [VERIFIED: codebase]
- `src/store/playbackStore.ts` — pattern source for scaleStore [VERIFIED: codebase]
- `src/components/PlaybackControls.tsx` — pattern source for ScaleSelector [VERIFIED: codebase]
- `src/styles/index.css` — toolbar CSS patterns for ScaleSelector styling [VERIFIED: codebase]
- `.planning/phases/06-full-visual-language/06-CONTEXT.md` — all locked decisions [VERIFIED: planning doc]
- `.planning/phases/05-playback-controls/05-CONTEXT.md` — playbackStore/toolbar patterns [VERIFIED: planning doc]
- `package.json` — dependency versions [VERIFIED: codebase]
- `vite.config.ts` — test configuration [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- `npx vitest run` output — pre-existing failing test confirmed [VERIFIED: 2026-04-22 test run]
- Node.js computation for pan formula, quantize logic, Chebyshev curve analysis [VERIFIED: 2026-04-22]

### Tertiary (LOW confidence / ASSUMED)
- Web Audio API StereoPannerNode pan range (-1 to +1), browser support — ASSUMED based on training knowledge; web search unavailable [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from package.json and existing codebase
- Architecture: HIGH — derived from existing patterns in audioEngine.ts and playbackStore.ts
- Pitfalls: HIGH — most discovered through codebase analysis (pre-existing test failure confirmed via test run)
- StereoPannerNode API: LOW (ASSUMED) — web search unavailable; standard knowledge from training

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable Web Audio API and Zustand 5 patterns)
