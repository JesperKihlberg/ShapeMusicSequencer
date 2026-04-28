# Phase 10: Visual Reference Grids — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three visual reference overlays to the lane canvases in `AnimationPanel`:
1. **Beat indicator lines** (ANIM-12) — vertical dashed lines at integer beats and adaptive sub-beat marks, with beat-number labels at the top; distinct style for beat 0/loop boundary; ghost region labels dimmed.
2. **Hue scale grid** (ANIM-13) — horizontal lines at hue values corresponding to the active scale's notes, colored by actual hue; root note brighter; note name labels (C, D, E…) visible only when lane is focused.
3. **Y-axis scroll/zoom per lane** (ANIM-10) — plain scroll wheel pans the Y viewport; Ctrl/Cmd+scroll zooms it; hard-clamped to the property's full range; per-lane state in uiStore.

Requirements in scope: ANIM-10, ANIM-12, ANIM-13.

</domain>

<decisions>
## Implementation Decisions

### Beat Indicator Lines (ANIM-12)

- **D-01:** Beat lines draw **behind the curve** — drawn first in `drawLaneCanvas`, then curve polyline + control points on top, playhead last. Grid never occludes the curve.
- **D-02:** Beat label style: small and muted — 10px monospace, `rgba(255,255,255,0.45)`. Labels render at the top edge of the canvas, clearly secondary to the curve.
- **D-03:** Ghost region beat labels dimmed to **half the primary opacity** — if primary labels are `rgba(255,255,255,0.45)`, ghost labels use `rgba(255,255,255,0.22)`. Applied via `ctx.globalAlpha` in the ghost pass, or as a separate color value passed to `drawLaneCanvas`.
- **D-04:** Beat 0 / loop boundary: **solid line at ~55% opacity** (not dashed), vs ~35% dashed for regular integer beats. Clearly distinct without being distracting.
- **D-05:** Sub-beat thresholds: **lock spec values** — half-beats shown when px-per-beat ≥ 40px; quarter-beat marks when px-per-beat ≥ 80px. Suppress labels when px-per-beat is too small to avoid collision (spec-defined).

### Hue Scale Grid (ANIM-13)

- **D-06:** Inverse hue-to-note mapping lives in a **new file: `src/engine/noteHue.ts`** — pure exported function `noteIndexToHue(semitone: number): number`. Testable, reusable for Phase 11 (Shift+snap snapping). No new import in `drawLaneCanvas` itself.
- **D-07:** Note name labels **omitted entirely** when lane is not focused. The 40–48px compressed height is too small for labels. Labels appear only at 160px focused height.
- **D-08:** Scale state is **passed as params to `drawLaneCanvas`** — caller reads `scaleStore.getState()` and passes `rootKey` + `scale`. `drawLaneCanvas` remains a pure function with no store imports.
- **D-09:** Note line opacity: **Claude decides exact values** — ensure root note is clearly brighter than non-root notes. Approximate targets: root ~60%, non-root ~25–30% (from spec), but exact tuning at implementation time.
- **D-10:** Scale grid is drawn in the **RAF loop as well as static redraws** — RAF loop reads `scaleStore.getState()` each frame (same pattern as `uiStore.getState()` for zoomBeats). Scale changes during playback reflected immediately.

### Y-Axis Scroll/Zoom (ANIM-10)

- **D-11:** Per-lane Y viewport state lives in **uiStore** — extend `UiState` with `yViewport: Partial<Record<AnimatableProperty, { min: number; max: number }>>`. Absent key = full range default. Consistent with focusedLane and zoomBeats already living there.
- **D-12:** Default Y range on load: **full property range** — hue: [0, 360]; others: [0, 100]. No key in yViewport map = use full range.
- **D-13:** Focusing a lane **does not reset Y viewport** — focus is about height only; the Y scroll/zoom state is independent.
- **D-14:** Y-axis is a **view, not an edit constraint** — control points exist at their stored values regardless of visible Y range. Zooming in just narrows what's visible; points outside the view can be scrolled to. Consistent with X-axis zoom behavior.
- **D-15:** Hard clamp: **yMin ≥ 0 and yMax ≤ fullMax** — visible window stays within [0, 360] for hue, [0, 100] for others. No rubber-band over-scroll.
- **D-16:** Scroll delta normalization — **Claude decides exact strategy** — goal: smooth feel on both trackpad (many small deltas) and mouse wheel (fewer large deltas). Lock the UX intent, not the pixel numbers.

### Draw Order & Integration

- **D-17:** `drawLaneCanvas` extended with an **options object** at the end:
  ```ts
  interface DrawOptions {
    yMin?: number
    yMax?: number
    isFocused?: boolean
    rootKey?: number
    scale?: ScaleName
    isGhostRegion?: boolean   // for ghost label dimming
  }
  function drawLaneCanvas(
    ctx, w, h, curve, property, selectedIdx,
    playheadBeat?, zoomBeats?, options?: DrawOptions
  ): void
  ```
  Non-breaking — all new params optional. Existing callers need no changes for Phase 10 features.
- **D-18:** Ghost passes use the **same yMin/yMax as the primary region** — ghost is a visual repetition of the primary curve; if Y-axis is zoomed, ghosts show the same zoomed view.
- **D-19:** RAF loop reads `uiStore.getState()` **each frame** for yMin/yMax per lane — consistent with how zoomBeats is already read; `getState()` is a direct object lookup, not a subscription trigger.
- **D-20:** Draw layer order within `drawLaneCanvas`:
  1. Background fill
  2. Hue scale grid lines (behind curve — horizontal)
  3. Beat indicator lines (behind curve — vertical)
  4. X-axis baseline dashed line (existing midpoint line)
  5. Curve polyline
  6. Control point circles
  7. Playhead line (always on top)

### Claude's Discretion

- Exact note line opacity percentages (root and non-root) — ensure root is clearly brighter than non-root.
- Scroll wheel delta normalization strategy — smooth on both trackpad and mouse.
- Whether to add a thin left-edge Y-axis ruler/indicator when Y-axis is zoomed (optional visual aid).
- Beat label position: render at very top of canvas or slightly below top edge — whichever avoids clipping.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ANIM-10 (Y-axis scroll/zoom), ANIM-12 (beat indicator lines), ANIM-13 (hue scale grid) — read full requirement text, not just IDs
- `.planning/ROADMAP.md` — Phase 10 success criteria (5 items)

### Prior Phase Context
- `.planning/phases/09-timeline-zoom-ghosts-and-lane-focus/09-CONTEXT.md` — D-07/D-08: drawLaneCanvas zoomBeats param, ghost pass architecture, uiStore shape (focusedLane, zoomBeats)
- `.planning/phases/08-beat-clock-and-playhead/08-CONTEXT.md` — D-02/D-03: RAF loop in AnimationPanel, drawLaneCanvas pure function, playheadBeat param

### Architecture
- `src/components/AnimationPanel.tsx` — `drawLaneCanvas` (line 354), `AnimLane` (line 444), RAF loop (lines 64–174), ghost pass logic (lines 95–167)
- `src/store/uiStore.ts` — current UiState shape (zoomBeats, focusedLane); Phase 10 extends with yViewport
- `src/store/scaleStore.ts` — `SCALE_INTERVALS`, `ScaleName`, `rootKey` — source of truth for note grid data
- `src/engine/beatClock.ts` — pattern for new `src/engine/noteHue.ts` pure utility

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimationPanel.tsx:354` — `drawLaneCanvas(ctx, w, h, curve, property, selectedIdx, playheadBeat?, zoomBeats?)` — all three Phase 10 features extend this via the new `options` object
- `AnimationPanel.tsx:379` — `const [minVal, maxVal] = property === 'hue' ? [0, 360] : [0, 100]` — Y-axis zoom replaces these with `options.yMin ?? minVal` and `options.yMax ?? maxVal`
- `AnimationPanel.tsx:526` — `getPropertyRange(prop)` utility in AnimLane — reuse for Y clamp validation
- `src/store/scaleStore.ts:22` — `SCALE_INTERVALS` record — input to `noteHue.ts` computation
- `src/engine/beatClock.ts` — file structure pattern for `noteHue.ts`

### Established Patterns
- Options object for `drawLaneCanvas` follows the existing optional-param pattern (playheadBeat and zoomBeats are already optional)
- `uiStore.getState()` called inside RAF loop for zoomBeats — same approach for yViewport per lane
- `ctx.save() / ctx.restore()` + `ctx.globalAlpha` already used for ghost passes — same for ghost region label dimming
- `scaleStore.getState()` used in `audioEngine.ts` outside React — same pattern for reading rootKey/scale in RAF loop
- `ResizeObserver` in AnimLane already redraws canvas on height change — no special handling needed for Y-axis changes (useEffect dep on yViewport triggers redraw)

### Integration Points
- `AnimLane` canvas — add `onWheel` handler for Y-axis scroll/zoom (calls `uiStore.setYViewport`)
- `uiStore.ts` — add `yViewport`, `setYViewport` to UiState
- `src/engine/noteHue.ts` — NEW pure utility file
- `drawLaneCanvas` options param — consumed by RAF loop (AnimationPanel) and static redraws (AnimLane useEffect)

</code_context>

<specifics>
## Specific Ideas

- `noteHue.ts` computes: for each semitone in `SCALE_INTERVALS[scale]`, offset by rootKey, then `hueForSemitone = ((semitone % 12) / 12) * 360`. This is the inverse of the `hue/360 * 12` mapping in `audioEngine.ts:26`.
- Ghost region beat labels: pass `isGhostRegion: true` in options to ghost pass calls — `drawLaneCanvas` uses this flag to halve label opacity.
- Y-axis zoom Ctrl+scroll: zoom around the midpoint of the current visible range (not the cursor position) — simpler and avoids complexity of zoom-to-cursor.
- Beat 0 marker: solid line (no dash), opacity ~0.55 vs 0.35 for regular beats.
- When `yViewport` key is absent for a lane, the lane behaves as if `{min: fullMin, max: fullMax}` — no migration needed for existing state.

</specifics>

<deferred>
## Deferred Ideas

- Optional Y-axis scrollbar/thumb indicator on right edge of lane (REQUIREMENTS.md optional item for ANIM-10)
- Zoom-to-cursor behavior for Ctrl+scroll (zooms around cursor Y position, not midpoint) — PoC scope: midpoint zoom is sufficient
- Phase 11 (Shift+snap) will reuse `noteHue.ts` — no Phase 10 changes needed to support it

</deferred>

---

*Phase: 10-visual-reference-grids*
*Context gathered: 2026-04-28*
