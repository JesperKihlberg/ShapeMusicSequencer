# Shape Music Sequencer

## What This Is

A public-facing web app for visual music composition where sound is created and controlled entirely through drawing. Users place geometric shapes on a 4×4 grid canvas — each shape is an autonomous, continuously-playing Web Audio voice whose color (hue→pitch, saturation→timbre, lightness→filter), type (waveform), size (amplitude), and per-property spline animation curves map directly to sonic output. A key/scale selector, stereo panning by column, and a multi-lane spline animation panel with polyrhythm support complete the v1.0 instrument.

## Core Value

Any change to the visual canvas is an immediate, audible change to the music — seeing and hearing are the same act.

## Requirements

### Validated

- ✓ Shape type determines oscillator waveform (circle=sine, triangle=triangle, square=square, star=sawtooth, diamond=pulse, blob=noise+sine) — v1.0
- ✓ Shape color (hue) maps to pitch via direct linear mapping (0–359° → C1–C8); saturation maps to WaveShaper harmonic richness; lightness maps to filter cutoff — v1.0
- ✓ Each shape plays continuously and independently as an audio voice — v1.0
- ✓ Shape size maps to amplitude/loudness — v1.0
- ✓ Per-property spline animation curves with free-float beat duration; polyrhythm from mismatched durations — v1.0
- ✓ AnimationPanel with drag-to-resize divider, per-shape lanes, property picker — v1.0
- ✓ Clicking a shape opens a side panel with HSV sliders, shape type selector, and size control — v1.0
- ✓ User can place shapes on strict 4×4 grid (up to 16 cells) and remove them — v1.0
- ✓ Playback has configurable BPM (40–200 BPM) and master volume — v1.0
- ✓ User can start/stop playback — v1.0
- ✓ Cell column maps to stereo pan (StereoPannerNode; left col = hard left, right = hard right) — v1.0
- ✓ Key/scale selector constrains pitch to selected scale (6 scales + chromatic) — v1.0
- ✓ Shapes hold animated size position when playback stops (frozenBeatPos) — v1.0

### Active

- [ ] Undo/redo with minimum 50-step depth (zundo middleware) — COMP-01 (deferred from v1.0)
- [ ] Export canvas as PNG encoding full composition state — COMP-02 (deferred from v1.0)
- [ ] Canvas can be saved and loaded as JSON — PERS-01/02
- [ ] Composition can be shared via URL — PERS-03
- [ ] Multi-shape per cell for complex timbres — SHPE-06

### Out of Scope

- Server-side storage — no backend, client-only for PoC
- User accounts / auth — not needed for PoC
- Playhead as trigger mechanism — all shapes play continuously; playhead is cosmetic
- Mobile/touch optimization — desktop web first
- Advanced MIDI export — out of scope for v1
- LFO-driven animation — replaced by spline curves (D-05); ANIM-01 superseded

## Context

- **Stack**: React 19 + TypeScript + CSS (no UI framework); Vite 8; Zustand + Immer + XState; Vitest 4
- **Audio**: Web Audio API (no Tone.js — direct control sufficient for PoC)
- **Grid**: Strict snap-to-cell, 4×4 (up to 16 simultaneous voices)
- **Codebase**: ~4,672 LOC, 182 files changed across v1.0
- **Shipped**: v1.0 on 2026-04-24 — fully functional PoC instrument
- All shapes play simultaneously; spline curves modulate properties in real time at independent beat durations
- Shape properties drive both visual rendering and audio synthesis — they are the same data object
- frozenBeatPos pattern: canvasEngine module variable captures beat position at stop; shapes visually freeze in animated state

## Constraints

- **Tech Stack**: React + TypeScript + CSS — no UI framework; solid design principles
- **Scope**: PoC — full feature set with rough edges acceptable; polish is v2
- **Polyphony**: Up to 16 simultaneous voices (4×4 grid); browser performance is the practical ceiling
- **Client-only**: No backend; all state lives in the browser

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All shapes play continuously (no playhead trigger) | Animations drive sound evolution — this is the core mechanic | ✓ Good — core mechanic validated |
| Strict grid (4×4) | Predictable timing, manageable polyphony for PoC | ✓ Good |
| Click → side panel for properties | Full control per shape without cluttering canvas | ✓ Good — HsvSliders, ShapeTypeSelector, size slider all in Phase 04 |
| Web Audio API (no Tone.js) | Direct control; no third-party abstraction needed for PoC complexity | ✓ Good |
| Saturation → WaveShaper harmonic richness (not reverb) | HSV saturation = colour richness/purity; WaveShaper is the honest metaphor; no mud at 32 voices | ✓ Good — implemented Phase 06 |
| LFO → spline curves (full replacement, D-05) | Two subsystems is a maintenance trap; LFO is a degenerate spline case; BeatFraction maps to spline loop duration | ✓ Good — polyrhythm is a free emergent feature |
| frozenBeatPos freeze-on-stop pattern | Module variable captures beat position at stop instant; O(1) overhead; single write path; cleared to null on resume | ✓ Good — UAT Test 7 confirmed |
| Hue → direct linear pitch mapping (no scale quantization on hue) | Scale quantization caused jumpy pitch for continuous hue changes; direct mapping is musically expressive | ✓ Good — quick-260424-2px |
| COMP-01/02 deferred (D-01/D-02) | Undo/redo and PNG export are polish; working instrument is the v1 goal | ✓ Good — shipped cleaner without them |

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
*Last updated: 2026-04-24 after v1.0 milestone — full PoC instrument shipped; all 7 phases complete*
