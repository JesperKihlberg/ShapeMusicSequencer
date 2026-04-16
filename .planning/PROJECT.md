# Shape Music Sequencer

## What This Is

A public-facing web app for visual music composition where sound is created and controlled entirely through drawing. Users place geometric shapes on a grid canvas — each shape is an autonomous, continuously-playing sound voice whose visual properties (type, color, size, animation) map directly to sonic properties (waveform, pitch, filter, envelope). The canvas is the composition: the animation of shapes over time is the music.

## Core Value

Any change to the visual canvas is an immediate, audible change to the music — seeing and hearing are the same act.

## Requirements

### Validated

- [x] Shape type determines oscillator waveform (circle=sine, triangle=triangle, square=square, star=sawtooth, diamond=pulse, blob=noise+sine) — Validated in Phase 02: audio-engine
- [x] Shape color (hue) maps to pitch; saturation maps to distortion/timbre; lightness maps to filter cutoff — Validated in Phase 02: audio-engine
- [x] Each shape plays continuously and independently as an audio voice — Validated in Phase 02: audio-engine (human-verified)

### Active

- [ ] User can place shapes on a strict grid canvas (up to 4x4 = 16 cells)
- [ ] Shape type determines oscillator waveform (circle=sine, square=square/buzz, star=noise burst, triangle=triangle, diamond=sawtooth)
- [ ] Shape color (hue) maps to pitch; saturation maps to reverb depth; value/brightness maps to filter cutoff
- [ ] Shape size maps to amplitude/loudness
- [ ] Each shape plays continuously and independently as an audio voice
- [ ] Shape animation lifecycle directly modulates sound (size oscillation = amplitude LFO, rotation = phase shift, bounce = pitch modulation)
- [ ] Animation parameters (rate, depth, mode) are configurable per shape
- [ ] Clicking a shape opens a side panel with sliders/pickers for all properties
- [ ] User can remove shapes from the canvas
- [ ] Playback has configurable BPM/tempo
- [ ] User can start/stop playback
- [ ] Canvas can be saved and loaded as JSON
- [ ] Composition can be shared via URL

### Out of Scope

- Server-side storage — no backend, client-only for PoC
- User accounts / auth — not needed for PoC
- Playhead as trigger mechanism — all shapes play continuously; playhead is cosmetic
- Mobile/touch optimization — desktop web first
- Advanced MIDI export — out of scope for v1

## Context

- Stack: React + TypeScript + CSS (no UI framework imposed)
- Audio: Web Audio API or Tone.js (architecture-dependent choice)
- Grid: Strict snap-to-cell placement, 4x4 (up to 16 simultaneous voices)
- All shapes play simultaneously at all times; animations modulate their sound properties in real time
- The playhead is a BPM-synced visual cursor — primarily cosmetic/arrangement reference for v1
- Shape properties drive both the visual rendering and the audio synthesis parameters — they are the same data
- Save/load (JSON) and URL sharing are v1 but not the primary PoC focus; working instrument is the goal

## Constraints

- **Tech Stack**: React + TypeScript + CSS — no UI framework; solid design principles
- **Scope**: PoC — full feature set with rough edges acceptable; polish is v2
- **Polyphony**: Up to 16 simultaneous voices (4x4 grid); browser performance is the practical ceiling
- **Client-only**: No backend; all state lives in the browser

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All shapes play continuously (no playhead trigger) | Animations drive sound evolution — this is the core mechanic | — Pending |
| Strict grid (4x4) | Predictable timing, manageable polyphony for PoC | — Pending |
| Click → side panel for properties | Full control per shape without cluttering canvas | — Pending |
| Image is actually animated JSON | Canvas state is the composition — saving JSON saves everything | — Pending |
| Audio library TBD at planning | Web Audio API or Tone.js decided based on architecture needs | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-16 after Phase 03 (canvas-interaction) completion*
