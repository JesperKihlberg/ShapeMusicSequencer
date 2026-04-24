---
phase: quick
plan: 260424-col
type: execute
wave: 1
depends_on: []
files_modified:
  - src/engine/canvasEngine.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "When a hue/saturation/lightness curve is active for a shape, the rendered color on canvas reflects the curve-evaluated value at each frame"
    - "When no color curves are active, rendered color is identical to shape.color (no regression)"
    - "Hue value is clamped to 0–360; saturation and lightness values are clamped to 0–100"
    - "frozenBeatPos is respected for color curves (same as size curves — shape holds last animated color when stopped)"
  artifacts:
    - path: "src/engine/canvasEngine.ts"
      provides: "effectiveColor construction and pass-through to drawShape"
      contains: "effectiveColor"
  key_links:
    - from: "src/engine/canvasEngine.ts drawShapes()"
      to: "drawShape(ctx, cx, cy, radius, shape.type, effectiveColor)"
      via: "effectiveColor built from shapeCurves.hue / .saturation / .lightness"
      pattern: "effectiveColor"
---

<objective>
Apply hue/saturation/lightness animation curves to the rendered canvas color, mirroring the effectiveSize pattern already in canvasEngine.ts.

Purpose: Color curves are already evaluated in audioEngine.ts for audio — the canvas ignores them entirely, so visual and audio color animation are disconnected.
Output: `drawShape` receives `effectiveColor` (curve-evaluated where curves exist, shape.color otherwise) on every render frame.
</objective>

<execution_context>
@C:/Users/jespe/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/jespe/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build effectiveColor and pass to drawShape in canvasEngine.ts</name>
  <files>src/engine/canvasEngine.ts</files>
  <action>
In `drawShapes()` in `src/engine/canvasEngine.ts`, after the existing `effectiveSize` block (lines 171–176), add an `effectiveColor` block that mirrors the same pattern:

1. Start from `shape.color` as the base: `let effectiveColor = { ...shape.color }` (spread to avoid mutating the store object).

2. For each of the three color dimensions, check if a curve is present and evaluate it using the already-computed `evalBeat`:
   - `if (shapeCurves?.hue)` → `effectiveColor.h = Math.max(0, Math.min(360, evalCurveAtBeat(shapeCurves.hue, evalBeat)))`
   - `if (shapeCurves?.saturation)` → `effectiveColor.s = Math.max(0, Math.min(100, evalCurveAtBeat(shapeCurves.saturation, evalBeat)))`
   - `if (shapeCurves?.lightness)` → `effectiveColor.l = Math.max(0, Math.min(100, evalCurveAtBeat(shapeCurves.lightness, evalBeat)))`

3. Replace the `drawShape` call on line 180:
   - Before: `drawShape(ctx, cx, cy, radius, shape.type, shape.color)`
   - After:  `drawShape(ctx, cx, cy, radius, shape.type, effectiveColor)`

`shapeCurves` is already declared above (`const shapeCurves = curves[shape.id]`), and `evalBeat` is already computed (`const evalBeat = frozenBeatPos !== null ? frozenBeatPos : liveBeatPos`). No new variables or imports are needed.

The `SplineCurve` keys on `animationStore` are exactly `hue`, `saturation`, `lightness` — confirmed from the constraints.

Do NOT alter `effectiveSize` logic, `frozenBeatPos` logic, or anything outside the `for (const shape of shapes)` loop body.
  </action>
  <verify>
    <automated>cd C:/src/GitHub/sound-image && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
- TypeScript compiles with no new errors
- `drawShape` is called with `effectiveColor` (not `shape.color`) in `drawShapes()`
- Each color dimension is independently curve-evaluated only when a curve exists; otherwise falls back to the original `shape.color` component value
- Hue clamped to [0, 360], saturation and lightness clamped to [0, 100]
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| animationStore → canvasEngine | Curve point values come from user-authored spline data; no external input |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-col-01 | Tampering | effectiveColor HSL values | accept | Values originate from user-controlled animationStore in same browser session; no external surface. Math.max/min clamp prevents out-of-range CSS color strings. |
</threat_model>

<verification>
1. Start the dev server and open the app.
2. Add a shape to the grid.
3. Open AnimationPanel for that shape, add a hue curve with at least two control points at different values, and start playback.
4. Verify the shape visibly cycles through different hues on the canvas while playing.
5. Stop playback — verify the shape holds the color at the stopped beat position (does not snap back to shape.color).
6. Remove the hue curve — verify the shape returns to its base color (no regression).
</verification>

<success_criteria>
- `npx tsc --noEmit` exits with code 0
- Shape color on canvas animates visibly when a hue/saturation/lightness curve is active
- Shape color is frozen at stopped beat position when playback is stopped
- Shape color is unchanged from `shape.color` when no color curves are present
</success_criteria>

<output>
After completion, create `.planning/quick/260424-col-color-animation-fix/260424-col-SUMMARY.md`
</output>
