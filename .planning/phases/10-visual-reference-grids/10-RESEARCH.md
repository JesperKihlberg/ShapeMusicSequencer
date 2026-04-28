# Phase 10: Visual Reference Grids — Research

**Researched:** 2026-04-28
**Domain:** Canvas 2D grid rendering, Zustand store extension, wheel event handling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Beat Indicator Lines (ANIM-12)**
- **D-01:** Beat lines draw behind the curve — drawn first in `drawLaneCanvas`, then curve polyline + control points on top, playhead last.
- **D-02:** Beat label style: 10px monospace, `rgba(255,255,255,0.45)`. Labels render at the top edge of the canvas.
- **D-03:** Ghost region beat labels dimmed to half the primary opacity — `rgba(255,255,255,0.22)`. Applied via `isGhostRegion` flag in options.
- **D-04:** Beat 0 / loop boundary: solid line at ~55% opacity (not dashed), vs ~35% dashed for regular integer beats.
- **D-05:** Sub-beat thresholds locked to spec values — half-beats shown when px-per-beat ≥ 40px; quarter-beat marks when px-per-beat ≥ 80px.

**Hue Scale Grid (ANIM-13)**
- **D-06:** Inverse hue-to-note mapping lives in a new file `src/engine/noteHue.ts` — pure exported function `noteIndexToHue(semitone: number): number`. No store import in `drawLaneCanvas`.
- **D-07:** Note name labels omitted entirely when lane is not focused (40–48px too small).
- **D-08:** Scale state passed as params to `drawLaneCanvas` — caller reads `scaleStore.getState()` and passes `rootKey` + `scale`. `drawLaneCanvas` stays pure.
- **D-09:** Note line opacity: Claude decides exact values — root note clearly brighter than non-root. Targets: root ~60%, non-root ~25–30%.
- **D-10:** Scale grid drawn in RAF loop as well as static redraws — RAF reads `scaleStore.getState()` each frame.

**Y-Axis Scroll/Zoom (ANIM-10)**
- **D-11:** Per-lane Y viewport state lives in `uiStore` — extend `UiState` with `yViewport: Partial<Record<AnimatableProperty, { min: number; max: number }>>`. Absent key = full range default.
- **D-12:** Default Y range: full property range — hue: [0, 360]; others: [0, 100]. No key in map = full range.
- **D-13:** Focusing a lane does NOT reset Y viewport — focus is about height only.
- **D-14:** Y-axis is a view, not an edit constraint — control points exist at stored values regardless of visible Y range.
- **D-15:** Hard clamp: yMin ≥ 0 and yMax ≤ fullMax. No rubber-band over-scroll.
- **D-16:** Scroll delta normalization: Claude decides exact strategy — smooth on both trackpad and mouse wheel.

**Draw Order & Integration**
- **D-17:** `drawLaneCanvas` extended with `options?: DrawOptions` at end:
  ```ts
  interface DrawOptions {
    yMin?: number
    yMax?: number
    isFocused?: boolean
    rootKey?: number
    scale?: ScaleName
    isGhostRegion?: boolean
  }
  function drawLaneCanvas(
    ctx, w, h, curve, property, selectedIdx,
    playheadBeat?, zoomBeats?, options?: DrawOptions
  ): void
  ```
  Non-breaking — all new params optional.
- **D-18:** Ghost passes use the same yMin/yMax as the primary region.
- **D-19:** RAF loop reads `uiStore.getState()` each frame for yMin/yMax per lane — consistent with zoomBeats pattern.
- **D-20:** Draw layer order within `drawLaneCanvas`:
  1. Background fill
  2. Hue scale grid lines (behind curve — horizontal)
  3. Beat indicator lines (behind curve — vertical)
  4. X-axis baseline dashed line (existing midpoint line)
  5. Curve polyline
  6. Control point circles
  7. Playhead line (always on top)

### Claude's Discretion

- Exact note line opacity percentages (root and non-root) — ensure root is clearly brighter than non-root.
- Scroll wheel delta normalization strategy — smooth on both trackpad and mouse.
- Whether to add a thin left-edge Y-axis ruler/indicator when Y-axis is zoomed (optional visual aid).
- Beat label position: render at very top of canvas or slightly below top edge — whichever avoids clipping.

### Deferred Ideas (OUT OF SCOPE)

- Optional Y-axis scrollbar/thumb indicator on right edge of lane (REQUIREMENTS.md optional item for ANIM-10).
- Zoom-to-cursor behavior for Ctrl+scroll — PoC uses midpoint zoom instead.
- Phase 11 reuse of `noteHue.ts` — no Phase 10 changes needed.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANIM-10 | Y-axis scroll/zoom per lane — plain wheel pans, Ctrl/Cmd+wheel zooms; hard-clamped to full property range; default = full range | D-11 to D-16 cover store shape and scroll handling; `onWheel` handler on canvas element; `uiStore.setYViewport(prop, {min, max})` writes new action |
| ANIM-12 | Beat indicator lines — integer beats dashed ~35% opacity with beat-number labels; sub-beat marks adaptive to pixel density; beat 0 solid ~55%; ghost region labels dimmed | D-01 to D-05 cover draw order and style values; `pxPerBeat = canvasWidth / zoomBeats` drives all thresholds |
| ANIM-13 | Hue scale grid — horizontal lines at scale note hue values; root brighter/thicker; note labels when focused; live on scale change | D-06 to D-10 cover `noteHue.ts` utility and params passing; `scaleStore.getState()` in RAF and static draw |
</phase_requirements>

---

## Summary

Phase 10 is a rendering-layer extension to the existing `AnimationPanel.tsx` canvas infrastructure. All three features (Y-axis viewport, beat grid, hue scale grid) are pure canvas drawing additions: no new React component trees, no audio engine changes, no new external dependencies. The architectural decisions are locked in CONTEXT.md with implementation-ready specificity.

The Y-axis viewport (ANIM-10) extends `uiStore` with a new `yViewport` map and adds a `setYViewport` action. The `AnimLane` component gains an `onWheel` handler that computes new yMin/yMax from the delta and writes it to the store. The `drawLaneCanvas` function then uses `yMin`/`yMax` from the options object to scale the Y-axis instead of the full `[minVal, maxVal]` range — a one-line change to the `toPixel` helper inside `drawLaneCanvas`.

The beat grid (ANIM-12) is a straightforward Canvas 2D drawing pass: compute `pxPerBeat = w / zoomBeats`, iterate integer beats 0..floor(zoomBeats), draw dashed lines with `ctx.setLineDash`, special-case beat 0 as a solid line, add sub-beat marks when pixel density allows. Labels are drawn with `ctx.fillText` using `10px monospace`. Ghost region dimming uses the `isGhostRegion` flag already designed into the `DrawOptions` interface.

The hue scale grid (ANIM-13) requires a new pure utility `src/engine/noteHue.ts` that inverts the `hue/360 * 12` mapping from `audioEngine.ts`. For each semitone in `SCALE_INTERVALS[scale]`, offset by rootKey mod 12, then compute `hue = ((semitone % 12) / 12) * 360`. The drawing pass iterates scale notes, converts each hue to a canvas Y pixel using the same `toPixel` math as the curve (but for value, not beat), and draws horizontal lines with `ctx.strokeStyle = \`hsl(${hue}, 100%, 60%)\``.

**Primary recommendation:** Implement in two plans. Wave 1: `noteHue.ts` + `uiStore` yViewport extension + `DrawOptions` interface + Y-axis viewport transform in `drawLaneCanvas` + `onWheel` handler. Wave 2: Beat grid rendering pass + hue scale grid rendering pass + ghost dimming integration.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Y viewport state | UI Store (uiStore.ts) | — | Pure UI preference; RAF loop reads via `getState()` — same pattern as `zoomBeats` |
| Y viewport write | AnimLane component (onWheel) | uiStore.setYViewport | Event handler on canvas element; computes new range, writes store |
| Beat grid drawing | drawLaneCanvas (canvas 2D) | AnimationPanel RAF caller | Pure draw function; beat grid is a rendering concern, not state |
| Hue scale grid drawing | drawLaneCanvas (canvas 2D) | noteHue.ts utility | Pure draw function; caller passes rootKey+scale from scaleStore |
| Note hue math | src/engine/noteHue.ts | — | Pure utility, no imports from React or stores; reusable by Phase 11 |
| Scale state reading | AnimationPanel RAF loop | AnimLane static draw effect | Both read `scaleStore.getState()` directly — same pattern as audioEngine.ts |
| Ghost region label dimming | drawLaneCanvas (isGhostRegion flag) | AnimationPanel RAF ghost pass | Flag propagated via DrawOptions; drawLaneCanvas halves label opacity when true |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | Browser native | All rendering — grid lines, labels, curves | Already used throughout; no external library |
| Zustand (vanilla) | 5.x (project-installed) | uiStore yViewport state | Existing store pattern; `createStore` used for RAF access outside React |
| React (hooks) | 18.x (project-installed) | onWheel handler wiring in AnimLane | Existing component infrastructure |

### Supporting

No new packages needed. All three features are implemented using the existing Canvas 2D API and project-installed Zustand.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas 2D manual grid | D3 axis / chart library | External library would conflict with existing raw canvas approach; over-engineered for grid lines |
| uiStore for yViewport | Local React state | Local state is inaccessible from RAF loop — ruled out in D-11 |
| noteHue.ts pure util | Inline in drawLaneCanvas | Inline would duplicate logic for Phase 11 snap; D-06 locks the new file approach |

**Installation:** No new packages required.

---

## Architecture Patterns

### System Architecture Diagram

```
WheelEvent (AnimLane canvas)
         │
         ▼
  onWheel handler (AnimLane)
  ├── compute new {min, max}
  ├── hard clamp to [0, fullMax]
  └── uiStore.setYViewport(prop, {min, max})
                   │
                   ▼
           uiStore.yViewport
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
  RAF tick (AnimationPanel)  AnimLane static draw useEffect
  reads uiStore.getState()   reads uiStore.getState()
  → passes options.yMin/yMax → passes options.yMin/yMax
         │                    │
         └─────────┬──────────┘
                   ▼
         drawLaneCanvas(ctx, w, h, curve, property,
           selectedIdx, playheadBeat, zoomBeats, options)
                   │
         Draw layers (in order):
         1. background fill
         2. hue scale grid (horizontal lines)  ← ANIM-13
         3. beat grid lines + labels           ← ANIM-12
         4. X-axis baseline dashed line
         5. curve polyline
         6. control point circles
         7. playhead line

scaleStore.getState() ──► rootKey, scale ──► noteHue.ts ──► hue values ──► step 2
uiStore.getState()    ──► zoomBeats       ──► pxPerBeat  ──► step 3
uiStore.getState()    ──► yViewport[prop] ──► yMin/yMax  ──► steps 2,3,5
```

### Recommended Project Structure

```
src/
├── engine/
│   ├── noteHue.ts        # NEW — pure hue-per-semitone utility (D-06)
│   ├── beatClock.ts      # existing — structural pattern for noteHue.ts
│   └── audioEngine.ts    # existing — hue-to-note formula to invert
├── store/
│   └── uiStore.ts        # EXTEND — add yViewport + setYViewport (D-11)
└── components/
    └── AnimationPanel.tsx  # EXTEND — drawLaneCanvas options, onWheel, RAF reads
```

### Pattern 1: Y-Axis Viewport Transform in drawLaneCanvas

**What:** Replace hard-coded `[minVal, maxVal]` with `options.yMin ?? minVal` and `options.yMax ?? maxVal` inside the `toPixel` helper.
**When to use:** Every draw call — the viewport defaults to full range when yViewport key is absent.

```typescript
// Source: [VERIFIED: codebase inspection — AnimationPanel.tsx line 379–385]
// Existing:
const [minVal, maxVal] = property === 'hue' ? [0, 360] : [0, 100]

// Phase 10 extension:
const [fullMin, fullMax] = property === 'hue' ? [0, 360] : [0, 100]
const yMin = options?.yMin ?? fullMin
const yMax = options?.yMax ?? fullMax

function toPixel(p: SplinePoint): [number, number] {
  const px = (p.beat / xDenominator) * w
  const py = ((yMax - p.value) / (yMax - yMin)) * h   // uses yMin/yMax instead of fullMin/fullMax
  return [px, py]
}
```

### Pattern 2: Beat Grid Drawing Pass

**What:** Compute `pxPerBeat`, iterate beats, draw dashed vertical lines; special-case beat 0 as solid; add sub-beat marks when pixel density allows; add labels.
**When to use:** Inside `drawLaneCanvas`, immediately after background fill, before curve drawing.

```typescript
// Source: [VERIFIED: codebase inspection + Canvas 2D API — ASSUMED for pixel math logic]
const pxPerBeat = w / (options?.zoomBeats ?? curve.duration)  // already available as w/xDenominator

// Integer beats
const beatCount = Math.ceil(zoomBeats)  // zoomBeats = xDenominator
for (let beat = 0; beat <= beatCount; beat++) {
  const x = (beat / xDenominator) * w
  if (beat === 0) {
    // Beat 0: solid line, ~55% opacity (D-04)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.setLineDash([])
  } else {
    // Integer beats: dashed, ~35% opacity (D-04)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.setLineDash([3, 3])
  }
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, h)
  ctx.stroke()
  ctx.setLineDash([])

  // Beat label (D-02, D-03)
  if (beat > 0 && pxPerBeat >= LABEL_MIN_PX) {  // collision guard
    const labelOpacity = options?.isGhostRegion ? 0.22 : 0.45
    ctx.fillStyle = `rgba(255,255,255,${labelOpacity})`
    ctx.font = '10px monospace'
    ctx.fillText(String(beat), x + 2, 10)
  }
}

// Sub-beat marks (D-05)
if (pxPerBeat >= 40) { /* draw half-beat marks at ~15% opacity, no labels */ }
if (pxPerBeat >= 80) { /* draw quarter-beat marks at ~10% opacity */ }
```

### Pattern 3: noteHue.ts Utility

**What:** Pure function that maps a semitone (0–11) offset + rootKey to a hue value (0–360).
**When to use:** Called inside `drawLaneCanvas` hue scale grid pass for the hue property only.

```typescript
// Source: [VERIFIED: codebase inspection — audioEngine.ts line 26]
// Inverse of: hueSemitone = (hClamped / 360) * 12
// i.e. hue = (semitone / 12) * 360

// src/engine/noteHue.ts
import { SCALE_INTERVALS, type ScaleName } from '../store/scaleStore'

/** Returns hue values (0–360) for each note in the given scale, ordered by ascending hue. */
export function scaleNoteHues(rootKey: number, scale: ScaleName): Array<{ hue: number; semitone: number; isRoot: boolean }> {
  return SCALE_INTERVALS[scale].map((interval) => {
    const semitone = (rootKey + interval) % 12
    const hue = (semitone / 12) * 360
    return { hue, semitone, isRoot: interval === 0 }
  })
}
```

### Pattern 4: onWheel Handler in AnimLane

**What:** Listen for wheel events on the canvas; pan on plain scroll, zoom on Ctrl/Cmd+scroll; write to uiStore.
**When to use:** Added to the `<canvas>` element in AnimLane's JSX.

```typescript
// Source: [VERIFIED: codebase inspection — AnimLane onPointerDown pattern]
// Note: React's onWheel is passive by default in modern React — use addEventListener
// with { passive: false } if preventDefault() is needed to stop page scroll.

function handleCanvasWheel(e: WheelEvent) {
  e.preventDefault()  // stop page scroll
  const [fullMin, fullMax] = getPropertyRange(property)
  const current = uiStore.getState().yViewport?.[property] ?? { min: fullMin, max: fullMax }
  const range = current.max - current.min

  if (e.ctrlKey || e.metaKey) {
    // Zoom: shrink or grow the visible range around midpoint
    const ZOOM_FACTOR = 0.1
    const delta = e.deltaY > 0 ? range * ZOOM_FACTOR : -range * ZOOM_FACTOR
    const mid = (current.min + current.max) / 2
    const newRange = Math.max(MIN_RANGE, Math.min(fullMax - fullMin, range + delta))
    const newMin = Math.max(fullMin, mid - newRange / 2)
    const newMax = Math.min(fullMax, mid + newRange / 2)
    uiStore.getState().setYViewport(property, { min: newMin, max: newMax })
  } else {
    // Pan: shift visible window
    const PAN_FRACTION = 0.1
    const panAmount = (e.deltaY / Math.abs(e.deltaY || 1)) * range * PAN_FRACTION
    const newMin = Math.max(fullMin, Math.min(fullMax - range, current.min + panAmount))
    uiStore.getState().setYViewport(property, { min: newMin, max: newMin + range })
  }
}
```

**Important:** React's synthetic `onWheel` prop cannot call `preventDefault()` (passive listener). Use a manual `addEventListener` in a `useEffect` with `{ passive: false }` to prevent the browser from scrolling the page while the user scrolls within the lane.

### Pattern 5: uiStore Extension

**What:** Add `yViewport` map and `setYViewport` action to `UiState`.
**When to use:** Extend existing `src/store/uiStore.ts` — same flat-setter pattern.

```typescript
// Source: [VERIFIED: codebase inspection — uiStore.ts]
export interface UiState {
  zoomBeats: number
  focusedLane: AnimatableProperty | null
  yViewport: Partial<Record<AnimatableProperty, { min: number; max: number }>>  // NEW
  setZoomBeats: (beats: number) => void
  setFocusedLane: (prop: AnimatableProperty | null) => void
  setYViewport: (prop: AnimatableProperty, viewport: { min: number; max: number }) => void  // NEW
}

// In createStore initializer:
yViewport: {},
setYViewport: (prop, viewport) => set((state) => ({
  yViewport: { ...state.yViewport, [prop]: viewport }
})),
```

### Anti-Patterns to Avoid

- **Passive wheel listener on canvas:** Using React's `onWheel` prop (passive) will make `preventDefault()` throw an error in Chrome. Must use a `useEffect` with `addEventListener(canvas, 'wheel', handler, { passive: false })`.
- **Hardcoding full range in toPixel:** When Y viewport is active, `toPixel` must use `yMin/yMax` not the full `[0, 360]` or `[0, 100]` range — otherwise zoomed-in Y viewport has no effect.
- **Drawing hue grid for non-hue properties:** Scale grid is only meaningful for the `hue` property lane. Guard with `if (property === 'hue' && options?.rootKey !== undefined)`.
- **Reading scaleStore inside drawLaneCanvas:** D-08 locks this as a caller responsibility. `drawLaneCanvas` must stay a pure function; caller passes `rootKey` and `scale` via `DrawOptions`.
- **Ghost passes with wrong width argument:** Ghost `drawLaneCanvas` calls pass `primaryWidthPx` (not `canvas.width`) as `w` — this is existing Phase 9 behavior that must be preserved when adding the options object.
- **Label collision at low zoom:** Always check `pxPerBeat >= LABEL_MIN_PX` before rendering beat labels. Missing this guard causes labels to overlap at zoom=64 (many beats, few pixels each).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Note name lookup | Custom note-name-to-semitone map | Use semitone index 0–11 with standard Western note names `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']` | 12-note chromatic scale is fixed; a simple array lookup at `noteNames[semitone]` is complete and correct |
| Wheel delta normalization | Custom smoothing/easing | Clamp `Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), MAX_DELTA)` | `deltaY` values vary wildly between trackpad (small floats) and mouse wheel (large integers, often ±100); clamping to a max delta normalizes the feel |
| Y-axis scrollbar | Custom scrollbar component | None needed (deferred per CONTEXT.md) | PoC scope; the optional thumb is deferred |
| Color rendering for hue lines | CSS color conversion | `hsl(${hue}, 100%, 60%)` string directly in `ctx.strokeStyle` | Canvas 2D API accepts CSS color strings including `hsl()`; no conversion library needed |

**Key insight:** This phase is entirely Canvas 2D API and state management. There are no algorithmic hard problems — the "tricky" parts are correct clamping logic and the passive/active wheel listener distinction.

---

## Common Pitfalls

### Pitfall 1: Passive Wheel Listener

**What goes wrong:** `e.preventDefault()` inside React's `onWheel` prop handler throws `Unable to preventDefault inside passive event listener` in Chrome 73+.
**Why it happens:** React 17+ makes all synthetic event handlers passive by default to improve scroll performance.
**How to avoid:** In `AnimLane`, use a `useEffect` to attach the wheel listener imperatively:
```typescript
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  canvas.addEventListener('wheel', handleCanvasWheel, { passive: false })
  return () => canvas.removeEventListener('wheel', handleCanvasWheel)
}, [property, curve])  // deps: anything handleCanvasWheel closes over
```
**Warning signs:** Console warning `[Intervention] Added non-passive event listener` or `Unable to preventDefault inside passive event listener`.

### Pitfall 2: Static Draw Missing yViewport

**What goes wrong:** Y-axis zoom works during playback (RAF reads uiStore) but resets visually when playback stops.
**Why it happens:** The static draw `useEffect` in `AnimLane` (line 485) reads `uiStore.getState().zoomBeats` but does NOT currently read `yViewport`. After Phase 10, the static draw must also read `yViewport` and pass it in options.
**How to avoid:** In `AnimLane`'s static draw `useEffect`, subscribe to `yViewport` via `useUiStore` so the effect re-runs when yViewport changes. Add `yViewport[property]` to the effect dependency array.
**Warning signs:** Y zoom appears to work during play but resets on stop.

### Pitfall 3: Ghost Pass Options Propagation

**What goes wrong:** Beat labels in ghost regions have full opacity instead of halved opacity.
**Why it happens:** Ghost passes call `drawLaneCanvas` without passing `options.isGhostRegion = true`.
**How to avoid:** In all three ghost pass sites (RAF loop full ghosts, RAF loop partial ghost, AnimLane static draw full ghosts, AnimLane static draw partial ghost), pass `{ ...options, isGhostRegion: true }` when calling `drawLaneCanvas` for ghost copies. There are 4 ghost call sites in the existing code — all must be updated.
**Warning signs:** Ghost region beat labels are as bright as primary region labels.

### Pitfall 4: Y-Axis Clamp Edge Cases

**What goes wrong:** After zooming in (narrow range), panning can push the window past [0, fullMax], making control points permanently inaccessible.
**Why it happens:** Pan calculation `current.min + panAmount` can exceed `fullMax - range` if delta is large.
**How to avoid:** Always clamp `newMin = Math.max(fullMin, Math.min(fullMax - range, current.min + panAmount))` and derive `newMax = newMin + range`. This preserves the range span while keeping the window within bounds.
**Warning signs:** Curve appears to disappear at the edges; control points can't be scrolled to.

### Pitfall 5: Hue Grid Drawn for Non-Hue Properties

**What goes wrong:** Horizontal lines appear on size/saturation/lightness lanes that don't correspond to any meaningful musical scale data.
**Why it happens:** Missing property guard in the hue scale grid drawing pass.
**How to avoid:** Guard with `if (property === 'hue' && options?.rootKey !== undefined && options?.scale !== undefined)` before drawing the hue scale grid.
**Warning signs:** Horizontal colored lines appear on non-hue lanes.

### Pitfall 6: Beat 0 at Ghost Boundary Drawn Twice

**What goes wrong:** At the boundary between the primary region and the first ghost, beat 0 of the ghost is drawn on top of the loop end of the primary, creating a double-thick line.
**Why it happens:** The ghost pass draws beat 0 (as a solid boundary line) at the ghost's origin, which coincides with the primary region's last beat.
**How to avoid:** In ghost passes, start the beat loop from `beat = 1` (skip beat 0) since beat 0 of each ghost is already visually covered by the loop boundary of the preceding region. Alternatively, only draw beat 0 as a special marker at the start of the entire canvas (primary region only).
**Warning signs:** Doubled/thicker line at the primary-to-ghost boundary.

---

## Code Examples

Verified patterns from official sources:

### Canvas 2D Dashed Line
```typescript
// Source: [VERIFIED: MDN Canvas 2D API — ctx.setLineDash]
ctx.setLineDash([3, 3])   // 3px dash, 3px gap
ctx.strokeStyle = 'rgba(255,255,255,0.35)'
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(x, 0)
ctx.lineTo(x, h)
ctx.stroke()
ctx.setLineDash([])  // always reset after use
```

### Canvas 2D Text at Top Edge
```typescript
// Source: [VERIFIED: MDN Canvas 2D API — ctx.fillText, ctx.font]
ctx.font = '10px monospace'
ctx.textBaseline = 'top'   // anchor to top of text, not baseline — avoids top-edge clipping
ctx.fillStyle = 'rgba(255,255,255,0.45)'
ctx.fillText('4', x + 2, 2)  // 2px inset from top edge
```

### Canvas 2D Hue-Colored Horizontal Line
```typescript
// Source: [VERIFIED: MDN Canvas 2D API — CSS color strings accepted in strokeStyle]
const hue = (semitone / 12) * 360
ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`  // 60% lightness for visibility on dark bg
ctx.lineWidth = isRoot ? 1.5 : 1
ctx.globalAlpha = isRoot ? 0.60 : 0.28
ctx.beginPath()
ctx.moveTo(0, y)
ctx.lineTo(w, y)
ctx.stroke()
ctx.globalAlpha = 1.0  // reset after each line
```

### Imperative Wheel Listener (passive: false)
```typescript
// Source: [VERIFIED: MDN EventTarget.addEventListener — passive option]
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const handler = (e: WheelEvent) => {
    e.preventDefault()
    // ... compute new yViewport ...
  }
  canvas.addEventListener('wheel', handler, { passive: false })
  return () => canvas.removeEventListener('wheel', handler)
}, [/* deps */])
```

### uiStore.yViewport Read in RAF Loop
```typescript
// Source: [VERIFIED: codebase inspection — AnimationPanel.tsx line 77 (zoomBeats pattern)]
// In tick():
const { zoomBeats: currentZoom, yViewport } = uiStore.getState()
const yVp = yViewport[prop] ?? { min: fullMin, max: fullMax }
drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedPointsRef.current[prop] ?? null,
  beat, currentZoom, { yMin: yVp.min, yMax: yVp.max, ... })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| drawLaneCanvas positional params only | options object for new optional params | Phase 10 (D-17) | Backward-compatible; no existing callers break |
| Y-axis hardcoded to full range | Per-lane yViewport in uiStore | Phase 10 (D-11) | Absent key = full range; no migration needed |
| No beat grid | Beat grid drawn in drawLaneCanvas pass 3 | Phase 10 (D-01, D-20) | All existing callers get beat grid for free via options param |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pxPerBeat >= LABEL_MIN_PX` threshold can be set to ~20px to prevent label overlap (choosing a concrete value) | Beat Grid Pattern | Labels may still collide at extreme zoom; tune at implementation time |
| A2 | `MIN_RANGE` for Y zoom (minimum visible span) should be ~10 for non-hue (10% of range) and ~36 for hue (1 semitone width) | onWheel Pattern | If too small, zoomed view is unusable; tune at implementation time |
| A3 | Wheel delta normalization: `Math.sign(deltaY) * Math.min(Math.abs(deltaY), 50)` cap at 50 will feel smooth on both trackpad and mouse | Scroll Normalization | May still feel too fast/slow; exact value is Claude's discretion per D-16 |

**All critical architectural claims (passive wheel listener, ctx.setLineDash reset, uiStore pattern) are VERIFIED by codebase inspection or MDN. The three ASSUMED items above are tunable constants, not structural decisions.**

---

## Open Questions

1. **Beat label collision threshold (`LABEL_MIN_PX`)**
   - What we know: labels must not overlap; at zoom=64 with a 400px canvas, pxPerBeat ≈ 6px — labels would certainly collide.
   - What's unclear: the exact pixel threshold at which a 2-digit label (e.g. "16") at 10px monospace starts to collide.
   - Recommendation: Use 16px as initial threshold (a 2-digit label at 10px monospace is approximately 12px wide + 4px gap). Adjust if visual testing shows collisions.

2. **useEffect dependency array for the wheel handler**
   - What we know: the handler closes over `property`, `curve`, and `getPropertyRange`.
   - What's unclear: whether stale closure on `curve` causes subtle bugs (e.g., old `curve.duration` used for clamping).
   - Recommendation: Include `property` in deps; use `uiStore.getState()` inside the handler (not closed-over state) to avoid stale reads.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 10 is code-only (Canvas 2D API, Zustand store, React hooks). No external tools, CLIs, or services required beyond the project's existing Node.js/npm/Vitest infrastructure.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (project-installed) |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run src/engine/noteHue.test.ts src/store/uiStore.test.ts` |
| Full suite command | `npx vitest run` |

### Current Test Status

2 pre-existing failures in `src/components/CellPanel.test.tsx` (unrelated to Phase 10 — Phase 4 CellPanel animation rate selector UI tests). 192 tests pass. Phase 10 must not break any currently-passing tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-10 | `setYViewport` stores per-lane viewport | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ Wave 0 — needs new test cases |
| ANIM-10 | Absent yViewport key returns full range | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ Wave 0 |
| ANIM-10 | Hard clamp: yMin ≥ 0, yMax ≤ fullMax | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ Wave 0 |
| ANIM-12 | pxPerBeat formula: w / zoomBeats | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ Wave 0 (formula test, no DOM) |
| ANIM-13 | `scaleNoteHues(0, 'major')` returns 7 notes | unit | `npx vitest run src/engine/noteHue.test.ts` | ❌ Wave 0 |
| ANIM-13 | Root note has `isRoot: true` | unit | `npx vitest run src/engine/noteHue.test.ts` | ❌ Wave 0 |
| ANIM-13 | `scaleNoteHues(0, 'major')` hue for C = 0° | unit | `npx vitest run src/engine/noteHue.test.ts` | ❌ Wave 0 |
| ANIM-13 | hue for rootKey=6 (F#) interval=0 = (6/12)*360 = 180° | unit | `npx vitest run src/engine/noteHue.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/engine/noteHue.test.ts src/store/uiStore.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (ignoring the 2 pre-existing CellPanel failures) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/engine/noteHue.test.ts` — covers ANIM-13 note hue math (new file)
- [ ] New test cases in `src/store/uiStore.test.ts` — covers ANIM-10 yViewport state shape, setYViewport action, default absent-key behavior

*(Existing `src/store/uiStore.test.ts` covers zoomBeats and focusedLane but not yViewport — extend, don't replace.)*

---

## Security Domain

Security enforcement is not applicable to this phase. Phase 10 consists entirely of Canvas 2D rendering additions and Zustand state extensions. There are no inputs from external services, no authentication flows, no storage of user data beyond in-memory browser state, and no network operations.

---

## Sources

### Primary (HIGH confidence)

- `[VERIFIED: codebase inspection]` — `src/components/AnimationPanel.tsx` lines 354–431 (drawLaneCanvas current signature and body)
- `[VERIFIED: codebase inspection]` — `src/store/uiStore.ts` (UiState interface, createStore pattern)
- `[VERIFIED: codebase inspection]` — `src/store/scaleStore.ts` (SCALE_INTERVALS, ScaleName, rootKey)
- `[VERIFIED: codebase inspection]` — `src/engine/beatClock.ts` (structural pattern for noteHue.ts)
- `[VERIFIED: codebase inspection]` — `src/engine/audioEngine.ts` line 26 (`hueSemitone = (hClamped / 360) * 12` — the formula noteHue.ts inverts)
- `[VERIFIED: codebase inspection]` — `vite.config.ts` (Vitest config: jsdom, globals, setupFiles)
- `[VERIFIED: codebase inspection]` — `src/store/uiStore.test.ts` (existing test structure and patterns to extend)
- `[VERIFIED: test run]` — `npx vitest run` result: 192 pass, 2 fail (pre-existing CellPanel failures, unrelated to Phase 10)

### Secondary (MEDIUM confidence)

- `[CITED: MDN Web Docs — CanvasRenderingContext2D.setLineDash]` — dashed line API
- `[CITED: MDN Web Docs — CanvasRenderingContext2D.fillText]` — text rendering
- `[CITED: MDN Web Docs — EventTarget.addEventListener `passive` option]` — passive wheel listener fix

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing libraries verified in codebase
- Architecture: HIGH — all decisions locked in CONTEXT.md; verified against live codebase
- Pitfalls: HIGH (passive wheel: MDN verified) / MEDIUM (beat 0 ghost double-line: reasoning from known canvas 2D behavior)
- Test patterns: HIGH — existing test files inspected and confirmed runnable

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable tech stack; all decisions locked)
