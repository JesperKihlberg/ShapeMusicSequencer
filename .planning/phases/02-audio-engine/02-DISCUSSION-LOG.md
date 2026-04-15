# Phase 2: Audio Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 02-audio-engine
**Areas discussed:** Audio library choice, Color-to-audio mapping approach, Shape data model extension, Audio playback trigger & lifecycle

---

## Audio Library Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Web Audio API directly | Zero deps, full control, working prototype already uses it | ✓ |
| Tone.js | Higher-level abstractions, ~60KB dep, built-in reverb/filter/scheduling | |

**User's choice:** Web Audio API directly
**Notes:** No extra dependency needed — prototype already demonstrates the full signal chain.

---

## Color-to-Audio Mapping Approach

### Hue → Pitch

| Option | Description | Selected |
|--------|-------------|----------|
| Wide musical range (C2–C6) | 4 octaves, musically coherent | |
| Prototype approach (per-shape base freq × hue) | Shape-specific base frequencies | |
| Narrow range (A3–A5) | 2 octaves around A440 | |
| **Custom: 12 semitones on color wheel** | C=0°(Red) through B=330°(Rose) | ✓ |

**User's choice:** Custom 12-semitone color wheel mapping (free-text response)
**Notes:** Precise note-to-hue table specified by user. Value/lightness maps octave across C1–C8 (7 octaves).

### Saturation → Timbre

| Option | Description | Selected |
|--------|-------------|----------|
| Sine → square/sawtooth blend | Oscillator type blend across saturation | |
| Additive harmonics | Stack partials as saturation increases | |
| WaveShaper distortion | Soft-clip/fold curve increases with saturation | ✓ |

**User's choice:** WaveShaper distortion — grey=clean, saturated=harmonically dense
**Notes:** User overrode the original reverb question mid-discussion: "Timbre richness — grey=sine, saturated=complex harmonics". Reverb deferred.

### Reverb/Spatial Dimension

| Option | Description | Selected |
|--------|-------------|----------|
| No reverb in Phase 2 | Defer to later phase | ✓ |
| Shape size → reverb depth | Larger = more reverberant | |
| Claude discretion | Let Claude decide | |

**User's choice:** No reverb in Phase 2 — deferred

---

## Shape Data Model Extension

### Shape.color type

| Option | Description | Selected |
|--------|-------------|----------|
| Keep string ('hsl(220, 70%, 60%)') | Parse in audio engine | |
| Change to { h, s, l } structured | Clean extraction everywhere | ✓ |

**User's choice:** Structured `{ h: number, s: number, l: number }`
**Notes:** Canvas engine reconstructs CSS string for rendering. Phase 1 default converted in Phase 2.

### Shape type → waveform mapping

User provided full instrument family specification:

| Shape | Waveform | Character |
|-------|----------|-----------|
| Circle | Sine | Pure, flute-like, sub bass |
| Triangle | Triangle | Soft, mellow, gentle lead |
| Square | Square | Hollow, reedy, clarinet-like |
| Diamond | Pulse 25% duty cycle | Nasal, oboe-like |
| Star/spiky | Sawtooth | Bright, brassy, aggressive |
| Blob/irregular | Noise + sine | Percussive, textural, drum-like |

**Diamond waveform detail:** Pulse wave at ~25% duty cycle. All harmonics present; even harmonics stronger than odd → nasal quality. Requires `createPeriodicWave()` in Web Audio API. Visual narrowness of diamond mirrors audio narrowness.

### Audio state ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Shape purely visual, audio engine owns voices | Map<shapeId, AudioVoice> | ✓ |
| Audio fields on Shape | Derived values alongside color | |

**User's choice:** Audio engine maintains its own Map — Shape stays purely visual.

---

## Audio Playback Trigger & Lifecycle

### When shapes play

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately when placed | No play/stop in Phase 2 | ✓ |
| Muted until 'playing' state | Requires Phase 5 wiring in Phase 2 | |

**User's choice:** Shapes play immediately when placed

### AudioContext initialization

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy-init on first shape click | Click IS the user gesture | ✓ |
| Explicit 'click to start audio' overlay | More explicit UX | |
| Create suspended, resume on interaction | Standard pattern | |

**User's choice:** Lazy-init on first click

### Additional lifecycle context (free-text)

User provided detailed future architecture:
- XState boots into `playing` state by default in Phase 2
- Phase 5 adds `stopped` state and transport controls (play/stop/pause)
- AudioContext singleton kept alive; Phase 5 uses `suspend()` / `resume()`
- Full step sequencer architecture described (cycle model, per-cell boolean step patterns, animation→envelope, velocity from pulse size) — captured as deferred idea, explicitly out of Phase 2 scope

---

## Claude's Discretion

- Octave-to-lightness curve (linear vs exponential across C1–C8)
- WaveShaper distortion formula
- Diamond PeriodicWave coefficients for 25% pulse
- Blob noise+sine implementation approach
- Per-voice signal chain topology
- Default color values for test shapes

## Deferred Ideas

- Full step sequencer system (cycle model, per-cell step patterns, animation→envelope, velocity, pattern transformations) — future phase
- Reverb/spatial depth — future phase (Phase 4 or dedicated phase)
