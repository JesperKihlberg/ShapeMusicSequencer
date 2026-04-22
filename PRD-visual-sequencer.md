# Product Requirements Document

## Chromatic — Visual Music Sequencer

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** April 2026

---

## 1. Overview

### 1.1 Product Vision

Chromatic is a browser-based visual music sequencer where sound and image are the same thing. Users compose music by placing and configuring geometric shapes on a grid canvas. Every visual property of a shape — its colour, size, form, and animation — directly encodes a sonic property: pitch, volume, timbre, and rhythm. The canvas is the score; the score is the canvas.

### 1.2 Problem Statement

Existing music creation tools are either too abstract (DAWs with piano rolls and waveforms) or too simplistic (toy apps with pre-set sounds). Neither approach makes the relationship between visual intent and sonic result legible at a glance. Chromatic explores a third path: a visual language where a non-musician can read a composition spatially and a musician can compose by drawing.

### 1.3 Target Users

- **Creative explorers** — people curious about generative sound with no music theory background
- **Musicians and producers** — looking for a novel compositional interface with intuitive polyrhythm support
- **Visual artists** — interested in the intersection of image and sound
- **Educators** — teaching acoustics, synthesis, or Fourier principles interactively

### 1.4 Core Value Proposition

> The image IS the music. Saving the canvas saves the composition.

---

## 2. Product Scope

### 2.1 In Scope (v1)

- Grid canvas with placeable, configurable shape-based sound cells
- Web Audio API synthesis engine driven entirely by visual properties
- Global cycle clock with per-cell step-pattern subdivision (Strudel/TidalCycles model)
- Shape types: circle, triangle, square, star
- Visual-to-audio property mappings: hue → pitch, value → amplitude, saturation → timbre, size → volume, shape → waveform/instrument family, animation → envelope/rhythm
- Per-cell step sequencer (up to 16 steps)
- LFO-driven size animation synced to BPM (pumping bass, pads, etc.)
- Play/stop transport with global BPM control
- Key/scale selector constraining valid pitches
- Export canvas as image (saves composition state)
- Undo/redo

### 2.2 Out of Scope (v1)

- Audio file import / sample playback
- MIDI input/output
- Multi-user collaboration
- Mobile touch interface (desktop-first)
- Pattern transformations (fast, slow, rev, degradeBy) — v2
- LFO depth control slider — v2
- Cell linking / modulation routing — v3
- AI assistant ("make it sound darker") — future
- Export as audio file — future

---

## 3. Visual Language Specification

### 3.1 The Shape-to-Sound Mapping

Each cell on the canvas contains exactly one shape. The shape fully describes one autonomous sound source. All properties are readable at a glance.

| Visual Property             | Audio Property                        | Details                                                                                                                                            |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hue**                     | Pitch                                 | Chromatic wheel: 0° = C, 30° = C#, 60° = D … 330° = B. Wraps at octave. Constrained by key/scale selector.                                         |
| **Lightness/Value**         | Amplitude / Velocity                  | Dark = quiet, bright = loud. Maps to GainNode.                                                                                                     |
| **Saturation**              | Harmonic richness / Timbre brightness | Desaturated = pure sine. Fully saturated = rich harmonics / complex waveform.                                                                      |
| **Shape type**              | Instrument family / Waveform          | Circle = sine (bass, pads), Triangle = triangle wave (melodic), Square = square wave (lead, chiptune), Star = noise burst (percussion, transients) |
| **Size**                    | Base amplitude / Note weight          | Large = dominant, small = subtle. Also controls gain floor for LFO modulation.                                                                     |
| **Animation pulse pattern** | Rhythm / Step pattern                 | When and how the shape pulses encodes its rhythmic trigger pattern.                                                                                |
| **Animation style**         | Envelope (attack + decay)             | Hard snap = percussive staccato, smooth swell = pad legato, bounce/elastic = plucked string.                                                       |
| **Cell position (column)**  | Stereo pan                            | Left column = hard left, right column = hard right, centre = centre.                                                                               |

### 3.2 Pitch Mapping Detail

Two modes selectable per session:

**Chromatic mode** — all 12 semitones mapped evenly around the hue circle (30° per semitone). Same hue = same pitch class; octave encoded in lightness or cell row.

**Scale mode (default)** — only the 7 notes of the selected scale mapped to 7 hue bands. No accidentals visible. More musical for non-musicians. Available scales: major, natural minor, pentatonic major, pentatonic minor, dorian, mixolydian.

### 3.3 Complex Sounds — Multiple Shapes Per Cell

Complex timbres are represented as multiple simple shapes layered in a single cell rather than one complex shape. Example: a kick drum = two shapes.

| Shape  | Role                | Visual                                                             |
| ------ | ------------------- | ------------------------------------------------------------------ |
| Star   | Click transient     | Small, bright teal (high hue), sharp snap animation, instant decay |
| Circle | 808 body / sub bass | Large, dark violet (270°), slow exponential decay, low saturation  |

This maps the decomposition principle from Fourier synthesis into the visual language: complex sounds are sums of simple components.

---

## 4. Audio Engine Specification

### 4.1 Synthesis Architecture

Each cell maps to a dedicated Web Audio API voice graph:

```
OscillatorNode (voice frequency)
  → WaveShaper (saturation → harmonic richness)
  → GainNode (voiceGain, base = cell.size)
  → MasterGain
  → Destination

OscillatorNode (LFO, sine, rate = BPM-derived)
  → GainNode (depth = 0.4 × voiceGain)  [v1: fixed depth]
  → voiceGain.gain AudioParam            [modulates amplitude]
```

LFO depth fixed at ±40% of base gain in v1. This ensures the voice never hits zero gain (no unwanted silence) and never clips.

### 4.2 Global Clock — Cycle Model

Inspired by Strudel/TidalCycles. One global loop of fixed duration (the cycle). Every voice fits its pattern within the same cycle but can subdivide it independently.

```
cycleLength (ms) = (60000 / BPM) × beatsPerCycle
```

**Example polyrhythm — 3 against 4, emerging for free:**

```
Cycle:   |————————————————|
Voice A: |●———|●———|●———|●———|   4 steps (quarter pulse)
Voice B: |●——|●——|●——|          3 steps (triplet)
Voice C: |●○○○○○○○|●○○○○○○○|   8 steps (eighth hi-hat)
```

No special handling required. The scheduler stretches or compresses each voice's pattern to fit the same wall-clock cycle.

### 4.3 Step Sequencer Per Cell

Each cell has a boolean step pattern of up to 16 steps.

- Filled slot = trigger (shape pulses, note fires at full velocity)
- Empty slot = rest (shape sits small and dark)
- Step count = subdivision of the global cycle
- Maximum 16 steps per cell

**Trigger to visual mapping:**

| State            | Visual                          | Audio                 |
| ---------------- | ------------------------------- | --------------------- |
| Active (trigger) | Shape pulses to full size       | Note at full velocity |
| Rest             | Shape sits small and dark       | Silence               |
| Accent           | Shape pulses larger than normal | Higher velocity hit   |

### 4.4 AudioContext Lifecycle

```typescript
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
```

Single AudioContext instance across the session. Suspended/resumed on play/stop; never reconstructed. Created on first user gesture to satisfy browser autoplay policy.

---

## 5. Interaction Model

### 5.1 Canvas Interactions

| Interaction         | Result                                                          |
| ------------------- | --------------------------------------------------------------- |
| Click empty cell    | Spawn new instrument with defaults (circle, mid hue, mid value) |
| Click existing cell | Open cell editor panel                                          |
| Drag hue ring       | Retune pitch                                                    |
| Drag brightness     | Adjust volume                                                   |
| Pick shape          | Change instrument type / waveform                               |
| Draw step pattern   | Set rhythmic trigger pattern                                    |
| Double-click cell   | Delete cell                                                     |

### 5.2 Cell Editor Panel

Appears on cell selection. Contains:

- Shape type picker (circle / triangle / square / star)
- Hue picker (constrained to current scale)
- Lightness slider → volume
- Saturation slider → timbre richness
- Size slider → base amplitude
- Step pattern editor (row of 4–16 toggle slots)
- Animation style selector (snap / swell / bounce / fade)
- Pan position (left → right slider)

### 5.3 Global Controls

- **Play / Stop** transport
- **BPM** slider (40–200 BPM)
- **Cycle length** (beats per cycle: 1, 2, 4, 8)
- **Key** selector (C, C#, D … B)
- **Scale** selector (major / minor / pentatonic / dorian / mixolydian)
- **Master volume**
- **Export canvas** (PNG — encodes full composition state)

---

## 6. State & Data Architecture

### 6.1 Data Layer — Zustand

All shape data lives in a Zustand store with Immer middleware for clean draft mutations.

```typescript
interface Cell {
  id: string;
  position: { row: number; col: number };
  shape: "circle" | "triangle" | "square" | "star";
  hue: number; // 0–360
  lightness: number; // 0–100
  saturation: number; // 0–100
  size: number; // 0–1 normalised
  stepPattern: boolean[];
  stepCount: number; // 1–16
  animStyle: "snap" | "swell" | "bounce" | "fade";
  pan: number; // -1 to 1
}

interface GlobalState {
  cells: Record<string, Cell>;
  bpm: number;
  beatsPerCycle: number;
  key: string;
  scale: ScaleType;
  masterVolume: number;
  isPlaying: boolean;
}
```

`zundo` temporal middleware wraps the store automatically for full undo/redo with zero extra code. Selectors defined outside the store to derive computed values without unnecessary re-renders.

### 6.2 Behavioural State — XState

The sequencer's modes modelled as an explicit state machine. Invalid combinations structurally impossible.

**States:** `idle` → `playing` → `stopped`  
**Substates during playing:** `selected`, `dragging`, `playingDragging`

All user interactions expressed as typed events sent to the machine. Machine evaluates transition, fires actions that delegate mutations to Zustand.

### 6.3 Canvas Engine

Sits entirely outside React. Subscribes directly to Zustand via raw subscription API — no re-renders triggered. Reads behavioural mode from XState via sync call. Animation loop runs independently at 60fps.

React re-renders only lightweight UI panels (toolbar, cell editor). Never the canvas.

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Framework         | React 19 + TypeScript                    |
| Canvas rendering  | HTML5 Canvas API + requestAnimationFrame |
| Audio engine      | Web Audio API (native browser)           |
| State — data      | Zustand + Immer + zundo (undo/redo)      |
| State — behaviour | XState v5                                |
| Build             | Vite                                     |
| Styling           | Tailwind CSS                             |
| Testing           | Vitest + React Testing Library           |

### 7.2 Module Structure

```
src/
├── engine/
│   ├── AudioEngine.ts       # Web Audio graph, per-cell synth voices
│   ├── CanvasEngine.ts      # Draw loop, shape rendering, animation
│   ├── Scheduler.ts         # Global cycle clock, step firing
│   └── PitchMapper.ts       # Hue → frequency lookup, scale quantisation
├── state/
│   ├── store.ts             # Zustand store + Immer + zundo
│   ├── machine.ts           # XState sequencer machine
│   └── selectors.ts         # Derived state selectors
├── components/
│   ├── Canvas.tsx           # Canvas host component
│   ├── CellEditor.tsx       # Per-cell edit panel
│   ├── Toolbar.tsx          # Global transport + controls
│   └── StepEditor.tsx       # Step pattern toggle UI
└── hooks/
    ├── useAudioContext.ts
    └── useCanvasSync.ts
```

### 7.3 Key Technical Constraints

- **Single AudioContext** per session — never reconstructed, suspended/resumed on transport
- **Canvas never touched by React** — owned exclusively by CanvasEngine
- **No React state in hot path** — animation loop reads Zustand store directly
- **AudioContext on user gesture only** — canvas click initiates context to satisfy browser autoplay policy
- **Step count max 16** — keeps pattern readable at grid scale

---

## 8. Build Phases

### Phase 1 — Core Synthesis (v1 MVP)

- Grid canvas, click to spawn shape
- Shape type, hue, lightness, size properties
- Web Audio synth voice per cell (oscillator + gain)
- Play/stop with BPM
- Static shapes (no animation yet)

### Phase 2 — Rhythm & Animation

- Step sequencer per cell (up to 16 steps)
- Global cycle clock with subdivision
- LFO-driven size animation synced to BPM (fixed ±40% depth)
- Animation style: snap / swell / bounce

### Phase 3 — Full Visual Language

- Saturation → harmonic richness (WaveShaper)
- Pan → stereo position (StereoPannerNode)
- Star shape → noise burst (percussion voices)
- Multiple shapes per cell (layered voices)
- Key/scale selector with hue quantisation

### Phase 4 — Composition Tools

- Undo/redo (zundo)
- Export canvas as PNG (composition save/load)
- Cell editor UI panel

### Phase 5 — Transport & Polish

- Full play/stop/pause transport
- AudioContext suspend/resume
- Master volume
- Cycle length control

### Phase 6 — Advanced (v2+)

- Pattern transformations (fast, slow, rev, degradeBy)
- LFO depth slider per cell
- Cell-to-cell modulation routing
- Import PNG → restore composition
- Export as audio (Web Audio offline rendering)

---

## 9. Non-Functional Requirements

| Requirement                | Target                                   |
| -------------------------- | ---------------------------------------- |
| Canvas frame rate          | 60fps sustained on mid-range hardware    |
| Audio latency              | < 20ms from trigger to audible output    |
| Max simultaneous voices    | 32 cells without performance degradation |
| Browser support            | Chrome 120+, Firefox 120+, Safari 17+    |
| First interaction to sound | < 500ms after AudioContext resume        |
| Undo depth                 | Minimum 50 steps                         |

---

## 10. Open Questions

1. **Octave encoding** — should octave be a separate control per cell, or encoded in lightness alongside volume? These conflict on the same axis.
2. **Cell grid size** — fixed grid (e.g. 8×8) or free-form canvas with arbitrary cell placement?
3. **Composition persistence** — local storage auto-save, or explicit export-only?
4. **Scale mode default** — should new sessions boot into scale mode (more musical, less flexible) or chromatic mode (full control, less constrained)?
5. **Cycle length per cell** — allow cells to define their own cycle length multiplier (e.g. 2× or 0.5× global), or keep cycle length strictly global?

---

## 11. Success Metrics

- A user with no music theory background can produce a recognisable rhythmic pattern within 5 minutes
- A musician can recreate a simple 4-bar loop using only the visual interface
- The canvas PNG round-trips cleanly (export → import → identical composition)
- 60fps maintained with 16 active cells on reference hardware
