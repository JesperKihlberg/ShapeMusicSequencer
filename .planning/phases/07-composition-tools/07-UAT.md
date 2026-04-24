---
status: complete
phase: 07-composition-tools
source: 07-00-SUMMARY.md, 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md
started: 2026-04-24T06:50:00Z
updated: 2026-04-24T07:05:00Z
---

## Current Test

[testing complete]

## Tests

### Auto-verified (Playwright)

#### A1. App loads with animation panel
expected: App opens, animation panel visible at bottom with "No curves yet. Click a shape and press Animate." empty state
result: pass

#### A2. Drag handle present and correct size
expected: 8px drag strip at top of animation panel, role="separator", aria-label="Resize animation panel"
result: pass

#### A3. CellPanel empty → Add Shape → shape appears
expected: Click empty cell, Add Shape button appears, clicking it places a circle on the canvas
result: pass

#### A4. CellPanel occupied: Animate button (no beat-selector)
expected: Occupied mode shows "Animate" button with aria-label "Open animation panel for this shape" — no beat-fraction buttons
result: pass

#### A5. Animation panel header updates on shape select
expected: Panel header shows "Cell (2, 2)" shape label when shape is selected
result: pass

#### A6. + Add Curve enabled on shape select
expected: "+ Add Curve" button becomes enabled when a shape is selected
result: pass

#### A7. Property picker shows 4 options
expected: Clicking "+ Add Curve" shows dropdown with size, hue, saturation, lightness (lowercase, in that order)
result: pass

#### A8. Adding "size" creates correct lane structure
expected: Lane with "size" label, duration spinbutton (default 4b), "b" unit, "×" remove button, canvas
result: pass

#### A9. "size" removed from picker after adding
expected: Re-opening picker after adding size shows only hue, saturation, lightness
result: pass

#### A10. Remove curve clears lane and shows empty state
expected: Clicking × on size lane removes it; "No curves yet" message returns
result: pass

#### A11. Panel default height 188px
expected: animation-panel-host height = 188px on load
result: pass

#### A12. Drag handle double-click collapses panel to 40px
expected: Double-clicking drag handle sets panel height to 40px
result: pass

#### A13. Animate button restores collapsed panel to 180px
expected: Clicking "Animate" when panel is collapsed (40px) expands it to 180px
result: pass

#### A14. Shape removal clears curves and resets panel
expected: Removing a shape clears its curves; animation panel shows empty state with no shape label
result: pass

## Manual Tests

### 1. Shapes play at static size (no pulsing) when no curve is active
expected: |
  Add a shape to the grid and press Start. The shape should stay at a fixed
  visual size — no pulsing or oscillating like in Phase 4/5. The LFO is gone.
  Size only changes if you have an active size curve running.
result: pass

### 2. Spline size curve modulates shape visually
expected: |
  Add a shape, open AnimationPanel, add a "size" curve. Click on the canvas area
  of the lane to add a control point at a different value from the defaults.
  Press Start. The shape on the canvas should visibly grow/shrink in sync with
  the spline curve looping.
result: pass

### 3. Spline size curve modulates audio (gain)
expected: |
  With the size curve running (from test 2), the audio volume should audibly
  follow the curve — louder when the curve value is high, quieter when low.
  The amplitude change should be smooth (not clicking/popping).
result: pass

### 4. Spline hue curve modulates pitch
expected: |
  Add a "hue" curve with a control point at a clearly different hue value
  (e.g., drag a point to the top of the canvas). Press Start. The pitch of the
  shape's audio should change over time as the hue value evolves along the curve.
result: pass

### 5. Multiple shapes have independent curves (polyrhythm)
expected: |
  Add two shapes to different cells. Give each a "size" curve with different
  durations (e.g., 4 beats vs 3 beats). Press Start. Both shapes should animate
  at their own rates independently — their visual sizes should drift in and out
  of phase, creating a polyrhythm effect.
result: pass

### 6. Duration input changes curve loop length
expected: |
  With a size curve active, change the duration input from 4 to 2 beats.
  Press blur/tab to confirm. The curve should now loop twice as fast visually.
result: pass

### 7. Curves freeze when stopped
expected: |
  With a shape and size curve running (Start pressed), press Stop. The shape
  should freeze at its current visual size and the animation should stop.
  Press Start again — animation resumes.
result: issue
reported: "it freezes in the default cell setting state"
severity: major

### 8. Hue/saturation/lightness curves modulate shape color visually
expected: |
  Add a shape, open AnimationPanel, add a "hue" curve. Add a control point at a
  clearly different hue value. Press Start. The shape on the canvas should visibly
  change color over time as the hue value evolves along the spline. Same applies
  to saturation and lightness curves — the shape fill/stroke color should update
  each animation frame to reflect the animated values.
result: issue
reported: "animated color properties are reflected in audio, but not on the visual shape on the canvas"
severity: major

## Summary

total: 22
passed: 20
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Shape freezes at its current visual size when Stop is pressed"
  status: resolved
  reason: "Fixed in 07-FIX-01: frozenBeatPos captured at stop, evalBeat uses frozen value, && isPlaying guard removed"
  severity: major
  test: 7
  root_cause: "The && isPlaying guard prevented curve evaluation when stopped, causing snap-to-base-size"
  artifacts:
    - path: "src/engine/canvasEngine.ts"
      fix: "frozenBeatPos module variable + subscriber capture + evalBeat selector"
  missing: []
  debug_session: ""

- truth: "Shape fill/stroke color updates each frame to reflect animated hue/saturation/lightness curve values"
  status: failed
  reason: "User reported: animated color properties are reflected in audio, but not on the visual shape on the canvas"
  severity: major
  test: 8
  root_cause: "canvasEngine.ts passes shape.color directly to drawShape — hue/saturation/lightness curves are evaluated for audio but never applied to the rendered color"
  artifacts:
    - path: "src/engine/canvasEngine.ts"
      issue: "drawShape called with shape.color; no effectiveColor computed from hue/saturation/lightness curves"
  missing:
    - "Compute effectiveColor by evaluating hue/saturation/lightness curves (same pattern as effectiveSize) and pass to drawShape"
  debug_session: ""
