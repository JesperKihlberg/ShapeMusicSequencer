---
quick_id: 260428-gfx
slug: ghost-lines-disappear-on-zoom-point-add
status: in_progress
---

# Ghost lines disappear when zoomed beyond curve length and a new point is added

## Problem

When `zoomBeats > curve.duration` (e.g. zoom=8, curve length=4 beats), the canvas should show
the primary curve on the left half and ghost copies on the right half.

When stopped and a new curve point is added, the canvas clears and only the primary curve is
redrawn — ghost copies are erased and never repainted.

## Root Cause

`AnimationPanel.tsx` has two `useEffect` paths:

1. **Outer effect** (line ~70, deps: `[isPlaying, shape, zoomBeats]`) — draws the full canvas
   including ghost passes. Does NOT include `curve` in deps, so does not re-run on point add.

2. **`AnimLane` inner effect** (line ~481, deps: `[curve, property, selectedPointIdx]`) — fires
   on curve changes, calls `drawLaneCanvas` for the primary region only. No ghost passes.

When a point is added while stopped:
- Inner effect fires → clears canvas → draws primary curve only
- Outer effect does NOT fire (no relevant dep changed)
- Ghost regions are blank

## Fix

In `AnimLane`'s canvas drawing effect (`AnimationPanel.tsx` ~line 481), replicate the ghost
rendering logic that exists in the outer effect (lines ~137–168).

The `AnimLane` effect already has access to:
- `curve` (prop)
- `zoom` (from uiStore via `useSnapshot`)
- `canvas` and `ctx` refs

Steps:
1. After drawing the primary curve in the `AnimLane` effect, add ghost passes using the same
   geometry as the outer effect static path (lines 137–167).
2. Ghost condition: `zoom > curve.duration` — only render when zoom exceeds curve length.
3. The ghost drawing uses `drawLaneCanvas` with `zoomBeats=undefined` (so xDenominator falls
   back to `curve.duration`), clipped and translated per ghost copy.

## Files to change

- `src/components/AnimationPanel.tsx` — `AnimLane` component, canvas drawing effect (~line 481)

## Acceptance criteria

- [ ] Ghost copies visible when zoom > curve.duration and player is stopped
- [ ] Ghost copies remain correct after adding a point to the curve
- [ ] Ghost copies remain correct when zoom changes
- [ ] No regression when zoom <= curve.duration (no ghosts expected)
- [ ] No regression during playback (RAF path unchanged)
