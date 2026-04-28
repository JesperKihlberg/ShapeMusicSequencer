---
phase: 10-visual-reference-grids
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/engine/noteHue.ts
  - src/engine/noteHue.test.ts
  - src/store/uiStore.ts
  - src/store/uiStore.test.ts
  - src/components/AnimationPanel.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the new `noteHue` engine utility, the `uiStore` Zustand store, and the updated `AnimationPanel` component that wires all Phase 10 drawing logic together. The code is well-structured and the TDD approach is visible. No security vulnerabilities or data-loss risks were found.

Four warnings surface: two concern the Y-axis zoom indicator strip using a flawed pixel formula (will produce incorrect thumb position/size when the viewport does not start at 0), one is a ghost-region interaction gap (pointer-move events are swallowed after the cursor crosses into a ghost region while dragging), and one is a minor race window in the RAF playhead. Three informational items cover the `chromatic` scale producing 12 grid lines (visually dense), a dead parameter in `pixelToPoint`, and a missing `yViewport` key reset when a curve is removed.

---

## Warnings

### WR-01: Y-axis zoom indicator strip uses incorrect thumb formula for non-zero `yMin`

**File:** `src/components/AnimationPanel.tsx:591-593`

**Issue:** The Y-axis scroll indicator strip computes `thumbTop` and `thumbHeight` relative to `fullMax` only, ignoring `yMin`. When the viewport is scrolled down (e.g. `yMin=90, yMax=270` on the hue lane), `thumbTop` will be calculated as `(1 - 270/360) * h = 0.25 * h` but the thumb should start at `(1 - (270-0)/(360-0)) * h`. More critically `thumbHeight` is `((yMax - yMin) / (fullMax - fullMin)) * h` — this part is correct — but `thumbTop` should be `((fullMax - yMax) / (fullMax - fullMin)) * h` to represent position within the full range correctly. The current formula anchors the top of the thumb to `1 - yMax/fullMax` which is identical only when `fullMin = 0`, coincidentally correct for the current ranges (0–360, 0–100). However when a non-zero `fullMin` is introduced the formula silently breaks. Additionally the `thumbHeight` formula has a subtle bug: it uses `fullMax` in the denominator but does not subtract `fullMin`, so it works now only because `fullMin` is always 0. This is latent and worth hardening now.

**Fix:**
```typescript
// Replace lines 591-593 with:
const fullRange = fullMax - fullMin
const thumbTop = ((fullMax - yMax) / fullRange) * h
const thumbHeight = Math.max(4, ((yMax - yMin) / fullRange) * h)
```

---

### WR-02: Drag pointer-move swallowed when cursor enters ghost region mid-drag

**File:** `src/components/AnimationPanel.tsx:806-820`

**Issue:** `handleCanvasPointerMove` returns early when `px > primaryRegionWidth` (line 816). Because pointer capture is held on the canvas (set in `handleCanvasPointerDown`), this early return silently drops the drag when the user briefly moves the mouse to the right past the primary region boundary. The point stops updating but the drag lock (`isDraggingPoint.current`) remains `true`. The cursor appears to "stick". The intent (no edits in ghost region) is correct but the fix should clamp `px` rather than silently drop the event.

**Fix:**
```typescript
function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
  if (!isDraggingPoint.current || selectedPointIdx === null) return
  const rect = canvasRect.current ?? canvasRef.current!.getBoundingClientRect()
  let px = e.clientX - rect.left
  const py = e.clientY - rect.top

  // Clamp px to primary region so dragging into ghost area keeps the last valid position
  const canvas = canvasRef.current!
  const currentZoom = uiStore.getState().zoomBeats
  const primaryRegionWidth = (curve.duration / currentZoom) * canvas.width
  px = Math.min(px, primaryRegionWidth)   // clamp instead of early-return

  const updated = pixelToPoint(px, py)
  const newPoints = curve.points.map((p, i) => i === selectedPointIdx ? updated : p)
  animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
}
```

---

### WR-03: `pixelToPoint` ignores `yViewport` — point inserted at wrong value when lane is zoomed

**File:** `src/components/AnimationPanel.tsx:748-758`

**Issue:** `pixelToPoint` uses the full property range (`minVal`/`maxVal` from `getPropertyRange`) to convert a canvas pixel Y coordinate into a value. When the Y-axis viewport is zoomed in (e.g. `yViewport.hue = { min: 90, max: 270 }`), a click at the vertical midpoint of the canvas should produce `hue = 180`, but the current formula gives `hue = 180` only by coincidence (full range midpoint). A click near the top of a zoomed canvas should produce a value near `yMax` (270), not near 360. The same bug applies to `pointToPixel` used in the hit-test path — control points will not visually align with their click targets when zoomed.

**Fix:**
```typescript
function pixelToPoint(px: number, py: number): SplinePoint {
  const canvas = canvasRef.current!
  const [minVal, maxVal] = getPropertyRange(property)
  const zoom = uiStore.getState().zoomBeats
  // Use yViewport so value maps correctly when zoomed in
  const yVp = uiStore.getState().yViewport[property] ?? { min: minVal, max: maxVal }
  const beat = (px / canvas.width) * zoom
  const value = yVp.max - (py / canvas.height) * (yVp.max - yVp.min)
  return {
    beat: Math.max(0, Math.min(curve.duration, beat)),
    value: Math.max(minVal, Math.min(maxVal, value)),
  }
}

function pointToPixel(p: SplinePoint, w: number, h: number): [number, number] {
  const [minVal, maxVal] = getPropertyRange(property)
  const zoom = uiStore.getState().zoomBeats
  const yVp = uiStore.getState().yViewport[property] ?? { min: minVal, max: maxVal }
  const px = (p.beat / zoom) * w
  const py = ((yVp.max - p.value) / (yVp.max - yVp.min)) * h
  return [px, py]
}
```

---

### WR-04: RAF tick reads `shape?.id` as a string key but `shape` is a React-state closure value that may be stale

**File:** `src/components/AnimationPanel.tsx:85`

**Issue:** Inside the RAF `tick` function (line 85), `shape` is closed over from the outer `useEffect` dependency array. The effect re-runs when `shape` changes, so on most updates this is fine. However, the RAF loop is started once (`rafId = requestAnimationFrame(tick)`) and `tick` calls itself recursively. If `shape` changes after the first frame (e.g. user selects a different cell while playing) the stale `shape?.id` value on line 85 will read curves from the wrong shape until the effect re-fires and starts a new RAF loop. The effect dependency array already includes `shape` (line 197) so the loop restarts correctly — but there is a one-frame window where the old `tick` closure fires after the new one has started, potentially double-drawing. The `return () => cancelAnimationFrame(rafId)` cleanup covers this for the _previous_ RAF id, but `rafId` is a `let` scoped to the outer `useEffect` body, not the `tick` closure. This means the cleanup captures the correct `rafId` only if the `let rafId` assignment on line 138 ran in the same effect instance. In practice this is safe in React's strict-mode double-invoke, but it is fragile.

A cleaner pattern is to store the shape id in a ref so `tick` always reads the current value:

**Fix:**
```typescript
// Add near other refs (~line 52):
const shapeIdRef = useRef<string | undefined>(shape?.id)
useEffect(() => { shapeIdRef.current = shape?.id }, [shape])

// In tick(), replace line 85:
const curve = animationStore.getState().curves[shapeIdRef.current ?? '']?.[prop]
```

---

## Info

### IN-01: `chromatic` scale produces 12 hue grid lines — potentially too dense for small lane heights

**File:** `src/components/AnimationPanel.tsx:411`

**Issue:** `scaleNoteHues` is called with whatever scale is active in `scaleStore`. When `scale === 'chromatic'` this produces 12 equally-spaced lines at 0, 30, 60, 90 ... 330 degrees. On a compressed lane (40 px tall) these lines are ~3 px apart. This is not a bug — it is consistent with the design — but a comment or a future guard (e.g. skip chromatic grid lines when lane height < 60 px) would prevent visual noise being misread as a bug.

**Fix:** Add a comment and consider a lane-height guard:
```typescript
// Skip scale grid when chromatic (12 lines) and lane is too small to render clearly
if (options.scale === 'chromatic' && h < 60) { /* skip */ }
```

---

### IN-02: `uiStore.test.ts` `beforeEach` does not reset `yViewport` for all describe blocks

**File:** `src/store/uiStore.test.ts:7-9, 21-23, 41-43`

**Issue:** The three `beforeEach` blocks in the defaults, `setZoomBeats`, and `setFocusedLane` describe groups reset `zoomBeats` and `focusedLane` but leave `yViewport` at whatever the previous test left it. Test ordering currently doesn't expose this as a problem, but if the `yViewport` tests (which run last in the file) are ever moved above the other groups or run in isolation, they may see non-empty `yViewport` from the defaults group's initial state. The `yViewport` describe block does correctly use `uiStore.setState({ ..., yViewport: {} })`.

**Fix:** Add `yViewport: {}` to each `beforeEach` `setState` call in the non-yViewport describe blocks:
```typescript
beforeEach(() => {
  uiStore.setState({ zoomBeats: 4, focusedLane: null, yViewport: {} })
})
```

---

### IN-03: Removing a curve does not clear its `yViewport` entry from `uiStore`

**File:** `src/components/AnimationPanel.tsx:893-896`

**Issue:** When the user clicks the `×` remove button on a lane, `animationStore.removeCurve` is called but `uiStore`'s `yViewport` entry for that property is never cleared. If the user re-adds the same property curve later, the previous zoom/pan state is silently restored. This may be intentional (user re-adds and finds their viewport unchanged), but if it is not, the viewport will appear zoomed in for a brand-new curve with no user action. This is a design ambiguity, not a crash.

**Fix (if reset is intended):**
```typescript
onClick={(e) => {
  e.stopPropagation()
  animationStore.getState().removeCurve(shapeId, property)
  // Clear stale yViewport so re-added curve starts at full range
  uiStore.getState().setYViewport(property, getPropertyRange(property) as unknown as { min: number; max: number })
}}
```
Or document the intentional behaviour with a comment.

---

_Reviewed: 2026-04-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
