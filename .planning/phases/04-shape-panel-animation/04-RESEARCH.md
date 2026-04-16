# Phase 4: Shape Panel & Animation - Research

**Researched:** 2026-04-16
**Domain:** React + Web Audio API (LFO modulation, real-time AudioParam automation, CSS gradient range sliders, canvas shape rendering)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Three separate range sliders: Hue (0–360), Saturation (0–100), Lightness (0–100). Maps directly to `ShapeColor { h, s, l }`.
- **D-02:** Each slider has a gradient CSS track: Hue = full rainbow, Saturation = grey→vivid at current hue, Lightness = dark→light at current hue+saturation.
- **D-03:** Color changes fire on every `input` event. Audio updates immediately without voice destroy/recreate. Audio engine must expose `updateVoice(shapeId, shape)`.
- **D-04:** `size: number` (0–100) added to `Shape` interface, default 50.
- **D-05:** `size` controls both canvas radius multiplier and audio base gain simultaneously.
- **D-06:** Size slider updates are real-time (`input` event).
- **D-07:** Type selector: 6 compact buttons in a row, each with a mini 32×32 canvas preview. Active type highlighted.
- **D-08:** Type change calls `shapeStore.getState().updateShapeType(id, newType)`. Audio engine destroys + re-creates voice with ramp-out/ramp-in. No hot-swap.
- **D-09:** LFO runs as a native Web Audio graph: second `OscillatorNode` (sine, frequency = `animRate`) connects to `gainNode.gain` AudioParam. Runs in audio thread entirely.
- **D-10:** LFO modulation depth fixed at ±40% of base gain. No depth slider. A `ConstantSourceNode` provides DC offset or equivalent approach.
- **D-11:** Animation rate range 0.1–10 Hz, default 1.0 Hz. Stored as `animRate: number` on `Shape`.
- **D-12:** Canvas visual pulse: `pulseScale = 1 + 0.4 * sin(2π * animRate * t_seconds)` using `performance.now()`. Mirror of LFO frequency, no cross-thread communication.
- **D-13:** Two new exported audio functions: `updateVoiceColor(shapeId, color)` and `updateVoiceSize(shapeId, size)`. Use `.setTargetAtTime()` / `.setValueAtTime()` for glitch-free updates.
- **D-14:** `animRate` change destroys + re-creates the LFO oscillator only (not the whole voice).
- **D-15:** `Shape` interface gains `size: number` (0–100, default 50) and `animRate: number` (0.1–10, default 1.0).
- **D-16:** `ShapeState` gains update actions — single `updateShape(id, Partial<Shape>)` using Immer set pattern preferred (or individual actions).

### Claude's Discretion

- Exact gain topology for LFO + DC offset (ConstantSourceNode vs simple gain math)
- Precise radius multiplier formula mapping `size` 0–100 to canvas radius
- Gradient track CSS implementation (SVG gradient vs CSS `linear-gradient` on wrapper div)
- Panel layout within existing sidebar (ordering of sections, spacing)
- Mini canvas button size (exact px), shape drawing scale, highlight style for selected type
- Exact `.setTargetAtTime()` time constants for real-time color/size updates

### Deferred Ideas (OUT OF SCOPE)

- LFO depth slider (ANIM-04) — v2
- BPM-synced animation rate — Phase 5 or later
- Rotation/bounce animation modes (ANIM-02, ANIM-03) — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PANL-01 | Shape edit panel exposes HSV color picker (hue=pitch, saturation=reverb/distortion, value=filter) | HSV slider component with gradient tracks; real-time `input` event → `updateVoiceColor()` |
| PANL-02 | Shape edit panel exposes size slider (controls base amplitude/loudness) | Size slider with radius multiplier formula; real-time `input` event → `updateVoiceSize()` |
| PANL-03 | Shape edit panel exposes animation rate slider (controls LFO speed) | AnimRate slider 0.1–10 Hz; LFO destroy+recreate on change |
| ANIM-01 | Shape size oscillates at a configurable rate (amplitude LFO modulation) | Native Web Audio OscillatorNode LFO wired to `gainNode.gain`; canvas `pulseScale` formula |
</phase_requirements>

---

## Summary

Phase 4 is a well-defined extension of the existing codebase. All major architectural decisions are locked in CONTEXT.md and confirmed by the actual code already written in Phases 1–3. The project uses React 19 + TypeScript + Web Audio API (no Tone.js) + Zustand vanilla store + Immer. No new npm dependencies are needed.

The four work areas are: (1) `shapeStore` extension with `size` and `animRate` fields plus a new `updateShape` action, (2) `audioEngine` extension with two new update functions and an LFO node per voice, (3) `canvasEngine` extension with the `drawShape` helper extraction and `pulseScale` formula, and (4) `CellPanel` replacement of read-only props with three new React components (`HsvSliders`, `ShapeTypeSelector`, and sliders for size/animRate).

The two technically interesting areas are the Web Audio LFO topology (exactly how the LFO OscillatorNode connects to the `gainNode.gain` AudioParam alongside the base gain value) and the CSS range-input gradient track approach (the wrapper-div approach is cross-browser reliable). All existing patterns (Immer mutation, `setTargetAtTime` ramp, voice lifecycle, `useShapeStore` hook) are already established and just need to be extended.

**Primary recommendation:** Follow the component decomposition in UI-SPEC Section 8 exactly. Extract `drawShape` first (it's needed by both canvas engine and mini previews), extend the store second, extend the audio engine third, then build the React panel components. This ordering minimizes merge conflicts and keeps each plan independently testable.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | Component rendering, `useRef` for mini canvas | Already installed [VERIFIED: package.json] |
| zustand | 5.0.12 | Vanilla store for shape/selection state | Already installed, all patterns established [VERIFIED: package.json] |
| immer | 11.1.4 | Immutable mutations in store actions | Already installed, `zustand/middleware/immer` in use [VERIFIED: shapeStore.ts] |
| Web Audio API | browser native | OscillatorNode LFO, AudioParam automation | Already the audio stack; no new dependency needed [VERIFIED: audioEngine.ts] |
| vitest | 4.1.4 | Test framework | Already installed, inline config in vite.config.ts [VERIFIED: package.json] |
| @testing-library/react | 16.3.2 | React component testing | Already installed [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zundo | 2.3.0 | Temporal undo/redo middleware | Already wrapping shapeStore; new `updateShape` action participates automatically [VERIFIED: package.json] |
| @testing-library/user-event | 14.6.1 | Simulate slider drag in tests | Already installed; needed for range input interaction tests [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Web Audio LFO OscillatorNode | requestAnimationFrame tick updating gain | RAF approach uses JS thread; native audio graph runs in audio thread — sample-accurate and zero RAF overhead (CONTEXT.md D-09 already locked) |
| CSS wrapper-div gradient track | `::-webkit-slider-runnable-track` pseudo-element | Pseudo-element approach requires both `-webkit-` and `-moz-` variants; wrapper-div is cross-browser without pseudo-element juggling (UI-SPEC Pitfall 1) |
| Single `updateShape(id, Partial<Shape>)` store action | Individual `updateShapeColor`, `updateShapeSize`, `updateShapeAnimRate` | Single action is simpler, fewer functions, equally Immer-compatible; CONTEXT.md D-16 allows either |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

Phase 4 adds three new files and modifies four existing files:

```
src/
├── engine/
│   ├── drawShape.ts          # NEW: extracted drawShape helper (used by canvas + mini previews)
│   ├── canvasEngine.ts       # MODIFIED: import drawShape, add pulseScale formula
│   └── audioEngine.ts        # MODIFIED: AudioVoice gains lfoOscillator/lfoGain; new export functions
├── components/
│   ├── HsvSliders.tsx         # NEW: three gradient-track range sliders
│   ├── ShapeTypeSelector.tsx  # NEW: 6 mini-canvas type buttons
│   └── CellPanel.tsx          # MODIFIED: occupied mode replaced with interactive controls
└── store/
    └── shapeStore.ts          # MODIFIED: Shape gains size+animRate; store gains updateShape action
```

### Pattern 1: Web Audio LFO Topology

**What:** Connect a second `OscillatorNode` (the LFO) directly to the `gainNode.gain` AudioParam. The base gain (DC offset) is set as the initial `gainNode.gain` value; the LFO oscillator swings around it. The `gainNode.gain` AudioParam accumulates both the constant offset and the LFO oscillation additively when you use `.value` + `.connect()`.

**When to use:** Amplitude modulation where an oscillator modulates another node's parameter in real time, running entirely in the audio thread.

**The exact topology (Claude's discretion area — D-10):**

The simplest correct approach is the GainNode-as-LFO-gain approach:

```typescript
// Source: Web Audio API spec + audioEngine.ts existing patterns [ASSUMED - training knowledge, cross-verified with spec]
// Inside createVoice(), after gainNode is created:

const ctx = getAudioContext()!

// Base gain (DC offset): size/100 * 0.8 gives max amplitude; LFO swings ±50% of this
const baseGain = (shape.size / 100) * 0.8  // e.g., size=50 → baseGain=0.4

// LFO oscillator — second oscillator, NOT connected to destination
const lfoOscillator = ctx.createOscillator()
lfoOscillator.type = 'sine'
lfoOscillator.frequency.value = shape.animRate  // 0.1–10 Hz

// LFO gain — scales the LFO output to ±40% of baseGain
const lfoGain = ctx.createGain()
lfoGain.gain.value = baseGain * 0.4  // LFO swing amplitude

// gainNode.gain is NOT set to a static value — instead use setValueAtTime for DC offset
// The AudioParam supports multiple inputs: the constant value PLUS connected node outputs
gainNode.gain.value = 0  // reset
// ConstantSourceNode approach for DC offset:
const dcOffset = ctx.createConstantSource()
dcOffset.offset.value = baseGain  // DC level = base amplitude
dcOffset.connect(gainNode.gain)   // additive contribution
lfoOscillator.connect(lfoGain)
lfoGain.connect(gainNode.gain)    // additive: base + LFO swing
dcOffset.start()
lfoOscillator.start()

// Store in voice
voices.set(shape.id, { ..., lfoOscillator, lfoGain, dcOffset })
```

**Why ConstantSourceNode for DC offset:** When an AudioParam has `.connect()` calls, any `.value` set on it is treated as an additional source input — the final value is `param.value + sum(connected_node_outputs)`. Setting `gainNode.gain.value = baseGain` and then connecting the LFO works, BUT `setTargetAtTime` writes ALSO target the `.value` base. Using `ConstantSourceNode` for the DC offset keeps `gainNode.gain.value = 0` and separates the base gain into its own automatable source — cleaner for `updateVoiceSize`. [ASSUMED: training knowledge of Web Audio API spec behavior]

**Alternative simpler topology (also correct):** Set `gainNode.gain.value = baseGain` (no ConstantSourceNode), connect LFO through `lfoGain` to `gainNode.gain`. Updating size just changes `gainNode.gain.value` via `setValueAtTime`. This is slightly less clean but simpler. The ConstantSourceNode approach is preferred because `updateVoiceSize` can use `dcOffset.offset.setTargetAtTime(newBase, ...)` without competing with the LFO automation.

### Pattern 2: AudioParam Real-Time Update (No Glitch)

**What:** Update a live voice's audio parameters without stopping it.

**When to use:** Color change (frequency, filter, distortion) and size change (gain) — D-13.

```typescript
// Source: audioEngine.ts existing patterns + Web Audio API spec [VERIFIED: audioEngine.ts line 260-261]
// Time constant τ: how fast the parameter reaches new value (4τ ≈ 98% of new value)
// Use τ=0.015 (15ms) for smooth color/gain updates — matches existing voice removal pattern
export function updateVoiceColor(shapeId: string, color: ShapeColor): void {
  const voice = voices.get(shapeId)
  const ctx = getAudioContext()
  if (!voice || !ctx) return
  const freq = colorToFrequency(color)
  const cutoff = lightnessToFilterCutoff(color.l)
  // Frequency update — setTargetAtTime for smooth glide
  if (voice.oscillator instanceof OscillatorNode) {
    voice.oscillator.frequency.setTargetAtTime(freq, ctx.currentTime, 0.015)
  }
  // Filter cutoff update
  voice.filter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.015)
  // Distortion curve — WaveShaper.curve cannot be automated via AudioParam,
  // must be set directly. Use setValueCurveAtTime or direct assignment.
  voice.waveshaper.curve = makeDistortionCurve(color.s)  // direct assignment, acceptable
}

export function updateVoiceSize(shapeId: string, size: number): void {
  const voice = voices.get(shapeId)
  const ctx = getAudioContext()
  if (!voice || !ctx) return
  const newBase = (size / 100) * 0.8
  // Update ConstantSourceNode offset if present, otherwise gainNode.gain
  if (voice.dcOffset) {
    voice.dcOffset.offset.setTargetAtTime(newBase, ctx.currentTime, 0.015)
  } else {
    voice.gainNode.gain.setTargetAtTime(newBase, ctx.currentTime, 0.015)
  }
  // Update lfoGain to maintain ±40% of new base
  if (voice.lfoGain) {
    voice.lfoGain.gain.setTargetAtTime(newBase * 0.4, ctx.currentTime, 0.015)
  }
}
```

**Key insight:** `WaveShaperNode.curve` is NOT an AudioParam — it cannot be smoothed via scheduling. Direct assignment is the correct approach. This causes no glitch in practice because distortion curves change harmonic density continuously. [ASSUMED: training knowledge of Web Audio API]

### Pattern 3: Immer Store Extension with `updateShape`

**What:** Add `size` and `animRate` fields to `Shape`, add `updateShape(id, Partial<Shape>)` action.

**When to use:** All shape property updates from the panel — color, size, type, animRate.

```typescript
// Source: shapeStore.ts existing pattern [VERIFIED: shapeStore.ts lines 33-60]
// New updateShape action — Immer compatible
updateShape: (id: string, patch: Partial<Shape>) =>
  set((state) => {
    const shape = state.shapes.find((s) => s.id === id)
    if (shape) {
      Object.assign(shape, patch)  // Immer draft accepts Object.assign mutation
    }
  }),

// Updated addShape defaults:
state.shapes.push({
  id: crypto.randomUUID(),
  col,
  row,
  color: { h: 220, s: 70, l: 30 },
  type: 'circle',
  size: 50,      // NEW D-15
  animRate: 1.0, // NEW D-15
})
```

### Pattern 4: Mini Canvas Preview with `useRef` + `useEffect`

**What:** Each `ShapeTypeSelector` button renders a `<canvas>` element at 32×32px. The `drawShape` helper draws the shape after mount.

**When to use:** Type selector buttons — renders same shape drawing code as canvas engine.

```typescript
// Source: React useRef + useEffect pattern [VERIFIED: CanvasContainer.tsx lines 13-26]
// ShapeTypeSelector button internal pattern:
function TypeButton({ type, color, isActive, onClick }: TypeButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 32
    canvas.height = 32  // No DPR scaling (UI-SPEC Pitfall 2)
    ctx.clearRect(0, 0, 32, 32)
    drawShape(ctx, 16, 16, 12, type, color)  // center at (16,16), radius 12
  }, [type, color])  // redraw when color or type changes

  return (
    <button
      className={`type-selector__btn${isActive ? ' type-selector__btn--active' : ''}`}
      onClick={() => onClick(type)}
      aria-label={`${type} shape`}
      aria-pressed={isActive}
    >
      <canvas ref={canvasRef} className="type-selector__canvas" />
    </button>
  )
}
```

**Pitfall:** `useEffect` with `[type, color]` dependency — `color` is an object so it must be compared by value. Pass `color.h`, `color.s`, `color.l` as separate dependencies OR use the canonical `JSON.stringify(color)` trick OR pass as a color string. Passing `color` directly as a dep will NOT re-render unless the reference changes (which it does on each Zustand state update since Immer creates new objects). Verified: Immer always creates new object references on mutation, so `color` as a dep will work correctly here. [ASSUMED: Immer object identity behavior — consistent with training knowledge]

### Pattern 5: LFO AnimRate Change (Destroy + Recreate LFO Only)

**What:** When `animRate` changes, stop and disconnect the old LFO oscillator and gain, create new ones with the new frequency, reconnect.

**When to use:** D-14 — animRate change detected in the audio engine's store subscription.

```typescript
// Source: audioEngine.ts existing ramp patterns [VERIFIED: audioEngine.ts lines 253-277]
function recreateLfo(shapeId: string, animRate: number): void {
  const voice = voices.get(shapeId)
  const ctx = getAudioContext()
  if (!voice || !ctx) return

  // Stop old LFO
  try { voice.lfoOscillator?.stop() } catch { /* already stopped */ }
  voice.lfoGain?.disconnect()
  voice.lfoOscillator?.disconnect()

  // Create new LFO with updated rate
  const baseGain = voice.dcOffset
    ? voice.dcOffset.offset.value
    : voice.gainNode.gain.value
  const newLfoOsc = ctx.createOscillator()
  newLfoOsc.type = 'sine'
  newLfoOsc.frequency.value = animRate
  const newLfoGain = ctx.createGain()
  newLfoGain.gain.value = baseGain * 0.4

  newLfoOsc.connect(newLfoGain)
  newLfoGain.connect(voice.gainNode.gain)
  newLfoOsc.start()

  voice.lfoOscillator = newLfoOsc
  voice.lfoGain = newLfoGain
}
```

### Pattern 6: Canvas `drawShape` Helper Extraction

**What:** Extract all six shape-drawing cases from `canvasEngine.ts drawShapes()` into a standalone pure function.

**When to use:** Called by `canvasEngine.ts drawShapes()` (main canvas) and by `ShapeTypeSelector` mini canvas previews.

```typescript
// Source: canvasEngine.ts drawShapes() + UI-SPEC Section 6 [VERIFIED: canvasEngine.ts lines 112-133]
// File: src/engine/drawShape.ts
export function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  type: ShapeType,
  color: ShapeColor,
): void {
  const cssColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`
  ctx.beginPath()
  switch (type) {
    case 'circle':
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      break
    case 'square':
      ctx.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, radius * 0.15)
      break
    case 'triangle': {
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * 0.866, cy + radius * 0.5)
      ctx.lineTo(cx - radius * 0.866, cy + radius * 0.5)
      ctx.closePath()
      break
    }
    case 'diamond':
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * 0.6, cy)
      ctx.lineTo(cx, cy + radius)
      ctx.lineTo(cx - radius * 0.6, cy)
      ctx.closePath()
      break
    case 'star': {
      const outerR = radius
      const innerR = radius * 0.4
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? outerR : innerR
        if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
        else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      }
      ctx.closePath()
      break
    }
    case 'blob': {
      // 60-point lobe path: r * (1 + 0.25 * sin(6θ)) [VERIFIED: UI-SPEC Section 6]
      for (let i = 0; i <= 60; i++) {
        const theta = (i / 60) * Math.PI * 2
        const rLobe = radius * (1 + 0.25 * Math.sin(6 * theta))
        const x = cx + rLobe * Math.cos(theta)
        const y = cy + rLobe * Math.sin(theta)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
  }
  ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.85)`
  ctx.fill()
  ctx.strokeStyle = cssColor
  ctx.lineWidth = 1.5
  ctx.stroke()
}
```

### Pattern 7: Canvas Engine pulseScale Integration

**What:** Modify `drawShapes()` in `canvasEngine.ts` to compute `pulseScale` per shape and pass it to `drawShape`. Set `dirty = true` always when shapes exist.

**When to use:** Every RAF frame while shapes are on canvas.

```typescript
// Source: UI-SPEC Section 6 + CONTEXT.md D-12 [VERIFIED: 04-UI-SPEC.md lines 188-199]
function drawShapes(shapes: Shape[], logicalW: number, logicalH: number): void {
  const cellSize = Math.floor(Math.min(logicalW, logicalH) / 4)
  const gridPx = cellSize * 4
  const offsetX = Math.floor((logicalW - gridPx) / 2)
  const offsetY = Math.floor((logicalH - gridPx) / 2)
  const t = performance.now() / 1000
  for (const shape of shapes) {
    const cx = offsetX + shape.col * cellSize + Math.floor(cellSize / 2)
    const cy = offsetY + shape.row * cellSize + Math.floor(cellSize / 2)
    const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t)
    const radius = Math.floor(cellSize * 0.35 * (shape.size / 50) * pulseScale)
    drawShape(ctx!, cx, cy, radius, shape.type, shape.color)
  }
}
```

The dirty flag loop must set `dirty = true` on every frame when shapes exist — replace the store-subscription-only dirty flag with:

```typescript
// In the RAF loop render() function, before checking dirty:
if (shapeStore.getState().shapes.length > 0) dirty = true
// [VERIFIED: UI-SPEC Pitfall 3]
```

### Pattern 8: Audio Engine Change Detection in Store Subscription

**What:** The audio engine's `shapeStore.subscribe()` callback must now detect color, size, and animRate changes in addition to add/remove.

**When to use:** Real-time slider updates from the panel need to trigger `updateVoiceColor` or `updateVoiceSize`.

```typescript
// Source: audioEngine.ts initAudioEngine pattern [VERIFIED: audioEngine.ts lines 238-278]
// Extend existing subscription to track previous state for change detection
let prevShapes = new Map<string, Shape>()  // track previous shape values

const unsubscribe = shapeStore.subscribe((state) => {
  const curr = state.shapes
  const currIds = new Set(curr.map((s) => s.id))

  // Detect additions (existing)
  for (const shape of curr) {
    if (!voices.has(shape.id)) {
      createVoice(shape)
      prevShapes.set(shape.id, shape)
    }
  }

  // Detect property changes on existing voices
  for (const shape of curr) {
    const prev = prevShapes.get(shape.id)
    if (prev && voices.has(shape.id)) {
      // Color changed
      if (shape.color.h !== prev.color.h ||
          shape.color.s !== prev.color.s ||
          shape.color.l !== prev.color.l) {
        updateVoiceColor(shape.id, shape.color)
      }
      // Size changed
      if (shape.size !== prev.size) {
        updateVoiceSize(shape.id, shape.size)
      }
      // animRate changed — destroy + recreate LFO
      if (shape.animRate !== prev.animRate) {
        recreateLfo(shape.id, shape.animRate)
      }
      // Type changed — voice already destroyed by removeVoice before this fires
      // (type change calls removeShape + addShape, handled by add/remove detection)
      prevShapes.set(shape.id, shape)
    }
  }

  // Detect removals (existing)
  for (const id of prevShapes.keys()) {
    if (!currIds.has(id)) {
      // ... existing ramp-out code
      prevShapes.delete(id)
    }
  }
})
```

**Note on type change:** Per D-08, type change uses `updateShapeType` which triggers voice destroy + recreate via the add/remove detection path. The subscription sees a shape removed (old id) then added (same id but new type). This is the same lifecycle as Phase 3 remove/add. [ASSUMED: based on how updateShape with type change would work vs the stated destroy+recreate requirement — the planner needs to decide whether updateShapeType replaces the shape id or mutates in-place with the audio engine detecting type mismatch]

**Critical question for planner:** `updateShapeType` in the CONTEXT.md D-08 says the audio engine "detects this as a voice property change and destroys + re-creates the voice." This can be implemented two ways:
1. `updateShapeType` mutates `shape.type` in place; the audio engine's change detection sees `shape.type !== prev.type` and calls `destroyVoice` + `createVoice`.
2. The store action removes and re-adds the shape (keeping same id, different type). This is more disruptive.

Option 1 is cleaner — add type-change detection to the subscription callback. The voice destroyed and recreated uses ramp-out/ramp-in (~60ms gap, acceptable per D-08).

### Anti-Patterns to Avoid

- **Direct `gainNode.gain.value =` assignment during LFO:** Once an AudioParam has connected sources (LFO), the `.value` property is overridden by the summed connected sources. Use `setValueAtTime` on the `dcOffset.offset` AudioParam, not `gainNode.gain.value`, to change base gain while LFO is running. [ASSUMED: Web Audio API spec behavior]
- **`ctx.scale()` accumulation:** Canvas engine already uses `ctx.setTransform()` not `ctx.scale()` — preserve this in the modified `drawShapes()`. [VERIFIED: canvasEngine.ts line 168]
- **DPR on mini canvas:** Mini 32×32 canvases do NOT need DPR scaling (PoC acceptable softness). Set `canvas.width = 32; canvas.height = 32` directly. [VERIFIED: UI-SPEC Pitfall 2]
- **`useEffect` with object dependency that never changes reference:** Immer creates new object references on every mutation — `color` as a `useEffect` dep in `TypeButton` will trigger correctly. [ASSUMED: Immer behavior]
- **`input[type=range]` `onChange` vs `onInput`:** React's `onChange` on range inputs fires on every mouse move (equivalent to native `input` event). Do NOT use `onMouseUp` or `onBlur` — those only fire at drag end. [ASSUMED: React synthetic event behavior, consistent with training knowledge]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LFO amplitude modulation | Manual RAF gain updates | `OscillatorNode.connect(gainNode.gain)` | Runs in audio thread — sample-accurate, zero JS overhead |
| Smooth audio parameter transitions | Abrupt `.value =` assignments | `.setTargetAtTime(value, time, tau)` | Eliminates click artifacts at parameter changes |
| Shape drawing code (6 types) | Duplicate code in each component | `drawShape()` helper in `src/engine/drawShape.ts` | Shared by canvas engine and mini preview buttons — single source of truth |
| CSS gradient track for range input | Custom slider component | CSS `linear-gradient` on wrapper div + `input` with `appearance: none` | No external dependency needed; cross-browser with webkit + moz pseudo-elements [VERIFIED: UI-SPEC Section 9] |
| Immutable state updates | Manual array clone/spread | Immer mutation inside `set((state) => {...})` | Already established pattern in shapeStore; Immer handles structural sharing |

**Key insight:** The Web Audio API's AudioParam graph scheduling is the entire point of the LFO architecture. Never fight it with a manual RAF loop when the audio graph can do it natively.

---

## Common Pitfalls

### Pitfall 1: AudioParam Value Override When Connected

**What goes wrong:** Developer sets `gainNode.gain.value = 0.4` then connects the LFO oscillator. The `gain.value` becomes the *initial* value before connected sources are summed — once the LFO oscillator connects, the effective gain = `0.4 + lfoOutput`, not `lfoOutput` modulating around `0.4`.

**Why it happens:** Web Audio API AudioParam with connections sums all inputs (both the `.value` and all connected nodes). The `.value` is a constant source added additively to connected node outputs.

**How to avoid:** Use `ConstantSourceNode` for the DC offset (set `gainNode.gain.value = 0`, connect both `dcOffset` and `lfoGain` to `gainNode.gain`). Then `updateVoiceSize` updates `dcOffset.offset.value` without interfering with the LFO connection. [ASSUMED: Web Audio API spec]

**Warning signs:** Volume never reaches zero (DC offset leaks), or volume doubles when LFO is at +peak.

### Pitfall 2: WaveShaper Curve Replacement Mid-Voice

**What goes wrong:** Assigning `voice.waveshaper.curve = newCurve` while the node is processing causes a brief discontinuity in Firefox (Safari is tolerant). The new curve takes effect on the next render quantum (~5.3ms at 192 sample block).

**Why it happens:** `WaveShaperNode.curve` is not an AudioParam — no smooth scheduling.

**How to avoid:** Accept the micro-discontinuity (~5ms); it is inaudible in practice for continuous-drone use cases. [ASSUMED: known Web Audio behavior]

**Warning signs:** Audible "zip" sound when dragging the saturation slider rapidly in Firefox.

### Pitfall 3: AnimRate LFO OscillatorNode Cannot Change Frequency After Start

**What goes wrong:** Attempting to set `lfoOscillator.frequency.value = newRate` on a running oscillator. The frequency AudioParam CAN be changed — `setValueAtTime` works fine for frequency. The CONTEXT.md D-14 decision says destroy+recreate "for simplicity" to avoid reconnection complexity.

**Why it happens:** CONTEXT.md explicitly chose destroy+recreate over frequency hot-swap (D-14). Both are technically valid.

**How to avoid:** Always destroy + recreate the LFO oscillator on animRate change. Stop old LFO oscillator, disconnect `lfoGain`, create new oscillator with new frequency, reconnect. [VERIFIED: CONTEXT.md D-14]

**Warning signs:** If hot-swapping frequency instead of recreating — would work but creates inconsistency with D-14.

### Pitfall 4: RAF Loop Dirty Flag Missing Continuous Animation

**What goes wrong:** The RAF loop's `dirty` flag is only set by store subscriptions. When no user interaction happens, `dirty` stays `false` and the canvas freezes — shapes stop pulsing.

**Why it happens:** `pulseScale` uses `performance.now()` which changes every frame, but the store doesn't change every frame.

**How to avoid:** In the RAF loop's `render()` function, always set `dirty = true` when `shapeStore.getState().shapes.length > 0`. [VERIFIED: UI-SPEC Pitfall 3]

**Warning signs:** Shapes animate only while dragging a slider; freeze as soon as the user stops interacting.

### Pitfall 5: `useEffect` Dep Array for Mini Canvas Color

**What goes wrong:** `useEffect(() => { drawShape(ctx, ...) }, [color])` — if the parent component passes the same `color` object reference (e.g., memoized incorrectly), the canvas never redraws when color changes.

**Why it happens:** `useEffect` uses `Object.is` comparison for deps. Same reference = skip.

**How to avoid:** Zustand + Immer always creates new object references on mutation, so `shape.color` is a new object on every `updateShape` call. The `color` dep works correctly as long as `CellPanel` reads from `useShapeStore`. [ASSUMED: Immer + Zustand reference behavior]

**Warning signs:** Slider changes color in panel but mini canvas buttons don't update their fill color.

### Pitfall 6: `ConstantSourceNode` Must Be Started

**What goes wrong:** `dcOffset.connect(gainNode.gain)` but forgetting to call `dcOffset.start()`. The node is connected but outputs silence (0).

**Why it happens:** `ConstantSourceNode` is an AudioScheduledSourceNode — it must be explicitly started.

**How to avoid:** Always call `dcOffset.start()` after connecting. [ASSUMED: Web Audio API AudioScheduledSourceNode requirement]

### Pitfall 7: `roundRect` Browser Compatibility

**What goes wrong:** `ctx.roundRect()` is used in the `square` shape drawing case. It was added to Canvas 2D API in Chrome 99 / Firefox 112 / Safari 15.4 (2022–2023). On older browsers this throws.

**Why it happens:** `roundRect` is a newer Canvas 2D API method.

**How to avoid:** For PoC, this is acceptable — all current evergreen browsers support it. Fallback: replace with manual `moveTo/arcTo` for older browser support if needed. [ASSUMED: caniuse.com data, training knowledge]

**Warning signs:** Console error "ctx.roundRect is not a function" on older Safari.

### Pitfall 8: `updateShape` and Zundo Temporal History

**What goes wrong:** Calling `updateShape` on every slider mouse-move creates hundreds of undo history entries — pressing Undo only reverts one character of slider movement.

**Why it happens:** Zundo captures every `set()` call as a temporal snapshot.

**How to avoid:** Use `shapeStore.temporal.pause()` / `.resume()` around slider drag start/end to batch the temporal history. Alternatively, `zundo` supports debouncing via the `handleSet` option. For PoC, the behavior (many undo states) may be acceptable. [ASSUMED: Zundo API, consistent with training knowledge of zundo 2.x]

**Warning signs:** Undo removes slider changes one step at a time instead of one drag gesture at a time.

---

## Code Examples

### CSS Slider Wrapper Pattern (Cross-Browser Gradient Track)

```css
/* Source: UI-SPEC Section 9 [VERIFIED: 04-UI-SPEC.md lines 358-413] */
.slider-wrap {
  position: relative;
  height: 16px;
  display: flex;
  align-items: center;
}

.slider-wrap__track {
  position: absolute;
  left: 0; right: 0;
  height: 4px;
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
  margin: 0; padding: 0;
}

.slider-wrap input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.slider-wrap input[type="range"]::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
```

React usage with dynamic gradient:

```tsx
// Source: UI-SPEC Section 7 [VERIFIED: 04-UI-SPEC.md lines 239-269]
function HueSlider({ h, onChange }: { h: number; onChange: (h: number) => void }) {
  const hueGradient = `linear-gradient(to right,
    hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
    hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
    hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
    hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
    hsl(360,100%,50%))`
  return (
    <div className="slider-wrap">
      <div className="slider-wrap__track" style={{ background: hueGradient }} />
      <input
        type="range" min={0} max={360} value={h}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Hue, 0 to 360"
      />
    </div>
  )
}
```

### `HsvSliders` Component Pattern

```tsx
// Source: CONTEXT.md D-01, D-02, D-03 + UI-SPEC Section 7 [VERIFIED: 04-CONTEXT.md D-01]
import type { ShapeColor } from '../store/shapeStore'

interface HsvSlidersProps {
  color: ShapeColor
  onChange: (color: ShapeColor) => void
}

export function HsvSliders({ color, onChange }: HsvSlidersProps) {
  const { h, s, l } = color
  const satGradient = `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
  const lightGradient = `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`
  const hueGradient = `linear-gradient(to right,
    hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
    hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
    hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
    hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
    hsl(360,100%,50%))`

  return (
    <>
      {/* Hue row */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-hue">Hue</label>
          <span className="control-group__readout">{h}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: hueGradient }} />
          <input id="slider-hue" type="range" min={0} max={360} value={h}
            onChange={(e) => onChange({ ...color, h: Number(e.target.value) })}
            aria-label="Hue, 0 to 360" />
        </div>
      </div>
      {/* Saturation row */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-sat">Saturation</label>
          <span className="control-group__readout">{s}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: satGradient }} />
          <input id="slider-sat" type="range" min={0} max={100} value={s}
            onChange={(e) => onChange({ ...color, s: Number(e.target.value) })}
            aria-label="Saturation, 0 to 100" />
        </div>
      </div>
      {/* Lightness row */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-light">Lightness</label>
          <span className="control-group__readout">{l}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: lightGradient }} />
          <input id="slider-light" type="range" min={0} max={100} value={l}
            onChange={(e) => onChange({ ...color, l: Number(e.target.value) })}
            aria-label="Lightness, 0 to 100" />
        </div>
      </div>
    </>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Shape.color` as CSS string `'hsl(220, 70%, 60%)'` | `ShapeColor { h, s, l }` struct | Phase 2 (D-06) | Sliders can bind directly to h/s/l without parsing |
| Read-only prop display in CellPanel | Interactive controls (sliders, type buttons) | This phase (Phase 4) | Full per-shape editing from the panel |
| `drawShapes()` hardcoded circle only | `drawShape()` helper for all 6 types | This phase | Mini canvas previews possible; all shape types render |
| Static shape radius `Math.floor(size * 0.35)` | Animated `pulseScale` formula using `performance.now()` | This phase | Visual pulse mirrors LFO audio modulation |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gainNode.gain.value` acts as additive constant source when AudioParams are connected — ConstantSourceNode needed for cleanly automatable DC offset | Pattern 1 (LFO Topology), Pitfall 1 | Wrong gain topology — audio LFO doesn't modulate correctly. Mitigated: both approaches (with/without CSN) work; CSN is just cleaner |
| A2 | `WaveShaperNode.curve` direct assignment causes ~5ms discontinuity in Firefox, inaudible for drones | Pitfall 2 | Audible artifact in Firefox on saturation changes; mitigation: accept for PoC |
| A3 | Immer always creates new object references on mutation — `color` reference changes on every `updateShape` call | Pattern 4, Pitfall 5 | Mini canvas deps don't trigger re-draw; mitigation: use `color.h, color.s, color.l` as separate `useEffect` deps if needed |
| A4 | `ConstantSourceNode.start()` must be called explicitly | Pitfall 6 | Silent audio (gain = 0); easy to diagnose |
| A5 | `ctx.roundRect()` is supported in all current evergreen browsers (2022+) | Pattern 6 | Square shape rendering breaks on old Safari; mitigation: PoC scope acceptable |
| A6 | Zundo captures every `set()` call — rapid slider changes create many undo entries | Pitfall 8 | Noisy undo history; mitigation: PoC scope acceptable |
| A7 | React `onChange` on `<input type="range">` fires on every mouse-move (equivalent to native `input`) | Pattern code examples | Sliders not real-time; mitigation: easily verified in browser |
| A8 | Type change detection in audio engine uses `shape.type !== prev.type` detection and calls destroyVoice + createVoice | Pattern 8 | Type changes don't update audio; open question below |

---

## Open Questions

1. **Type change detection strategy**
   - What we know: D-08 says audio engine "detects this as a voice property change and destroys + re-creates the voice." D-16 says `updateShapeType(id, type)` is a new store action.
   - What's unclear: Does `updateShapeType` mutate `shape.type` in-place (audio engine detects via `type !== prev.type`) or does it remove+re-add the shape? The former is simpler and avoids changing the shape ID.
   - Recommendation: Implement `updateShapeType` as an Immer mutation of `shape.type` in-place (no ID change). Audio engine subscription detects `type !== prev.type` and calls `destroyVoice(id)` then `createVoice(newShape)`. This is the cleanest path.

2. **Zundo undo history granularity for sliders**
   - What we know: Zundo captures every `set()` call. Real-time slider drags will create many history entries.
   - What's unclear: Is this acceptable for PoC, or should slider commits be debounced / batched?
   - Recommendation: Accept many undo entries for PoC (consistent with phase scope). The planner can note this as a known limitation.

3. **AudioVoice `dcOffset` field presence for pre-existing voices**
   - What we know: `createVoice` in Phase 3 does NOT add `lfoOscillator`, `lfoGain`, or `dcOffset`. Phase 4 must add them.
   - What's unclear: When the audio engine is updated in Phase 4, existing voices in the `voices` Map (created before Phase 4) will not have LFO fields. But since `initAudioEngine` is called fresh on mount, all voices are created with the new `createVoice` — no migration needed.
   - Recommendation: No migration needed. `destroy()` clears all voices; `initAudioEngine()` recreates from scratch. All new voices use the Phase 4 `createVoice`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server | Yes | v22.19.0 | — |
| npm | Package install | Yes | 11.7.0 | — |
| Vitest | Test runner | Yes | 4.1.4 (inline config) | — |
| jsdom | Test environment | Yes | 29.0.2 | — |
| Web Audio API | Audio engine | Browser (not jsdom) | Native | Tests stub AudioContext; engine guards with `if (!ctx) return` |
| Canvas 2D API | drawShape helper | Browser + jsdom stub | Native | vitest.setup.ts already stubs `getContext` |

**Missing dependencies with no fallback:** None — all required tools available.

**Note on jsdom Canvas stub:** `vitest.setup.ts` stubs `getContext` with a mock CanvasRenderingContext2D. The stub does NOT include `roundRect`. Tests for `drawShape.ts` that invoke `roundRect` will need to add `roundRect: () => {}` to the mock. [VERIFIED: vitest.setup.ts]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (inline `test:` key) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` (all 6 test files, currently 60 tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PANL-01 | `HsvSliders` renders three sliders, `onChange` fires with correct `ShapeColor` values | unit | `npm run test -- --reporter=verbose` | No — Wave 0: `src/components/HsvSliders.test.tsx` |
| PANL-01 | `shapeStore.updateShape` updates `color` and Immer creates new reference | unit | `npm run test` | No — extend `src/store/shapeStore.test.ts` |
| PANL-02 | `size` slider fires store `updateShape({size})` with correct value | unit | `npm run test` | No — extend `src/components/CellPanel.test.tsx` |
| PANL-03 | `animRate` slider fires store `updateShape({animRate})` with correct value | unit | `npm run test` | No — extend `src/components/CellPanel.test.tsx` |
| ANIM-01 | `drawShape` helper renders all 6 shape types without throwing | unit | `npm run test` | No — Wave 0: `src/engine/drawShape.test.ts` |
| ANIM-01 | `pulseScale` formula correctness: `1 + 0.4 * sin(2π * rate * t)` within expected range | unit | `npm run test` | No — can add to `drawShape.test.ts` |
| PANL-01 + PANL-02 + PANL-03 | `CellPanel` occupied mode renders all 4 control sections | unit | `npm run test` | Partial — `CellPanel.test.tsx` needs new test cases for Phase 4 controls |
| ANIM-01 | `updateVoiceColor` / `updateVoiceSize` pure function behavior | unit | `npm run test` | Partial — extend `audioEngine.test.ts` |

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test` (full suite, currently < 2 seconds)
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/engine/drawShape.test.ts` — covers `drawShape` for all 6 types (at minimum: no-throw test per type, using jsdom canvas stub)
- [ ] `src/components/HsvSliders.test.tsx` — covers PANL-01 slider rendering and onChange
- [ ] `src/components/ShapeTypeSelector.test.tsx` — covers type button rendering and onClick
- [ ] Update `vitest.setup.ts` — add `roundRect: () => {}` to canvas mock (needed for `square` shape drawing)
- [ ] Extend `src/store/shapeStore.test.ts` — covers `updateShape` action, `size` and `animRate` defaults
- [ ] Extend `src/components/CellPanel.test.tsx` — covers Phase 4 occupied mode controls (update test that checks `'Type'` / `'Hue'` read-only labels — those will be replaced)
- [ ] Extend `src/engine/audioEngine.test.ts` — covers `updateVoiceColor` and `updateVoiceSize` (pure logic; AudioContext still stubs to null in jsdom)

---

## Security Domain

Security enforcement is not applicable to this phase. Phase 4 is a client-only UI/audio feature with no input validation beyond type-safe slider clamping, no authentication, no server communication, and no user-provided code execution. All state lives in-browser.

---

## Sources

### Primary (HIGH confidence)

- `src/engine/audioEngine.ts` — Verified existing voice lifecycle, signal chain topology, ramp patterns
- `src/store/shapeStore.ts` — Verified Immer/Zustand patterns, Shape interface, addShape defaults
- `src/engine/canvasEngine.ts` — Verified dirty-flag RAF loop, drawShapes, DPR handling
- `src/components/CellPanel.tsx` — Verified existing panel structure and store wiring
- `.planning/phases/04-shape-panel-animation/04-CONTEXT.md` — Locked decisions D-01 through D-16
- `.planning/phases/04-shape-panel-animation/04-UI-SPEC.md` — CSS contract, component inventory, interaction contract
- `vitest.setup.ts` — Verified jsdom canvas mock (missing `roundRect`)
- `package.json` — Verified all dependency versions

### Secondary (MEDIUM confidence)

- `04-UI-SPEC.md Section 9` — CSS slider anatomy with wrapper-div gradient approach (cross-browser rationale)

### Tertiary (LOW confidence — marked ASSUMED in text)

- Web Audio API AudioParam additive behavior when `ConstantSourceNode` + OscillatorNode both connect to same param
- `WaveShaperNode.curve` direct assignment discontinuity in Firefox
- Immer object reference creation on every `set()` mutation

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified in package.json; no new dependencies needed
- Architecture patterns: HIGH for React/Zustand/Immer (verified in codebase); MEDIUM for Web Audio LFO topology (training knowledge, not tested in jsdom)
- Pitfalls: MEDIUM — most are well-known Web Audio API behaviors; some are ASSUMED from training

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable stack, no fast-moving dependencies)
