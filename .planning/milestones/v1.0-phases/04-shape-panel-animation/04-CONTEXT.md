# Phase 4: Shape Panel & Animation - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can edit all properties of a selected shape through the right sidebar panel (CellPanel), and shapes animate in ways that modulate their sound in real time. The panel gains: HSV color picker (three gradient-track range sliders), a size slider (visual radius + audio gain together), a shape type selector (mini canvas preview buttons), and an animation rate slider (LFO speed). Shapes visibly pulse in size at the configured rate; audio amplitude follows that pulsing.

**Not in scope:** Playback controls (Phase 5), LFO modulation depth slider (ANIM-04, v2), drag-to-reposition (deferred from Phase 3), BPM-synced animation rate.

</domain>

<decisions>
## Implementation Decisions

### Color Picker (PANL-01)
- **D-01:** Three separate range sliders — **Hue** (0–360), **Saturation** (0–100), **Lightness** (0–100). Maps directly to the `ShapeColor { h, s, l }` struct with no transformation.
- **D-02:** Each slider has a **gradient CSS track** that previews the mapping: Hue slider = full rainbow, Saturation slider = grey→vivid at current hue, Lightness slider = dark→light at current hue+saturation.
- **D-03:** Color changes fire on **every `input` event** (real-time, every mouse move). Audio parameters update immediately — this is the core value. The audio engine must expose an `updateVoice(shapeId, shape)` function that applies new frequency/filter/distortion values without destroying and re-creating the voice.

### Size Slider (PANL-02)
- **D-04:** `size: number` (0–100) added to the `Shape` interface. Default value **50** (matches current rendered size and sets a moderate gain).
- **D-05:** `size` controls **both simultaneously**: canvas uses it as a radius multiplier (e.g., size 50 → 50% of max radius ≈ current `Math.floor(cellSize * 0.35)`), and the audio engine uses it as the base gain (size 50 → gain 0.5, roughly). Exact mapping curves are Claude's discretion.
- **D-06:** Size slider updates are **real-time** (same `input` event pattern as color). Audio gain updates without voice destroy/recreate.

### Shape Type Selector (unlocked by panel)
- **D-07:** The panel includes a **type selector**: 6 compact buttons arranged in a row, one per shape type (circle, triangle, square, diamond, star, blob). Each button renders a **mini canvas preview** of the shape (same drawing code as the canvas engine, drawn at ~32×32px into a `<canvas>` element inside the button). The currently active type is highlighted.
- **D-08:** Changing type calls `shapeStore.getState().updateShapeType(id, newType)` (new action needed). The audio engine detects this as a voice property change and **destroys + re-creates the voice** with the new waveform descriptor (same ramp-out / ramp-in pattern as removal/addition). No hot-swap.

### LFO Architecture (ANIM-01 + PANL-03)
- **D-09:** The LFO runs as a **native Web Audio graph**: a second `OscillatorNode` (type `sine`, frequency = `animRate`) connects to the voice's `gainNode.gain` AudioParam via `.connect()`. This runs entirely in the audio thread — sample-accurate, zero RAF overhead, no tick-based updates.
- **D-10:** LFO modulation depth is **fixed at ±40% of base gain** in Phase 4. No depth slider. (ANIM-04 depth control is v2.) Implementation: a `ConstantSourceNode` provides the DC offset (base gain), the LFO oscillator provides ±0.4 swing. Or equivalently: gain DC = `size/100 * 0.4` and LFO amplitude = `size/100 * 0.4` so the voice swings between 0 and `size/100 * 0.8`. Exact gain topology is Claude's discretion.
- **D-11:** Animation rate range: **0.1–10 Hz**, default **1.0 Hz**. Stored as `animRate: number` on `Shape`.
- **D-12:** The canvas engine computes the visual size pulse **independently** using `performance.now()`: `pulseScale = 1 + 0.4 * sin(2π * animRate * t_seconds)`. This mirrors the LFO frequency without cross-thread communication. The canvas and audio stay in visual sync because they share the same `animRate` value from the store.

### Audio Engine Updates
- **D-13:** The audio engine needs two new exported functions (in addition to `initAudioEngine`):
  1. `updateVoiceColor(shapeId: string, color: ShapeColor)` — updates frequency, filter cutoff, and distortion curve on a live voice without stopping it. Uses `.setTargetAtTime()` / `.setValueAtTime()` for glitch-free parameter automation.
  2. `updateVoiceSize(shapeId: string, size: number)` — updates the voice's base gain.
  On type change, the existing create/destroy lifecycle handles it (no new function needed).
- **D-14:** `animRate` change requires destroying and re-creating the LFO oscillator inside the voice (cannot change a running oscillator's frequency in a way that also reconnects the AudioParam — simpler to rebuild the LFO node). This is distinct from color/size updates which are parameter-only.

### Store Updates
- **D-15:** `Shape` interface gains two new fields: `size: number` (0–100, default 50) and `animRate: number` (0.1–10, default 1.0).
- **D-16:** `ShapeState` gains: `updateShapeType(id, type)`, `updateShapeColor(id, color)`, `updateShapeSize(id, size)`, `updateShapeAnimRate(id, animRate)` — or a single `updateShape(id, partial)` if Claude prefers. Each mutation must be Immer-compatible and follow the existing `set((state) => { ... })` pattern.

### Claude's Discretion
- Exact gain topology for LFO + DC offset (ConstantSourceNode approach vs simple gain math)
- Precise radius multiplier formula mapping `size` 0–100 to canvas radius
- Gradient track CSS implementation (SVG gradient, CSS linear-gradient on the range track)
- Panel layout within the existing sidebar (ordering of sections, spacing)
- Mini canvas button size (exact px), shape drawing scale, highlight style for selected type
- Exact `.setTargetAtTime()` time constants for real-time color/size updates

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture (must preserve)
- `.planning/phases/01-scaffold/01-CONTEXT.md` — D-04 three-layer architecture; canvas engine subscribes to Zustand vanilla store via `.subscribe()`, not React; RAF loop is independent
- `.planning/phases/02-audio-engine/02-CONTEXT.md` — D-09 audio lifecycle (`voices` Map, Shape is purely visual); D-10 lazy AudioContext; D-12 singleton; signal chain topology; ramp-in/ramp-out patterns
- `.planning/phases/03-canvas-interaction/03-CONTEXT.md` — D-06 sidebar panel pattern; D-07 canvas highlight via RAF; visibility:hidden pitfall (Pitfall 4)

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 4 covers: PANL-01, PANL-02, PANL-03, ANIM-01

### Existing Prototype
- `shape_music_sequencer.html` — Reference for `drawShape()` drawing code for all 6 shape types (used for mini canvas previews in the type selector)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/CellPanel.tsx` — Existing sidebar panel component with occupied/empty modes. Phase 4 extends the occupied mode with the full editor UI. The component structure (aside, header, body) can be extended in place.
- `src/engine/canvasEngine.ts:112–133` — `drawShapes()` contains the circle-drawing code. The mini canvas preview buttons need the full `drawShape()` for all 6 types — extract or duplicate the drawing logic into a shared helper.
- `src/engine/canvasEngine.ts:67` — `sequencerActor` reference is already kept as a void import. Phase 4 does not need to change the sequencer.
- `src/store/shapeStore.ts` — `Shape` interface needs `size` and `animRate` added. Store actions need update mutations. The `addShape` default color `{ h: 220, s: 70, l: 30 }` should gain defaults `size: 50, animRate: 1.0`.
- `src/engine/audioEngine.ts` — `AudioVoice` interface and `voices` Map are the integration points. The `createVoice` function builds the signal chain; Phase 4 adds LFO nodes to each voice. The `initAudioEngine` subscription loop currently detects add/remove; Phase 4 must also detect color/size/animRate changes and call the appropriate update functions.

### Established Patterns
- **Zustand vanilla store** (`createStore` not `create`) — all stores subscribe without React
- **Singleton exports** — `shapeStore`, `selectionStore`, `sequencerActor` are module-level singletons
- **`useShapeStore` hook pattern** — wraps `useStore(shapeStore, selector)`; panel components use these hooks
- **Audio ramp patterns** — `gain.setTargetAtTime(0, ctx.currentTime, 0.015)` + `setTimeout(60ms)` for click-free removal (already in `initAudioEngine`)
- **Dirty-flag RAF loop** — canvas engine subscribes to both `shapeStore` and `selectionStore`, sets `dirty = true` on any change, redraws next frame

### Integration Points
- `CellPanel.tsx` — Phase 4 replaces the read-only property display with interactive controls. Shape updates call new store action(s) which trigger both canvas redraw (via shapeStore subscription) and audio parameter update (via audio engine subscription).
- `canvasEngine.ts drawShapes()` — must read `shape.size` and `shape.animRate` to compute the animated radius each frame. Currently hardcodes `Math.floor(size * 0.35)` — this becomes `Math.floor(cellSize * 0.35 * (shape.size / 50) * pulseScale)` or similar.
- `audioEngine.ts` — `AudioVoice` interface gains two new optional fields for LFO nodes (`lfoOscillator: OscillatorNode` and `lfoGain: GainNode`). `createVoice` always adds these. Update functions (`updateVoiceColor`, `updateVoiceSize`) modify live voice parameters.

</code_context>

<specifics>
## Specific Ideas

- **Mini canvas shape buttons**: Each type-selector button contains a `<canvas>` element rendered at ~32×32px showing the shape drawn using the same color as the currently selected shape. When a button is hovered/focused, it could preview the waveform name in a tooltip. The user specifically asked for the shape to be "rendered like on canvas" — same drawing code, same color, small size.
- **Gradient track CSS**: The hue slider can use a CSS `linear-gradient` on the `input[type=range]` track pseudo-element (`::-webkit-slider-runnable-track`) cycling through the 12 semitone hues. Lightness and saturation gradients update dynamically via inline style as the other sliders move (to show the actual color at current h/s/l).
- **Real-time audio updates**: Color changes should use `AudioParam.setValueAtTime(value, ctx.currentTime + 0.001)` (1ms lookahead) rather than direct `.value =` assignment to stay on the audio render thread schedule and avoid potential glitches.

</specifics>

<deferred>
## Deferred Ideas

- **LFO depth slider (ANIM-04)** — Modulation depth configurable per shape. Already marked as v2 in REQUIREMENTS.md. Phase 4 uses fixed ±40% depth.
- **BPM-synced animation rate** — Rate expressed as a fraction of global BPM (e.g., 1/4 note, 1/8 note). Belongs in Phase 5 (Playback Controls) or later.
- **Rotation and bounce animation modes** — ANIM-02 (rotation → phase shift) and ANIM-03 (bounce → pitch vibrato) are v2 requirements. Out of Phase 4 scope.

</deferred>

---

*Phase: 04-shape-panel-animation*
*Context gathered: 2026-04-16*
