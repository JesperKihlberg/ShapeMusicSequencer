---
phase: 07-composition-tools
plan: FIX-01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/engine/canvasEngine.ts
autonomous: true
requirements:
  - ANIM-02
gap_closure: true
uat_gaps:
  - "Test 7: Shape freezes at its current visual size when Stop is pressed"

must_haves:
  truths:
    - "Pressing Stop freezes each shape at the visual size the spline curve had at the moment Stop was pressed"
    - "Pressing Start after Stop resumes animation from real-time beat position"
    - "Shapes with no size curve are unaffected — they continue to render at base size"
  artifacts:
    - path: "src/engine/canvasEngine.ts"
      provides: "frozenBeatPos capture + freeze-aware evalCurveAtBeat path"
      contains: "frozenBeatPos"
  key_links:
    - from: "playbackStore subscriber (canvasEngine.ts)"
      to: "frozenBeatPos module variable"
      via: "subscriber captures beatPos at the instant isPlaying transitions false→true"
      pattern: "frozenBeatPos\\s*="
    - from: "drawShapes (canvasEngine.ts)"
      to: "evalCurveAtBeat"
      via: "uses frozenBeatPos when not null, live beatPos otherwise"
      pattern: "frozenBeatPos !== null"
---

<objective>
Fix UAT Test 7: when the user presses Stop, shapes that have an active size curve
snap back to shape.size (the base fallback) because the `&& isPlaying` guard
prevents the curve from being evaluated. The fix captures the beat position at the
instant playback stops into a module-level `frozenBeatPos` variable and uses that
frozen value for curve evaluation while stopped.

Purpose: Shapes must freeze at the curve's current visual position on Stop, not
reset to their base size.
Output: One modified file — src/engine/canvasEngine.ts.
</objective>

<execution_context>
@/root/.claude/get-shit-done/workflows/execute-plan.md
@/root/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-composition-tools/07-UAT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add frozenBeatPos and fix effectiveSize guard in canvasEngine.ts</name>
  <files>src/engine/canvasEngine.ts</files>
  <action>
Apply ALL four changes below to src/engine/canvasEngine.ts. Make only these
changes — touch no other logic.

──────────────────────────────────────────────────────────────────────────────
CHANGE 1 — Add module-level frozenBeatPos variable (after line 14, before the
           "Pure helper" section comment on line 16).

Insert after line 14 (`import type { SplineCurve } from '../store/animationStore'`):

```typescript
// frozenBeatPos: beat position captured at the instant Stop is pressed.
// null means playback is live; non-null means use this position for curve evaluation.
let frozenBeatPos: number | null = null
```

──────────────────────────────────────────────────────────────────────────────
CHANGE 2 — Replace the drawShapes beat-position block (lines 155–168).

BEFORE (lines 155–168):
```typescript
    const t = performance.now() / 1000
    const { bpm, isPlaying } = playbackStore.getState()
    const beatPos = (t * bpm) / 60
    const curves = animationStore.getState().curves

    for (const shape of shapes) {
      const cx = offsetX + shape.col * cellSize + Math.floor(cellSize / 2)
      const cy = offsetY + shape.row * cellSize + Math.floor(cellSize / 2)

      // Determine effective size: base size OR spline-modulated size if curve present
      let effectiveSize = shape.size
      const shapeCurves = curves[shape.id]
      if (shapeCurves?.size && isPlaying) {
        effectiveSize = evalCurveAtBeat(shapeCurves.size, beatPos)
      }
```

AFTER:
```typescript
    const t = performance.now() / 1000
    const { bpm } = playbackStore.getState()
    const liveBeatPos = (t * bpm) / 60
    const curves = animationStore.getState().curves

    for (const shape of shapes) {
      const cx = offsetX + shape.col * cellSize + Math.floor(cellSize / 2)
      const cy = offsetY + shape.row * cellSize + Math.floor(cellSize / 2)

      // Determine effective size: base size OR spline-modulated size if curve present.
      // frozenBeatPos is non-null while stopped — use it so the shape holds its
      // last animated position rather than snapping back to shape.size.
      let effectiveSize = shape.size
      const shapeCurves = curves[shape.id]
      const evalBeat = frozenBeatPos !== null ? frozenBeatPos : liveBeatPos
      if (shapeCurves?.size) {
        effectiveSize = evalCurveAtBeat(shapeCurves.size, evalBeat)
      }
```

Key changes in CHANGE 2:
- `isPlaying` removed from the destructure (no longer needed here).
- `beatPos` renamed to `liveBeatPos` to distinguish from the frozen value.
- `evalBeat` selects `frozenBeatPos` when non-null, `liveBeatPos` otherwise.
- The `&& isPlaying` guard is removed from the `if (shapeCurves?.size)` check.

──────────────────────────────────────────────────────────────────────────────
CHANGE 3 — Capture frozenBeatPos in the playbackStore subscriber (lines 229–231).

BEFORE (lines 229–231):
```typescript
  // Phase 5: subscribe to playbackStore — isPlaying/bpm/volume changes trigger redraw
  const unsubscribePlayback = playbackStore.subscribe(() => { dirty = true })
```

AFTER:
```typescript
  // Phase 5/7: subscribe to playbackStore — isPlaying/bpm/volume changes trigger redraw.
  // Capture frozenBeatPos at the instant playback stops so drawShapes can hold position.
  const unsubscribePlayback = playbackStore.subscribe(() => {
    const { isPlaying, bpm } = playbackStore.getState()
    if (!isPlaying) {
      frozenBeatPos = (performance.now() / 1000 * bpm) / 60
    } else {
      frozenBeatPos = null
    }
    dirty = true
  })
```

──────────────────────────────────────────────────────────────────────────────
CHANGE 4 — Reset frozenBeatPos in destroy() to prevent stale state across
           hot-module-replacement cycles (line 250 area).

BEFORE (lines 244–252):
```typescript
  // Cleanup — returned as destroy() for useEffect
  return function destroy(): void {
    if (rafId !== null) cancelAnimationFrame(rafId)
    unsubscribeShape()
    unsubscribeSelection()
    unsubscribePlayback()  // Phase 5: clean up playback subscription (Pitfall 3)
    unsubscribeAnimation()  // Phase 7: clean up animationStore subscription
    resizeObserver.disconnect()
  }
```

AFTER:
```typescript
  // Cleanup — returned as destroy() for useEffect
  return function destroy(): void {
    if (rafId !== null) cancelAnimationFrame(rafId)
    unsubscribeShape()
    unsubscribeSelection()
    unsubscribePlayback()  // Phase 5/7: clean up playback subscription (Pitfall 3)
    unsubscribeAnimation()  // Phase 7: clean up animationStore subscription
    resizeObserver.disconnect()
    frozenBeatPos = null   // Reset freeze state on engine teardown
  }
```

──────────────────────────────────────────────────────────────────────────────
After applying all four changes, verify the file compiles and tests pass (see
&lt;verify&gt; below).
  </action>
  <verify>
    <automated>cd /c/src/GitHub/sound-image && npx tsc --noEmit && npx vitest run src/engine/canvasEngine.test.ts</automated>
  </verify>
  <done>
- `npx tsc --noEmit` exits 0 with no type errors.
- `npx vitest run src/engine/canvasEngine.test.ts` exits 0 (all existing tests pass).
- The string `frozenBeatPos` appears in canvasEngine.ts (grep confirms).
- The string `&& isPlaying` does NOT appear in the effectiveSize block (grep confirms the guard is removed).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| playbackStore → canvasEngine | Store state read synchronously in RAF loop and subscriber |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-fix01-01 | Tampering | frozenBeatPos module variable | accept | Module-level variable; no external write path; reset on destroy() |
</threat_model>

<verification>
1. TypeScript compiles cleanly: `npx tsc --noEmit` exits 0.
2. Canvas engine unit tests pass: `npx vitest run src/engine/canvasEngine.test.ts` exits 0.
3. Manual spot-check (UAT Test 7 re-run):
   - Add a shape, add a size curve, press Start — shape animates.
   - Press Stop — shape holds its current visual size (does NOT snap to base size).
   - Press Start — animation resumes smoothly from live beat position.
4. Regression check (UAT Test 1): shape with no size curve still renders at base size when stopped.
</verification>

<success_criteria>
- frozenBeatPos is captured in the playbackStore subscriber at the instant isPlaying goes false.
- drawShapes uses frozenBeatPos (when non-null) instead of live performance.now() for evalCurveAtBeat.
- The `&& isPlaying` guard is absent from the effectiveSize conditional.
- TypeScript strict-null checks pass (frozenBeatPos typed as `number | null`).
- All pre-existing canvasEngine tests continue to pass.
</success_criteria>

<output>
After completion, create `.planning/phases/07-composition-tools/07-FIX-01-SUMMARY.md`
using the standard summary template. Record:
- The four change locations (line numbers in the final file)
- Confirmation that `frozenBeatPos` is present and `&& isPlaying` guard is removed
- Test results (tsc + vitest)

Commit message:
  fix(07): freeze shape size at stop by capturing frozenBeatPos in canvasEngine
</output>
