# Phase 2: Audio Engine - Research

**Researched:** 2026-04-15
**Domain:** Web Audio API — oscillator synthesis, voice lifecycle, color-to-audio mapping
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Audio Library** — Use Web Audio API directly. No Tone.js.

**D-02: Hue → Note (pitch class)** — 12 semitones mapped to the color wheel (30° per semitone):
| Note | Hue | Color |
|------|-----|-------|
| C    | 0°  | Red |
| C#   | 30° | Orange |
| D    | 60° | Yellow |
| D#   | 90° | Yellow-green |
| E    | 120°| Green |
| F    | 150°| Teal |
| F#   | 180°| Cyan |
| G    | 210°| Sky blue |
| G#   | 240°| Blue |
| A    | 270°| Violet |
| A#   | 300°| Magenta |
| B    | 330°| Rose |

**D-03: Value/Lightness → Octave** — Maps across C1–C8 (7 octaves). Low lightness = low octave (deep bass), high lightness = high octave. Precise breakpoints at Claude's discretion.

**D-04: Saturation → Timbre (harmonic richness)** — via WaveShaper distortion:
- 0% saturation (grey) = clean, undistorted
- 100% saturation = heavily distorted (soft-clip/fold curve)
- WaveShaper curve intensity scales linearly with saturation

**D-05: Shape Type → Base Waveform**
| Shape | Base Waveform | Character |
|-------|---------------|-----------|
| Circle | Sine | Pure, flute-like, sub bass |
| Triangle | Triangle | Soft, mellow, gentle lead |
| Square | Square | Hollow, reedy, clarinet-like |
| Diamond | Pulse (25% duty cycle via createPeriodicWave) | Nasal, oboe-like |
| Star/spiky | Sawtooth | Bright, brassy, aggressive |
| Blob/irregular | Noise + sine mix | Percussive, textural, drum-like |

**D-06:** Change `Shape.color` from `string` to `{ h: number, s: number, l: number }`.

**D-07:** Canvas engine reconstructs CSS string (`hsl(${h}, ${s}%, ${l}%)`) for rendering.

**D-08:** Phase 1 default color `'hsl(220, 70%, 60%)'` → `{ h: 220, s: 70, l: 60 }`.

**D-09:** Shape is purely visual — no audio fields on `Shape`. Audio engine maintains its own `Map<shapeId, AudioVoice>`.

**D-10:** Shapes play immediately when placed. No play/stop button in Phase 2.

**D-11:** Lazy-init `AudioContext` on first shape placement click (user gesture pattern).

**D-12:** `AudioContext` is a singleton — created once, never reconstructed.

**D-13:** XState machine boots into `playing` state by default in Phase 2.

### Claude's Discretion

- Precise octave-to-lightness breakpoints (linear vs exponential curve across C1–C8)
- WaveShaper distortion curve formula (soft-clip vs fold-back vs both)
- Diamond pulse wave: exact PeriodicWave coefficients to achieve ~25% duty cycle
- Blob "noise + sine" mix ratio and implementation (separate noise oscillator? AudioWorklet? Filtered noise node?)
- Per-voice signal chain topology: oscillator → WaveShaper → filter → gain → destination (or variations)
- Default color values for Phase 2 test shapes

### Deferred Ideas (OUT OF SCOPE)

- Step Sequencer System (global cycle model, per-cell step patterns, animation→envelope, velocity, pattern transformations)
- Reverb / Spatial Depth
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHPE-01 | Circle shape renders on the canvas and generates a sine wave oscillator voice | OscillatorNode with type `"sine"`, per-voice AudioVoice pattern, subscription to shapeStore |
| COLR-01 | Shape hue maps to pitch (oscillator frequency) | Hue-to-note lookup (D-02) + octave formula (D-03) → `frequency.value` on OscillatorNode |
| COLR-02 | Shape saturation maps to reverb depth (wet/dry) | Decision: reassigned to WaveShaper distortion (D-04); note requirement label says "reverb depth" but decision says "timbre" — planner should use D-04 definition |
| COLR-03 | Shape value/brightness maps to filter cutoff frequency | BiquadFilterNode (lowpass) `frequency.value` driven by lightness component |
| AUDI-01 | All placed shapes play continuously and simultaneously when playback is active | One persistent OscillatorNode per shape, started once and never stopped until shape removed |
| AUDI-02 | Each shape is an independent audio voice with its own oscillator, filter, and reverb chain | `Map<shapeId, AudioVoice>` with isolated signal chain per voice |
</phase_requirements>

---

## Summary

Phase 2 establishes the audio synthesis layer using only the browser's built-in Web Audio API. There are no new npm dependencies — the entire implementation is native browser APIs on top of the Phase 1 scaffold.

The core pattern is a `Map<shapeId, AudioVoice>` maintained by a new `audioEngine` module that subscribes to `shapeStore` using the same vanilla Zustand subscription pattern already used by `canvasEngine`. When a shape is added to the store, the audio engine creates a voice (OscillatorNode + WaveShaper + BiquadFilterNode + GainNode chain), derives audio parameters from the shape's `{ h, s, l }` color, starts the oscillator, and stores the voice by `shapeId`. The oscillator runs indefinitely until the shape is removed (Phase 3).

The `Shape.color` field must be migrated from `string` to `{ h: number, s: number, l: number }` as the first task, since all downstream Phase 2 logic depends on structured color access. The canvas engine's `drawShapes` function must be updated simultaneously to reconstruct the CSS string for rendering.

**Primary recommendation:** Build `audioEngine.ts` as a direct parallel to `canvasEngine.ts` — module-level singleton, no React, `shapeStore.subscribe()` pattern, voice lifecycle in a `Map`. The signal chain per voice is: `OscillatorNode → WaveShaper → BiquadFilterNode → GainNode → masterGain → AudioContext.destination`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Browser-native | Oscillator synthesis, signal graph, filter | D-01: locked decision, zero dependency |
| React + TypeScript | Already installed (React 19, TS 6.0) | CanvasContainer integration point | Existing project stack |
| Zustand vanilla store | Already installed (zustand 5.0.12) | shapeStore subscription | Existing project pattern |
| XState v5 | Already installed (xstate 5.30.0) | sequencerMachine initial state change | Existing project pattern |

### No New Dependencies Required

Phase 2 requires zero new npm packages. All synthesis is done with browser-native Web Audio API nodes. [VERIFIED: package.json + MDN documentation]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Audio API directly | Tone.js | Locked by D-01: user chose raw API for full control |
| AudioBufferSourceNode loop for noise | AudioWorkletNode | Buffer loop is simpler to implement; AudioWorklet requires separate processor file. Buffer loop is sufficient for Phase 2 — use buffer approach |
| Inline `Float32Array` WaveShaper curve per voice | Shared pre-computed curve | Shared curve saves memory; per-voice allows different intensity — use shared curve factory called once per saturation value |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── engine/
│   ├── audioEngine.ts        # NEW: audio voice lifecycle, signal chains
│   ├── audioEngine.test.ts   # NEW: unit tests for colorToFreq, colorToWaveType, makeCurve
│   └── canvasEngine.ts       # MODIFY: update drawShapes for structured color
├── store/
│   └── shapeStore.ts         # MODIFY: Shape.color string → { h, s, l }
├── machine/
│   └── sequencerMachine.ts   # MODIFY: initial state idle → playing
└── components/
    └── CanvasContainer.tsx   # MODIFY: trigger audioEngine init on mount (same pattern as canvasEngine)
```

### Pattern 1: AudioVoice Interface and Map

**What:** Each placed shape owns one `AudioVoice` — a typed object holding the Web Audio nodes for that voice. The audio engine owns a `Map<string, AudioVoice>` indexed by `shapeId`.

**When to use:** Always. Mirrors the canvas engine's shape-parallel state management (D-09).

```typescript
// Source: MDN Web Audio API + project D-09 decision
interface AudioVoice {
  oscillator: OscillatorNode
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
}

const voices = new Map<string, AudioVoice>()
```

### Pattern 2: Lazy AudioContext Singleton

**What:** `getAudioContext()` initializes `AudioContext` on first call, resumes if suspended. Call site is the `shapeStore.subscribe` handler — triggered by the user's click (the required gesture).

**When to use:** On every voice creation call — never construct AudioContext at module load time.

```typescript
// Source: D-11 verbatim, VERIFIED against MDN AudioContext autoplay policy
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
```

### Pattern 3: shapeStore Subscription (same as canvasEngine)

**What:** Audio engine subscribes to `shapeStore` to detect additions. Compare previous and current `shapes` arrays; create voices for new shapes, destroy for removed (Phase 3).

**When to use:** Module initialization — called once from `initAudioEngine()`.

```typescript
// Source: VERIFIED against existing canvasEngine.ts line 161
let prevShapes: Shape[] = []

const unsubscribe = shapeStore.subscribe((state) => {
  const curr = state.shapes
  // detect additions
  for (const shape of curr) {
    if (!voices.has(shape.id)) {
      createVoice(shape)
    }
  }
  // detect removals (Phase 3 — stub for now)
  prevShapes = curr
})
```

### Pattern 4: Per-Voice Signal Chain

**What:** Each voice chains: `OscillatorNode → WaveShaperNode → BiquadFilterNode (lowpass) → GainNode → masterGain`. Master gain is a single shared node at -6dB to prevent clipping with multiple voices.

**When to use:** In `createVoice(shape)`.

```typescript
// Source: VERIFIED against MDN Web Audio API node graph documentation
function createVoice(shape: Shape): void {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const waveshaper = ctx.createWaveShaper()
  const filter = ctx.createBiquadFilter()
  const gainNode = ctx.createGain()

  // Waveform from shape type
  const waveType = shapeTypeToWave(shape.type)
  if (waveType === 'pulse') {
    osc.setPeriodicWave(getPulseWave(ctx))
  } else {
    osc.type = waveType
  }

  // Frequency from hue + lightness
  osc.frequency.value = colorToFrequency(shape.color)

  // Timbre (saturation → WaveShaper intensity)
  waveshaper.curve = makeDistortionCurve(shape.color.s)
  waveshaper.oversample = '2x'

  // Filter (lightness → cutoff)
  filter.type = 'lowpass'
  filter.frequency.value = lightnessToFilterCutoff(shape.color.l)
  filter.Q.value = 1

  // Volume: fixed per-voice gain; master attenuates sum
  gainNode.gain.value = 0.4

  osc.connect(waveshaper)
  waveshaper.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(masterGain)

  osc.start()
  voices.set(shape.id, { oscillator: osc, waveshaper, filter, gainNode })
}
```

### Pattern 5: Hue-to-Frequency Mapping

**What:** Convert `{ h, s, l }` to a frequency in Hz. Two steps: (1) hue → MIDI semitone offset within octave (pitch class), (2) lightness → octave number, then combine using standard MIDI-to-Hz formula.

**When to use:** In `colorToFrequency(color)`.

```typescript
// Source: D-02 note table + D-03 octave range + MIDI formula (440 * 2^((n-69)/12))
// VERIFIED: note C4 = MIDI 60 = 261.63 Hz; formula verified against MDN synth tutorial

// MIDI note numbers for C in each octave: C1=24, C2=36, C3=48, C4=60 ... C8=108
const NOTE_OFFSET = [0,1,2,3,4,5,6,7,8,9,10,11] // C,C#,D,D#,E,F,F#,G,G#,A,A#,B

function hueToSemitone(h: number): number {
  // 360° wheel, 30° per semitone (D-02)
  return Math.round((h % 360) / 30) % 12
}

function lightnessToOctave(l: number): number {
  // Map lightness 0–100 to octave C1 (MIDI 24) through C8 (MIDI 108) [ASSUMED: linear mapping]
  // C1=24, C8=108 → 7 octave span
  const clamped = Math.max(0, Math.min(100, l))
  return 1 + Math.round((clamped / 100) * 7)  // octave 1–8
}

function colorToFrequency(color: { h: number; s: number; l: number }): number {
  const semitone = hueToSemitone(color.h)
  const octave = lightnessToOctave(color.l)
  // MIDI note: C in octave N = 12 + (octave * 12) + semitone
  const midiNote = 12 + octave * 12 + semitone
  return 440 * Math.pow(2, (midiNote - 69) / 12)
}
```

### Pattern 6: WaveShaper Distortion Curve (Saturation → Timbre)

**What:** Build a `Float32Array` distortion curve. At saturation=0, curve is linear (identity — no distortion). At saturation=100, curve is a tanh soft-clip. Intermediate values blend between them.

**When to use:** In `makeDistortionCurve(saturation)`. Can be cached — same saturation value always produces same curve.

```typescript
// Source: MDN WaveShaperNode documentation (soft-clip formula verified)
// CITED: https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
function makeDistortionCurve(saturation: number): Float32Array {
  const SAMPLES = 256
  const curve = new Float32Array(SAMPLES)
  const intensity = saturation / 100  // 0.0 – 1.0
  const k = intensity * 200           // drive amount [ASSUMED: k=200 at max is reasonable soft-clip]

  for (let i = 0; i < SAMPLES; i++) {
    const x = (i * 2) / SAMPLES - 1
    if (intensity < 0.01) {
      curve[i] = x  // identity (linear passthrough)
    } else {
      // Soft-clip via tanh approximation: x * (1 - x²/3) scaled by k
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
    }
  }
  return curve
}
```

### Pattern 7: Pulse Wave via createPeriodicWave (Diamond shape)

**What:** Web Audio API has no built-in pulse/PWM oscillator type. A 25% duty cycle pulse wave is approximated using Fourier series coefficients computed from the analytical formula for rectangular waves.

**When to use:** For Diamond shape type only. Create the PeriodicWave once and cache it.

```typescript
// Source: CITED: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createPeriodicWave
// Fourier series for rectangular wave with duty cycle D:
//   b_n = (2 / n*PI) * sin(n * PI * D)  [ASSUMED: standard DSP rectangular wave formula]
// At D=0.25: b1=0.450, b2=0.318, b3=0.150, b4=0, b5=0.090, ...
function getPulseWave(ctx: AudioContext): PeriodicWave {
  const N = 16  // number of harmonics
  const D = 0.25  // duty cycle
  const real = new Float32Array(N)
  const imag = new Float32Array(N)
  real[0] = 0  // DC offset = 0
  imag[0] = 0
  for (let n = 1; n < N; n++) {
    imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * D)
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false })
}
```

### Pattern 8: Blob Shape — Filtered Noise + Sine Mix

**What:** Two sources: (1) a looping `AudioBufferSourceNode` filled with white noise, passed through a bandpass filter; (2) a low-frequency sine oscillator. Mixed via separate `GainNode`s into the shared waveshaper.

**When to use:** For Blob shape type only. Use pre-allocated buffer (not AudioWorklet) for Phase 2 simplicity.

```typescript
// Source: MDN Web Audio API advanced techniques — white noise section (CITED)
// ASSUMED: 70% noise / 30% sine mix ratio — provides textural character with slight pitch
function createBlobVoice(shape: Shape, ctx: AudioContext, masterGain: GainNode): AudioVoice {
  // Noise source
  const bufLen = ctx.sampleRate * 2  // 2 seconds, looped
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuf
  noiseSource.loop = true

  // Sine oscillator for pitch center
  const sineOsc = ctx.createOscillator()
  sineOsc.type = 'sine'
  sineOsc.frequency.value = colorToFrequency(shape.color)

  // Mix gains
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.7
  const sineGain = ctx.createGain()
  sineGain.gain.value = 0.3

  const merger = ctx.createGain()  // acts as mixer output
  merger.gain.value = 1

  const waveshaper = ctx.createWaveShaper()
  waveshaper.curve = makeDistortionCurve(shape.color.s)
  waveshaper.oversample = '2x'

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'  // bandpass for drum-like character
  filter.frequency.value = colorToFrequency(shape.color)
  filter.Q.value = 2

  const voiceGain = ctx.createGain()
  voiceGain.gain.value = 0.4

  noiseSource.connect(noiseGain).connect(merger)
  sineOsc.connect(sineGain).connect(merger)
  merger.connect(waveshaper).connect(filter).connect(voiceGain).connect(masterGain)

  noiseSource.start()
  sineOsc.start()

  // Return structured so destroy() can stop both sources
  return { oscillator: sineOsc, waveshaper, filter, gainNode: voiceGain, noiseSource }
}
```

Note: `AudioVoice` interface will need an optional `noiseSource?: AudioBufferSourceNode` field to allow cleanup.

### Pattern 9: Lightness → Filter Cutoff Mapping

**What:** Map lightness (0–100) to a lowpass filter cutoff frequency in a perceptually useful range (100 Hz – 8000 Hz). Low lightness = dark/muffled; high lightness = bright/open.

```typescript
// Source: BiquadFilterNode docs (MDN) — frequency parameter is in Hz [CITED]
// Range 100–8000Hz chosen as perceptually broad but browser-safe [ASSUMED]
function lightnessToFilterCutoff(l: number): number {
  const minHz = 100
  const maxHz = 8000
  const t = Math.max(0, Math.min(100, l)) / 100
  // Exponential mapping sounds more linear perceptually
  return minHz * Math.pow(maxHz / minHz, t)  // ~100Hz at l=0, ~8000Hz at l=100
}
```

### Anti-Patterns to Avoid

- **Creating AudioContext at module load:** Will fail silently in modern browsers — must create inside user gesture handler. Create lazily via `getAudioContext()` on first shape placement.
- **Using `osc.stop()` on a drone voice:** Stopped oscillators cannot be restarted. Never stop a voice's oscillator unless the shape is being removed.
- **Setting `gainNode.gain.value` directly for fade-in/out:** Creates audible click artifacts. Use `linearRampToValueAtTime` or `setTargetAtTime` for any gain transitions.
- **Accumulating WaveShaper curves on every color update:** Generating a new `Float32Array(256)` every frame is expensive. Cache curves by saturation bucket or debounce.
- **Connecting OscillatorNode directly to destination for polyphony:** Will cause clipping. Always route through per-voice gain → master gain at reduced level.
- **Using `webkitAudioContext` fallback:** No longer needed — Safari has supported `AudioContext` since Safari 14.1 (2021). [CITED: MDN compatibility tables]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polyphony volume management | Custom summing logic | masterGain node at 0.3–0.4 gain | Web Audio API auto-sums; just reduce master gain |
| Frequency calculation | Custom formula | Standard MIDI: `440 * 2^((n-69)/12)` | Standard formula handles all octave arithmetic correctly |
| Noise generation | Custom PRNG | `Math.random() * 2 - 1` in AudioBuffer | AudioBuffer + loop is the standard pattern for static noise |
| Pulse waveform | Trying to approximate with square | `createPeriodicWave` with Fourier coefficients | The API is designed exactly for this use case |
| AudioContext lifecycle | Rebuilding context on play/stop | Suspend/resume existing context singleton | Reconstructing AudioContext loses all connected nodes |

**Key insight:** Web Audio API's node graph IS the architecture — don't manage audio state outside the graph. The Map<shapeId, AudioVoice> is only for teardown reference; the actual audio runs inside the AudioContext's graph.

---

## Common Pitfalls

### Pitfall 1: AudioContext Suspended on Page Load

**What goes wrong:** `new AudioContext()` created before user gesture returns a context in `"suspended"` state in Chrome/Firefox. Oscillators scheduled on a suspended context produce no sound.

**Why it happens:** Browser autoplay policy blocks audio before user interaction to prevent unwanted noise on page load.

**How to avoid:** Lazy-init pattern (D-11): create `AudioContext` inside the `shapeStore.subscribe` callback — which fires because the user just clicked a cell. Always check `audioCtx.state === 'suspended'` and call `audioCtx.resume()` before creating voices.

**Warning signs:** No sound; `audioCtx.state` reads `"suspended"` in DevTools.

### Pitfall 2: Clicking in Web Audio Gain Changes

**What goes wrong:** Setting `gainNode.gain.value = 0` directly produces an audible click/pop when audio is running.

**Why it happens:** The abrupt discontinuity in the signal waveform creates a high-frequency artifact.

**How to avoid:** Always use `linearRampToValueAtTime` or `setTargetAtTime` for any gain changes. For voice creation, start gain at 0 and ramp to target in ~10ms.

**Warning signs:** Audible pop/click whenever shapes are added.

### Pitfall 3: ShapeType Union Needs Expansion

**What goes wrong:** The current `ShapeType = 'circle'` type in `shapeStore.ts` must be expanded to all 6 types before the `shapeTypeToWave()` mapping function can cover them all.

**Why it happens:** Phase 1 only needed `'circle'`; Phase 2 introduces all 6 shape types per D-05.

**How to avoid:** Expand `ShapeType` to `'circle' | 'triangle' | 'square' | 'diamond' | 'star' | 'blob'` as part of the `Shape.color` migration task.

**Warning signs:** TypeScript exhaustiveness errors in the audio engine's waveform switch statement.

### Pitfall 4: Canvas Engine drawShapes Breaks After Color Type Change

**What goes wrong:** After changing `Shape.color` to `{ h, s, l }`, the canvas engine's `drawShapes` function directly uses `shape.color` as a CSS string — it will render `[object Object]` instead of a color.

**Why it happens:** `canvasEngine.ts` line 127 reads `shape.color` as a string and passes it to `fillStyle`/`strokeStyle`. After the type change it's an object.

**How to avoid:** Update `drawShapes` in the same task that changes the `Shape` interface. The reconstruction is one line: `` `hsl(${shape.color.h}, ${shape.color.s}%, ${shape.color.l}%)` `` (D-07).

**Warning signs:** Canvas renders shapes as transparent/black; TypeScript compiler errors on `shape.color`.

### Pitfall 5: OscillatorNode Cannot Be Reused After Stop

**What goes wrong:** If `oscillator.stop()` is called and then the shape is somehow re-added, calling `oscillator.start()` again throws `"Cannot call start more than once"`.

**Why it happens:** OscillatorNode is a one-shot resource by design in the Web Audio API.

**How to avoid:** For drone voices, never call `stop()` except when destroying the voice on shape removal. Shape removal (Phase 3) must call `oscillator.stop()` AND remove the entry from `voices` Map, then allow GC to clean up nodes.

**Warning signs:** Console error `InvalidStateError: Cannot call start more than once`.

### Pitfall 6: Master Gain Clipping with Multiple Voices

**What goes wrong:** 16 simultaneous voices each at gain=1.0 will clip the output — Web Audio API sums linearly and the sum can exceed ±1.0 range.

**Why it happens:** No automatic limiting is applied unless requested.

**How to avoid:** Set `masterGain.gain.value = 0.15` (approximately 1/sqrt(16+1)) so the mix headroom is maintained. Each per-voice gain can be 0.4 (reduced from full to prevent individual voice distortion). A DynamicsCompressorNode can be added as the last node before destination for safety — optional for Phase 2.

**Warning signs:** Distorted/clipping output when 4+ shapes are placed.

---

## Code Examples

Verified patterns from official sources:

### AudioContext Lazy Init (D-11)

```typescript
// Source: D-11 context decision, pattern verified against MDN AudioContext docs
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.15  // headroom for 16 voices
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}
```

### Shape.color Migration

```typescript
// Source: D-06, D-07, D-08 decisions
// Before (Phase 1):
export interface Shape {
  color: string  // 'hsl(220, 70%, 60%)'
}
// After (Phase 2):
export interface ShapeColor {
  h: number  // 0–360
  s: number  // 0–100
  l: number  // 0–100
}
export interface Shape {
  color: ShapeColor
}
// Canvas rendering reconstruction (D-07):
const cssColor = `hsl(${shape.color.h}, ${shape.color.s}%, ${shape.color.l}%)`
// Default color (D-08):
color: { h: 220, s: 70, l: 60 }
```

### XState Initial State Change (D-13)

```typescript
// Source: D-13 decision; existing sequencerMachine.ts lines 21-31
// Change initial: 'idle' to initial: 'playing'
const sequencerMachine = setup({ ... }).createMachine({
  id: 'sequencer',
  initial: 'playing',  // Changed from 'idle'
  states: {
    idle:    { on: {} },
    playing: { on: {} },  // Now the boot state
    // ...
  },
})
```

### Frequency Calculation (MIDI formula)

```typescript
// Source: Standard MIDI specification; VERIFIED against MDN synth tutorial
// C4 (middle C) = MIDI 60 = 261.63 Hz; A4 = MIDI 69 = 440 Hz
function midiToHz(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12)
}
// C1=MIDI 24=32.70Hz, C2=36=65.41Hz, C3=48=130.81Hz, C4=60=261.63Hz
// C5=72=523.25Hz, C6=84=1046.5Hz, C7=96=2093Hz, C8=108=4186Hz
```

### White Noise Buffer (Blob shape)

```typescript
// Source: CITED MDN Web Audio API advanced techniques
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2  // 2s loop
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webkitAudioContext` fallback | `AudioContext` only | Safari 14.1 (2021) | Simplify: remove webkit prefix |
| `ScriptProcessorNode` for custom DSP | `AudioWorkletNode` | Chrome 66, 2018 | Not needed for Phase 2; buffer loop is sufficient |
| Creating AudioContext eagerly | Lazy creation on user gesture | Chrome 71, 2018 (autoplay policy) | Must use lazy init pattern (already in D-11) |
| `osc.stop(audioCtx.currentTime + delay)` | `osc.stop()` for drone voices | Always true | Just don't call stop until shape removed |

**Deprecated/outdated:**
- `ScriptProcessorNode`: Deprecated; do not use. For Phase 2, `AudioBufferSourceNode` with loop is sufficient for noise. AudioWorklet is the modern replacement but adds significant complexity (separate file, async module load, requires HTTPS).
- `webkitAudioContext`: Do not use. All target browsers (Chrome, Firefox, Safari 14.1+, Edge) support unprefixed `AudioContext`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Linear octave mapping (lightness 0% = C1, 100% = C8) | Pattern 5: Hue-to-Frequency | If perceptually wrong, pitches cluster in wrong octaves — adjust breakpoints; no structural impact |
| A2 | WaveShaper drive k=200 at max saturation for soft-clip | Pattern 6: WaveShaper Distortion | If too harsh or too subtle, adjust k constant; formula structure stays the same |
| A3 | Filter cutoff range 100 Hz–8000 Hz for lightness mapping | Pattern 9: Lightness → Filter | If range sounds too narrow or wide, adjust min/max Hz; formula stays the same |
| A4 | 70% noise / 30% sine blend for Blob voice | Pattern 8: Blob Shape | If textural character feels wrong, adjust mix ratios; no structural impact |
| A5 | 16 harmonics (N=16) sufficient for pulse wave fidelity | Pattern 7: Pulse Wave | More harmonics = crisper pulse; fewer = softer — audible difference but not a functional failure |
| A6 | masterGain at 0.15 provides adequate headroom for 16 voices | Code Examples: AudioContext Lazy Init | If too quiet or still clips, adjust value; non-structural |

---

## Open Questions

1. **COLR-02 definition: reverb vs. timbre**
   - What we know: The REQUIREMENTS.md says "saturation maps to reverb depth (wet/dry)" (COLR-02). The CONTEXT.md D-04 says saturation → WaveShaper timbre distortion. There is no reverb in Phase 2.
   - What's unclear: Should the planner implement COLR-02 as "reverb" (which would require a convolver node, deferred per CONTEXT.md deferred section) or accept that D-04 supersedes the requirement text?
   - Recommendation: D-04 is the locked decision from the discussion phase and explicitly overrides the requirement text. The plan should implement saturation → WaveShaper distortion as D-04 defines, and note that COLR-02 requirement text will be reconciled in REQUIREMENTS.md. No reverb node needed in Phase 2.

2. **Blob shape type: is it in ShapeType for Phase 2?**
   - What we know: D-05 lists `Blob/irregular` as the 6th shape type with `Noise + sine mix`. The current `ShapeType` is `'circle'` only.
   - What's unclear: Should all 6 shape types be added to `ShapeType` in Phase 2, or only the ones being rendered in Phase 2? The canvas engine's `drawShapes` currently only draws circles.
   - Recommendation: Add all 6 types to the TypeScript union in Phase 2 (SHPE-01 only requires circle to produce sine wave, but the audio engine needs the full union for the mapping switch). Canvas drawing of non-circle shapes can be stubbed (render as circle or basic polygon) — full shape drawing is Phase 3+.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling / Vitest | ✓ | v22.19.0 | — |
| Vitest | Test runner | ✓ | 4.1.4 (package.json) | — |
| Web Audio API | Audio synthesis | ✓ (browser) | All modern browsers (Chrome, Firefox, Safari 14.1+) | — |
| jsdom (test env) | Unit tests | ✓ | 29.0.2 (package.json) | — |

**Note on jsdom and Web Audio API tests:** jsdom does not implement `AudioContext`. Unit tests for the audio engine must test pure functions only (`colorToFrequency`, `makeDistortionCurve`, `lightnessToFilterCutoff`, `hueToSemitone`). Integration tests requiring actual AudioContext must be tagged `@skip-in-jsdom` or tested via manual browser verification. The Vitest config already uses `environment: 'jsdom'` — no change needed, but audio engine tests must avoid instantiating AudioContext.

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (inline, `test` key) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHPE-01 | Circle shape type maps to `"sine"` waveform | unit | `npx vitest run src/engine/audioEngine.test.ts` | ❌ Wave 0 |
| COLR-01 | `colorToFrequency({h:0, s:50, l:50})` returns ~261 Hz (C4 ≈ hue 0, lightness 50%) | unit | `npx vitest run src/engine/audioEngine.test.ts` | ❌ Wave 0 |
| COLR-02 | `makeDistortionCurve(0)` returns identity curve; `makeDistortionCurve(100)` returns non-linear curve | unit | `npx vitest run src/engine/audioEngine.test.ts` | ❌ Wave 0 |
| COLR-03 | `lightnessToFilterCutoff(0)` ≈ 100 Hz; `lightnessToFilterCutoff(100)` ≈ 8000 Hz | unit | `npx vitest run src/engine/audioEngine.test.ts` | ❌ Wave 0 |
| AUDI-01 | `shapeStore.color` structured migration — existing store tests pass after color type change | unit | `npx vitest run src/store/shapeStore.test.ts` | ✅ (needs update) |
| AUDI-02 | Voice Map integrity: adding shape creates entry, shape count matches voice count | manual-only | Browser DevTools — AudioContext node count | — |

**Note on AUDI-01 and AUDI-02:** AUDI-01 (simultaneous polyphony) and AUDI-02 (independent voice chains) cannot be automated in jsdom — AudioContext is not implemented. These are verified manually by placing multiple shapes in the browser.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/engine/audioEngine.test.ts` — covers SHPE-01, COLR-01, COLR-02, COLR-03 (pure function tests only)
- [ ] `src/store/shapeStore.test.ts` — existing file needs updated assertions for structured `ShapeColor` type (AUDI-01)

---

## Security Domain

> This phase is client-only, no network requests, no user data persistence, no authentication. ASVS categories V2 (Authentication), V3 (Session Management), V4 (Access Control), V6 (Cryptography) do not apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (minimal) | Color values from store are typed `number` — TypeScript strict mode enforces valid range in addShape; no external input in Phase 2 |
| V6 Cryptography | no | — |

### Known Threat Patterns

Not applicable for this phase — entirely local audio synthesis with no external data flow.

---

## Sources

### Primary (HIGH confidence)

- MDN Web Audio API: WaveShaperNode — `https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode`
- MDN Web Audio API: BaseAudioContext.createPeriodicWave — `https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createPeriodicWave`
- MDN Web Audio API: OscillatorNode — `https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode`
- MDN Web Audio API: BiquadFilterNode — `https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode`
- MDN Web Audio API: GainNode — `https://developer.mozilla.org/en-US/docs/Web/API/GainNode`
- MDN Web Audio API: BaseAudioContext.createBuffer — `https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer`
- MDN Web Audio API: Advanced techniques — `https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques`
- MDN Web Audio API: Simple synth (MIDI-to-Hz formula) — `https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth`
- Project CONTEXT.md — D-01 through D-13 locked decisions
- Project codebase: `src/store/shapeStore.ts`, `src/engine/canvasEngine.ts`, `src/machine/sequencerMachine.ts`

### Secondary (MEDIUM confidence)

- Standard MIDI specification: note-to-frequency formula `440 * 2^((n-69)/12)` — cross-verified via MDN synth tutorial and standard equal-temperament theory

### Tertiary (LOW confidence)

- None — all critical claims in this research are either verified via MDN documentation or stated as `[ASSUMED]` in the Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Audio API is browser-native; no third-party packages needed; all node types verified via MDN
- Architecture: HIGH — Direct parallel to existing canvasEngine.ts pattern; Map<id, Voice> is idiomatic Web Audio
- Pitfalls: HIGH — AudioContext autoplay policy, click artifacts, and OscillatorNode lifecycle are well-documented and verified
- Assumed values (curve parameters, gain levels, mix ratios): LOW — tunable constants, not structural decisions

**Research date:** 2026-04-15
**Valid until:** 2026-07-15 (Web Audio API is a stable W3C spec; 90-day validity)
