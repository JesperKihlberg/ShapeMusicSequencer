# Phase 9: Timeline Zoom, Ghosts, and Lane Focus — Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 4 (1 new, 3 modified)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/store/uiStore.ts` | store | request-response | `src/store/playbackStore.ts` | exact |
| `src/store/uiStore.test.ts` | test | — | `src/store/playbackStore.test.ts` + `src/store/animationStore.test.ts` | exact |
| `src/components/AnimationPanel.tsx` | component | event-driven + CRUD | `src/components/AnimationPanel.tsx` (self — extend) | self |
| `src/styles/index.css` | config/style | — | `src/styles/index.css` (self — Phase 7 section pattern) | self |

---

## Pattern Assignments

### `src/store/uiStore.ts` (store, request-response)

**Analog:** `src/store/playbackStore.ts`

**Imports pattern** (`src/store/playbackStore.ts` lines 9–10):
```typescript
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
```

**Interface declaration pattern** (`src/store/playbackStore.ts` lines 27–34):
```typescript
export interface PlaybackState {
  isPlaying: boolean
  bpm: number
  volume: number
  setIsPlaying: (v: boolean) => void
  setBpm: (v: number) => void
  setVolume: (v: number) => void
}
```
Mirror this exactly for UiState — same property-then-setter layout.

**Store creation pattern** (`src/store/playbackStore.ts` lines 36–43):
```typescript
export const playbackStore = createStore<PlaybackState>()((set) => ({
  isPlaying: true,
  bpm: 120,
  volume: 0.8,
  setIsPlaying: (v: boolean) => set({ isPlaying: v }),
  setBpm: (v: number) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
  setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
}))
```
For `uiStore` use same `createStore<UiState>()((set) => ...)` shape. Actions are simple flat assignments — no Immer `produce` needed; `set({ zoomBeats: beats })` is sufficient.

**React hook export pattern** (`src/store/playbackStore.ts` lines 46–47):
```typescript
export const usePlaybackStore = <T>(selector: (state: PlaybackState) => T): T =>
  useStore(playbackStore, selector)
```
Export `useUiStore` with the same generic selector wrapper.

**Type import needed** — `AnimatableProperty` comes from `animationStore.ts`:
```typescript
import type { AnimatableProperty } from './animationStore'
```

**Target shape for uiStore** (from CONTEXT.md D-02):
```typescript
export interface UiState {
  zoomBeats: number                           // default 4
  focusedLane: AnimatableProperty | null      // default null
  setZoomBeats: (beats: number) => void
  setFocusedLane: (prop: AnimatableProperty | null) => void
}
```

---

### `src/store/uiStore.test.ts` (test)

**Analog:** `src/store/playbackStore.test.ts` (structure) + `src/store/animationStore.test.ts` (reset pattern)

**File header + import pattern** (`src/store/playbackStore.test.ts` lines 1–4):
```typescript
// src/store/playbackStore.test.ts
// Covers: PLAY-01 (isPlaying), PLAY-02 (BPM), PLAY-03 (volume)
import { describe, it, expect, beforeEach } from 'vitest'
import { playbackStore } from './playbackStore'
```

**beforeEach reset pattern** (`src/store/playbackStore.test.ts` line 8 + `src/store/animationStore.test.ts` line 14):
```typescript
// animationStore.test.ts resets via setState to initial values:
beforeEach(() => {
  animationStore.setState({ curves: {} })
})

// playbackStore.test.ts resets all fields explicitly:
beforeEach(() => {
  playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
})
```
For `uiStore.test.ts`, reset to initial state before each describe block:
```typescript
beforeEach(() => {
  uiStore.setState({ zoomBeats: 4, focusedLane: null })
})
```

**Defaults describe block pattern** (`src/store/playbackStore.test.ts` lines 6–22):
```typescript
describe('playbackStore — defaults', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('has isPlaying=true by default (D-14: auto-start behavior preserved)', () => {
    expect(playbackStore.getState().isPlaying).toBe(true)
  })
})
```

**Setter describe block pattern** (`src/store/playbackStore.test.ts` lines 24–39):
```typescript
describe('playbackStore — setIsPlaying (PLAY-01)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('setIsPlaying(false) sets isPlaying to false', () => {
    playbackStore.getState().setIsPlaying(false)
    expect(playbackStore.getState().isPlaying).toBe(false)
  })
})
```

**Test coverage required** (from RESEARCH.md Validation Architecture):
- `uiStore.zoomBeats` defaults to 4 (ANIM-08)
- `setZoomBeats(8)` updates zoomBeats to 8 (ANIM-08)
- `uiStore.focusedLane` defaults to null (ANIM-11)
- `setFocusedLane(prop)` sets focusedLane (ANIM-11)
- `setFocusedLane(null)` clears focusedLane (ANIM-11)
- `repeatCount = Math.floor(zoomBeats/duration) - 1` formula — pure math test (ANIM-09)
- Ghost pointer exclusion: `px > primaryRegionWidth` computed correctly (ANIM-09)

---

### `src/components/AnimationPanel.tsx` — modifications (component, event-driven)

**Analog:** `src/components/AnimationPanel.tsx` (self — three targeted modifications)

#### Modification 1: Zoom segmented buttons in header

**Location to modify:** `src/components/AnimationPanel.tsx` lines 187–225 (header div)

**Pattern to follow — beat-selector segmented buttons** (`src/styles/index.css` lines 490–520, used in `src/components/CellPanel.tsx`):
```tsx
// Segmented button group with active state — copy beat-selector structure
<div className="beat-selector" role="group" aria-label="...">
  {VALUES.map((v) => (
    <button
      key={v}
      className={['beat-selector__btn', v === current ? 'beat-selector__btn--active' : ''].filter(Boolean).join(' ')}
      aria-pressed={v === current}
      onClick={() => store.getState().setSomething(v)}
    >
      {v}
    </button>
  ))}
</div>
```
For zoom: use class names `zoom-selector` / `zoom-selector__btn` / `zoom-selector__btn--active` (new Phase 9 CSS classes that mirror beat-selector exactly). Place the `<div className="zoom-selector">` inside the header, before the existing `<div style={{ position: 'relative', marginLeft: 'auto' }}>` (the Add Curve wrapper at line 194).

**Store read pattern** in AnimationPanel — read `zoomBeats` from `useUiStore` following existing store hook pattern (`src/components/AnimationPanel.tsx` lines 63):
```tsx
const isPlaying = usePlaybackStore((s) => s.isPlaying)
// New — same pattern:
const zoomBeats = useUiStore((s) => s.zoomBeats)
```

**Imports to add** at top of `AnimationPanel.tsx` (after existing store imports at lines 6–10):
```typescript
import { uiStore, useUiStore } from '../store/uiStore'
```

#### Modification 2: Ghost rendering in RAF loop and stopped-state draw

**Location to modify:** `src/components/AnimationPanel.tsx` lines 66–101 (RAF `useEffect`)

**Existing primary draw call** (`src/components/AnimationPanel.tsx` line 78):
```typescript
drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedPoints[prop] ?? null, beat)
```
Replace with primary + ghost pass sequence (reading `zoomBeats` from store at tick time, not from closure):
```typescript
const zoomBeats = uiStore.getState().zoomBeats
// Primary — passes zoomBeats for X-axis scaling
drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedPointsRef.current[prop] ?? null, beat, zoomBeats)
// Ghost passes — see ghost pattern below
```

**Note on `selectedPoints` stale closure** (RESEARCH.md Pitfall 1): the existing code at line 78 captures `selectedPoints` from component state at effect setup time. Fix by adding a ref that mirrors the state:
```typescript
const selectedPointsRef = useRef(selectedPoints)
useEffect(() => { selectedPointsRef.current = selectedPoints }, [selectedPoints])
```
Then use `selectedPointsRef.current` inside the RAF tick instead of `selectedPoints`.

**Ghost pass pattern** (`src/components/AnimationPanel.tsx` — to be inserted after primary draw call, before `rafId = requestAnimationFrame(tick)`):
```typescript
const primaryWidthPx = (curve.duration / zoomBeats) * canvas.width
const repeatCount = Math.floor(zoomBeats / curve.duration) - 1

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
Apply the same ghost pass block to the stopped-state draw at lines 89–95, reading `canvas.width`/`canvas.height` fresh inside the loop (not cached values).

#### Modification 3: `drawLaneCanvas` signature extension

**Location to modify:** `src/components/AnimationPanel.tsx` lines 256–331 (`drawLaneCanvas` function)

**Current signature** (line 256–264):
```typescript
function drawLaneCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  curve: SplineCurve,
  property: AnimatableProperty,
  selectedIdx: number | null,
  playheadBeat?: number,
): void {
```
**Extended signature** — add `zoomBeats?` as final optional parameter:
```typescript
function drawLaneCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  curve: SplineCurve,
  property: AnimatableProperty,
  selectedIdx: number | null,
  playheadBeat?: number,
  zoomBeats?: number,         // NEW Phase 9 — X-axis denominator override
): void {
```

**`toPixel` function modification** (current lines 282–286):
```typescript
// CURRENT:
function toPixel(p: SplinePoint): [number, number] {
  const px = (p.beat / curve.duration) * w
  const py = ((maxVal - p.value) / (maxVal - minVal)) * h
  return [px, py]
}
```
Replace `curve.duration` with `xDenominator`:
```typescript
// NEW:
const xDenominator = zoomBeats ?? curve.duration
function toPixel(p: SplinePoint): [number, number] {
  const px = (p.beat / xDenominator) * w
  const py = ((maxVal - p.value) / (maxVal - minVal)) * h
  return [px, py]
}
```

**Playhead X calculation modification** (current lines 320–323):
```typescript
// CURRENT:
const phX = curve.duration > 0
  ? (phBeat % curve.duration) / curve.duration * w
  : 0
```
```typescript
// NEW — modulo stays curve.duration (phase within loop), denominator uses xDenominator:
const phX = curve.duration > 0
  ? (phBeat % curve.duration) / xDenominator * w
  : 0
```

#### Modification 4: AnimLane — lane focus state and label-col click

**Analog:** `src/components/AnimationPanel.tsx` `AnimLane` component (lines 344–516)

**Store read pattern — add to AnimLane** (following same pattern as existing store reads in AnimationPanel):
```tsx
const focusedLane = useUiStore((s) => s.focusedLane)
const isFocused = focusedLane === property
const isCompressed = focusedLane !== null && !isFocused
```

**CSS class application** (current `AnimLane` return, line 478):
```tsx
// CURRENT:
<div className="anim-lane" data-property={property}>

// NEW — BEM modifier classes appended:
<div
  className={[
    'anim-lane',
    isFocused ? 'anim-lane--focused' : '',
    isCompressed ? 'anim-lane--compressed' : '',
  ].filter(Boolean).join(' ')}
  data-property={property}
>
```
This mirrors the exact className-joining pattern already used for `beat-selector__btn--active` throughout the codebase.

**Label-col click handler** (modify existing `<div className="anim-lane__label-col">` at line 479):
```tsx
function handleLabelColClick() {
  const { focusedLane, setFocusedLane } = uiStore.getState()
  setFocusedLane(focusedLane === property ? null : property)
}

// In JSX — add interaction attributes to label-col div:
<div
  className="anim-lane__label-col"
  role="button"
  tabIndex={0}
  aria-label={`Focus ${property} lane`}
  aria-pressed={isFocused}
  onClick={handleLabelColClick}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLabelColClick() }}
>
```

**Remove button — stopPropagation** (current line 495–499 — stop click from bubbling to label-col):
```tsx
// CURRENT:
<button
  className="anim-lane__remove-btn"
  aria-label={`Remove ${property} curve`}
  onClick={() => animationStore.getState().removeCurve(shapeId, property)}
>

// NEW — add e.stopPropagation():
<button
  className="anim-lane__remove-btn"
  aria-label={`Remove ${property} curve`}
  onClick={(e) => {
    e.stopPropagation()
    animationStore.getState().removeCurve(shapeId, property)
  }}
>
```

**Ghost pointer exclusion** (modify `handleCanvasPointerDown` at lines 413–431):
```typescript
function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
  const canvas = canvasRef.current!
  canvasRect.current = canvas.getBoundingClientRect()
  const px = e.clientX - canvasRect.current.left
  const py = e.clientY - canvasRect.current.top

  // NEW — Phase 9: ignore clicks in ghost region
  const zoomBeats = uiStore.getState().zoomBeats
  const primaryRegionWidth = (curve.duration / zoomBeats) * canvas.width
  if (px > primaryRegionWidth) return

  // ... existing hit-test logic unchanged (lines 419–431) ...
}
```
Apply the same guard to `handleCanvasPointerMove` (line 433).

---

### `src/styles/index.css` — Phase 9 CSS additions

**Analog:** `src/styles/index.css` lines 489–520 (`.beat-selector` and `.beat-selector__btn` rules)

**Phase section header convention** (existing pattern throughout `index.css`):
```css
/* ── Phase N: Feature Name ─────────────────────────────────────────────── */
```

**Zoom selector CSS** — copy `.beat-selector` structure exactly, rename to `.zoom-selector`:
```css
/* ── Phase 9: Timeline Zoom, Ghosts, and Lane Focus ─────────────────────── */

/* Zoom segmented buttons — mirrors .beat-selector exactly */
.zoom-selector {
  display: flex;
  flex-direction: row;
  gap: var(--space-1);
}

.zoom-selector__btn {
  flex: 1;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-secondary);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--weight-regular);
  cursor: pointer;
  padding: 0;
}

.zoom-selector__btn:hover {
  border-color: var(--color-border-primary);
  background: rgba(255, 255, 255, 0.04);
}

.zoom-selector__btn--active {
  border-color: var(--color-accent);
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-text-primary);
}
```

**Lane focus/compress modifier classes** (extend existing `.anim-lane` at line 675 — no transition per D-14):
```css
/* Lane focus: focused lane snaps to 160px (ANIM-11) */
.anim-lane--focused {
  height: 160px;
}

/* Lane compress: non-focused lanes collapse to 44px when any lane is focused (ANIM-11) */
.anim-lane--compressed {
  height: 44px;
  min-height: 44px;   /* override existing min-height: 56px on .anim-lane */
}

/* Label column is clickable — add pointer cursor */
.anim-lane__label-col {
  cursor: pointer;
}
```
Note: `.anim-lane--compressed` needs `min-height: 44px` to override the existing `min-height: 56px` on `.anim-lane` (line 679).

---

## Shared Patterns

### Store creation (Zustand vanilla)
**Source:** `src/store/playbackStore.ts` lines 9–47
**Apply to:** `src/store/uiStore.ts`
```typescript
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export const store = createStore<State>()((set) => ({
  // fields
  setter: (v) => set({ field: v }),
}))

export const useStore_ = <T>(selector: (state: State) => T): T =>
  useStore(store, selector)
```

### Direct store access (outside React)
**Source:** `src/components/AnimationPanel.tsx` lines 70–71, 76–77, 160
**Apply to:** All RAF loop reads and AnimLane click handlers
```typescript
// Read outside React:
const { bpm } = playbackStore.getState()
const curve = animationStore.getState().curves[shape?.id ?? '']?.[prop]

// Write outside React:
animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
```
Use `.getState()` in RAF ticks and event handlers; use `useXxxStore` hook only for reactive render reads.

### Canvas ctx.save/restore guard
**Source:** Standard Canvas 2D — established pattern (not yet in codebase for ghost passes, but `ctx.save/restore` is the single correct way to isolate globalAlpha + clip + translate state)
**Apply to:** Every ghost pass in the RAF loop and stopped-state draw
```typescript
ctx.save()
ctx.globalAlpha = 0.30
ctx.beginPath()
ctx.rect(startPx, 0, widthPx, h)
ctx.clip()
ctx.translate(startPx, 0)
drawLaneCanvas(...)
ctx.restore()
```
Every ghost pass must be wrapped — no shared state leaks between ghost iterations or back to the primary draw.

### BEM className joining
**Source:** Used throughout `src/components/` for conditional modifier classes
**Apply to:** `AnimLane` div and zoom button render
```typescript
className={[
  'base-class',
  condition ? 'base-class--modifier' : '',
].filter(Boolean).join(' ')}
```

### Test describe/beforeEach/it structure
**Source:** `src/store/playbackStore.test.ts` lines 1–86
**Apply to:** `src/store/uiStore.test.ts`
```typescript
describe('storeName — featureName (REQ-ID)', () => {
  beforeEach(() => {
    store.setState({ field: initialValue })
  })

  it('describes expected behavior with requirement reference', () => {
    store.getState().setter(newValue)
    expect(store.getState().field).toBe(newValue)
  })
})
```

---

## No Analog Found

All files in Phase 9 have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/store/`, `src/components/`, `src/styles/`
**Files scanned:** 8 (playbackStore.ts, animationStore.ts, playbackStore.test.ts, animationStore.test.ts, AnimationPanel.tsx, index.css, App.tsx, CellPanel.tsx)
**Pattern extraction date:** 2026-04-27
