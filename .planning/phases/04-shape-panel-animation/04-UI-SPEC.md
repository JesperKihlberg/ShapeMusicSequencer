---
phase: 4
phase_name: Shape Panel & Animation
slug: shape-panel-animation
status: draft
shadcn_initialized: false
preset: none
created: "2026-04-16"
tool: none
---

# UI-SPEC: Phase 4 — Shape Panel & Animation

## Summary

Phase 4 replaces the read-only property display in `CellPanel` with a full interactive editor. Four new controls are added to the occupied-cell panel: an HSV color picker (three gradient-track range sliders), a size slider, a shape type selector (six mini canvas preview buttons), and an animation rate slider. Shapes gain a continuous visual pulse on the canvas driven by `performance.now()` and the stored `animRate`.

**Design system:** CSS custom properties (no UI framework). All base tokens remain from Phase 1 (`src/styles/index.css`). Phase 4 introduces new CSS tokens for control-specific UI (slider tracks, type selector buttons). No new background or accent palette entries.

**Source decisions:** CONTEXT.md D-01 through D-16. All design contract values pre-populated from upstream artifacts except where Claude's discretion was explicitly granted.

---

## 1. Spacing Scale

**Inherited from Phase 1 — base scale unchanged.**

| Token | Value | Use in Phase 4 |
|-------|-------|----------------|
| `--space-1` | 4px | Gap between slider label row and slider input; gap inside type-selector row |
| `--space-2` | 8px | Gap between control sections inside the panel; slider value readout margin |
| `--space-4` | 16px | Panel outer padding (unchanged); section-level gaps |
| `--space-6` | 24px | Not used in Phase 4 |
| `--space-8` | 32px | Not used in Phase 4 |

**Phase 4 additions:**

- Slider track height: `6px` (visual thumb target stays at browser default ~16px).
- Type selector button: `40px` wide × `44px` tall (44px meets minimum touch target height even for desktop accessibility; the 32×32 mini canvas is centered inside with 4px padding on each side vertically).
- Mini canvas inside type button: `32px × 32px`. Rendered at `1px` physical pixel per logical pixel (DPR-unaware for simplicity at PoC scale).
- Control row (label + readout): height `20px`.
- Gap between control group label row and input: `var(--space-1)` (4px).
- Gap between complete control groups stacked in panel: `var(--space-4)` (16px).

---

## 2. Typography

**Inherited from Phase 1 — no new sizes or weights.**

| Token | Value | Use in Phase 4 |
|-------|-------|----------------|
| `--text-xs` | 11px | Slider live value readout (e.g., `220`, `0.5×`, `1.0 Hz`); type button tooltip on hover |
| `--text-sm` | 12px | Control group labels (e.g., `Hue`, `Saturation`, `Size`, `Anim Rate`); type selector section label |
| `--text-base` | 13px | Panel section headings (`Color`, `Shape`, `Animation`); button labels |
| `--text-title` | 14px | Panel header (cell coordinates) — unchanged from Phase 3 |

| Token | Value | Use |
|-------|-------|-----|
| `--weight-regular` | 400 | All labels and readout values |
| `--weight-medium` | 500 | Section headings, selected-type button label override not needed (visual state via border) |

**Line heights:** Body/labels `1.4`. Single-line control elements (sliders, buttons) `1`. Panel header `1.2`.

---

## 3. Color

**Inherited from Phase 1 — palette tokens unchanged. Phase 4 extends usage.**

**60% — Dominant surfaces (unchanged):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-primary` | `#111113` | App background, canvas background |
| `--color-bg-secondary` | `#1a1a1e` | Panel background (unchanged) |
| `--color-bg-tertiary` | `#222226` | Type selector button resting background; slider track fill for inactive portion |

**30% — Chrome and borders (unchanged):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-border-primary` | `rgba(255,255,255,0.18)` | Active/selected type button border |
| `--color-border-secondary` | `rgba(255,255,255,0.10)` | Resting type button border; slider container |
| `--color-border-tertiary` | `rgba(255,255,255,0.06)` | Section dividers between control groups |

**Text (unchanged):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-text-primary` | `rgba(255,255,255,0.88)` | Panel header, section headings |
| `--color-text-secondary` | `rgba(255,255,255,0.55)` | Control group labels (Hue, Size, Anim Rate, etc.) |
| `--color-text-tertiary` | `rgba(255,255,255,0.35)` | Live readout values next to sliders |

**10% — Accent (unchanged token, extended use):**

| Token | Value | Reserved for |
|-------|-------|-------------|
| `--color-accent` | `#6366f1` | Cell selection highlight ring (Phase 3); selected type-selector button border/background tint (Phase 4) |

- **Selected type button:** border `1px solid var(--color-accent)`, background `rgba(99, 102, 241, 0.12)`.
- Accent is NOT used on slider thumbs or tracks — those use the shape's own HSL color dynamically.

**Semantic — Destructive (unchanged, carried from Phase 3):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-danger` | `#ef4444` | Remove Shape button — unchanged from Phase 3 |
| `--color-bg-danger` | `rgba(239,68,68,0.10)` | Remove Shape button hover — unchanged |

**Dynamic color (not CSS tokens — inline style):**

The HSV slider tracks use inline `style` attributes with CSS `linear-gradient` values computed from the current shape's `h`, `s`, `l`. These are not fixed design tokens; they are data-driven. See Section 7 (Slider Track Gradients).

---

## 4. Border Radius

**Inherited from Phase 1 — no changes.**

| Token | Value | Use in Phase 4 |
|-------|-------|----------------|
| `--radius-sm` | 4px | Type selector buttons; slider track ends; section dividers |
| `--radius-md` | 6px | Panel container |
| `--radius-lg` | 10px | Not used in Phase 4 |

---

## 5. Layout

**Unchanged from Phase 3.** The sidebar panel is still 240px fixed-width, `visibility: hidden` when no cell is selected. Phase 4 only changes the interior content of the panel's occupied-cell mode.

```
┌─────────────────────────────────────────────────────┐
│  Toolbar (min-height: 40px, spans full width)       │
├────────────────────────────────────┬────────────────┤
│                                    │                │
│  Canvas area (flex: 1)             │  Cell Panel    │
│  4x4 grid with pulsing shapes      │  (240px fixed) │
│                                    │  HSV sliders   │
│                                    │  Size slider   │
│                                    │  Type selector │
│                                    │  Anim rate     │
│                                    │  Remove Shape  │
└────────────────────────────────────┴────────────────┘
```

**Panel interior layout (occupied mode, Phase 4):**

```
cell-panel__body (flex column, gap: var(--space-4), padding: var(--space-4))
│
├── [Section] Color (label: "Color")
│     ├── Hue slider row        (0–360, gradient track)
│     ├── Saturation slider row (0–100, gradient track)
│     └── Lightness slider row  (0–100, gradient track)
│
├── [Divider]
│
├── [Section] Size
│     └── Size slider row       (0–100, default 50)
│
├── [Divider]
│
├── [Section] Shape
│     └── Type selector row     (6 buttons in a row)
│
├── [Divider]
│
├── [Section] Animation
│     └── Anim Rate slider row  (0.1–10 Hz, default 1.0)
│
├── [Divider]
│
└── [Button] Remove Shape
```

**Scroll:** Panel has `overflow-y: auto` (Phase 3 carried forward). At 240px width the content is approximately 380–420px tall — it will scroll on shorter viewports.

---

## 6. Canvas Rendering Contract

**Inherited from Phase 3 with two changes: animated shape size and blob shape support.**

### Shape Size Animation (new in Phase 4)

Each frame, `drawShapes()` computes `pulseScale` per shape using:

```
t_seconds = performance.now() / 1000
pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t_seconds)
radius = Math.floor(cellSize * 0.35 * (shape.size / 50) * pulseScale)
```

- `shape.size` default is `50` → at default, `shape.size / 50 = 1.0` (no change to current scale).
- `pulseScale` oscillates between `0.6` and `1.4` (±40% as per CONTEXT.md D-12).
- The dirty-flag is always set to `true` while any shape has `animRate > 0` (all shapes pulse). The RAF loop runs continuously (already the case in Phase 3).
- No additional canvas redraw mechanism is needed beyond the existing RAF loop — the canvas already redraws every frame when dirty.

### Blob Shape Drawing

The prototype (`shape_music_sequencer.html`) does not include a `blob` shape type. For Phase 4, blob is rendered as a circle with a sinusoidal radius variation:

```
// Blob: circle with 6 lobes, radius varies as r + 0.25r*sin(6θ)
// Drawn as a closed path with 60 line segments:
for i in 0..60:
  θ = (i / 60) * 2π
  r_lobe = radius * (1 + 0.25 * Math.sin(6 * θ))
  point = (cx + r_lobe * cos(θ), cy + r_lobe * sin(θ))
```

This gives a consistent organic shape without external dependencies. Claude's discretion per CONTEXT.md.

### Shape Type Drawing

All six shape types must be extractable into a standalone `drawShape(ctx, cx, cy, radius, type, color)` helper function. This function is called both by `canvasEngine.ts` (full canvas) and by type selector buttons (mini canvas previews). See Section 8 (Component Inventory) for the extraction plan.

Drawing code for each type (all drawn at `ctx.translate(cx, cy)` then reset):

| Type | Path |
|------|------|
| `circle` | `ctx.arc(0, 0, r, 0, 2π)` |
| `square` | `roundRect(-r, -r, r*2, r*2, r*0.15)` (slightly rounded) |
| `triangle` | moveTo(0,−r), lineTo(r·0.866, r·0.5), lineTo(−r·0.866, r·0.5), close |
| `diamond` | moveTo(0,−r), lineTo(r·0.6, 0), lineTo(0, r), lineTo(−r·0.6, 0), close |
| `star` | 5-point star, outerR=r, innerR=r·0.4, starting at −π/2 |
| `blob` | 60-point closed path, lobe radius `r·(1+0.25·sin(6θ))` |

Fill: `hsla(h, s%, l%, 0.85)`. Stroke: `hsl(h, s%, l%)` at `lineWidth: 1.5`.

---

## 7. Slider Track Gradients

Three HSV sliders use dynamically computed CSS `linear-gradient` on the `input[type=range]` track via `style` prop. All updates happen on `onInput` (React's `onChange` with `type=range` fires on every move).

### Hue Slider (0–360)

Track gradient: full rainbow, fixed (does not depend on s/l):

```css
linear-gradient(to right,
  hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
  hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
  hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
  hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
  hsl(360,100%,50%))
```

Applied via the `::-webkit-slider-runnable-track` pseudo-element or an inline `style` on a wrapping div. Implementation approach: use a `<div>` track layer behind the `<input type="range">` styled `appearance: none` with transparent track. See Section 9 (CSS Contract) for the slider anatomy.

### Saturation Slider (0–100)

Track gradient: grey at current hue/0% → vivid at current hue/100%. Recomputed when `h` or `l` changes:

```js
`linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
```

### Lightness Slider (0–100)

Track gradient: black at current hue+saturation → full color midpoint → white. Recomputed when `h` or `s` changes:

```js
`linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`
```

### Slider Thumb

The range input thumb is styled via `appearance: none` override:
- Size: `14px × 14px`
- Shape: circle
- Background: `white`
- Border: `1px solid rgba(0,0,0,0.4)` (subtle dark border for definition)
- No box-shadow at rest
- Focus: `box-shadow: 0 0 0 2px var(--color-accent)` (accessible focus ring)

---

## 8. Component Inventory

Phase 4 replaces the read-only property display in `CellPanel` and adds canvas animation logic.

### New

| Component | Type | File | Notes |
|-----------|------|------|-------|
| `drawShape` | Pure helper function | `src/engine/drawShape.ts` | Extracted from `canvasEngine.ts`; called by both canvas engine and mini canvas previews. Signature: `drawShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, type: ShapeType, color: ShapeColor): void` |
| `ShapeTypeSelector` | React component | `src/components/ShapeTypeSelector.tsx` | Row of 6 buttons, each containing a `<canvas>` mini preview. `Props: { currentType: ShapeType; shapeColor: ShapeColor; onChange: (type: ShapeType) => void }` |
| `HsvSliders` | React component | `src/components/HsvSliders.tsx` | Three gradient-track sliders for H, S, L. `Props: { color: ShapeColor; onChange: (color: ShapeColor) => void }` |

### Modified

| Component | Change |
|-----------|--------|
| `CellPanel.tsx` | Occupied mode replaces read-only prop rows with interactive controls: `HsvSliders`, size slider, `ShapeTypeSelector`, anim rate slider. Wires onChange handlers to store update actions. |
| `shapeStore.ts` | `Shape` interface gains `size: number` (default 50) and `animRate: number` (default 1.0). `ShapeState` gains update actions — single `updateShape(id, Partial<Shape>)` using Immer set pattern. |
| `canvasEngine.ts` | `drawShapes()` uses `drawShape` helper; computes `pulseScale` per shape from `performance.now()`. Dirty flag is always `true` while shapes are on canvas (animation runs continuously). |
| `audioEngine.ts` | `AudioVoice` interface gains `lfoOscillator: OscillatorNode` and `lfoGain: GainNode`. `createVoice` wires LFO. Two new exported functions: `updateVoiceColor(id, color)` and `updateVoiceSize(id, size)`. `animRate` change destroys + re-creates LFO oscillator only. |

---

## 9. CSS Contract

### New CSS Classes (Phase 4)

All added to `src/styles/index.css`.

**Section heading within panel:**

```css
.cell-panel__section-heading {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

**Control group (label row + input row):**

```css
.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.control-group__label-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  height: 20px;
}

.control-group__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-regular);
  color: var(--color-text-secondary);
}

.control-group__readout {
  font-size: var(--text-xs);
  font-weight: var(--weight-regular);
  color: var(--color-text-tertiary);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

**Slider anatomy (gradient track via wrapper):**

```css
.slider-wrap {
  position: relative;
  height: 16px;
  display: flex;
  align-items: center;
}

.slider-wrap__track {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: var(--radius-sm);
  pointer-events: none;
  /* background set via inline style (dynamic gradient) */
}

.slider-wrap input[type="range"] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 16px;
  background: transparent;
  position: relative;
  z-index: 1;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.slider-wrap input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.slider-wrap input[type="range"]:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--color-accent);
}

/* Firefox */
.slider-wrap input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
```

**Type selector row:**

```css
.type-selector {
  display: flex;
  flex-direction: row;
  gap: var(--space-1);
}

.type-selector__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-secondary);
  background: var(--color-bg-tertiary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.type-selector__btn:hover {
  border-color: var(--color-border-primary);
  background: rgba(255, 255, 255, 0.04);
}

.type-selector__btn--active {
  border-color: var(--color-accent);
  background: rgba(99, 102, 241, 0.12);
}

.type-selector__canvas {
  display: block;
  width: 32px;
  height: 32px;
}
```

---

## 10. Interaction Contract

### Control Update Events

All controls fire updates on `input` event (not `change`) for real-time feedback:
- React: use `onChange` on `<input type="range">` (React synthetic event equivalent to native `input`).
- Each update calls the store action (e.g., `shapeStore.getState().updateShape(id, { color: { ...color, h: newH } })`).
- The store subscription in `canvasEngine.ts` sets `dirty = true` → canvas redraws next frame.
- The store subscription in `audioEngine.ts` detects the change and calls `updateVoiceColor` or `updateVoiceSize`.

### Color Sliders

| Trigger | Result |
|---------|--------|
| Drag Hue slider | `color.h` updates 0–360. Saturation and Lightness track gradients recompute (h changed). Audio frequency updates via `updateVoiceColor`. |
| Drag Saturation slider | `color.s` updates 0–100. Saturation gradient updates (s changed). Lightness gradient recomputes (s changed). Audio reverb/distortion updates via `updateVoiceColor`. |
| Drag Lightness slider | `color.l` updates 0–100. Lightness gradient updates (l changed). Audio filter cutoff updates via `updateVoiceColor`. |

### Size Slider

| Trigger | Result |
|---------|--------|
| Drag Size slider (0–100) | `shape.size` updates. Canvas radius recalculates on next frame via `pulseScale` formula. Audio gain updates via `updateVoiceSize`. |

Readout format: `{value}%` — e.g., `50%`.

### Shape Type Selector

| Trigger | Result |
|---------|--------|
| Click type button | `shape.type` updates. Audio voice destroys + re-creates with new waveform (same ramp-out / ramp-in as removal/addition). Mini canvas previews all re-render with current shape color. New active button highlighted with accent border. |

- Type change causes audio voice destroy/recreate (not hot-swap) — brief silent gap during ramp transition (~60ms) is acceptable per CONTEXT.md D-08.
- Active button does NOT need a tooltip — shape type name is implied by the visual. Future enhancement, not Phase 4.

### Animation Rate Slider

| Trigger | Result |
|---------|--------|
| Drag Anim Rate slider (0.1–10 Hz) | `shape.animRate` updates. Canvas pulse speed changes immediately (reads `animRate` from store on next RAF frame). Audio LFO oscillator destroys + re-creates (per CONTEXT.md D-14). |

Readout format: `{value.toFixed(1)} Hz` — e.g., `1.0 Hz`.

### Remove Shape

**Unchanged from Phase 3.** No confirmation. Immediate audio voice destruction.

---

## 11. Copywriting Contract

### Panel Copy

| Location | Copy | Notes |
|----------|------|-------|
| Panel header | `Cell (col, row)` | Dynamic — unchanged from Phase 3 |
| Color section heading | `Color` | Uppercase via CSS `text-transform` |
| Hue label | `Hue` | Next to readout showing `220` (integer, no unit) |
| Saturation label | `Saturation` | Next to readout showing `70` (integer, no unit) |
| Lightness label | `Lightness` | Next to readout showing `50` (integer, no unit) |
| Size section heading | `Size` | |
| Size label | `Size` | Next to readout showing `50%` |
| Shape section heading | `Shape` | |
| Animation section heading | `Animation` | |
| Anim rate label | `Rate` | Next to readout showing `1.0 Hz` |
| Remove Shape button | `Remove Shape` | Unchanged from Phase 3 |
| Empty cell body | `This cell is empty.` | Unchanged from Phase 3 |
| Add Shape button | `+ Add Shape` | Unchanged from Phase 3 |

### Canvas Hint Text

No change from Phase 3: `"Click any cell to select it"`.

### Error States

No async operations in Phase 4. No error states needed.

### Destructive Action Confirmation

- **Remove Shape:** No confirmation dialog — identical to Phase 3 rationale (zundo undo already wired).
- **Type change:** Not treated as destructive. The audio voice briefly silences during ramp transition but the shape is not deleted.

---

## 12. Empty and Loading States

No loading states — all operations are synchronous.

**Panel empty state (no cell selected):** Panel is `visibility: hidden` — unchanged from Phase 3.

**Panel empty cell state:** Shows `"This cell is empty."` + `+ Add Shape` button — unchanged from Phase 3.

**Mini canvas preview before first paint:** Each `<canvas>` in the type selector renders its shape in a `useEffect` (after mount). There is no blank-flash risk because the `ShapeTypeSelector` only renders when a shape is selected and `shape.color` is known.

---

## 13. Accessibility

- All `<input type="range">` sliders have an associated `<label>` via `htmlFor`/`id` pairing.
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` are set on each range input (browser defaults for `type=range` cover this automatically; explicit aria attributes are belt-and-suspenders for screen readers).
- Slider `aria-label` pattern: `"Hue, 0 to 360"`, `"Saturation, 0 to 100"`, `"Lightness, 0 to 100"`, `"Size, 0 to 100"`, `"Animation rate, 0.1 to 10 Hz"`.
- Type selector buttons: each has `aria-label="{type} shape"` (e.g., `aria-label="circle shape"`) and `aria-pressed={currentType === type}`.
- Focus order within panel: Header → Hue slider → Saturation slider → Lightness slider → Size slider → type buttons (left to right) → Anim Rate slider → Remove Shape button.
- No new keyboard shortcuts introduced in Phase 4 beyond Phase 3 (Escape, Delete, Backspace).
- Canvas pulse animation: decorative, no ARIA `aria-live` needed. Audio feedback is the primary medium.

---

## 14. Animation

### Canvas Shape Pulse

- Each shape pulses in size using `performance.now()` — see Section 6.
- The canvas redraws continuously via the RAF loop (dirty flag stays `true` while any shape exists).
- This is a canvas-rendered animation, not CSS animation — no CSS `transition` or `animation` involved.
- No reduced-motion exemption needed at PoC scope (animation is core to the product).

### Panel Controls

No CSS transitions on the new controls. Instant state updates — consistent with Phase 3 approach.

---

## 15. Token Reference Sheet

**No new CSS custom property tokens introduced in Phase 4.** All Phase 4 controls use existing tokens from Phase 1. Dynamic slider track gradients use inline `style` computed at runtime, not static CSS tokens.

```css
/* Tokens activated or extended in Phase 4: */
--color-accent: #6366f1;         /* Selected type button highlight (new use) */
--color-bg-tertiary: #222226;    /* Type selector button resting background (new use) */
--color-border-secondary: rgba(255,255,255,0.10);  /* Type button resting border (new use) */
--color-border-primary: rgba(255,255,255,0.18);    /* Type button hover border (new use) */
```

Full token reference: `src/styles/index.css`.

---

## 16. Registry

**shadcn:** Not initialized (CLAUDE.md prohibits UI frameworks).
**Third-party component registries:** None.
**Safety gate:** Not applicable.

---

## 17. Pitfalls

**Pitfall 1 — Slider cross-browser rendering:** `input[type=range]` requires both `-webkit-slider-runnable-track` (Chrome/Safari) and `-moz-range-track` (Firefox) pseudo-elements for gradient track styling. Must declare both. The wrapper div approach (a `<div>` positioned behind the input to show the gradient) is a reliable fallback if pseudo-elements are too complex.

**Pitfall 2 — Mini canvas DPR:** The 32×32 mini canvas inside type buttons does NOT need DPR scaling for PoC. Set `canvas.width = 32; canvas.height = 32`. The canvas CSS size is also 32×32 via the `.type-selector__canvas` class. On Retina screens the mini previews will be slightly soft — acceptable for PoC.

**Pitfall 3 — AnimRate dirty flag:** The RAF loop uses `dirty = true` only when the store changes. With continuous animation, the shape store does NOT change on every frame — only when a user drags a slider. The `dirty` flag must be set every frame when any shape exists (animation requires continuous redraws). Implementation: in the RAF loop, check `shapeStore.getState().shapes.length > 0` and always set `dirty = true` in that case. Alternatively, remove the dirty-flag optimization for Phase 4 and always redraw.

**Pitfall 4 — Panel scroll on short viewports:** The occupied panel content (4 control groups + type selector + Remove Shape button) is ~400px at comfortable spacing. The 240px panel has `overflow-y: auto` from Phase 3 — this is sufficient. No changes needed.

**Pitfall 5 — Type change causes voice gap:** When the user clicks a different type button, the audio voice is destroyed and re-created (ramp-out ~60ms, ramp-in ~60ms). This is intentional and documented in CONTEXT.md D-08. Do not attempt to hot-swap the waveform.

---

## 18. Source Attribution

| Decision | Source |
|----------|--------|
| Three separate HSV sliders | CONTEXT.md D-01 |
| Gradient CSS track on each slider | CONTEXT.md D-02 |
| Real-time `input` event updates | CONTEXT.md D-03 |
| Size controls radius + gain simultaneously | CONTEXT.md D-04, D-05 |
| Size default value 50 | CONTEXT.md D-04 |
| Real-time size updates | CONTEXT.md D-06 |
| 6 type buttons with mini canvas previews | CONTEXT.md D-07 |
| Type change = voice destroy + recreate | CONTEXT.md D-08 |
| Web Audio LFO (native oscillator, not RAF) | CONTEXT.md D-09 |
| LFO depth fixed at ±40% | CONTEXT.md D-10 |
| Anim rate 0.1–10 Hz, default 1.0 Hz | CONTEXT.md D-11 |
| Canvas pulse via performance.now() | CONTEXT.md D-12 |
| updateVoiceColor / updateVoiceSize functions | CONTEXT.md D-13 |
| AnimRate change = LFO destroy + recreate | CONTEXT.md D-14 |
| Shape interface gains size + animRate | CONTEXT.md D-15 |
| Store update actions (Immer pattern) | CONTEXT.md D-16 |
| Blob drawn as lobed circle | Claude's discretion (CONTEXT.md) |
| Exact gradient stops for hue track | Claude's discretion (CONTEXT.md) |
| Mini canvas 32×32px | Claude's discretion (CONTEXT.md) — CONTEXT.md "Specifics" confirms ~32×32 |
| Type button 40×44px | Claude's discretion — 44px height for accessibility touch target |
| Section headings (Color, Size, Shape, Animation) | Claude's discretion (CONTEXT.md) |
| No CSS transitions on controls | PoC scope; consistent with Phase 3 pattern |
| Dirty-flag always-true when shapes exist | Phase 4 animation requirement; Claude's discretion |
| No UI framework | CLAUDE.md constraint |

---

*Phase: 04-shape-panel-animation*
*UI-SPEC drafted: 2026-04-16*
