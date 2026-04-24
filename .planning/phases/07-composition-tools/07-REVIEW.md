---
phase: 07-composition-tools
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/App.tsx
  - src/components/AnimationPanel.tsx
  - src/components/CellPanel.tsx
  - src/engine/audioEngine.test.ts
  - src/engine/audioEngine.ts
  - src/engine/canvasEngine.ts
  - src/styles/index.css
  - vitest.setup.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 7 adds the animation panel with per-property spline curves, a draggable resize handle, and the curve evaluator used by both the audio and canvas engines. The architecture is clean and the separation of concerns between engines is consistent with the established pattern.

Three warnings were found: a logic bug in the loop-wrap segment of `evalCurveAtBeat` (duplicated in both engines) that silently prevents interpolation across the loop boundary; a magic-number discrepancy in the drag-handle double-click toggle height; and an intermediate-value persistence issue in the duration input. Three info items cover dead CSS, a duplicated constant, and a performance note about redundant sorting in a hot path.

---

## Warnings

### WR-01: `evalCurveAtBeat` — loop-wrap interpolation silently falls back to `lo.value`

**Files:** `src/engine/audioEngine.ts:219-232`, `src/engine/canvasEngine.ts:70-83`

**Issue:** When `pos` falls after the last control point (i.e. in the wrap-around segment from the last point back to beat 0), the initialisation `lo = active[active.length - 1]` and `hi = active[0]` is correct in intent. However, `segLength = hi.beat - lo.beat` is **negative** in this case (e.g. hi.beat=0, lo.beat=3.5), which causes the guard `if (segLength <= 0) return lo.value` to fire immediately. The wrap interpolation is never computed; the curve snaps to the value of the last control point for the entire tail of the loop instead of blending back toward `active[0].value`.

Example: curve `{ duration: 4, points: [{beat:0, value:10}, {beat:4, value:90}] }` — at `pos=3` the expected interpolated value is 80, and the code does correctly reach the inner loop (`active[0].beat <= 3 && 3 < active[1].beat` is true). But for a three-point curve like `{beat:0, value:0}, {beat:2, value:100}, {beat:4, value:0}` when `pos=3` the loop exits with no match, `lo=point[2], hi=point[0]`, `segLength = 0-4 = -4`, guard fires, returns `0` instead of the expected `50`.

This directly contradicts the "loops — beat position > duration wraps back to start" test (which uses a flat curve and therefore never hits the wrap segment), so the bug is not caught by the existing test suite.

**Fix:** Adjust `segLength` and `t` for the cross-boundary case by treating the wrap segment as having a length of `(curve.duration - lo.beat) + hi.beat`:

```typescript
// Replace the existing segLength/t block in evalCurveAtBeat:
if (lo.beat === hi.beat) return lo.value

// Wrap case: lo is the last point, hi is the first point (beat wraps through 0)
const isWrap = lo.beat > hi.beat
const segLength = isWrap
  ? (curve.duration - lo.beat) + hi.beat
  : hi.beat - lo.beat

if (segLength <= 0) return lo.value

const posInSeg = isWrap
  ? (pos >= lo.beat ? pos - lo.beat : curve.duration - lo.beat + pos)
  : pos - lo.beat

const t = posInSeg / segLength
return lo.value + t * (hi.value - lo.value)
```

The same fix must be applied in both `src/engine/audioEngine.ts` and `src/engine/canvasEngine.ts` as the implementations are identical.

---

### WR-02: `handleDragHandleDoubleClick` uses `180` instead of `PANEL_DEFAULT` (188)

**File:** `src/components/AnimationPanel.tsx:68`

**Issue:** The double-click toggle handler restores the panel to `180` px:

```typescript
onHeightChange(panelHeight <= PANEL_MIN ? 180 : PANEL_MIN)
```

But `PANEL_DEFAULT` is defined as `188` on line 12. This means double-clicking the handle expands to 180 px while the actual default height (set by `App.tsx`) is 188 px, producing a 8 px discrepancy. The `handleAnimate` callback in `App.tsx` (line 18) also restores to `180` — both locations are inconsistent with `PANEL_DEFAULT`.

**Fix:** Use the named constant in both places:

```typescript
// AnimationPanel.tsx line 68
onHeightChange(panelHeight <= PANEL_MIN ? PANEL_DEFAULT : PANEL_MIN)

// App.tsx line 18
setPanelHeight(h => h <= 40 ? PANEL_DEFAULT : h)
// and import PANEL_DEFAULT from '../components/AnimationPanel'
```

---

### WR-03: Duration input persists out-of-range intermediate values on every keystroke

**File:** `src/components/AnimationPanel.tsx:373-377`

**Issue:** `handleDurationChange` calls `animationStore.getState().setCurve(...)` with `clamped` on every `onChange` event. If the user types `0` (intending `0.25`) or `6` (intending `64`), the clamped value `0.25` or `6` is immediately committed to the store and broadcast to both engines. The `onBlur` handler is only a display-restore shim (it calls `setCurve` with the existing `curve.duration` to force a re-render) — it does not prevent the premature commitment.

In practice this causes audible pitch/filter jumps mid-typing when the user edits an in-use curve's duration. It also means the engines briefly evaluate curves with the intermediate duration, potentially producing incorrect playback.

**Fix:** Use an uncontrolled local state for the input display value and only commit on blur or Enter:

```typescript
const [draftDuration, setDraftDuration] = useState<string>(String(curve.duration))

// Keep draft in sync when curve.duration changes externally
useEffect(() => { setDraftDuration(String(curve.duration)) }, [curve.duration])

function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
  setDraftDuration(e.target.value)  // display only — no store commit
}

function handleDurationBlur(e: React.FocusEvent<HTMLInputElement>) {
  const raw = parseFloat(e.target.value)
  const clamped = isNaN(raw) ? curve.duration : Math.max(0.25, Math.min(64, raw))
  setDraftDuration(String(clamped))
  animationStore.getState().setCurve(shapeId, property, { ...curve, duration: clamped })
}
```

Then use `value={draftDuration}` on the input.

---

## Info

### IN-01: Dead CSS — `.beat-selector` classes orphaned after Phase 7 refactor

**File:** `src/styles/index.css:489-520`

**Issue:** The `.beat-selector`, `.beat-selector__btn`, and `.beat-selector__btn--active` rule blocks (32 lines) were used by the beat-fraction selector in CellPanel. Phase 7 replaced that component with the "Animate" button, but the CSS was not removed. No component in the codebase references these classes.

**Fix:** Remove lines 489–520 from `index.css`.

---

### IN-02: `PANEL_DEFAULT` duplicated between `App.tsx` and `AnimationPanel.tsx`

**File:** `src/App.tsx:10`, `src/components/AnimationPanel.tsx:12`

**Issue:** Both files define `const PANEL_DEFAULT = 188` with a comment pointing to each other. `AnimationPanel.tsx` already exports `PANEL_DEFAULT` (line 430). The duplication is a maintenance hazard — the two values diverged already (see WR-02 where `180` is used inconsistently).

**Fix:** Import the constant in `App.tsx` instead of redeclaring it:

```typescript
import { AnimationPanel, PANEL_DEFAULT } from './components/AnimationPanel'
// Remove: const PANEL_DEFAULT = 188
```

---

### IN-03: `evalCurveAtBeat` sorts control points on every call — hot path allocation

**Files:** `src/engine/audioEngine.ts:215-216`, `src/engine/canvasEngine.ts:66-67`

**Issue:** Both implementations call `.filter(...).sort(...)` inside `evalCurveAtBeat`, which is invoked on every frame from a `setInterval` at 16ms (audio engine) and every RAF frame (canvas engine). This allocates a new array and sorts it on every call. The `points` array is typically 2–4 elements, so the overhead is small, but it is unnecessary if points are maintained in sorted order by the store.

The store's `setCurve` in `animationStore.ts` does not enforce sort order; neither does `handleCanvasPointerDown` which sorts before calling `setCurve` (AnimationPanel line 339) but `handleCanvasPointerMove` does not re-sort (line 351).

**Fix (minimal):** Sort once in `setCurve` within `animationStore.ts` so `evalCurveAtBeat` can assume sorted order and use a simple linear scan without allocating. Alternatively, pre-sort in `setCurve` and remove the `.sort()` call from the evaluator.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
