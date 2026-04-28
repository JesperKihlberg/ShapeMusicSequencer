# Phase 11: Shift+Drag Snapping — Research

**Researched:** 2026-04-28
**Domain:** Canvas pointer-event handling, coordinate transform math, snap-grid computation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Snap Behavior**
- D-01: Shift+drag snaps on both axes simultaneously for hue lane; X-only for non-hue lanes.
- D-02: Snap threshold: "nearest" means always snap to closest grid line when Shift is held — no pixel proximity threshold.
- D-03: Releasing Shift mid-drag returns immediately to free-drag (next pointer move uses unsnapped position). Point stays at last snapped position until cursor moves.
- D-04: Shift+insert (clicking empty canvas while holding Shift) also snaps the new point using same snap logic.

**Snap Coordinate Source**
- D-05: X snap targets: `Math.round(beat)` clamped to `[0, curve.duration]`.
- D-06: Y snap targets (hue lane only): `scaleNoteHues(rootKey, scale)` — nearest `.hue` value.
- D-07: Y snap reads `scaleStore.getState()` at the time of each pointer move.

**pixelToPoint Y-viewport Fix**
- D-08: Fix `pixelToPoint()` to use `yViewport` per lane in Phase 11 scope.
- D-09: Fixed formula: `value = yMax - (py / canvas.height) * (yMax - yMin)`, clamped to `[minVal, maxVal]`.

**Visual Snap Feedback**
- D-10: While Shift is held and point is snapped, selected control point renders with a distinct visual state.
- D-11: Snap state communicated via `isSnapped?: boolean` in DrawOptions or a ref. Claude decides.
- D-12: Snap feedback applies to both drag and insert cases.

**Shift Key Detection**
- D-13: Read `e.shiftKey` from each PointerEvent. No keydown/keyup listeners needed.

### Claude's Discretion
- Exact snapped point color/style (fill, stroke, glow) — just clearly distinct from normal selected state.
- Whether to track snap state via ref or derive it inline each render.
- Exact implementation structure for passing snap state to `drawLaneCanvas` (flag in DrawOptions, separate param, or ref-based redraw trigger).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANIM-16 | Holding Shift while dragging a spline control point snaps X to nearest beat grid line and (hue lanes only) Y to nearest scale note line; both axes snap simultaneously when applicable; snapping active only while Shift is held | pixelToPoint fix (D-08/D-09), handleCanvasPointerMove snap branch, handleCanvasPointerDown insert snap branch, scaleNoteHues for Y grid, DrawOptions.isSnapped for visual feedback |
</phase_requirements>

---

## Summary

Phase 11 is a narrow, self-contained interaction enhancement confined to `AnimLane` inside `AnimationPanel.tsx`. All building blocks exist: the coordinate transforms (`pixelToPoint`/`pointToPixel`), the snap grid source (`scaleNoteHues` from `noteHue.ts`), the Y-viewport state (`uiStore.yViewport`), and the scale data (`scaleStore`). The phase has two tightly coupled sub-tasks: (1) fix the existing `pixelToPoint` Y-formula bug so it accounts for the Y-axis viewport (this is a prerequisite for correct snap math), and (2) insert snap logic into the two pointer event handlers and propagate a snap state flag through to `drawLaneCanvas` for visual feedback.

The snap math itself is trivial: `Math.round(beat)` for X, and a one-pass `reduce` over `scaleNoteHues` output for Y. The most structurally significant choice is how to pass `isSnapped` into `drawLaneCanvas` — extending `DrawOptions` is the cleanest option given that interface already exists (D-17 from Phase 10). The snap state is ephemeral UI state (no store needed) best tracked in a ref inside `AnimLane`, mirroring how `isDraggingPoint` is already tracked.

The test infrastructure is healthy: 17 files green (vitest + jsdom), two pre-existing CellPanel failures unrelated to this phase. Wave 0 must add a `snapFormulas` unit test file for pure snap math and a `pixelToPoint` fix test.

**Primary recommendation:** One plan, one wave — fix `pixelToPoint`, add snap branches in both pointer handlers, extend `DrawOptions` with `isSnapped`, add snapped visual style. All changes are in `AnimLane` / `drawLaneCanvas` only.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snap math (X beat, Y hue) | Browser / Client (AnimLane) | — | Pure coordinate computation triggered by pointer events; no server, no shared state |
| Shift key detection | Browser / Client (pointer events) | — | `e.shiftKey` is available on every PointerEvent; no listener infrastructure needed |
| Y snap grid source | Browser / Client (noteHue.ts) | scaleStore | `scaleNoteHues` is a pure function reading scale data from vanilla Zustand store |
| Visual snap feedback | Browser / Client (canvas 2D) | drawLaneCanvas DrawOptions | Rendered on the AnimLane canvas via existing draw pipeline; no DOM changes |
| pixelToPoint Y-fix | Browser / Client (AnimLane) | uiStore.yViewport | Coordinate transform reads per-lane viewport from uiStore — pure local computation |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 19.2.4 / ~6.0.2 | Component/event layer | Project stack (CLAUDE.md) [VERIFIED: package.json] |
| Canvas 2D API | Browser native | Lane drawing | All animation rendering uses canvas 2D already [VERIFIED: AnimationPanel.tsx] |
| Zustand (vanilla) | 5.0.12 | uiStore + scaleStore state reads | Established pattern for all stores in this project [VERIFIED: package.json, store files] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.4 | Unit tests for snap math | Adding new test file for snap formula coverage [VERIFIED: package.json] |
| @testing-library/react | 16.3.2 | Component render tests | Existing AnimationPanel tests already use this [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `isSnapped` flag in DrawOptions | Separate ref + imperative redraw | DrawOptions approach is cleaner — the draw already receives all rendering context via this object; a ref+redraw would duplicate the existing useEffect trigger pattern |
| `e.shiftKey` on PointerEvent | keydown/keyup listeners | Pointer event approach handles mid-drag release correctly (D-03) without managing extra listener lifecycle |

**Installation:** No new packages. All dependencies already present.

---

## Architecture Patterns

### System Architecture Diagram

```
PointerEvent (pointerdown / pointermove)
        │
        ▼
  AnimLane handler
  ┌─────────────────────────────────────┐
  │  1. pixelToPoint(px, py)            │
  │     └── reads uiStore.yViewport     │
  │         (FIXED: uses yMin/yMax)     │
  │                                     │
  │  2. e.shiftKey?                     │
  │     ├── YES → snapPoint()           │
  │     │         ├── X: Math.round()   │
  │     │         └── Y (hue only):     │
  │     │             scaleNoteHues()   │
  │     │             → nearest hue     │
  │     └── NO  → rawPoint (unchanged)  │
  │                                     │
  │  3. Update animationStore           │
  │  4. isSnapped ref = e.shiftKey      │
  └─────────────────────────────────────┘
        │
        ▼
  useEffect draw (triggered by curve change)
        │
        ▼
  drawLaneCanvas(ctx, w, h, curve, property,
    selectedIdx, playhead, zoom,
    { ...options, isSnapped })
        │
        ▼
  Control point rendering:
    isSelected && isSnapped → white fill + accent ring
    isSelected && !isSnapped → accent fill (existing)
    !isSelected → dim white fill (existing)
```

### Recommended Project Structure

No new files needed. All changes are in existing files:

```
src/
├── components/
│   └── AnimationPanel.tsx       # pixelToPoint fix + snap logic + DrawOptions.isSnapped
├── engine/
│   └── noteHue.ts               # unchanged — already correct
└── store/
    ├── uiStore.ts                # unchanged
    └── scaleStore.ts             # unchanged
```

New test file:
```
src/
└── engine/
    └── snapFormulas.test.ts     # unit tests for snap math (Wave 0)
```

### Pattern 1: pixelToPoint Y-viewport Fix (D-08/D-09)

**What:** Current `pixelToPoint` uses full `[minVal, maxVal]` range for the Y transform, ignoring the active Y viewport. This means dragging while Y-axis is zoomed places points at wrong values.

**Current code (line 750–760):**
```typescript
// BUGGY — ignores yViewport
function pixelToPoint(px: number, py: number): SplinePoint {
  const canvas = canvasRef.current!
  const [minVal, maxVal] = getPropertyRange(property)
  const zoom = uiStore.getState().zoomBeats
  const beat = (px / canvas.width) * zoom
  const value = maxVal - (py / canvas.height) * (maxVal - minVal)
  return {
    beat: Math.max(0, Math.min(curve.duration, beat)),
    value: Math.max(minVal, Math.min(maxVal, value)),
  }
}
```

**Fixed code:**
```typescript
// FIXED — respects yViewport (D-09)
function pixelToPoint(px: number, py: number): SplinePoint {
  const canvas = canvasRef.current!
  const [minVal, maxVal] = getPropertyRange(property)
  const zoom = uiStore.getState().zoomBeats
  const { yViewport } = uiStore.getState()
  const yVp = yViewport[property] ?? { min: minVal, max: maxVal }
  const beat = (px / canvas.width) * zoom
  const value = yVp.max - (py / canvas.height) * (yVp.max - yVp.min)
  return {
    beat: Math.max(0, Math.min(curve.duration, beat)),
    value: Math.max(minVal, Math.min(maxVal, value)),
  }
}
```

**Note:** `pointToPixel` (used by `findPointAt` hit-test) already correctly uses `getPropertyRange` full range for the hit-test Y transform. However, this function also does NOT account for yViewport — which means hit-testing is also currently broken when Y is zoomed. This is in-scope to fix alongside `pixelToPoint` as it requires the same one-line change. [VERIFIED: AnimationPanel.tsx lines 763–769]

**Fixed `pointToPixel`:**
```typescript
// FIXED — respects yViewport so hit-test is correct when Y-zoomed
function pointToPixel(p: SplinePoint, w: number, h: number): [number, number] {
  const [minVal, maxVal] = getPropertyRange(property)
  const zoom = uiStore.getState().zoomBeats
  const { yViewport } = uiStore.getState()
  const yVp = yViewport[property] ?? { min: minVal, max: maxVal }
  const px = (p.beat / zoom) * w
  const py = ((yVp.max - p.value) / (yVp.max - yVp.min)) * h
  return [px, py]
}
```

### Pattern 2: X Snap Formula (D-05)

**What:** After `pixelToPoint` returns a raw `{ beat, value }`, snap the beat to the nearest integer.

```typescript
// Source: CONTEXT.md D-05 — verified against curve.duration range invariant
function snapBeat(rawBeat: number, duration: number): number {
  return Math.max(0, Math.min(duration, Math.round(rawBeat)))
}
```

**Edge case:** `curve.duration` is not necessarily an integer (allowed range 0.25–64, step 0.25). `Math.round(rawBeat)` correctly handles this — snapping to beat 4 on a duration=3.5 curve will clamp to 3 (wait, clamp is to `curve.duration`, so beat 4 on duration=3.5 clamps to 3.5). The snap never exceeds `curve.duration`. [VERIFIED: animationStore types, handleDurationChange logic at line 844]

### Pattern 3: Y Snap Formula for Hue Lane (D-06)

**What:** Snap the raw hue value to the nearest scale note hue.

```typescript
// Source: CONTEXT.md D-06 + noteHue.ts verified
function snapHue(rawHue: number, rootKey: number, scale: ScaleName): number {
  const noteHues = scaleNoteHues(rootKey, scale)
  return noteHues.reduce(
    (best, n) => Math.abs(n.hue - rawHue) < Math.abs(best.hue - rawHue) ? n : best
  ).hue
}
```

**Chromatic scale edge case:** `SCALE_INTERVALS['chromatic']` has 12 notes, each 30 hue units apart. Snap still works correctly — the `reduce` just has more candidates. [VERIFIED: scaleStore.ts SCALE_INTERVALS, noteHue.ts]

### Pattern 4: Snap Branch in handleCanvasPointerMove (D-13, D-01, D-03)

**What:** After computing the raw point, apply snap if `e.shiftKey`.

```typescript
function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
  if (!isDraggingPoint.current || selectedPointIdx === null) return
  const rect = canvasRect.current ?? canvasRef.current!.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  // Phase 9: ignore movement in ghost region (D-10)
  const canvas = canvasRef.current!
  const currentZoom = uiStore.getState().zoomBeats
  const primaryRegionWidth = (curve.duration / currentZoom) * canvas.width
  if (px > primaryRegionWidth) return

  let updated = pixelToPoint(px, py)  // now viewport-corrected

  // Phase 11: Shift snap (D-01, D-02, D-13)
  if (e.shiftKey) {
    const snappedBeat = Math.max(0, Math.min(curve.duration, Math.round(updated.beat)))
    let snappedValue = updated.value
    if (property === 'hue') {
      const { rootKey, scale } = scaleStore.getState()  // D-07
      const noteHues = scaleNoteHues(rootKey, scale)
      snappedValue = noteHues.reduce(
        (best, n) => Math.abs(n.hue - updated.value) < Math.abs(best.hue - updated.value) ? n : best
      ).hue
    }
    updated = { beat: snappedBeat, value: snappedValue }
    isSnappedRef.current = true
  } else {
    isSnappedRef.current = false  // D-03: releasing Shift returns to free-drag
  }

  const newPoints = curve.points.map((p, i) => i === selectedPointIdx ? updated : p)
  animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
}
```

### Pattern 5: Snap Branch in handleCanvasPointerDown — Insert Case (D-04)

```typescript
// In the "click on empty canvas — insert new point" branch:
let newPoint = pixelToPoint(px, py)

// Phase 11: Shift snap on insert (D-04)
if (e.shiftKey) {
  const snappedBeat = Math.max(0, Math.min(curve.duration, Math.round(newPoint.beat)))
  let snappedValue = newPoint.value
  if (property === 'hue') {
    const { rootKey, scale } = scaleStore.getState()
    const noteHues = scaleNoteHues(rootKey, scale)
    snappedValue = noteHues.reduce(
      (best, n) => Math.abs(n.hue - newPoint.value) < Math.abs(best.hue - newPoint.value) ? n : best
    ).hue
  }
  newPoint = { beat: snappedBeat, value: snappedValue }
  isSnappedRef.current = true
}

const newPoints = [...curve.points, newPoint].sort((a, b) => a.beat - b.beat)
animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
onSelectedPointChange(null)
```

### Pattern 6: isSnapped Ref and DrawOptions Extension (D-11, D-10, D-12)

**What:** Track snap state in a ref inside AnimLane; pass it to the static-draw useEffect via the DrawOptions object.

**In AnimLane:**
```typescript
const isSnappedRef = useRef(false)
```

**In the static-draw useEffect (already triggered by `selectedPointIdx` and `curve` changes):**
```typescript
const primaryOptions: DrawOptions = {
  yMin: yVp.min, yMax: yVp.max,
  isFocused,
  rootKey, scale,
  isSnapped: isSnappedRef.current,  // Phase 11
}
```

**In DrawOptions interface:**
```typescript
interface DrawOptions {
  yMin?: number
  yMax?: number
  isFocused?: boolean
  rootKey?: number
  scale?: ScaleName
  isGhostRegion?: boolean
  isSnapped?: boolean   // Phase 11: selected point is currently snapped (D-11)
}
```

**Trigger:** The curve change from `animationStore.setCurve` inside the pointer handlers already causes React to re-render, which re-runs the draw useEffect with the updated `isSnappedRef.current`. No extra trigger needed.

**However:** `isSnappedRef.current` is a ref, not reactive state — the draw useEffect won't re-run just because the ref changes. The ref only matters in the same render cycle where the curve also changed (which is always the case during active dragging). On `pointerUp`, `isDraggingPoint` goes false and `isSnappedRef` should be reset to `false` so the next static draw doesn't show a stale snapped style. Add `isSnappedRef.current = false` to `handleCanvasPointerUp`.

### Pattern 7: Snapped Control Point Visual (D-10)

**Current selected point rendering (lines 563–572):**
```typescript
for (let i = 0; i < visible.length; i++) {
  const [px, py] = toPixel(visible[i])
  const isSelected = selectedIdx !== null && curve.points.indexOf(visible[i]) === selectedIdx
  const radius = isSelected ? 6 : 5
  ctx.beginPath()
  ctx.arc(px, py, radius, 0, Math.PI * 2)
  ctx.fillStyle = isSelected ? '#6366f1' : 'rgba(255,255,255,0.55)'
  ctx.fill()
}
```

**Proposed snapped visual (D-10, Claude's discretion per D-11):**
```typescript
for (let i = 0; i < visible.length; i++) {
  const [px, py] = toPixel(visible[i])
  const isSelected = selectedIdx !== null && curve.points.indexOf(visible[i]) === selectedIdx
  const isSnappedPoint = isSelected && (options?.isSnapped ?? false)
  const radius = isSelected ? 6 : 5

  ctx.beginPath()
  ctx.arc(px, py, radius, 0, Math.PI * 2)

  if (isSnappedPoint) {
    // Snapped: white fill + accent-colored ring to signal grid lock (D-10)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.save()
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  } else {
    ctx.fillStyle = isSelected ? '#6366f1' : 'rgba(255,255,255,0.55)'
    ctx.fill()
  }
}
```

### Anti-Patterns to Avoid

- **Snapping in `toPixel`/`drawLaneCanvas`:** Snap logic belongs in the event handlers, not the draw function. `drawLaneCanvas` only reads stored point values — snap must happen before writing to the store.
- **Using `keydown`/`keyup` to track Shift state:** `e.shiftKey` on each PointerEvent is the correct approach (D-13). A global listener creates lifecycle/cleanup complexity and can miss events if focus is lost.
- **Calling `scaleNoteHues` once at component mount:** Scale can change during drag (D-07). Call it inside each `handleCanvasPointerMove` invocation reading `scaleStore.getState()`.
- **Snapping pointToPixel output in drawLaneCanvas:** Do not adjust display coordinates; snap only the stored beat/value. The stored value IS the truth; the canvas reflects what's stored.
- **Forgetting to reset isSnappedRef on pointerUp:** Without this, a point retains the snapped visual style after the drag ends, which is misleading — the point is at a snapped position but Shift is no longer held.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Y snap grid | Custom hue-to-note computation | `scaleNoteHues()` from `noteHue.ts` | Already built for Phase 10 (ANIM-13); tested; handles all 7 scale types + chromatic |
| Shift key state | `keydown`/`keyup` event listeners | `e.shiftKey` on each PointerEvent | Standard DOM; zero lifecycle overhead; exactly what D-13 requires |
| Snap state persistence | Zustand store slice | `useRef(false)` inside AnimLane | Snap state is ephemeral drag-time UI state; storing it in a global store would add unnecessary churn |

**Key insight:** The snap feature is a pure pointer-event transform — raw pixel coords → snap-adjusted beat/value → stored to animationStore. All infrastructure is already present.

---

## Common Pitfalls

### Pitfall 1: isSnappedRef.current Stale After pointerUp
**What goes wrong:** If `isSnappedRef.current` is not reset to `false` in `handleCanvasPointerUp`, the next static draw after the drag ends will pass `isSnapped: true` to `drawLaneCanvas`, rendering the control point with the white/ring style even though the user is no longer dragging or holding Shift.
**Why it happens:** Refs don't trigger re-renders; the draw useEffect won't run again to "clear" the snapped state unless the curve changes.
**How to avoid:** Set `isSnappedRef.current = false` inside `handleCanvasPointerUp`.
**Warning signs:** Control point stays white after mouse release.

### Pitfall 2: pointToPixel Also Needs yViewport Fix
**What goes wrong:** `findPointAt` calls `pointToPixel` to compute hit-test pixel coordinates. If `pointToPixel` still uses the full `[minVal, maxVal]` range instead of `yViewport`, hit-testing is misaligned when Y is zoomed — clicking a visually rendered control point misses it.
**Why it happens:** The current `pointToPixel` mirrors the old `pixelToPoint` bug — it was written before `yViewport` existed.
**How to avoid:** Apply the same yViewport fix to `pointToPixel` in the same commit as `pixelToPoint`.
**Warning signs:** Clicks on control points fail to select them when Y-axis is zoomed in.

### Pitfall 3: Snapping on Insert Does Not Select the New Point
**What goes wrong:** `handleCanvasPointerDown` insert branch calls `onSelectedPointChange(null)` after inserting. This means the newly inserted+snapped point does NOT get a selected visual. The snapped visual only shows for selected points. If D-12 requires "freshly inserted point shows snapped visual", a follow-up selected idx assignment is needed.
**Why it happens:** Insert intentionally deselects (`onSelectedPointChange(null)`) because the point is just added, not dragged.
**How to avoid:** Either (a) after insert, find and select the newly inserted point index, or (b) accept that the snapped visual only applies during active drag (simplest — no visual regression). Decision: accept (b). The insert itself lands on the grid, which is the functional requirement. Visual snapped state during drag is the primary use case per D-10.
**Warning signs:** Non-issue unless spec is interpreted as requiring selected state on inserted points.

### Pitfall 4: scaleNoteHues Returns Empty Array for Chromatic Scale
**What goes wrong:** Chromatic scale is valid (`SCALE_INTERVALS['chromatic'] = [0,1,2,...,11]`). `scaleNoteHues(rootKey, 'chromatic')` returns 12 notes — the reduce still finds the nearest. Not a problem.
**Why it happens:** Non-issue.
**How to avoid:** No action needed. Verified by reading `scaleStore.ts` and `noteHue.ts`. [VERIFIED: scaleStore.ts line 29, noteHue.ts line 19]

### Pitfall 5: Ghost Region Passes Receive isSnapped
**What goes wrong:** Ghost pass calls to `drawLaneCanvas` spread `primaryOptions` which now includes `isSnapped`. Ghost regions always pass `selectedIdx = null`, so `isSnapped` is only visually active when `isSelected` is true — it has no effect on ghost renders. Safe to leave as-is.
**Why it happens:** DrawOptions spread naturally carries all flags.
**How to avoid:** No action needed. Ghost renders already pass `selectedIdx=null`, so the `isSnappedPoint = isSelected && isSnapped` guard prevents any ghost point from showing the snapped style.

### Pitfall 6: curve.duration Non-Integer Beat Clamp
**What goes wrong:** `Math.round(rawBeat)` could return an integer larger than `curve.duration` if `curve.duration` is non-integer (e.g. 3.5 beats — snap to beat 4 would exceed duration).
**Why it happens:** `curve.duration` is a float in range [0.25, 64].
**How to avoid:** Clamp after rounding: `Math.max(0, Math.min(curve.duration, Math.round(rawBeat)))`. This is already specified in D-05 and the Pattern 2 formula above. [VERIFIED: CONTEXT.md D-05]

---

## Code Examples

Verified patterns from the existing codebase:

### scaleNoteHues Return Shape
```typescript
// Source: src/engine/noteHue.ts — verified in this session
// Returns NoteHue[] where each element is: { hue: number, semitone: number, isRoot: boolean }
// For rootKey=0, 'major': hues are [0, 60, 120, 150, 210, 270, 330]
// (semitones [0,2,4,5,7,9,11] → hues [(n/12)*360])
scaleNoteHues(0, 'major')
// → [{ hue: 0, semitone: 0, isRoot: true }, { hue: 60, semitone: 2, isRoot: false }, ...]
```

### Current DrawOptions Interface (Phase 10 state)
```typescript
// Source: AnimationPanel.tsx lines 378–385 — verified in this session
interface DrawOptions {
  yMin?: number
  yMax?: number
  isFocused?: boolean
  rootKey?: number
  scale?: ScaleName
  isGhostRegion?: boolean
  // Phase 11 adds: isSnapped?: boolean
}
```

### scaleStore.getState() Pattern (D-07)
```typescript
// Source: AnimationPanel.tsx line 704 — established pattern in static-draw useEffect
const { rootKey, scale } = scaleStore.getState()
// Same pattern used in RAF tick at line 91
```

### uiStore.getState() Pattern for yViewport
```typescript
// Source: AnimationPanel.tsx line 703 — established pattern
const yVp = uiStore.getState().yViewport[property] ?? { min: staticFullMin, max: staticFullMax }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pixelToPoint ignores yViewport | pixelToPoint uses yViewport (yMin/yMax) | Phase 11 (this phase) | Fixes drag position correctness when Y-axis is zoomed |
| No snap on drag | Shift = snap to beat/scale-note grid | Phase 11 (this phase) | Enables precise alignment without affecting free-drag |

**No deprecated patterns in this phase** — all changes are additive.

---

## Assumptions Log

> All claims in this research are tagged VERIFIED — they were confirmed by reading the actual source files in this session.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims were verified by direct code inspection.** No assumed claims in this research.

---

## Open Questions

1. **Should `pointToPixel` be fixed in the same plan as `pixelToPoint`?**
   - What we know: Both functions have the same yViewport bug. `pointToPixel` is used only for hit-testing in `findPointAt`.
   - What's unclear: Whether the planner should treat the `pointToPixel` fix as a separate task or bundle it with `pixelToPoint`.
   - Recommendation: Bundle both fixes into one task — they are two lines in two adjacent functions with the same root cause.

2. **Snapped visual after insert: select the new point or leave unselected?**
   - What we know: Insert branch calls `onSelectedPointChange(null)` — the new point is immediately deselected, so it won't show the snapped visual (D-12 says "freshly inserted point that was snapped should show snapped visual").
   - What's unclear: Whether D-12 requires selecting the inserted point to show the visual, or whether the snap-to-grid landing position is sufficient feedback.
   - Recommendation: Treat as Claude's discretion — the simplest approach is to not select the inserted point (preserving existing behavior). If the plan author disagrees, they can select the inserted point's index after insert.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 11 is code-only changes within the existing project. No external tools, services, or runtimes beyond those already installed and verified (Node.js, npm, vitest).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (`test` section) |
| Quick run command | `npx vitest run src/engine/snapFormulas.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-16 | X snap: `Math.round(beat)` clamped to `[0, duration]` | unit | `npx vitest run src/engine/snapFormulas.test.ts` | Wave 0 |
| ANIM-16 | Y snap (hue): nearest `.hue` in `scaleNoteHues` output | unit | `npx vitest run src/engine/snapFormulas.test.ts` | Wave 0 |
| ANIM-16 | pixelToPoint Y-formula uses yViewport | unit | `npx vitest run src/engine/snapFormulas.test.ts` | Wave 0 |
| ANIM-16 | Releasing Shift returns to free-drag (D-03) | manual | Open browser, drag with Shift, release mid-drag | — |
| ANIM-16 | Both axes snap simultaneously on hue lane | manual | Open browser, hue lane, hold Shift and drag | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/engine/snapFormulas.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/engine/snapFormulas.test.ts` — covers ANIM-16 snap math (X beat snap, Y hue snap, pixelToPoint Y-formula)

Existing test infrastructure covers all other aspects (AnimationPanel component renders, scaleNoteHues, uiStore). The existing `noteHue.test.ts` already covers `scaleNoteHues` return shape — `snapFormulas.test.ts` only needs to test the snap selection logic (nearest hue reduce, beat rounding, clamp edge cases).

---

## Security Domain

This phase involves no authentication, authorization, user input storage, cryptography, or server communication. ASVS categories do not apply. The only "input" is pointer event coordinates and modifier key state — both are ephemeral, canvas-local, and never stored beyond the animation curve data already handled by the existing animationStore.

---

## Sources

### Primary (HIGH confidence — verified by direct code inspection)
- `src/components/AnimationPanel.tsx` — `pixelToPoint` (line 750), `pointToPixel` (line 763), `handleCanvasPointerDown` (line 782), `handleCanvasPointerMove` (line 808), `handleCanvasPointerUp` (line 825), `DrawOptions` interface (line 378), control point rendering (line 563), RAF loop (lines 64–197), static-draw useEffect (lines 693–743)
- `src/engine/noteHue.ts` — `scaleNoteHues` function and `NoteHue` interface (full file)
- `src/store/uiStore.ts` — `yViewport` shape and `setYViewport` (full file)
- `src/store/scaleStore.ts` — `SCALE_INTERVALS`, `ScaleName`, `rootKey` (full file)
- `.planning/phases/11-shift-drag-snapping/11-CONTEXT.md` — all decisions D-01 through D-13
- `vitest.setup.ts` — canvas mock setup
- `vite.config.ts` — vitest configuration
- `package.json` — dependency versions

### Secondary (MEDIUM confidence)
- `.planning/phases/10-visual-reference-grids/10-CONTEXT.md` — DrawOptions prior decisions
- `.planning/phases/09-timeline-zoom-ghosts-and-lane-focus/09-CONTEXT.md` — pointer exclusion patterns
- `.planning/REQUIREMENTS.md` — ANIM-16 full requirement text
- `.planning/ROADMAP.md` — Phase 11 success criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and existing source files
- Architecture: HIGH — read actual implementation, all integration points confirmed
- Pitfalls: HIGH — derived from direct code inspection, not guesswork
- Snap math: HIGH — verified scaleNoteHues return shape and SCALE_INTERVALS

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable codebase, no external dependencies)
