# Product Requirements Document

## Chromatic — Visual Music Sequencer

**Version:** 1.1  
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
- Global beat clock synced to BPM
- Shape types: circle, triangle, square, star
- Visual-to-audio property mappings: hue → pitch, value → amplitude, saturation → timbre, size → volume, shape → waveform/instrument family, animation → envelope/rhythm
- Per-property spline animation curves with free-float beat duration
- Animatable properties: size, hue, saturation, lightness, rotation
- Bottom panel spline editor with stacked multi-lane view
- Play/stop transport with global BPM control
- Key/scale selector constraining valid pitches
- Export canvas as image (saves composition state)
- Undo/redo

### 2.2 Out of Scope (v1)

- Step sequencer — replaced by spline animation curves
- LFO-driven animation — replaced by spline animation curves
- Audio file import / sample playback
- MIDI input/output
- Multi-user collaboration
- Mobile touch interface (desktop-first)
- Pattern transformations (fast, slow, rev, degradeBy) — v2
- Cell linking / modulation routing — v3
- AI assistant ("make it sound darker") — future
- Export as audio file — future

---

## 3. Visual Language Specification

### 3.1 The Shape-to-Sound Mapping

Each cell on the canvas contains exactly one shape. The shape fully describes one autonomous sound source. All properties are readable at a glance.

| Visual Property            | Audio Property                        | Details                                                                                                                                             |
| -------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hue**                    | Pitch                                 | Chromatic wheel: 0° = C, 30° = C#, 60° = D … 330° = B. Wraps at octave. Constrained by key/scale selector.                                         |
| **Lightness/Value**        | Amplitude / Velocity                  | Dark = quiet, bright = loud. Maps to GainNode.                                                                                                      |
| **Saturation**             | Harmonic richness / Timbre brightness | Desaturated = pure sine. Fully saturated = rich harmonics / complex waveform.                                                                       |
| **Shape type**             | Instrument family / Waveform          | Circle = sine (bass, pads), Triangle = triangle wave (melodic), Square = square wave (lead, chiptune), Star = noise burst (percussion, transients)  |
| **Size**                   | Base amplitude / Note weight          | Large = dominant, small = subtle.                                                                                                                   |
| **Animation curves**       | Rhythm, envelope, modulation          | Per-property spline curves define how each visual property evolves over time relative to global BPM. Curves loop independently at their own beat duration, producing natural polyrhythm from mismatched loop lengths. |
| **Cell position (column)** | Stereo pan                            | Left column = hard left, right column = hard right, centre = centre.                                                                                |

### 3.2 Pitch Mapping Detail

Two modes selectable per session:

**Chromatic mode** — all 12 semitones mapped evenly around the hue circle (30° per semitone). Same hue = same pitch class; octave encoded in lightness or cell row.

**Scale mode (default)** — only the 7 notes of the selected scale mapped to 7 hue bands. No accidentals visible. More musical for non-musicians. Available scales: major, natural minor, pentatonic major, pentatonic minor, dorian, mixolydian.

### 3.3 Complex Sounds — Multiple Shapes Per Cell

Complex timbres are represented as multiple simple shapes layered in a single cell rather than one complex shape. Example: a kick drum = two shapes.

| Shape  | Role                | Visual                                                              |
| ------ | ------------------- | ------------------------------------------------------------------- |
| Star   | Click transient     | Small, bright teal (high hue), sharp snap animation, instant decay  |
| Circle | 808 body / sub bass | Large, dark violet (270°), slow exponential decay, low saturation   |

This maps the decomposition principle from Fourier synthesis into the visual language: complex sounds are sums of simple components.

---

## 4. Animation System

### 4.1 Core Model

Each cell has an independent set of **animation curves** — one per property. A curve defines how that property evolves over time, expressed as a spline in a 2D editor with **beat on the X axis** and **normalized value (0–1) on the Y axis**, mapped to real units at evaluation time.

- **Duration** — free float, any number of beats (e.g. 3.5 beats is valid). No quantization constraint.
- **Phase** — no explicit offset. A flat segment at zero at the start of the curve serves as a delay if needed.
- **Looping** — all curves loop continuously. The seam between end and start is implicit.
- **Step sequencer** — removed entirely. Animation curves are the sole driver of property modulation.
- **Polyrhythm** — mismatched curve durations across properties produce natural polyrhythmic drift for free. A 3-beat size curve against a 4-beat hue curve generates a 12-beat macro-pattern with no extra configuration.

### 4.2 Animatable Properties

| Property   | Value Range      | Y-axis display                       |
|------------|------------------|--------------------------------------|
| Size       | 0–1 (normalised) | Percentage + actual pixel size       |
| Hue        | 0°–360°          | Colour swatches at gridlines         |
| Saturation | 0–100%           | Percentage                           |
| Lightness  | 0–100%           | Percentage                           |
| Rotation   | 0°–360°          | Degrees                              |

One curve per property per cell. Multiple curves per property are not supported in v1.

### 4.3 Data Model

```typescript
type ShapeProperty = 'size' | 'hue' | 'saturation' | 'lightness' | 'rotation';

type InterpolationType = 'cubic' | 'linear' | 'step';

type SplinePoint = {
  beat: number;        // 0..durationBeats
  value: number;       // normalized 0..1
  handleType: 'smooth' | 'corner' | 'linear';
  tension?: number;    // Catmull-Rom tension, smooth points only
};

type AnimationCurve = {
  propertyKey: ShapeProperty;
  durationBeats: number;       // free float, any positive value
  interpolation: InterpolationType;
  muted: boolean;
  points: SplinePoint[];
};

type CellAnimations = {
  cellId: string;
  curves: AnimationCurve[];    // one per animated property
};
```

Value is always stored normalized 0–1. Mapping to actual units happens at evaluation time per property.

### 4.4 Runtime Evaluation

Pulled every animation frame from the global transport beat position:

```typescript
function evaluateCurve(curve: AnimationCurve, globalBeat: number): number {
  const localBeat = globalBeat % curve.durationBeats;
  return sampleCatmullRom(curve.points, localBeat); // returns 0..1
}

// At render time per property:
const norm = evaluateCurve(sizeCurve, transport.currentBeat);
const actualSize = lerp(SIZE_MIN, SIZE_MAX, norm);
```

No scheduling required — curves are sampled at render time from the global beat clock. Cheap per frame: one curve evaluation per animated property per cell.

---

## 5. Audio Engine Specification

### 5.1 Synthesis Architecture

Each cell maps to a dedicated Web Audio API voice graph:

```
OscillatorNode (voice frequency)
  → WaveShaper (saturation → harmonic richness)
  → GainNode (voiceGain, base = cell.size)
  → MasterGain
  → Destination
```

Amplitude modulation is now driven entirely by the lightness animation curve evaluated each frame against the GainNode, rather than a fixed LFO.

### 5.2 Global Clock — Beat Model

One global beat clock running continuously from play. All animation curves sample from the same monotonically increasing beat position and loop independently at their own duration.

```
beatPosition += (BPM / 60) × deltaTimeSeconds
```

Polyrhythm emerges naturally from curves with different `durationBeats`. No cycle concept required — each curve is its own loop.

### 5.3 AudioContext Lifecycle

```typescript
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
```

Single AudioContext instance across the session. Suspended/resumed on play/stop; never reconstructed. Created on first user gesture to satisfy browser autoplay policy.

---

## 6. Interaction Model

### 6.1 Canvas Interactions

| Interaction         | Result                                                           |
| ------------------- | ---------------------------------------------------------------- |
| Click empty cell    | Spawn new instrument with defaults (circle, mid hue, mid value)  |
| Click existing cell | Open cell editor panel                                           |
| Drag hue ring       | Retune pitch                                                     |
| Drag brightness     | Adjust volume                                                    |
| Pick shape          | Change instrument type / waveform                                |
| Double-click cell   | Delete cell                                                      |

### 6.2 Cell Editor Panel

Appears on cell selection. Contains:

- Shape type picker (circle / triangle / square / star)
- Hue picker (constrained to current scale)
- Lightness slider → volume
- Saturation slider → timbre richness
- Size slider → base amplitude
- Pan position (left → right slider)
- Animation button → opens / focuses the animation bottom panel for this cell

### 6.3 Animation Bottom Panel

Opens when a cell is selected and animation mode is active. A **draggable divider** separates the canvas above from the animation panel below, letting the user trade canvas height for editing space.

**Layout — large screen (stacked lanes)**

All animated properties rendered simultaneously as stacked horizontal lanes. Each lane has its own time axis scaled to its own beat duration. A shared playhead spans all lanes, advancing proportionally within each lane's independent time scale. Minimum lane height: 80–100px. Breakpoint is height-driven: if all active lanes fit at minimum height, show stacked; otherwise collapse to tabs.

**Layout — small screen (tab strip)**

One lane visible at a time. Each tab shows a sparkline thumbnail of the curve so all curves remain scannable without being expanded. Switching tabs changes the active curve in the editor.

**Lane controls (per lane)**

| Control         | Behaviour                                                                              |
|-----------------|----------------------------------------------------------------------------------------|
| Property label  | Identifies the lane; click to focus                                                    |
| Beat duration   | Inline editable; common presets (1, 2, 4, 8). Rescales control points proportionally. |
| Interpolation   | Icon toggle cycling: cubic / linear / step. Per-curve in v1.                           |
| Mute            | Disables curve without deleting                                                        |
| Delete          | Removes lane entirely                                                                  |

**Spline editor interactions**

| Interaction           | Result                                                              |
|-----------------------|---------------------------------------------------------------------|
| Click empty area      | Add control point, snapped to 1/16 beat grid                        |
| Alt + click           | Add point, free placement (no snap)                                 |
| Drag point            | Move; clamped to X axis boundaries                                  |
| Drag tangent handle   | Adjust curve shape; symmetric by default                            |
| Alt + drag handle     | Break handle symmetry                                               |
| Double-click point    | Cycle handle type: smooth → corner → linear                         |
| Right-click point     | Context menu: delete, set handle type, copy value                   |
| Scroll / pinch        | Zoom time axis horizontally                                         |

**Visual aids**

- **Loop ghost** — faint copy of the curve rendered beyond the right edge, showing the next iteration so seam smoothness is immediately visible.
- **Live playhead** — vertical line scrubbing in real time during playback, showing current beat position within each lane's own time scale.
- **Value axis** — shows normalized percentage alongside real units. Hue axis shows colour swatches at gridlines instead of degree numbers.

**Adding a property lane**

Clicking "+ Add" opens a property picker showing all animatable properties; already-animated ones are greyed out. After picking, the user sets beat duration and lands on a blank spline canvas.

### 6.4 Global Controls

- **Play / Stop** transport
- **BPM** slider (40–200 BPM)
- **Key** selector (C, C#, D … B)
- **Scale** selector (major / minor / pentatonic / dorian / mixolydian)
- **Master volume**
- **Export canvas** (PNG — encodes full composition state)

---

## 7. State & Data Architecture

### 7.1 Data Layer — Zustand

All shape data lives in a Zustand store with Immer middleware for clean draft mutations.

```typescript
interface Cell {
  id: string;
  position: { row: number; col: number };
  shape: "circle" | "triangle" | "square" | "star";
  hue: number;        // 0–360
  lightness: number;  // 0–100
  saturation: number; // 0–100
  size: number;       // 0–1 normalised
  rotation: number;   // 0–360
  pan: number;        // -1 to 1
  animations: AnimationCurve[]; // one per animated property
}

interface GlobalState {
  cells: Record<string, Cell>;
  bpm: number;
  key: string;
  scale: ScaleType;
  masterVolume: number;
  isPlaying: boolean;
  currentBeat: number; // monotonically increasing, read by animation engine
}
```

`zundo` temporal middleware wraps the store automatically for full undo/redo with zero extra code. Selectors defined outside the store to derive computed values without unnecessary re-renders.

### 7.2 Behavioural State — XState

The sequencer's modes modelled as an explicit state machine. Invalid combinations structurally impossible.

**States:** `idle` → `playing` → `stopped`  
**Substates during playing:** `selected`, `dragging`, `playingDragging`

All user interactions expressed as typed events sent to the machine. Machine evaluates transition, fires actions that delegate mutations to Zustand.

### 7.3 Canvas Engine

Sits entirely outside React. Subscribes directly to Zustand via raw subscription API — no re-renders triggered. Reads behavioural mode from XState via sync call. Animation loop runs independently at 60fps.

React re-renders only lightweight UI panels (toolbar, cell editor, animation panel chrome). Never the canvas or spline editor.

---

## 8. Technical Architecture

### 8.1 Tech Stack

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Framework         | React 19 + TypeScript                    |
| Canvas rendering  | HTML5 Canvas API + requestAnimationFrame |
| Audio engine      | Web Audio API (native browser)           |
| State — data      | Zustand + Immer + zundo (undo/redo)      |
| State — behaviour | XState v5                                |
| Build             | Vite                                     |
| Styling           | CSS                                      |
| Testing           | Vitest + React Testing Library           |

### 8.2 Module Structure

```
src/
├── engine/
│   ├── AudioEngine.ts        # Web Audio graph, per-cell synth voices
│   ├── CanvasEngine.ts       # Draw loop, shape rendering
│   ├── AnimationEngine.ts    # Curve evaluation, Catmull-Rom sampler
│   ├── BeatClock.ts          # Global beat position, play/stop
│   └── PitchMapper.ts        # Hue → frequency lookup, scale quantisation
├── state/
│   ├── store.ts              # Zustand store + Immer + zundo
│   ├── machine.ts            # XState sequencer machine
│   └── selectors.ts          # Derived state selectors
├── components/
│   ├── Canvas.tsx            # Canvas host component
│   ├── CellEditor.tsx        # Per-cell property edit panel
│   ├── Toolbar.tsx           # Global transport + controls
│   ├── AnimationPanel.tsx    # Bottom panel — lane list + spline editor
│   ├── SplineEditor.tsx      # 2D spline canvas, control point interactions
│   └── LaneList.tsx          # Lane strip with property/duration controls
└── hooks/
    ├── useAudioContext.ts
    ├── useAnimationCurve.ts  # Curve evaluation hook for render loop
    └── useCanvasSync.ts
```

### 8.3 Key Technical Constraints

- **Single AudioContext** per session — never reconstructed, suspended/resumed on transport
- **Canvas never touched by React** — owned exclusively by CanvasEngine
- **SplineEditor is its own canvas element** — rendered independently from the main grid canvas
- **No React state in hot path** — animation loop reads Zustand store directly via raw subscription
- **AudioContext on user gesture only** — canvas click initiates context to satisfy browser autoplay policy
- **Curve evaluation is pull-based** — sampled each animation frame from global beat clock; no scheduling needed

---

## 9. Build Phases

### Phase 1 — Core Synthesis (v1 MVP)

- Grid canvas, click to spawn shape
- Shape type, hue, lightness, saturation, size, rotation properties
- Web Audio synth voice per cell (oscillator + gain)
- Play/stop with BPM
- Static shapes (no animation yet)

### Phase 2 — Animation Engine

- Global beat clock (BeatClock.ts)
- AnimationEngine: Catmull-Rom curve sampler, per-property evaluation
- AnimationCurve data model integrated into Zustand Cell type
- SplineEditor canvas component (add/drag/delete points, handle types)
- AnimationPanel bottom panel with draggable divider
- Single-lane editing (size only) to validate the stack end-to-end

### Phase 3 — Full Animation System

- All five animatable properties wired (size, hue, saturation, lightness, rotation)
- Stacked multi-lane view with independent time axes per lane
- Tab strip collapse for height-constrained screens
- Loop ghost preview beyond right edge of each lane
- Live playhead during playback
- Mute / delete per lane
- Interpolation toggle (cubic / linear / step)
- Beat duration inline editing with proportional point rescaling

### Phase 4 — Full Visual Language

- Saturation → harmonic richness (WaveShaper)
- Pan → stereo position (StereoPannerNode)
- Star shape → noise burst (percussion voices)
- Multiple shapes per cell (layered voices)
- Key/scale selector with hue quantisation

### Phase 5 — Composition Tools

- Undo/redo (zundo)
- Export canvas as PNG (composition save/load)
- Curve presets library (sine, sawtooth, triangle, bounce, exponential decay)
- Curve copy/paste between cells and properties

### Phase 6 — Transport & Polish

- Full play/stop/pause transport
- AudioContext suspend/resume
- Master volume

### Phase 7 — Advanced (v2+)

- Pattern transformations
- Cell-to-cell modulation routing
- Import PNG → restore composition
- Export as audio (Web Audio offline rendering)

---

## 10. Non-Functional Requirements

| Requirement                | Target                                   |
| -------------------------- | ---------------------------------------- |
| Canvas frame rate          | 60fps sustained on mid-range hardware    |
| Audio latency              | < 20ms from trigger to audible output    |
| Max simultaneous voices    | 32 cells without performance degradation |
| Browser support            | Chrome 120+, Firefox 120+, Safari 17+    |
| First interaction to sound | < 500ms after AudioContext resume        |
| Undo depth                 | Minimum 50 steps                         |

---

## 11. Open Questions

1. **Octave encoding** — should octave be a separate control per cell, or encoded in lightness alongside volume? These conflict on the same axis.
2. **Cell grid size** — fixed grid (e.g. 8×8) or free-form canvas with arbitrary cell placement?
3. **Composition persistence** — local storage auto-save, or explicit export-only?
4. **Scale mode default** — should new sessions boot into scale mode (more musical, less flexible) or chromatic mode (full control, less constrained)?
5. **Spline editor focus model** — in stacked lane view, can any lane be edited directly, or must a lane be clicked to focus before accepting point edits?
6. **Live playhead during editing** — should the playhead scrub in real time while the user is editing a curve, or pause during editing?
7. **Curve presets format** — define preset curves as named sets of SplinePoints; v1 preset list candidates: sine, sawtooth, triangle, bounce, exponential decay.
8. **Curve reuse UI** — copy a curve from one cell/property to another; interaction pattern not yet defined.

---

## 12. Success Metrics

- A user with no music theory background can produce a recognisable rhythmic pattern within 5 minutes
- A musician can recreate a simple 4-bar loop using only the visual interface
- The canvas PNG round-trips cleanly (export → import → identical composition)
- 60fps maintained with 16 active cells on reference hardware
