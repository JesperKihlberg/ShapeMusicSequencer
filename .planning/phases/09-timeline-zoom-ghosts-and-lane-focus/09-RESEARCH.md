# Phase 9: Timeline Zoom, Ghosts, and Lane Focus — Research

**Researched:** 2026-04-27
**Domain:** React canvas rendering, Zustand store patterns, CSS class-based layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create `src/store/uiStore.ts` (Zustand + Immer) to hold all pure UI state.
- **D-02:** Initial shape of `uiStore`: `{ zoomBeats: 4, focusedLane: null as AnimatableProperty | null, setZoomBeats, setFocusedLane }`.
- **D-03:** Both `zoomBeats` and `focusedLane` live in `uiStore` — pure UI state with no audio/curve data dependency.
- **D-04:** Zoom control is a row of 7 segmented buttons: `1 2 4 8 16 32 64` in the animation panel header.
- **D-05:** Zoom control position: left of the existing "+ Add Curve" button.
- **D-06:** Active zoom value gets a visual active state matching existing button style conventions. Clicking calls `uiStore.setZoomBeats(value)`.
- **D-07:** `drawLaneCanvas` gains optional `zoomBeats?: number` parameter — X-axis spans `zoomBeats` beats when provided (`toPixel` maps `beat / zoomBeats` rather than `beat / curve.duration`).
- **D-08:** Ghost rendering is handled in the RAF loop (and stopped-state draw), NOT inside `drawLaneCanvas`. Caller is responsible for ghost passes.
- **D-09:** Ghost pass approach: `repeatCount = Math.floor(zoomBeats / curve.duration) - 1`; per ghost: `ctx.save()`, `ctx.globalAlpha = 0.30`, clip to ghost region, translate, call `drawLaneCanvas(ctx, ghostWidthPx, h, curve, property, null, undefined)`, `ctx.restore()`.
- **D-10:** Ghost regions are non-interactive: canvas hit-test in `AnimLane` ignores events where `pixelX > primaryRegionWidth`.
- **D-11:** `focusedLane` lives in `uiStore`. `AnimLane` reads it via `useUiStore`.
- **D-12:** Lane height implemented via CSS classes: `.anim-lane--focused` → `height: 160px`, `.anim-lane--compressed` → `height: 44px`.
- **D-13:** Clicking `.anim-lane__label-col` calls `uiStore.setFocusedLane(prop)` — if `prop === focusedLane`, sets `null`; otherwise sets `prop`.
- **D-14:** On first load no lane is focused (`focusedLane: null`). No transition animation.

### Claude's Discretion

- Partial ghost at right edge: render a clipped partial copy (natural fallout of clip approach).
- Whether to add a thin separator line between primary region and first ghost: decide at implementation — keep if it aids readability, skip if it adds visual noise.
- Ghost clicks fall through to the primary canvas interaction — acceptable for PoC.

### Deferred Ideas (OUT OF SCOPE)

- Y-axis scroll/zoom (ANIM-10) — Phase 10.
- Beat indicator lines (ANIM-12) — Phase 10.
- Hue scale grid (ANIM-13) — Phase 10.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANIM-08 | User can control how many beats are visible across all lanes simultaneously via a zoom control in the animation panel header (range 1–64, default 4, common values: 1, 2, 4, 8, 16, 32, 64) | D-04 to D-07 cover implementation; uiStore holds state; `drawLaneCanvas` extended with `zoomBeats?` parameter |
| ANIM-09 | When a lane's curve duration is shorter than the global timeline zoom width, the curve is repeated as ghost copies (30% opacity, same stroke color, no fill) to fill the remaining viewport; ghost regions are non-interactive | D-08 to D-10 cover the canvas rendering; `ctx.globalAlpha = 0.30` + clip + translate pattern is standard Canvas 2D API; pointer exclusion via `primaryRegionWidth` check |
| ANIM-11 | Clicking the label column of a lane toggles focus — focused lane snaps to 160px, unfocused lanes snap to 44px; only one lane focused; clicking focused lane collapses it; no transition animation; no lane focused on first load | D-11 to D-14 cover CSS class approach; ResizeObserver auto-triggers canvas resize on height change; uiStore holds single `focusedLane` value |
</phase_requirements>

---

## Summary

Phase 9 is a well-specified, self-contained extension to the existing `AnimationPanel.tsx` and its `AnimLane` subcomponent. All architectural decisions have been locked in CONTEXT.md by the user and confirmed by an approved UI-SPEC. The research task is primarily to verify the implementation patterns against the live codebase rather than to explore alternatives.

The phase requires three coordinated additions: (1) a new Zustand vanilla store (`uiStore.ts`) for pure UI state, (2) modifications to `drawLaneCanvas` to support zoom-scaled X-axis rendering and the ghost pass rendering loop in the RAF tick, and (3) CSS class-based lane height toggling driven by a label-column click handler. All patterns exist in adjacent code — the store follows `playbackStore.ts` exactly, the canvas patterns use standard Canvas 2D API (`ctx.save/restore`, `ctx.globalAlpha`, `ctx.rect` clip, `ctx.translate`), and the CSS approach mirrors the existing `.beat-selector__btn--active` pattern.

One pre-existing issue was observed during codebase inspection: the RAF loop in `AnimationPanel.tsx` line 78 references `selectedPoints` before it is declared (line 131). This is a scoping issue where the `useEffect` closure captures a stale reference. The planner should note this as a risk area — the ghost-pass work will touch the RAF loop and provides a natural opportunity to verify `selectedPoints` is read from a ref (not from component state captured at effect time).

**Primary recommendation:** Split into two plans — Wave 1: `uiStore.ts` creation + `drawLaneCanvas` X-axis extension + zoom control UI; Wave 2: ghost rendering in RAF loop + lane focus CSS classes + label-column interaction.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| zoomBeats state | UI Store (uiStore.ts) | — | Pure UI preference, no audio/curve data dependency |
| focusedLane state | UI Store (uiStore.ts) | — | Pure UI preference, one lane focused at a time |
| Zoom segmented buttons | Frontend Component (AnimationPanel.tsx header) | — | Read/write uiStore; no audio side effects |
| Ghost curve rendering | Canvas Draw Loop (AnimationPanel.tsx RAF tick) | drawLaneCanvas (reuse) | Caller owns ghost passes per D-08; drawLaneCanvas is the pure draw primitive |
| Lane height classes | CSS + React Component (AnimLane) | uiStore (reads focusedLane) | Class-based layout; ResizeObserver reacts automatically to height change |
| Label-col click handler | Frontend Component (AnimLane) | uiStore (writes focusedLane) | Single click target; toggle logic is a one-liner |
| Ghost pointer exclusion | Frontend Component (AnimLane) | — | `pixelX > primaryRegionWidth` guard in existing pointer event handlers |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 (installed) | uiStore state management | Already used for all stores in codebase; `createStore` + `useStore` pattern is established [VERIFIED: package.json] |
| immer | 11.1.4 (installed) | Immutable state updates | Already a dependency; CONTEXT.md D-01 mandates Zustand + Immer for uiStore [VERIFIED: package.json] |
| React Canvas 2D API | browser built-in | Ghost pass rendering: globalAlpha, save/restore, clip, translate | No library needed; Canvas 2D standard API is sufficient [VERIFIED: existing AnimationPanel.tsx usage] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.4 (installed) | Unit tests for uiStore | Follow animationStore.test.ts pattern for uiStore tests [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS class-based height | CSS transition / React Spring | Transitions are explicitly out of scope (D-14); class snap is correct |
| Caller-managed ghost passes | drawLaneCanvas internal ghost | D-08 locks ghost as caller responsibility; internal approach would couple drawing logic to zoom state |
| uiStore (Zustand vanilla) | React useState/useContext | Vanilla store accessible outside React if needed; consistent with all other stores; also avoids prop-drilling to AnimLane |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction
      |
      v
[Zoom button click]          [Label-col click]
      |                             |
      v                             v
uiStore.setZoomBeats()      uiStore.setFocusedLane()
      |                             |
      v                             v
uiStore.zoomBeats             uiStore.focusedLane
      |                             |
      +----------+    +-------------+
                 |    |
                 v    v
          AnimationPanel (RAF loop)
                 |
         for each lane canvas:
                 |
         +-------+--------+
         |                |
         v                v
  drawLaneCanvas      ghost passes
  (primary region)    (i=1..repeatCount)
    zoomBeats param     ctx.globalAlpha=0.30
    X = beat/zoomBeats  clip + translate
                        drawLaneCanvas(ghostW,...)
                 |
                 v
         AnimLane component
           .anim-lane--focused    (160px)
           .anim-lane--compressed (44px)
           ResizeObserver fires → canvas.width/height updated
```

### Recommended Project Structure

No new directories. All changes are additions or modifications to existing files:

```
src/
├── store/
│   ├── uiStore.ts           # NEW: zoomBeats + focusedLane
│   └── uiStore.test.ts      # NEW: unit tests for uiStore
├── components/
│   └── AnimationPanel.tsx   # MODIFY: zoom buttons, ghost passes, focus classes
└── styles/
    └── index.css            # MODIFY: Phase 9 section with new classes
```

### Pattern 1: Zustand Vanilla Store (uiStore.ts)

**What:** Vanilla Zustand store with Immer — matches all existing stores in the codebase.
**When to use:** Any UI state that multiple components need to share without prop-drilling.
**Example:**

```typescript
// Source: modeled on src/store/playbackStore.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AnimatableProperty } from './animationStore'

export interface UiState {
  zoomBeats: number
  focusedLane: AnimatableProperty | null
  setZoomBeats: (beats: number) => void
  setFocusedLane: (prop: AnimatableProperty | null) => void
}

export const uiStore = createStore<UiState>()((set) => ({
  zoomBeats: 4,
  focusedLane: null,
  setZoomBeats: (beats) => set({ zoomBeats: beats }),
  setFocusedLane: (prop) => set({ focusedLane: prop }),
}))

export const useUiStore = <T>(selector: (state: UiState) => T): T =>
  useStore(uiStore, selector)
```

Note: CONTEXT.md D-01 specifies Zustand + Immer. Since the state actions are simple assignments (no nested mutation), `produce` from Immer is not actually needed for this store's actions — but the pattern can be included for consistency. The simple `set({ ... })` form works without `produce`.

### Pattern 2: Canvas Ghost Pass (globalAlpha + clip + translate)

**What:** Render a semi-transparent copy of the primary curve by setting `ctx.globalAlpha`, clipping the canvas context to the ghost region, translating the origin, and calling the existing `drawLaneCanvas` function.
**When to use:** Every frame in the RAF loop (and the stopped-state draw pass) when `zoomBeats > curve.duration`.
**Example:**

```typescript
// Source: CONTEXT.md D-09; Canvas 2D spec
// Pixel geometry
const primaryWidthPx = (curve.duration / zoomBeats) * canvasWidth
const repeatCount = Math.floor(zoomBeats / curve.duration) - 1

// Primary region — draw at full opacity (no globalAlpha change)
drawLaneCanvas(ctx, primaryWidthPx, h, curve, prop, selectedIdx, beat, undefined)

// Full ghost copies
for (let i = 1; i <= repeatCount; i++) {
  const ghostStartPx = (i * curve.duration / zoomBeats) * canvasWidth
  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.beginPath()
  ctx.rect(ghostStartPx, 0, primaryWidthPx, h)
  ctx.clip()
  ctx.translate(ghostStartPx, 0)
  drawLaneCanvas(ctx, primaryWidthPx, h, curve, prop, null, undefined, undefined)
  ctx.restore()
}

// Partial ghost at right edge (when zoomBeats % curve.duration !== 0)
const remainder = zoomBeats % curve.duration
if (remainder > 0) {
  const partialStartPx = ((repeatCount + 1) * curve.duration / zoomBeats) * canvasWidth
  const partialWidthPx = (remainder / zoomBeats) * canvasWidth
  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.beginPath()
  ctx.rect(partialStartPx, 0, partialWidthPx, h)
  ctx.clip()
  ctx.translate(partialStartPx, 0)
  drawLaneCanvas(ctx, primaryWidthPx, h, curve, prop, null, undefined, undefined)
  ctx.restore()
}
```

### Pattern 3: drawLaneCanvas X-axis Extension

**What:** Add optional `zoomBeats?: number` as final parameter. When provided, `toPixel` uses `zoomBeats` as the denominator instead of `curve.duration`.
**When to use:** The primary region caller passes `zoomBeats` to scale the X-axis to the full visible span. Ghost pass callers pass `undefined` — the function uses `curve.duration` to fill the ghost canvas width proportionally.

```typescript
// Source: CONTEXT.md D-07, 09-UI-SPEC.md
function drawLaneCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  curve: SplineCurve,
  property: AnimatableProperty,
  selectedIdx: number | null,
  playheadBeat?: number,
  zoomBeats?: number,   // NEW — Phase 9
): void {
  // X denominator: zoomBeats if provided, else curve.duration
  const xDenominator = zoomBeats ?? curve.duration

  // ... existing setup (clearRect, background, baseline) ...

  function toPixel(p: SplinePoint): [number, number] {
    const px = (p.beat / xDenominator) * w   // CHANGED from curve.duration
    const py = ((maxVal - p.value) / (maxVal - minVal)) * h
    return [px, py]
  }
  // ...
}
```

**Critical:** The playhead position formula also uses `curve.duration` for modulo. When `zoomBeats` is active, the modulo stays `phBeat % curve.duration` (the phase within the loop), but the X pixel position should use `xDenominator`:

```typescript
const phBeat = playheadBeat ?? 0
const phX = curve.duration > 0
  ? (phBeat % curve.duration) / xDenominator * w   // CHANGED denominator
  : 0
```

### Pattern 4: CSS Class-Based Lane Focus (no transitions)

**What:** Apply modifier classes to `.anim-lane` based on `focusedLane` from `uiStore`. No CSS `transition` property — instant snap per spec.

```css
/* Source: 09-UI-SPEC.md */
.anim-lane--focused {
  height: 160px;
}

.anim-lane--compressed {
  height: 44px;
}

/* Amend existing rule — add cursor: pointer */
.anim-lane__label-col {
  cursor: pointer;
}
```

React usage in `AnimLane`:

```tsx
// Source: CONTEXT.md D-12, D-13
const focusedLane = useUiStore((s) => s.focusedLane)
const isFocused = focusedLane === property
const isCompressed = focusedLane !== null && !isFocused

<div
  className={[
    'anim-lane',
    isFocused ? 'anim-lane--focused' : '',
    isCompressed ? 'anim-lane--compressed' : '',
  ].filter(Boolean).join(' ')}
  data-property={property}
>
```

### Pattern 5: Label Column Toggle Handler

```tsx
// Source: CONTEXT.md D-13
// Remove button must stopPropagation so its click does not trigger focus toggle
function handleLabelColClick() {
  const { focusedLane, setFocusedLane } = uiStore.getState()
  setFocusedLane(focusedLane === property ? null : property)
}

// In render:
<div
  className="anim-lane__label-col"
  role="button"
  tabIndex={0}
  aria-label={`Focus ${property} lane`}
  aria-pressed={isFocused}
  onClick={handleLabelColClick}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLabelColClick() }}
>
  {/* ... existing children ... */}
  <button
    className="anim-lane__remove-btn"
    onClick={(e) => { e.stopPropagation(); animationStore.getState().removeCurve(shapeId, property) }}
  >
    ×
  </button>
</div>
```

### Anti-Patterns to Avoid

- **Setting `ctx.globalAlpha` without `ctx.save/restore`:** Will leak the opacity into subsequent draw calls, affecting the primary curve. Always wrap ghost passes in `save/restore`.
- **Calling `ctx.clearRect` before ghost passes but after primary:** The ghost pass approach draws ghosts ON TOP of the primary region — do NOT call `clearRect` between the primary pass and ghost passes. The primary region is drawn first; ghosts are additive.
- **Using React state for `focusedLane` inside `AnimLane` locally:** Would break single-focused-lane-at-a-time invariant because each `AnimLane` instance is independent. Must use the shared `uiStore`.
- **Calling `setFocusedLane` from the RAF tick:** `focusedLane` is only set by user interaction; it must never be written inside the animation loop.
- **Forgetting to pass `zoomBeats` to the primary `drawLaneCanvas` call:** If the primary call uses `curve.duration` as X denominator instead of `zoomBeats`, the curve will appear at the wrong scale when `zoomBeats !== curve.duration`.
- **Ghost pointer exclusion check with stale canvas width:** `primaryRegionWidth` must be computed from the current canvas width and current `zoomBeats`, not a cached value. Read `canvas.width` and `uiStore.getState().zoomBeats` at event time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global UI state sharing | Custom React context + provider | Zustand uiStore (createStore pattern) | Pattern already established for all stores; avoids prop-drilling; works outside React if needed |
| Ghost transparency | Custom compositing logic | `ctx.globalAlpha = 0.30` + `ctx.save/restore` | Standard Canvas 2D API — browser compositing handles this correctly including all child draws |
| Lane height animation | CSS transitions or JS animation frame | CSS class snap (no `transition`) | Spec explicitly requires instant snap; transitions would violate ANIM-11 |
| Canvas resize on height change | Manual canvas.width/height updates on class change | ResizeObserver already in AnimLane | The existing ResizeObserver fires automatically when the div height changes from class toggle |

**Key insight:** The ghost rendering problem looks like it needs a complex offscreen canvas or masking system, but it is solved entirely by Canvas 2D's built-in compositing: set `globalAlpha`, clip the context region, translate the origin, call the existing draw function, restore. No new abstractions needed.

---

## Common Pitfalls

### Pitfall 1: RAF Loop Closure Over Stale `selectedPoints`

**What goes wrong:** The RAF loop `useEffect` in `AnimationPanel.tsx` (line 66–101) currently references `selectedPoints` state from the component closure. When the effect is set up with `[isPlaying, shape]` as dependencies, `selectedPoints` is captured at that point and won't update. This means the RAF loop draws with a potentially stale selected-point index.

**Why it happens:** React `useEffect` closures capture values at the time the effect runs. The `selectedPoints` state is not in the effect's dependency array, so changes to it don't re-run the effect — but the loop uses the captured stale value.

**How to avoid:** Move `selectedPoints` into a `useRef` so the RAF loop always reads the current value without needing the effect to re-run. Pattern: `const selectedPointsRef = useRef(selectedPoints); useEffect(() => { selectedPointsRef.current = selectedPoints }, [selectedPoints])`.

**Warning signs:** Control points stop being highlighted as selected during playback even though they are selected in the UI.

**Note for Phase 9:** The ghost-pass work touches the RAF loop directly. This is the natural time to fix this pre-existing issue.

### Pitfall 2: Ghost Clip Rectangle Does Not Cover Full Canvas Height

**What goes wrong:** If the `ctx.rect(ghostStartPx, 0, ghostWidthPx, h)` clip rectangle uses an incorrect `h` value (e.g. a stale height from before a lane focus change), the ghost may be clipped too short.

**Why it happens:** Canvas `h` comes from `canvas.height`, which is updated by ResizeObserver asynchronously. If the ghost pass runs in the same RAF frame as the resize, `canvas.height` is already updated, so this is not actually a problem — but using a separate local variable for `h` that was captured before the loop matters if height can change mid-frame.

**How to avoid:** Read `canvas.width` and `canvas.height` fresh at the start of each `tick()` iteration per canvas, not once outside the loop.

### Pitfall 3: `ctx.translate` Is Cumulative Within a Save/Restore Block

**What goes wrong:** Each ghost's `ctx.translate(ghostStartPx, 0)` moves the origin. If `ctx.restore()` is not called before the next ghost, translations accumulate and each subsequent ghost starts at the wrong position.

**Why it happens:** Canvas transform state is cumulative. `ctx.translate` adds to the current transform matrix; it does not set an absolute position.

**How to avoid:** Always pair `ctx.save()` and `ctx.restore()` around each ghost pass. The example code in the Patterns section already does this correctly. Verify that the primary region draw does NOT call `ctx.save()` before the loop — or, if it does, that it also calls `ctx.restore()` before the loop.

### Pitfall 4: `clearRect` Erases Ghosts

**What goes wrong:** If `drawLaneCanvas` calls `ctx.clearRect(0, 0, w, h)` at the start (which it does — line 265), and the ghost pass is called from within `drawLaneCanvas` (which it is NOT per D-08), the primary region would erase the ghosts.

**Why it happens:** Ghost rendering is caller-managed (D-08), so `drawLaneCanvas` is called once for primary, then multiple times for ghosts within `save/restore` + translate. The translate means `clearRect(0, 0, w, h)` inside a ghost call clears the ghost's local coordinate space (the ghost region), not the entire canvas. Combined with the clip, this is safe.

**How to avoid:** Confirm ghost pass callers do NOT pass `zoomBeats` — they pass `undefined` so `drawLaneCanvas` uses `curve.duration` as denominator to fill the ghost width proportionally. This is correct per UI-SPEC.

### Pitfall 5: Remove Button Click Propagates to Label Column

**What goes wrong:** Clicking "×" to remove a curve also triggers the label-column focus toggle, focusing (or collapsing) the lane in the same click.

**Why it happens:** The remove button is a child of `.anim-lane__label-col`. Without `stopPropagation`, the click event bubbles up to the label column's click handler.

**How to avoid:** Add `e.stopPropagation()` to the remove button's `onClick`. This is noted in the UI-SPEC (section "Label column interaction") and CONTEXT.md D-13.

### Pitfall 6: `zoomBeats < curve.duration` — No Ghosts, Curve Cropped

**What goes wrong:** When `zoomBeats < curve.duration`, the curve is drawn with `X = beat / zoomBeats * w`, which means points beyond `zoomBeats` render outside the canvas width and are clipped by the canvas boundary. `repeatCount` will be 0. This is the correct behavior — the canvas shows only the first `zoomBeats` beats.

**Why it happens:** This is not a bug, but it surprises developers who expect `curve.duration` to always be visible.

**How to avoid:** No action needed — just be aware that the `pixelToPoint` conversion in drag handlers must still map back to `curve.duration` space, not `zoomBeats` space. The drag handler's `pixelToPoint` function uses `curve.duration` (current code, line 384). Phase 9 does NOT change this — control-point dragging still maps to full curve coordinates. Only the visual X-axis display scale changes.

---

## Code Examples

Verified patterns from official sources:

### Zustand vanilla createStore (no Immer needed for flat state)

```typescript
// Source: src/store/playbackStore.ts (existing codebase)
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export const uiStore = createStore<UiState>()((set) => ({
  zoomBeats: 4,
  focusedLane: null,
  setZoomBeats: (beats: number) => set({ zoomBeats: beats }),
  setFocusedLane: (prop: AnimatableProperty | null) => set({ focusedLane: prop }),
}))

export const useUiStore = <T>(selector: (state: UiState) => T): T =>
  useStore(uiStore, selector)
```

### Zoom Segmented Buttons in AnimationPanel Header

```tsx
// Source: 09-UI-SPEC.md; mirrors beat-selector pattern in existing CSS
const ZOOM_VALUES = [1, 2, 4, 8, 16, 32, 64] as const

// In AnimationPanel render (inside the header div, before Add Curve button):
const zoomBeats = useUiStore((s) => s.zoomBeats)

<div
  className="zoom-selector"
  role="group"
  aria-label="Timeline zoom"
>
  {ZOOM_VALUES.map((v) => (
    <button
      key={v}
      className={['zoom-selector__btn', v === zoomBeats ? 'zoom-selector__btn--active' : ''].filter(Boolean).join(' ')}
      aria-label={`Zoom to ${v} beats`}
      aria-pressed={v === zoomBeats}
      onClick={() => uiStore.getState().setZoomBeats(v)}
    >
      {v}
    </button>
  ))}
</div>
```

### Ghost Pass Loop (inside RAF tick and stopped-state draw)

```typescript
// Source: CONTEXT.md D-09; 09-UI-SPEC.md ghost pixel geometry
const zoomBeats = uiStore.getState().zoomBeats
const primaryWidthPx = (curve.duration / zoomBeats) * canvas.width
const repeatCount = Math.floor(zoomBeats / curve.duration) - 1

// Primary
drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedIdx, beat, zoomBeats)

// Full ghost copies
for (let i = 1; i <= repeatCount; i++) {
  const ghostStartPx = (i * curve.duration / zoomBeats) * canvas.width
  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.beginPath()
  ctx.rect(ghostStartPx, 0, primaryWidthPx, canvas.height)
  ctx.clip()
  ctx.translate(ghostStartPx, 0)
  drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
  ctx.restore()
}

// Partial ghost at right edge
const remainder = zoomBeats % curve.duration
if (remainder > 0 && repeatCount >= 0) {
  const partialStartPx = Math.floor(zoomBeats / curve.duration) * curve.duration / zoomBeats * canvas.width
  const partialWidthPx = (remainder / zoomBeats) * canvas.width
  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.beginPath()
  ctx.rect(partialStartPx, 0, partialWidthPx, canvas.height)
  ctx.clip()
  ctx.translate(partialStartPx, 0)
  drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
  ctx.restore()
}
```

### Ghost Pointer Exclusion (in handleCanvasPointerDown / handleCanvasPointerMove)

```typescript
// Source: CONTEXT.md D-10; 09-UI-SPEC.md interaction exclusion contract
function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
  const canvas = canvasRef.current!
  canvasRect.current = canvas.getBoundingClientRect()
  const px = e.clientX - canvasRect.current.left
  const py = e.clientY - canvasRect.current.top

  // Ghost region exclusion: ignore events in x > primaryRegionWidth
  const zoomBeats = uiStore.getState().zoomBeats
  const primaryRegionWidth = (curve.duration / zoomBeats) * canvas.width
  if (px > primaryRegionWidth) return  // ghost region — non-interactive

  // ... existing hit-test logic unchanged ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS transitions for height changes | Instant class snap (no transition) | Spec decision (ANIM-11) | No animation library needed; simpler CSS |
| Canvas overlay for playhead | Full redraw each frame (curve + playhead together) | Phase 8 | Ghost passes follow same "full redraw each frame" pattern |

**Deprecated/outdated:**
- Per-lane timeline zoom: spec explicitly requires global zoom only (REQUIREMENTS.md Out of Scope).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `uiStore` does not need Immer `produce` for its actions since state is flat (no nested objects to mutate) | Standard Stack / Pattern 1 | Low risk — plain `set({...})` works for flat state; adding `produce` adds no harm but also no benefit |
| A2 | The pre-existing `selectedPoints` stale-closure issue in the RAF loop (lines 66–101 of AnimationPanel.tsx) does not currently cause visible bugs because the RAF loop reads `selectedPoints[prop]` which is always `undefined` for non-selected lanes and `null/number` for the selected one — stale at stop/start transitions only | Common Pitfalls | Medium risk — if this causes visual glitches during Phase 9 testing, the RAF loop needs `selectedPointsRef` refactor |

**Verified claims in this research:** All architectural patterns are derived from the live codebase (src/components/AnimationPanel.tsx, src/store/playbackStore.ts, src/styles/index.css) and from the approved CONTEXT.md and UI-SPEC documents.

---

## Open Questions (RESOLVED)

1. **Optional separator line between primary and first ghost**
   - What we know: UI-SPEC specifies 1px line at `x = primaryRegionWidth`, color `rgba(255,255,255,0.15)`, drawn after primary before first ghost pass
   - What's unclear: Whether the visual result aids readability or adds noise in the dark theme
   - Recommendation: Implement it — the dark background makes boundaries subtle; 15% white is very low contrast and adds useful context without visual noise
   - RESOLVED: Include the separator line — implemented in 09-02 Task 1 as an optional 1px `rgba(255,255,255,0.15)` line at `x = primaryRegionWidth`, drawn after the primary region and before the first ghost pass.

2. **`selectedPoints` stale closure in existing RAF loop**
   - What we know: Line 78 references `selectedPoints` which is React state, not a ref; the effect deps are `[isPlaying, shape]`; `selectedPoints` changes will not re-run the RAF effect
   - What's unclear: Whether this causes visible bugs in practice (the RAF loop re-runs on shape change which resets selected points to `{}`)
   - Recommendation: Fix as part of Wave 2 when touching the RAF loop; use `useRef` pattern to track `selectedPoints` inside the loop
   - RESOLVED: Fixed in 09-01 Task 2 — `selectedPointsRef` added as a `useRef` that tracks `selectedPoints` state; RAF loop reads from `selectedPointsRef.current` instead of the captured closure value.

---

## Environment Availability

Step 2.6: SKIPPED — phase has no external dependencies. All required tooling (Vitest, TypeScript, React) is already installed and verified operational. Two pre-existing test failures exist in `CellPanel.test.tsx` (animation rate selector test) — these are not related to Phase 9 and should not be treated as Phase 9 regressions.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom |
| Config file | vite.config.ts (unified) |
| Quick run command | `npx vitest run src/store/uiStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-08 | `uiStore.zoomBeats` defaults to 4 | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-08 | `setZoomBeats(8)` updates zoomBeats to 8 | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-08 | `drawLaneCanvas` with `zoomBeats=8` uses 8 as X denominator | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-09 | `repeatCount = Math.floor(zoomBeats/duration) - 1` formula | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-09 | Ghost pointer exclusion: events at `x > primaryRegionWidth` are ignored | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-11 | `uiStore.focusedLane` defaults to null | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-11 | `setFocusedLane(prop)` sets focusedLane | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |
| ANIM-11 | `setFocusedLane(null)` clears focusedLane | unit | `npx vitest run src/store/uiStore.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/store/uiStore.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/store/uiStore.test.ts` — covers all ANIM-08, ANIM-09, ANIM-11 store behaviors above
- [ ] `src/store/uiStore.ts` — the store itself (created in Wave 1)

Note: No conftest or shared fixture setup needed — Vitest + jsdom is already fully configured in `vite.config.ts` with `setupFiles: ['./vitest.setup.ts']`.

---

## Security Domain

Phase 9 involves no authentication, sessions, access control, user data, external input over the network, cryptography, or backend communication. All changes are client-side UI state and canvas rendering.

Security domain: NOT APPLICABLE. The only user input is clicks on buttons and the label column — both are simple UI toggles with no security implications in a client-only, no-backend app.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 9 |
|-----------|-------------------|
| React + TypeScript + CSS — no UI framework | Confirmed: zoom buttons are plain `<button>` elements; no component library imports |
| No backend; all state lives in the browser | Confirmed: uiStore is client-only Zustand store |
| PoC — full feature set with rough edges acceptable | Confirmed: no polished animations needed; instant snap is correct |
| Up to 16 simultaneous voices (4x4 grid) | RAF loop already handles up to 4 lanes per shape; ghost pass adds at most ~15 extra draw calls per lane per frame — acceptable |
| GSD workflow enforcement: start work through GSD command | Research artifact only; no direct repo edits made |

---

## Sources

### Primary (HIGH confidence)

- `src/components/AnimationPanel.tsx` — live codebase; RAF loop structure, `drawLaneCanvas` signature, `AnimLane` component, current CSS class usage
- `src/store/playbackStore.ts` — Zustand vanilla store template for uiStore
- `src/store/animationStore.ts` — `AnimatableProperty` type, `SplineCurve` structure
- `src/styles/index.css` — existing CSS custom properties, `.beat-selector__btn` pattern for zoom buttons, `.anim-lane` existing rules
- `.planning/phases/09-timeline-zoom-ghosts-and-lane-focus/09-CONTEXT.md` — locked decisions D-01 to D-14
- `.planning/phases/09-timeline-zoom-ghosts-and-lane-focus/09-UI-SPEC.md` — approved visual and interaction contract
- `package.json` — verified installed dependencies and versions

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — ANIM-08, ANIM-09, ANIM-11 requirement text
- `.planning/phases/08-beat-clock-and-playhead/08-CONTEXT.md` — RAF loop architecture decisions

### Tertiary (LOW confidence)

None. All findings are verified against the live codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all patterns derived from live codebase and locked CONTEXT.md decisions
- Pitfalls: HIGH — all derived from static analysis of live code + Canvas 2D API standard behavior
- Test patterns: HIGH — Vitest and jsdom already configured and working (178/180 tests pass)

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30-day window; stable codebase)
