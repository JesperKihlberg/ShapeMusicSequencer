# Phase 11: Shift+Drag Snapping — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Shift-key snapping to the spline control point drag interaction in `AnimLane`:

- **X-snap** (all lanes): while Shift is held, snap the dragged point's X (beat) position to the nearest integer beat grid line.
- **Y-snap** (hue lane only): while Shift is held, snap the dragged point's Y (value) position to the nearest scale note hue line.
- **Both axes simultaneously** on the hue lane when Shift is held.
- **Releasing Shift mid-drag** immediately returns to free-drag without dropping the point.
- **Shift+insert**: Shift held while clicking empty canvas also snaps the newly inserted point (same snap logic).

Requirement in scope: ANIM-16.

</domain>

<decisions>
## Implementation Decisions

### Snap Behavior

- **D-01:** Shift+drag snaps on both axes simultaneously for hue lane; X-only for non-hue lanes. Matches ANIM-16 spec exactly.
- **D-02:** Snap threshold: "nearest" means always snap to closest grid line when Shift is held — no pixel proximity threshold. Shift = snap, period.
- **D-03:** Releasing Shift mid-drag returns immediately to free-drag (next pointer move uses unsnapped position). Point stays at last snapped position until cursor moves.
- **D-04:** Shift+insert (clicking empty canvas while holding Shift) also snaps the new point using the same snap logic. Rationale: if you're holding Shift to get a precise position, the new point should land on the grid too. Consistent behavior: Shift = snap, always.

### Snap Coordinate Source

- **D-05:** X snap targets: integer beat positions `0, 1, 2, ..., curve.duration`. Beat 0 and loop boundary included. Source: `Math.round(beat)` clamped to `[0, curve.duration]`.
- **D-06:** Y snap targets (hue lane only): `scaleNoteHues(rootKey, scale)` from `src/engine/noteHue.ts` — already built for Phase 10. Snap to nearest `.hue` value in the returned array.
- **D-07:** Y snap reads current `scaleStore.getState()` at the time of each pointer move — same pattern as RAF loop. Live scale changes during drag are reflected immediately.

### pixelToPoint Y-viewport Fix

- **D-08:** Fix `pixelToPoint()` to respect the Y-axis viewport (`yMin`/`yMax` from `uiStore.getState().yViewport`) in Phase 11 scope. Current implementation uses full `[minVal, maxVal]` range regardless of viewport — this causes drag positions to be wrong when Y-axis is zoomed. Since snap math requires correct viewport-aware Y coordinates, fixing `pixelToPoint` here is zero-extra-work and also corrects the existing drag-while-Y-zoomed bug.
- **D-09:** Fixed `pixelToPoint` formula: `value = yMax - (py / canvas.height) * (yMax - yMin)`, clamped to `[minVal, maxVal]` (full property range, not viewport bounds — point can be dragged to any valid value, the viewport just determines what's visible).

### Visual Snap Feedback

- **D-10:** When Shift is held and a point is currently snapped, the selected control point renders with a distinct visual state — different fill or stroke color vs the normal selected state. Communicates snap state at a glance.
- **D-11:** Snap feedback requires knowing whether a drag is currently snapped. Implement by passing a `isSnapped?: boolean` flag into `drawLaneCanvas` (or tracking it in a ref in `AnimLane`). Claude decides exact approach at implementation time — keep it simple.
- **D-12:** Snap feedback applies to both drag and insert cases (D-04). A freshly inserted point that was snapped should show the snapped visual until the pointer moves away.

### Shift Key Detection

- **D-13:** Read `e.shiftKey` from each `PointerEvent` in `handleCanvasPointerMove` and `handleCanvasPointerDown`. No `keydown`/`keyup` listener needed — `e.shiftKey` reflects the instantaneous modifier state at each event, which is exactly what "releasing Shift mid-drag" requires (D-03).

### Claude's Discretion

- Exact snapped point color/style (fill, stroke, glow) — just clearly distinct from normal selected state.
- Whether to track snap state via ref or derive it inline each render.
- Exact implementation structure for passing snap state to `drawLaneCanvas` (flag in DrawOptions, separate param, or ref-based redraw trigger).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ANIM-16 (Shift+drag snapping) — read full requirement text
- `.planning/ROADMAP.md` — Phase 11 success criteria (4 items)

### Prior Phase Context
- `.planning/phases/10-visual-reference-grids/10-CONTEXT.md` — D-08/D-17: DrawOptions interface, yViewport in uiStore, noteHue.ts usage pattern, draw layer order
- `.planning/phases/09-timeline-zoom-ghosts-and-lane-focus/09-CONTEXT.md` — D-07/D-10: zoomBeats X-axis param, ghost region pointer exclusion

### Architecture
- `src/components/AnimationPanel.tsx` — `pixelToPoint` (line 750), `handleCanvasPointerDown` (line 782), `handleCanvasPointerMove` (line 808), `handleCanvasPointerUp` (line 825), `drawLaneCanvas` (line 393), `DrawOptions` interface (line ~377)
- `src/engine/noteHue.ts` — `scaleNoteHues(rootKey, scale): NoteHue[]` — Y snap targets; `.hue` values are the snap grid lines
- `src/store/uiStore.ts` — `yViewport` per lane (needed for D-08/D-09 pixelToPoint fix)
- `src/store/scaleStore.ts` — `rootKey`, `scale`, `ScaleName` — source for Y snap grid

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimationPanel.tsx:750` — `pixelToPoint(px, py)` — modify to use yViewport (D-08/D-09)
- `AnimationPanel.tsx:782` — `handleCanvasPointerDown` — add Shift+snap for insert case (D-04)
- `AnimationPanel.tsx:808` — `handleCanvasPointerMove` — add Shift+snap for drag case (D-01/D-13)
- `src/engine/noteHue.ts:18` — `scaleNoteHues(rootKey, scale)` — call this for Y snap targets (D-06)
- `AnimationPanel.tsx:393` — `DrawOptions` interface — extend with `isSnapped?: boolean` for visual feedback (D-11)

### Established Patterns
- `e.shiftKey` on pointer events — standard DOM, no extra listener needed
- `uiStore.getState()` read inside event handlers — consistent with how zoomBeats is read in `handleCanvasPointerDown`
- `scaleStore.getState()` read outside React — same pattern already used in RAF loop and static redraws
- `ctx.save() / ctx.restore()` around control point rendering — already used for selected state styling
- `drawLaneCanvas` options object pattern — extending DrawOptions with `isSnapped` follows D-17 from Phase 10

### Integration Points
- `pixelToPoint` — fix Y formula to use yViewport (D-08/D-09); caller (handleCanvasPointerDown, handleCanvasPointerMove) unchanged
- `handleCanvasPointerDown` — add snap branch when `e.shiftKey` for insert case
- `handleCanvasPointerMove` — add snap branch when `e.shiftKey` for drag case
- `drawLaneCanvas` — add `isSnapped` to DrawOptions; change selected point fill/stroke when true

</code_context>

<specifics>
## Specific Ideas

- X snap formula: `snappedBeat = Math.round(rawBeat)`, clamped to `[0, curve.duration]`. Integer beats only.
- Y snap formula (hue lane): find `noteHues = scaleNoteHues(rootKey, scale)`, then `snappedHue = noteHues.reduce((best, n) => Math.abs(n.hue - rawHue) < Math.abs(best.hue - rawHue) ? n : best).hue`.
- `pixelToPoint` fixed: `const yVp = uiStore.getState().yViewport[property] ?? { min: minVal, max: maxVal }; const value = yVp.max - (py / canvas.height) * (yVp.max - yVp.min);`
- Snap feedback: snapped selected point could use a brighter fill (e.g. white or accent color) vs the normal semi-transparent selected state.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-shift-drag-snapping*
*Context gathered: 2026-04-28*
