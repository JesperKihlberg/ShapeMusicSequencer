# Phase 2: Audio Engine - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the audio synthesis engine: every placed shape produces a continuously playing audio drone voice whose sonic properties (pitch, octave, timbre) are driven by the shape's color values (hue, value, saturation). This phase establishes the color→audio mapping, the per-shape voice lifecycle, and the AudioContext initialization pattern.

**No step sequencer in this phase** — shapes play as continuous drones. Rhythm, step patterns, and triggered envelopes are deferred to a future phase.

</domain>

<decisions>
## Implementation Decisions

### Audio Library
- **D-01:** Use **Web Audio API directly** — zero dependencies, full control, working prototype already uses it. No Tone.js.

### Color-to-Audio Mapping
The Shape's `{ h, s, l }` color object drives three independent audio dimensions:

- **D-02: Hue → Note (pitch class)** — 12 semitones mapped to the color wheel:
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

- **D-03: Value/Lightness → Octave** — maps across C1–C8 (7 octaves). Low lightness = low octave (deep bass), high lightness = high octave. Approximate breakpoints: 15% ≈ C1, 28% ≈ C2, etc. Claude to implement precise linear/exponential mapping across 7 octaves.

- **D-04: Saturation → Timbre (harmonic richness)** — via WaveShaper distortion:
  - 0% saturation (grey) = clean, undistorted (pure waveform character of the shape type)
  - 100% saturation = heavily distorted, harmonically dense (soft-clip/fold curve)
  - The WaveShaper curve intensity scales linearly with saturation

### Shape Type → Base Waveform (Instrument Family)
Each shape type defines the base oscillator waveform and sonic character:

- **D-05:**
  | Shape | Base Waveform | Character |
  |-------|---------------|-----------|
  | Circle | Sine | Pure, flute-like, sub bass |
  | Triangle | Triangle | Soft, mellow, gentle lead |
  | Square | Square | Hollow, reedy, clarinet-like |
  | Diamond | Pulse (25% duty cycle) | Nasal, oboe-like |
  | Star/spiky | Sawtooth | Bright, brassy, aggressive |
  | Blob/irregular | Noise + sine mix | Percussive, textural, drum-like |

  Note: Diamond's pulse wave (25% duty cycle) requires `createPeriodicWave()` since Web Audio API has no built-in pulse type. Star uses sawtooth (replacing the prototype's diamond→sawtooth mapping).

### Shape Data Model
- **D-06:** Change `Shape.color` from string (`'hsl(220, 70%, 60%)'`) to structured `{ h: number, s: number, l: number }`.
- **D-07:** The canvas engine reconstructs the CSS string (`hsl(${h}, ${s}%, ${l}%)`) for rendering — one source of truth in the structured type.
- **D-08:** Phase 1 scaffold's default color `'hsl(220, 70%, 60%)'` → `{ h: 220, s: 70, l: 60 }`.
- **D-09:** Shape stays **purely visual** — no audio fields on Shape. The audio engine maintains its own `Map<shapeId, AudioVoice>` for Web Audio nodes. Shape and AudioVoice have different lifecycles and different responsibilities.

### Audio Lifecycle & Playback
- **D-10:** **Shapes play immediately when placed** — no play/stop button in Phase 2. A placed shape = an active, sounding voice. This makes Phase 2 immediately demonstrable.
- **D-11:** **Lazy-init AudioContext** on first shape placement click. The click is the required user gesture. Pattern:
  ```typescript
  function getAudioContext(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  ```
- **D-12:** **AudioContext is a singleton** — created once, never reconstructed. Phase 5 will use `audioCtx.suspend()` / `audioCtx.resume()` on the same instance.
- **D-13:** **XState machine boots into `playing` state by default in Phase 2** — the existing `playing` stub state becomes the initial state. Phase 5 adds stopped state and transport control transitions.

### Claude's Discretion
- Precise octave-to-lightness breakpoints (linear vs exponential curve across C1–C8)
- WaveShaper distortion curve formula (soft-clip vs fold-back vs both)
- Diamond pulse wave: exact PeriodicWave coefficients to achieve ~25% duty cycle
- Blob "noise + sine" mix ratio and implementation (separate noise oscillator? AudioWorklet? Filtered noise node?)
- Per-voice signal chain topology: oscillator → WaveShaper → filter → gain → destination (or variations)
- Default color values for Phase 2 test shapes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Prototype
- `shape_music_sequencer.html` — Working vanilla JS prototype with:
  - `colorToFreq()` — hue-to-frequency math (reference only; Phase 2 uses different mapping)
  - `colorToWaveform()` — shape type → oscillator waveform (reference)
  - Full Web Audio API signal chain: oscillator → filter → gain → convolver → masterGain
  - `playShape()` — voice creation and envelope implementation

### Project Requirements
- `.planning/REQUIREMENTS.md` — Phase 2 covers: SHPE-01, COLR-01, COLR-02, COLR-03, AUDI-01, AUDI-02

### Phase 1 Context (architecture decisions to preserve)
- `.planning/phases/01-scaffold/01-CONTEXT.md` — D-04 (three-layer architecture), D-05 (all three layers scaffolded in Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/shapeStore.ts` — `Shape` interface and `shapeStore` (Zustand vanilla). Phase 2 extends `Shape` with structured color type. The `ShapeType` union currently only has `'circle'` — Phase 2 expands to all 6 types.
- `src/machine/sequencerMachine.ts` — `sequencerActor` singleton. Phase 2 changes initial state to `playing`. The PLAY/STOP events are already declared as stubs.
- `src/engine/canvasEngine.ts` — subscribes to `shapeStore`, runs RAF loop. Phase 2: canvas engine must be updated to reconstruct HSL string from structured color `{ h, s, l }` when drawing shapes.

### Established Patterns
- **Zustand vanilla store** (`createStore` not `create`) — canvas engine subscribes without React
- **Singleton actor** (`sequencerActor`) started at module load, shared across the app
- **RAF loop** in canvas engine — separate from React render cycle
- **`Map<shapeId, AudioVoice>`** — audio engine should follow same pattern as canvas engine: subscribe to shapeStore, maintain its own parallel state, never touch React

### Integration Points
- Audio engine needs to subscribe to `shapeStore` (same pattern as canvas engine) to:
  - Create a voice when a shape is added
  - Destroy a voice when a shape is removed (Phase 3)
  - Update voice parameters when color changes (Phase 3+)
- `sequencerMachine` transitions to `playing` state must trigger audio resume (Phase 5)
- Phase 2 does NOT need to wire PLAY/STOP events — machine stays in `playing` by default

</code_context>

<specifics>
## Specific Ideas

- **Pulse wave (Diamond)**: Web Audio API's `createPeriodicWave()` with Fourier coefficients approximating a 25% duty cycle pulse. Nasal/oboe-like quality distinct from 50% square. Visual narrowness of diamond shape mirrors the audio narrowness.
- **Blob voice**: Noise + sine blend — could be a filtered noise node (white noise via AudioWorklet or offline buffer) mixed with a sine oscillator. Percussive/textural character.
- **AudioContext singleton**: `getAudioContext()` utility function, lazy-init on first interaction, resume if suspended. All voice creation goes through this function.
- **The step sequencer architecture** (cycle model, per-cell step patterns, animation→envelope, velocity) was discussed and is the target end-state of the app — but is explicitly out of Phase 2 scope. See Deferred Ideas.

</specifics>

<deferred>
## Deferred Ideas

### Step Sequencer System (major future phase)
The full rhythm architecture discussed:
- **Global cycle model**: one loop of fixed duration; each cell subdivides it freely; polyrhythm emerges naturally
- **Per-cell step patterns**: boolean arrays (up to 16 steps); filled = trigger, empty = rest
- **Animation style → envelope**: hard snap = percussive/staccato; smooth swell = pad/legato; bounce/elastic = plucked string; slow fade = breath-like
- **Velocity from pulse size**: degree of size change on trigger = note velocity; accent = larger pulse
- **Pattern transformations** (Strudel-style): fast 2, slow 2, rev, stack, degradeBy, every N
- **Step count limits**: max 16 steps; useful subdivisions: 2 (half), 3 (triplet), 4 (quarter), 6 (triplet eighth), 8 (eighth), 12 (triplet sixteenth), 16 (sixteenth)

This is a significant architectural feature — belongs in its own phase, likely after Phase 4 (Shape Panel & Animation) since animation style drives envelope character.

### Reverb / Spatial Depth
No reverb in Phase 2. Could be added in Phase 4 (shape panel sliders) or as a separate feature. The prototype used a convolver node; saturation was initially considered for this but is assigned to timbre instead.

</deferred>

---

*Phase: 02-audio-engine*
*Context gathered: 2026-04-15*
