---
status: complete
---

# Summary

Fixed ghost lines disappearing when zoomed beyond curve length and a new point is added.

## Root cause

`AnimLane`'s curve-change `useEffect` (deps: `[curve, property, selectedPointIdx]`) called
`drawLaneCanvas` for the primary region only. The outer `useEffect` (deps: `[isPlaying, shape,
zoomBeats]`) held all the ghost-pass logic but didn't re-run on curve changes, so any point
add/move while stopped cleared the canvas and left ghost regions blank.

## Fix

Added full ghost pass logic (full copies loop + partial remainder) to the `AnimLane` curve-change
effect at `AnimationPanel.tsx:491–519`. Mirrors the existing outer-effect static path exactly.

## Commit

`1e2df44` fix(anim): repaint ghost lanes after curve point add while stopped
