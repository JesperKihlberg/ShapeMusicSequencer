---
phase: 07-composition-tools
slug: composition-tools
status: ready-for-planning
gathered: 2026-04-23
---

# Phase 7: Composition Tools — Context

## Domain

This phase delivers the spline animation system (replacing LFO), and lays the groundwork for undo/redo and PNG export (both deferred to future phases by user decision). The primary deliverable is: a per-shape animation panel with multi-property spline curve editor, a separate animationStore, and removal of the existing LFO (animRate field) from the shape model.

Phase boundary is FIXED from ROADMAP.md. Features not listed above are out of scope.

---

<decisions>
## Implementation Decisions

### Undo/Redo (COMP-01)

- **D-01:** Deferred to a later phase. Do NOT implement Ctrl+Z/Ctrl+Y in Phase 7. The zundo temporal middleware is already wired into shapeStore — no removal needed, just no UI wired up.

### PNG Export (COMP-02)

- **D-02:** Deferred to a later phase. Do NOT add an Export button in Phase 7.

### LFO Removal

- **D-03:** Remove `animRate: BeatFraction` from the `Shape` interface entirely. New shapes play a steady, constant sound with no pulsing. Animation only exists if the user explicitly adds spline curves via the animation panel.
- **D-04:** Remove LFO code from `audioEngine.ts` (ConstantSourceNode + OscillatorNode LFO per voice) and from `canvasEngine.ts` (pulseScale formula). Shapes render at their base size; audio plays at their base gain with no modulation.
- **D-05:** No LFO-to-spline migration. Old animRate values are simply dropped. Users add animation fresh via the spline panel.

### Spline Data Model

- **D-06:** Animatable properties: `size`, `hue`, `saturation`, `lightness` — all four color-mapped shape properties are animatable.
- **D-07:** Curve structure:
  ```typescript
  interface SplinePoint {
    beat: number   // absolute beat position within the loop (not 0-1 normalized)
    value: number  // property range: 0-100 for size/saturation/lightness; 0-360 for hue
  }
  interface SplineCurve {
    duration: number  // loop window in beats (free-float, e.g. 1.5, 3, 7)
    points: SplinePoint[]
  }
  ```
- **D-08:** Duration is the loop window. Changing `duration` does NOT move control points — points stay at their absolute beat positions. If a point is at beat 2.0 and duration shrinks to 1.5, that point is outside the window and is either hidden or clamped. Duration change only stretches/shrinks how many beats fit in one loop cycle.
- **D-09:** Curves live in a separate `animationStore` (new Zustand vanilla store), keyed by shape ID:
  ```typescript
  interface AnimationState {
    curves: Record<string, ShapeCurves>  // key = shape.id
    setCurve: (shapeId: string, property: AnimatableProperty, curve: SplineCurve) => void
    removeCurve: (shapeId: string, property: AnimatableProperty) => void
    clearShape: (shapeId: string) => void  // called on shape removal
  }
  type AnimatableProperty = 'size' | 'hue' | 'saturation' | 'lightness'
  type ShapeCurves = Partial<Record<AnimatableProperty, SplineCurve>>
  ```
- **D-10:** `animationStore` uses `createStore` from `zustand/vanilla` (same pattern as `scaleStore`, `playbackStore`) so canvas and audio engines can subscribe without React.

### Animation Panel UX

- **D-11:** The animation panel is opened via an "Animate" button inside `CellPanel` (the existing side panel). Clicking "Animate" for the selected shape opens the bottom animation panel focused on that shape's curves.
- **D-12:** Animation panel sits below the canvas area (bottom of the page). A draggable handle on the **top edge** of the panel resizes it: drag up to expand, drag down to shrink. Panel collapses to zero height (only the drag strip visible) when minimized.
- **D-13:** Lanes are **stacked rows**, one per active (non-null) curve. No placeholder rows for unanimated properties. A `+` button lets the user add a curve for a new property. Each lane shows the property name (e.g. "size", "hue").
- **D-14:** Each lane displays a polyline (straight segments between control points). Control points are draggable dots — drag vertically to change value, drag horizontally to change beat position within the duration window.
- **D-15:** The x-axis of every lane represents `duration` beats. All lanes for the same shape share the same time scale so polyrhythm is visible when lanes have different durations.

### Claude's Discretion

- Interpolation between control points: linear (straight segments). No bezier smoothing in Phase 7.
- Adding a control point: click on the lane polyline to insert a new point at that beat/value position.
- Minimum control points per curve: 2 (otherwise the curve is trivially constant — use the static property instead).
- animationStore default state: `{ curves: {} }` — no animations on any shape.
- When `removeShape` fires in shapeStore, `animationStore.clearShape(shapeId)` is called to prevent orphan curves.
- Panel height default: 180px. Min: 40px (collapsed, just the handle visible). Max: 50% of viewport height.
- Lane label width: fixed 60px on left side; polyline takes remaining width.
- No playhead visualization in Phase 7 — curves loop silently, no cursor shown in the panel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning documents
- `.planning/REQUIREMENTS.md` — ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, COMP-01 (deferred), COMP-02 (deferred)
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, dependencies
- `.planning/INGEST-CONFLICTS.md` — Bucket 2: LFO→spline staged migration rationale (now superseded by D-05: no migration, fresh start)

### Prior phase context (pattern sources)
- `.planning/phases/06-full-visual-language/06-CONTEXT.md` — scaleStore pattern (vanilla Zustand), toolbar layout
- `.planning/phases/05-playback-controls/05-CONTEXT.md` — playbackStore pattern, BeatFraction type

### Code to modify
- `src/store/shapeStore.ts` — remove `animRate: BeatFraction` from `Shape` interface
- `src/engine/audioEngine.ts` — remove LFO (ConstantSourceNode + OscillatorNode per voice)
- `src/engine/canvasEngine.ts` — remove `pulseScale` formula; shapes render at base size
- `src/components/CellPanel.tsx` — remove animRate BeatFraction selector; add "Animate" button
- `src/store/playbackStore.ts` — `computeLfoHz` may be removable if no other consumers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createStore` (zustand/vanilla) — used in `playbackStore.ts`, `scaleStore.ts`, `selectionStore.ts`; same pattern for `animationStore`
- `shapeStore.temporal.getState()` — zundo already wired; undo/redo is there when needed (Phase 8+)
- `BeatFraction` type in `playbackStore.ts` — referenced by animRate today; `computeLfoHz` converts it to Hz. Both may be removed if animRate is the only consumer.
- `playbackStore.subscribe` pattern in `audioEngine.ts` (~lines 447–490) — copy for `animationStore.subscribe`

### Established Patterns
- All Zustand stores use `createStore` (vanilla), not `create` (React) — required for non-React canvas/audio engine subscriptions
- React hooks use `useStore(store, selector)` pattern — wrap `animationStore` similarly
- CSS module: no framework, plain classes in `src/styles/index.css`
- Wave-based plan structure (00-infrastructure → 01-data → 02a-audio → 02b-canvas → 03-UI)

### Integration Points
- `canvasEngine.ts`: currently reads `shape.animRate` for pulseScale → remove; shapes render at `shape.size` directly
- `audioEngine.ts`: LFO per voice → remove ConstantSourceNode + OscillatorNode LFO; gain stays constant at size-mapped level
- `CellPanel.tsx`: animRate BeatFraction selector → replace with "Animate" button that opens animation panel
- `App.tsx`: add `<AnimationPanel />` below `<main className="canvas-area">` with draggable divider
- `shapeStore.ts`: `removeShape` → call `animationStore.clearShape(id)` on removal

</code_context>

<specifics>
## Specific Ideas

- "When creating a shape no animations should be present — only a steady sound and volume." — shapes are silent/static until the user explicitly adds curves in the animation panel.
- Duration as a free-float beat count (not quantized to BeatFraction) — 1.5 beats, 7 beats, 3.333 beats are all valid. This enables polyrhythm by design.
- Points use absolute beat positions within the loop window. Duration change stretches/shrinks the window only — points don't move.

</specifics>

<deferred>
## Deferred Ideas

- **Undo/redo (COMP-01)**: User explicitly deferred to a later phase. zundo temporal middleware already in shapeStore — wiring Ctrl+Z/Y is a future task.
- **PNG export (COMP-02)**: User explicitly deferred to a later phase.
- **Playhead cursor in animation panel**: No beat cursor in Phase 7.
- **Smooth bezier interpolation**: Linear segments only in Phase 7; bezier upgrade is future.
- **Star percussion**: Bandpass-filtered noise burst controlled by animation curves. Still depends on spline system (Phase 7) but star sound design is a separate feature decision.

</deferred>

---

*Phase: 07-composition-tools*
*Context gathered: 2026-04-23*
