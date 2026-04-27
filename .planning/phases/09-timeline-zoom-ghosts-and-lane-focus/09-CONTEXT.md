# Phase 9: Timeline Zoom, Ghosts, and Lane Focus — Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three interrelated visual controls to `AnimationPanel`:
1. **Timeline zoom** (ANIM-08) — a segmented button control in the header that sets a global `zoomBeats` (1–64) changing the visible beat span across all lanes simultaneously.
2. **Ghost repetitions** (ANIM-09) — when `curve.duration < zoomBeats`, semi-transparent ghost copies of the curve fill the remaining viewport (30% opacity, non-interactive).
3. **Lane focus toggle** (ANIM-11) — clicking a lane's label column toggles that lane to 160px tall; all others compress to 40–48px; clicking again collapses it; at most one lane focused at a time; no focus on load; no transition animation.

Requirements in scope: ANIM-08, ANIM-09, ANIM-11.

</domain>

<decisions>
## Implementation Decisions

### New uiStore (src/store/uiStore.ts)

- **D-01:** Create `src/store/uiStore.ts` (Zustand + Immer) to hold all pure UI state that doesn't belong in audio or animation stores.
- **D-02:** Initial shape of `uiStore`:
  ```ts
  {
    zoomBeats: 4,                          // global visible beat span; default 4
    focusedLane: null as AnimatableProperty | null,  // null = no lane focused
    setZoomBeats: (beats: number) => void,
    setFocusedLane: (prop: AnimatableProperty | null) => void,
  }
  ```
- **D-03:** Both `zoomBeats` and `focusedLane` live here — both are pure UI state with no audio or curve data dependency.

### Timeline Zoom Control (ANIM-08)

- **D-04:** Zoom control is a row of 7 segmented buttons: `1 2 4 8 16 32 64` in the animation panel header.
- **D-05:** Position: left of the existing "+ Add Curve" button. Zoom is a global panel control; Add Curve is a per-shape action.
- **D-06:** The active zoom value gets a visual active state (matching the existing button style conventions). Clicking a button calls `uiStore.setZoomBeats(value)`.
- **D-07:** `drawLaneCanvas` gains an optional `zoomBeats?: number` parameter. When provided, the X-axis spans `zoomBeats` beats instead of `curve.duration` beats — i.e. `toPixel` maps `beat / zoomBeats` rather than `beat / curve.duration` for the X coordinate.

### Ghost Repetitions (ANIM-09)

- **D-08:** Ghost rendering is handled in the RAF loop (and the stopped-state draw), NOT inside `drawLaneCanvas`. The caller is responsible for ghost passes.
- **D-09:** Ghost pass approach per lane:
  1. Calculate `repeatCount = Math.floor(zoomBeats / curve.duration) - 1` (how many full ghost copies after the primary).
  2. For each ghost index `i = 1..repeatCount`:
     - `ctx.save()`
     - `ctx.globalAlpha = 0.30`
     - `ctx.beginPath(); ctx.rect(ghostStartPx, 0, ghostWidthPx, h); ctx.clip()` — clip to ghost region
     - `ctx.translate(ghostStartPx, 0)` — shift origin to ghost start
     - Call `drawLaneCanvas(ctx, ghostWidthPx, h, curve, property, null, /* no playhead */)` — pass ghost width, not full canvas width, so the curve fills the ghost region proportionally
     - `ctx.restore()`
  3. Primary region is drawn first at full opacity (no globalAlpha change).
- **D-10:** Ghost regions are non-interactive: no pointer events land in them (the label column sits outside; the canvas hit-test in `AnimLane` ignores ghost regions by checking `pixelX > primaryRegionWidth`).

### Lane Focus State & Height (ANIM-11)

- **D-11:** `focusedLane` lives in `uiStore` (decided in D-02). `AnimLane` reads it via `useUiStore`.
- **D-12:** Lane height is implemented via CSS classes on `.anim-lane`:
  - `.anim-lane--focused` → `height: 160px`
  - `.anim-lane--compressed` → `height: 44px` (midpoint of 40–48px spec range; matches compact look)
  - No class = default height (existing CSS governs)
- **D-13:** Clicking the `.anim-lane__label-col` calls `uiStore.setFocusedLane(prop)` — if `prop === focusedLane`, sets `null` (collapse); otherwise sets `prop` (focus). The toggle is a single function call.
- **D-14:** On first load no lane is focused (`focusedLane: null` in initial store state). No transition animation — instant snap.

### Claude's Discretion

- The partial ghost at the right edge (when `zoomBeats % curve.duration !== 0`): render a clipped partial copy (same approach as full ghosts, just narrower clip region). This is the natural fallout of the clip-based approach.
- Whether to add a thin separator line between the primary region and first ghost: Claude decides — keep it if it aids readability, skip it if it adds visual noise.
- Control point hit-testing in ghost regions: already excluded by D-10. Ghost clicks fall through to the primary canvas interaction (add-point on empty click) — this is acceptable for PoC.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ANIM-08 (zoom), ANIM-09 (ghosts), ANIM-11 (lane focus) — read the full requirement text, not just the IDs
- `.planning/ROADMAP.md` — Phase 9 success criteria (4 items)

### Architecture
- `.planning/phases/08-beat-clock-and-playhead/08-CONTEXT.md` — D-02/D-03: RAF loop lives in `AnimationPanel.tsx`; `drawLaneCanvas` is the pure draw function; `laneCanvasRefs` map; Phase 9 extends all of this
- `.planning/milestones/v1.0-phases/07-composition-tools/07-CONTEXT.md` — D-14/D-15: lane canvas draw loop, `animationStore` structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/AnimationPanel.tsx:256` — `drawLaneCanvas(ctx, w, h, curve, property, selectedIdx, playheadBeat?)` — extend with `zoomBeats?` param for X-axis scaling
- `src/components/AnimationPanel.tsx:64–101` — RAF loop in `AnimationPanel`; ghost passes added here alongside the primary `drawLaneCanvas` call per lane
- `src/store/animationStore.ts` — `SplineCurve.duration` is the per-lane loop beat count; ghost calc: `zoomBeats / curve.duration`
- `src/store/playbackStore.ts` — `isPlaying`, `bpm` — RAF loop already reads these; no changes needed

### Established Patterns
- Zustand + Immer store pattern: follow `playbackStore.ts` or `animationStore.ts` as template for new `uiStore.ts`
- CSS class-based layout: existing `.anim-lane`, `.animation-panel__header` classes; new classes follow same BEM convention
- `ctx.save() / ctx.restore()` + `ctx.globalAlpha` for opacity — standard canvas 2D; used for ghost passes
- `ResizeObserver` in `AnimLane` already handles canvas resize on height change — the class-driven height change will trigger it automatically

### Integration Points
- `AnimationPanel.tsx` header div — zoom segmented buttons added here (left of Add Curve)
- `AnimLane` — reads `focusedLane` from `uiStore`; applies CSS class; label-col click handler calls `setFocusedLane`
- `src/store/uiStore.ts` — NEW file; imported in `AnimationPanel.tsx` and `AnimLane`

</code_context>

<specifics>
## Specific Ideas

- Zoom default on load: 4 beats (per ANIM-08 spec and existing STATE.md decision).
- Ghost opacity: exactly 0.30 (per ANIM-09 spec — "30% opacity").
- Compressed lane height: 44px (midpoint of 40–48px; clean CSS value).
- Focused lane height: 160px (per ANIM-11 spec).
- Zoom buttons: exactly `[1, 2, 4, 8, 16, 32, 64]` — the common values listed in ANIM-08.

</specifics>

<deferred>
## Deferred Ideas

- Optional boundary separator line between primary region and first ghost (ANIM-09 — explicitly listed as optional in REQUIREMENTS.md). Claude decides at implementation time.
- Y-axis scroll/zoom (ANIM-10) — Phase 10.
- Beat indicator lines (ANIM-12) — Phase 10.
- Hue scale grid (ANIM-13) — Phase 10.

</deferred>

---

*Phase: 09-timeline-zoom-ghosts-and-lane-focus*
*Context gathered: 2026-04-27*
