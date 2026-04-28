---
phase: 11-shift-drag-snapping
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/AnimationPanel.tsx
  - src/engine/snapFormulas.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-28
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Both files are for Phase 11 Shift+drag snapping on animation curve control points. `AnimationPanel.tsx` is the primary implementation file containing the `AnimationPanel` component, the `AnimLane` sub-component, and the `drawLaneCanvas` pure helper. `snapFormulas.test.ts` contains unit tests for the snap math functions, defined inline in the test file as helper stubs.

The implementation is structurally sound and the Phase 11 additions (isSnappedRef, laneSnappedRefs map, snap branches in pointer handlers, snapped visual rendering in drawLaneCanvas) are correctly wired. No critical security issues were found.

Three warnings were identified: a division-by-zero risk in the Y-axis zoom indicator that exists before Phase 11 but is exercised by the new snap logic, a snap-state visual inconsistency on pointer-leave during a snap drag, and a logic gap where snap-on-insert only applies the beat snap for non-hue properties. Four info items cover redundant draw code, a magic number, a minor off-by-one boundary, and a test coverage gap.

## Warnings

### WR-01: Division-by-zero in Y-axis zoom indicator when `fullMax` is 0

**File:** `src/components/AnimationPanel.tsx:621`
**Issue:** The Y-axis zoom indicator strip computes `thumbTop = (1 - yMax / fullMax) * h`. `fullMax` is derived from `getPropertyRange`, which returns `[0, 360]` for `hue` and `[0, 100]` for all other properties — both non-zero in practice. However `fullMax` is computed inside `drawLaneCanvas` from the `property` parameter without a guard, so if an unknown/future property is ever passed the division `yMax / fullMax` would produce `Infinity` and `fillRect` would silently fail or produce a visual artefact. The same expression appears at line 622 as the `thumbHeight` numerator.

More immediately, if `yMin === yMax` (a degenerate viewport that can be reached by zooming all the way in past `MIN_RANGE`), the `thumbHeight` calculation `((yMax - yMin) / (fullMax - fullMin)) * h` returns `0` which is then `Math.max(4, 0)` — harmless — but the upstream zoom code at line 714 allows `newRange === MIN_RANGE` (which is `>0`), so this specific degenerate state is not reachable today. Still, the divisor `(yMax - yMin)` in `toPixel` (line 558) would produce `Infinity` px values if it were ever 0, rendering the entire curve at a single horizontal line with no error.

**Fix:** Add a guard in `drawLaneCanvas` before `toPixel` is used:
```ts
if (yMax <= yMin) return   // degenerate viewport — nothing to draw
```
Place this immediately after the `yMin`/`yMax` assignments at lines 422–423.

---

### WR-02: Snap visual state not cleared when pointer leaves canvas during a snap drag

**File:** `src/components/AnimationPanel.tsx:902-906`
**Issue:** `isSnappedRef.current` is set to `false` in `handleCanvasPointerUp` (line 904). However, if the user holds Shift, starts dragging a point, and the pointer leaves the canvas while still held down, `onPointerMove` stops firing on the canvas element. If the pointer then releases outside the canvas, `handleCanvasPointerUp` may not fire (pointer capture is set via `setPointerCapture` on line 839, so the canvas does continue to receive events — but only if `isDraggingPoint.current` was set to `true`, which only happens on hit-select, not on a re-select via a second pointerdown). If pointer capture is lost for any reason (e.g., browser cancels it), `isDraggingPoint.current` remains `true` and `isSnappedRef.current` remains `true`, causing the next static redraw (triggered by store change) to render all newly selected points as snapped even when they are not.

**Fix:** Add `onPointerCancel` to the canvas element to mirror the cleanup in `onPointerUp`:
```tsx
function handleCanvasPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
  isDraggingPoint.current = false
  isSnappedRef.current = false
  canvasRef.current?.releasePointerCapture(e.pointerId)
}
```
And wire it:
```tsx
<canvas
  ...
  onPointerCancel={handleCanvasPointerCancel}
/>
```

---

### WR-03: Shift+insert snaps only the beat axis for non-hue properties — value left unsnapped

**File:** `src/components/AnimationPanel.tsx:845-858`
**Issue:** In `handleCanvasPointerDown`, the Shift+insert branch (lines 845–858) snaps `beat` to the nearest integer and, for hue, snaps `value` to the nearest scale note. For `size`, `saturation`, and `lightness` the value is left free (only `snappedBeat` is applied). This is inconsistent with `handleCanvasPointerMove` (lines 882–892) which applies the same pattern.

This is likely intentional — there is no natural discrete grid for `size`/`saturation`/`lightness` the way there is a scale for hue. However, the comment on line 844 says `"Phase 11: Shift snap on insert (D-04)"` without clarifying this distinction. If D-04 intends value snap only for hue, this is correct behavior but the asymmetry is a latent misread risk.

**Fix:** If hue-only value snap is intentional, add an inline comment to make it explicit:
```ts
// Only hue snaps to scale notes; size/saturation/lightness have no discrete value grid
if (property === 'hue') {
  ...
}
```
If value snap for other properties is also desired (e.g., snap saturation/lightness to 0/25/50/75/100), the insert branch needs the same grid logic added.

---

## Info

### IN-01: Ghost-pass drawing logic is duplicated three times

**File:** `src/components/AnimationPanel.tsx:116-145, 181-206, 754-781`
**Issue:** The ghost-pass loop (full repeats + partial remainder) is copy-pasted identically into the RAF tick's playing branch, the RAF tick's stopped branch, and the static draw `useEffect` in `AnimLane`. All three blocks share the same logic with only the variable names changed (`currentZoom` vs `zoomBeats` vs `zoom`). This is ~30 lines of duplicated drawing code.

**Fix:** Extract into a helper function, e.g.:
```ts
function drawGhostPasses(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  curve: SplineCurve,
  prop: AnimatableProperty,
  zoom: number,
  options: DrawOptions
): void {
  const primaryWidthPx = (curve.duration / zoom) * canvas.width
  const repeatCount = Math.floor(zoom / curve.duration) - 1
  // ... full + partial loops ...
}
```
This would reduce the total surface area for bugs in the ghost-pass math.

---

### IN-02: Magic number `0.30` for ghost opacity appears four times

**File:** `src/components/AnimationPanel.tsx:123, 138, 185, 200` (and again at lines 761, 776)
**Issue:** The ghost copy alpha `0.30` is repeated six times across the file without a named constant.

**Fix:**
```ts
const GHOST_ALPHA = 0.30
```
Define at module level alongside the other constants (`PANEL_MIN`, `PANEL_DEFAULT`, etc.).

---

### IN-03: `snapBeat` test at line 40 tests clamping to non-integer `duration` — mismatches actual usage

**File:** `src/engine/snapFormulas.test.ts:40-43`
**Issue:** The test comment says `"rawBeat=3.7 rounds to 4, but duration=3.5 → clamp to 3.5"` and asserts `snapBeat(3.7, 3.5)` returns `3.5`. This is mathematically correct for the inline `snapBeat` function, but in `AnimLane` the actual usage at lines 883 and 846 applies `Math.round` before `Math.min(curve.duration, ...)`. For a duration of `3.5`, `Math.round(3.7) = 4`, and `Math.min(3.5, 4) = 3.5` — so the result is correct. However, the test description implies the snap always clamps to `duration` even when `duration` is non-integer. If `duration` is `3.5` and `rawBeat` is `3.4`, `Math.round(3.4) = 3`, `Math.min(3.5, 3) = 3` — the result is `3`, not `3.5`. There is no test covering this case, which could mislead a reader into thinking all near-end-of-loop drags snap to `duration` rather than `3`.

**Fix:** Add a test:
```ts
it('fractional duration: beat=3.4 with duration=3.5 rounds to 3 not 3.5', () => {
  expect(snapBeat(3.4, 3.5)).toBe(3)
})
```

---

### IN-04: `snapHue` test at line 57 assumes a specific hue mapping that depends on `scaleNoteHues` internals

**File:** `src/engine/snapFormulas.test.ts:57-81`
**Issue:** The test descriptions hard-code expected hue values (e.g., `"hues: 0,60,120,150,210,270,330"` for C major) derived from the `scaleNoteHues` formula. If the hue-to-semitone mapping in `noteHue.ts` is ever changed, these tests will break with cryptic failures rather than pointing to the formula change. The tests also do not verify the test's own assumed hue table against the live `scaleNoteHues` output.

**Fix:** Derive expected hue values from `scaleNoteHues` in the test body rather than hard-coding them:
```ts
it('snaps to nearest scale hue — C major root', () => {
  const hues = scaleNoteHues(0, 'major').map(n => n.hue)
  const rawHue = 10
  const closest = hues.reduce((best, h) => Math.abs(h - rawHue) < Math.abs(best - rawHue) ? h : best)
  expect(snapHue(rawHue, 0, 'major')).toBe(closest)
})
```
This makes the test resilient to formula changes while still verifying the snap-to-nearest behavior.

---

_Reviewed: 2026-04-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
