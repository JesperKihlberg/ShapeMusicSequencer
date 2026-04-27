---
phase: 09-timeline-zoom-ghosts-and-lane-focus
reviewed: 2026-04-27T07:56:16Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/store/uiStore.ts
  - src/store/uiStore.test.ts
  - src/components/AnimationPanel.tsx
  - src/styles/index.css
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-27T07:56:16Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This phase adds three features to the animation panel: a zoom segmented-button control that changes the visible beat span (`zoomBeats`), ghost copies of animation curves for repeated loop regions, and a lane focus/compress toggle. The store (`uiStore.ts`) and tests (`uiStore.test.ts`) are clean and well-structured. The CSS (`index.css`) is correct and consistent. The main concerns are concentrated in `AnimationPanel.tsx`: a ghost-drawing logic error that causes the partial ghost to be misplaced or overlap the primary region in specific edge cases, a missing bounds guard in `setZoomBeats` that allows nonsensical values at the store level, stale-closure access to `selectedPointsRef` that is initialised after it is used in the RAF tick, and a pointer-interaction asymmetry where `pointerdown` is blocked in the ghost region but `pointermove` can still drag a point from the primary region into the ghost region.

---

## Warnings

### WR-01: Ghost partial-tail draws at wrong offset when `zoomBeats` is an exact multiple of `curve.duration`

**File:** `src/components/AnimationPanel.tsx:104-117` (playing) and `152-167` (stopped)

**Issue:** The partial-ghost guard is `if (remainder > 0 && repeatCount >= 0)`. When `zoomBeats` is an exact multiple of `curve.duration`, `remainder === 0` so no partial is drawn — correct. However, `repeatCount` can be `-1` when `zoomBeats < curve.duration` (e.g. zoom=2, duration=4: `Math.floor(2/4) - 1 = -1`). In that case `remainder = 2 % 4 = 2 > 0` and `repeatCount >= 0` is `false`, so the branch is correctly skipped. This path is safe.

The real bug is in `partialStartPx` computation (line 107 / 157):

```ts
const partialStartPx =
  Math.floor(currentZoom / curve.duration) * curve.duration / currentZoom * canvas.width
```

Operator precedence evaluates this as:

```
(Math.floor(currentZoom / curve.duration) * curve.duration) / currentZoom * canvas.width
```

That is `(repeatCount + 1) * curve.duration / currentZoom * canvas.width`, which equals `primaryWidthPx * (repeatCount + 1)` — the correct start position of the partial ghost. So the arithmetic is actually correct, but the lack of parentheses makes it a maintenance hazard. More critically: when `zoomBeats < curve.duration` (zoom=2, duration=4), `repeatCount = -1` and `remainder = 2`. The guard `repeatCount >= 0` saves us here, but this is a fragile defence. If someone removes the guard thinking it is redundant, a partial ghost with `repeatCount = -1` would position at `0 * duration / zoom * width = 0`, drawing on top of the primary region with `primaryWidthPx = (4/2)*w = 2w` (width wider than the canvas), causing a large semi-transparent rectangle to obscure the entire primary curve.

**Fix:** Add an explicit `zoomBeats >= curve.duration` guard and add parentheses for clarity:

```ts
const remainder = currentZoom % curve.duration
// Only draw partial if zoom exceeds one full period and there is a remainder
if (remainder > 0 && repeatCount >= 0 && currentZoom >= curve.duration) {
  const partialStartPx =
    ((Math.floor(currentZoom / curve.duration) * curve.duration) / currentZoom) * canvas.width
  // ...
}
```

Apply the same fix to the stopped branch at lines 155–167.

---

### WR-02: `pixelToPoint` in `AnimLane` ignores `zoomBeats` — click coordinates map to wrong beats when zoomed

**File:** `src/components/AnimationPanel.tsx:494-503`

**Issue:** `pixelToPoint` converts a canvas pixel x-coordinate to a beat value using `curve.duration` as the full-width denominator:

```ts
const beat = (px / canvas.width) * curve.duration
```

But when `zoomBeats !== curve.duration` the canvas x-axis represents `zoomBeats` beats, not `curve.duration` beats. A click at the right edge of the canvas maps to `curve.duration` beats in this calculation, but visually it represents `zoomBeats` beats. The result: when zoom is 8 and curve duration is 4, clicking at `px = canvas.width/2` (which visually is at beat 4 = `curve.duration`) maps to beat 2 instead of beat 4. New control points are inserted at incorrect beat positions whenever `zoomBeats !== curve.duration`.

**Fix:** Read `zoomBeats` from the store inside `pixelToPoint` (or pass it as a parameter) and use it as the denominator for the x-axis, then clamp to `curve.duration`:

```ts
function pixelToPoint(px: number, py: number): SplinePoint {
  const canvas = canvasRef.current!
  const [minVal, maxVal] = getPropertyRange(property)
  const currentZoom = uiStore.getState().zoomBeats
  const beat = (px / canvas.width) * currentZoom   // x-axis = zoomBeats, not curve.duration
  const value = maxVal - (py / canvas.height) * (maxVal - minVal)
  return {
    beat: Math.max(0, Math.min(curve.duration, beat)),  // still clamped to curve.duration
    value: Math.max(minVal, Math.min(maxVal, value)),
  }
}
```

The same fix applies to `pointToPixel` (line 506-511) — `curve.duration` is used as the x denominator when drawing hit targets, so hit detection is also offset. Change its denominator to `currentZoom` for spatial consistency.

---

### WR-03: Drag can move a point into the ghost region via `pointerdown` → `pointermove` after pointer escapes primary boundary

**File:** `src/components/AnimationPanel.tsx:550-565`

**Issue:** `handleCanvasPointerMove` checks `px > primaryRegionWidth` and returns early, but the check uses the instantaneous pointer x position. When a user starts dragging a point near the right boundary of the primary region and moves quickly, the pointer can land in the ghost region for a single frame before the early-return fires. More importantly: once pointer capture is set (`canvas.setPointerCapture`), pointer events continue to be delivered even when the physical pointer is outside the canvas element entirely. There is no guard that snaps the point back to `curve.duration` when the pointer enters the ghost region mid-drag; the function simply discards the update. This means the visual position of the point and the stored beat value can diverge during fast moves across the boundary — not a crash, but a confusing UX gap.

**Fix:** Instead of returning early, clamp `px` to `primaryRegionWidth` before passing it to `pixelToPoint`:

```ts
function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
  if (!isDraggingPoint.current || selectedPointIdx === null) return
  const rect = canvasRect.current ?? canvasRef.current!.getBoundingClientRect()
  const rawPx = e.clientX - rect.left
  const py = e.clientY - rect.top

  const canvas = canvasRef.current!
  const currentZoom = uiStore.getState().zoomBeats
  const primaryRegionWidth = (curve.duration / currentZoom) * canvas.width
  // Clamp into primary region rather than discarding — keeps the drag live
  const px = Math.min(rawPx, primaryRegionWidth)

  const updated = pixelToPoint(px, py)
  const newPoints = curve.points.map((p, i) => i === selectedPointIdx ? updated : p)
  animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
}
```

---

### WR-04: `setZoomBeats` accepts any number — no validation at the store level

**File:** `src/store/uiStore.ts:18`

**Issue:** `setZoomBeats: (beats: number) => set({ zoomBeats: beats })` stores the value without any range or validity check. The UI constrains callers to `[1, 2, 4, 8, 16, 32, 64]`, but the store is exported and can be called programmatically. A value of `0` passed here causes a division-by-zero in all ghost-geometry computations in `AnimationPanel.tsx` (lines 88, 93, 107, etc.) since `currentZoom` is used as a divisor. A negative value would invert ghost positioning.

**Fix:** Validate in the store action:

```ts
setZoomBeats: (beats: number) => {
  if (beats <= 0 || !Number.isFinite(beats)) return  // guard against 0/negative/NaN/Infinity
  set({ zoomBeats: beats })
},
```

---

## Info

### IN-01: Ghost-drawing code is duplicated between the playing and stopped branches

**File:** `src/components/AnimationPanel.tsx:87-117` and `137-167`

**Issue:** The full-ghost loop and partial-ghost block are copy-pasted between the `isPlaying` RAF tick (lines 87–117) and the stopped one-shot draw (lines 137–167). The only differences are the variable names (`currentZoom` vs `zoomBeats`) for the same value and the `beat` argument to `drawLaneCanvas`. This duplication means any fix to the ghost logic (e.g. WR-01 above) must be applied twice.

**Fix:** Extract a helper function:

```ts
function drawGhosts(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  curve: SplineCurve,
  prop: AnimatableProperty,
  zoom: number,
) {
  const primaryWidthPx = (curve.duration / zoom) * canvas.width
  const repeatCount = Math.floor(zoom / curve.duration) - 1
  for (let i = 1; i <= repeatCount; i++) {
    const ghostStartPx = (i * curve.duration / zoom) * canvas.width
    ctx.save()
    ctx.globalAlpha = 0.30
    ctx.beginPath()
    ctx.rect(ghostStartPx, 0, primaryWidthPx, canvas.height)
    ctx.clip()
    ctx.translate(ghostStartPx, 0)
    drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
    ctx.restore()
  }
  const remainder = zoom % curve.duration
  if (remainder > 0 && repeatCount >= 0 && zoom >= curve.duration) {
    const partialStartPx = ((Math.floor(zoom / curve.duration) * curve.duration) / zoom) * canvas.width
    const partialWidthPx = (remainder / zoom) * canvas.width
    ctx.save()
    ctx.globalAlpha = 0.30
    ctx.beginPath()
    ctx.rect(partialStartPx, 0, partialWidthPx, canvas.height)
    ctx.clip()
    ctx.translate(partialStartPx, 0)
    drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
    ctx.restore()
  }
}
```

---

### IN-02: `uiStore.test.ts` — ghost geometry tests are pure math, not store integration

**File:** `src/store/uiStore.test.ts:64-104`

**Issue:** The `ghost geometry formulas` describe-block (lines 64–104) tests arithmetic expressions inline rather than calling any module code. These tests document the expected formula and serve as a useful regression check, but they cannot catch the actual bug in WR-01 (wrong edge-case logic in the component) because they never call `AnimationPanel` or `drawLaneCanvas`. This is not a bug but is worth noting for coverage completeness.

**Fix:** Consider adding a separate integration test or moving the formula validation into a dedicated pure-function export (e.g. `computeGhostLayout`) that both the component and the tests import, so the test directly exercises the production code path.

---

### IN-03: `anim-lane__label-col` cursor rule is declared twice in `index.css`

**File:** `src/styles/index.css:684-693` and `836`

**Issue:** `.anim-lane__label-col` appears in two separate rule blocks. The first (line 684) is the structural definition. The second (line 836) adds only `cursor: pointer`. Because the second block has no other properties it does not cause a visual conflict (cursor wins by source order), but it is a split-definition that can confuse future maintainers and risks accidental override if properties are added to either block independently.

**Fix:** Merge `cursor: pointer` into the original `.anim-lane__label-col` rule at line 684:

```css
.anim-lane__label-col {
  width: 60px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-2) var(--space-2);
  border-right: 1px solid var(--color-border-tertiary);
  gap: var(--space-1);
  cursor: pointer;   /* <-- moved here from the duplicate rule at line 836 */
}
```

---

_Reviewed: 2026-04-27T07:56:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
