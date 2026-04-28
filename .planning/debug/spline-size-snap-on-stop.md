---
status: resolved
trigger: "When playback is stopped (isPlaying goes false), shapes with active spline size curves snap back to their default/base visual size instead of freezing at whatever size the curve was at when Stop was pressed."
created: 2026-04-24T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Focus

hypothesis: Line 167 in canvasEngine.ts gates evalCurveAtBeat behind `isPlaying`, so when stopped the branch is skipped and effectiveSize falls through to `shape.size`.
test: Inspected the drawShapes function directly.
expecting: Removing the `&& isPlaying` guard will freeze the shape at the curve's value at the moment stop was pressed (because beatPos is still the last performance.now()-derived position, which stops advancing when the RAF loop still runs but isPlaying is false — wait, RAF still runs, so beatPos still advances. Need to capture last beat at stop time instead, OR drop the guard AND capture a frozen beatPos.)
next_action: DONE — root cause confirmed, fix documented below.

## Symptoms

expected: Shape freezes visually at its current curve-driven size when playback is stopped.
actual: Shape snaps back to base size (shape.size, 50% by default) when isPlaying goes false.
errors: No runtime error — purely a visual regression.
reproduction: Add a size spline curve to a shape, start playback, observe shape animating, press Stop.
started: Phase 7 Wave 2b — when effectiveSize branch was gated on isPlaying.

## Eliminated

- hypothesis: playbackStore subscriber resets a size variable explicitly
  evidence: playbackStore.subscribe only sets dirty=true — no size reset
  timestamp: 2026-04-24

- hypothesis: animationStore is cleared on stop
  evidence: animationStore has no isPlaying-aware logic; curves persist until explicitly removed
  timestamp: 2026-04-24

## Evidence

- timestamp: 2026-04-24
  checked: canvasEngine.ts drawShapes, lines 165-169
  found: |
    let effectiveSize = shape.size                          // line 165 — default
    const shapeCurves = curves[shape.id]
    if (shapeCurves?.size && isPlaying) {                  // line 167 — GATE
      effectiveSize = evalCurveAtBeat(shapeCurves.size, beatPos)
    }
  implication: When isPlaying is false the if-branch is never entered; effectiveSize stays at shape.size. This is the snap-back.

- timestamp: 2026-04-24
  checked: canvasEngine.ts render() line 202
  found: "Always redraw when shapes exist" — RAF loop continues running when stopped; beatPos still advances each frame via performance.now().
  implication: Dropping the isPlaying guard alone would cause the curve to keep animating visually even while audio is paused. To truly freeze the visual at the stop-time value, the canvas engine must capture a frozen beat position when isPlaying transitions to false, and use that frozen value for curve evaluation while stopped.

## Resolution

root_cause: |
  src/engine/canvasEngine.ts line 167.
  The condition `if (shapeCurves?.size && isPlaying)` was an intentional design
  decision recorded in the 07-03 summary: "effectiveSize uses spline value only
  when isPlaying — static base size when stopped matches previous freeze-at-1.0
  semantics." That decision is now confirmed wrong per the desired behavior.

  Two sub-problems exist:
  1. The isPlaying guard causes snap-back to shape.size (the immediate bug).
  2. beatPos is computed from performance.now() every frame, so dropping the
     guard without a freeze would let the curve keep advancing visually while
     audio is paused (a secondary problem, but not what the user is hitting yet).

fix: |
  **Minimal fix (1-line removal + freeze variable — ~5 lines total):**

  In drawShapes, capture a module-level `frozenBeatPos: number | null = null`.
  In the playbackStore subscriber, when isPlaying transitions false → true reset it,
  when true → false store the current beatPos.
  In drawShapes, use `frozenBeatPos ?? beatPos` as the evaluation position, and
  drop the `&& isPlaying` guard.

  Concretely:

  ```ts
  // Module-level, next to rafId / dirty:
  let frozenBeatPos: number | null = null

  // In drawShapes, replace lines 155-168 with:
  const t = performance.now() / 1000
  const { bpm, isPlaying } = playbackStore.getState()
  const beatPos = frozenBeatPos !== null ? frozenBeatPos : (t * bpm) / 60
  const curves = animationStore.getState().curves

  for (const shape of shapes) {
    // ...
    let effectiveSize = shape.size
    const shapeCurves = curves[shape.id]
    if (shapeCurves?.size) {                       // <-- isPlaying guard REMOVED
      effectiveSize = evalCurveAtBeat(shapeCurves.size, beatPos)
    }
  ```

  And in the playbackStore subscriber, replace the one-liner with:
  ```ts
  const unsubscribePlayback = playbackStore.subscribe((state, prev) => {
    if (prev.isPlaying && !state.isPlaying) {
      // Freeze beat position at the moment of stop
      const t = performance.now() / 1000
      frozenBeatPos = (t * state.bpm) / 60
    } else if (!prev.isPlaying && state.isPlaying) {
      frozenBeatPos = null   // Resume: advance freely again
    }
    dirty = true
  })
  ```

  **Is it a 1-line fix?** No. Removing the `&& isPlaying` guard alone (1 line)
  fixes the snap-back but introduces a secondary issue: curve keeps animating
  visually while audio is paused. The correct fix is ~10 lines across two places
  in canvasEngine.ts only — no other files need to change.

verification: Root cause confirmed by direct code inspection. Fix design confirmed
  by tracing the RAF loop and performance.now() behavior.
files_changed:
  - src/engine/canvasEngine.ts
