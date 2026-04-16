# Phase 4: Shape Panel & Animation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 04-shape-panel-animation
**Areas discussed:** Color picker style, Size slider semantics, LFO architecture, Shape type switching

---

## Color Picker Style

| Option | Description | Selected |
|--------|-------------|----------|
| Three range sliders (H/S/L) | Hue 0–360, Saturation 0–100, Lightness 0–100 as range sliders. Simple, maps directly to ShapeColor struct. | ✓ |
| Custom canvas color picker | Painted HSL wheel or saturation/lightness square. Visually richer but non-trivial. | |
| Library component | Drop in react-colorful etc. Adds dependency. | |

**User's choice:** Three range sliders

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, gradient tracks | Hue = rainbow, Saturation = grey→vivid, Lightness = dark→light. Communicates visual-audio relationship. | ✓ |
| Plain sliders, no gradients | Faster to build. | |

**User's choice:** Gradient tracks on each slider

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real time on every move | Every `input` event updates audio — core value proposition. | ✓ |
| On release only | Simpler but breaks core value. | |

**User's choice:** Real time on every `input` event

---

## Size Slider Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Both visual size AND audio gain | One slider, both change. Core value. | ✓ |
| Visual size only | Breaks PANL-02 requirement. | |

**User's choice:** Both simultaneously

---

| Option | Description | Selected |
|--------|-------------|----------|
| size: number 0–100, default 50 | Normalised int on Shape. Canvas = radius multiplier, audio = gain multiplier. | ✓ |
| Different range / split properties | e.g., 0.0–1.0 float or separate fields. | |

**User's choice:** `size: number` 0–100, default 50

---

## LFO Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Web Audio LFO (OscillatorNode → GainNode) | Runs in audio thread, sample-accurate, zero RAF overhead. Canvas mirrors independently. | ✓ |
| RAF-driven gain updates | Simpler but adds RAF→AudioParam latency; can cause clicks on frame drops. | |
| setInterval-driven | Unreliable timing. | |

**User's choice:** Web Audio LFO

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed depth (±40% of base gain) | No depth slider in Phase 4. ANIM-04 is v2. | ✓ |
| Depth slider in panel too | Scope creep — ANIM-04 is v2. | |

**User's choice:** Fixed ±40% depth

---

| Option | Description | Selected |
|--------|-------------|----------|
| 0.1–10 Hz, default 1 Hz | Covers slow swell to fast tremolo. Default is moderate. | ✓ |
| Different range (e.g., BPM-synced) | BPM sync is Phase 5+ concern. | |

**User's choice:** 0.1–10 Hz, default 1.0 Hz

---

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas computes its own sine independently | Uses `performance.now()`, no cross-thread communication. | ✓ |
| Audio engine writes LFO phase to shared state | Complex, breaks architecture pattern. | |

**User's choice:** Canvas computes independently using `performance.now()`

---

## Shape Type Switching

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include type selector | Natural, low-cost. All 6 types exist. Makes other waveforms reachable. | ✓ |
| No, type set at placement only | Leaves 5 of 6 shape types unreachable forever. | |

**User's choice:** Yes, include type selector

---

| Option | Description | Selected |
|--------|-------------|----------|
| Icon/label buttons | 6 compact buttons, one per type. | |
| Compact buttons with mini canvas preview | Each button renders the shape at small scale, like on the main canvas. | ✓ |
| Dropdown select | Simpler but less expressive. | |

**User's choice:** Compact buttons rendering each shape on a mini canvas (same drawing code, same color as current shape)
**Notes:** User explicitly said "compact buttons for each shape containing a shape rendered like on canvas"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Destroy and re-create voice | Clean, uses existing create/destroy lifecycle. Handles blob topology difference cleanly. | ✓ |
| Hot-swap oscillator in place | More complex; blob has different node graph. | |

**User's choice:** Destroy and re-create voice on type change

---

## Claude's Discretion

- Exact gain topology for LFO + DC offset
- Precise radius multiplier formula for `size` 0–100
- Gradient track CSS implementation
- Panel layout ordering and spacing
- Mini canvas button px size and highlight style
- Exact `.setTargetAtTime()` time constants for real-time updates

## Deferred Ideas

- LFO depth slider (ANIM-04) — already in v2 requirements
- BPM-synced animation rate — Phase 5 concern
- Rotation and bounce animation modes (ANIM-02, ANIM-03) — v2
