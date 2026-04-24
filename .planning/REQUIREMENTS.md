# Requirements: v1.1 Animation Panel improvements

> Generated: 2026-04-24
> Milestone: v1.1
> Status: Active

---

## Animation Panel — Timeline & Zoom

- [ ] **ANIM-08**: User can control how many beats are visible across all lanes simultaneously via a zoom control in the animation panel header (range 1–64, default 4, common values: 1, 2, 4, 8, 16, 32, 64)
- [ ] **ANIM-09**: When a lane's curve duration is shorter than the global timeline zoom width, the curve is repeated as ghost copies (30% opacity, same stroke color, no fill) to fill the remaining viewport; ghost regions are non-interactive (no click, drag, or point insertion)
- [ ] **ANIM-10**: User can scroll the Y-axis of each lane independently with plain scroll wheel (pan up/down); user can zoom the Y-axis with Ctrl/Cmd+scroll wheel (narrow or widen visible value range); scroll is clamped to the property's full range; default visible range on load is the full property range (hue 0–360, others 0–100)

## Animation Panel — Lane Interaction

- [ ] **ANIM-11**: Clicking the label column of a lane toggles focus — focused lane snaps to 160px canvas height, unfocused lanes snap to 40–48px (compressed curve visible, no collapse); only one lane focused at a time; clicking an already-focused lane collapses it; no lane focused on first load; no transition animation

## Animation Panel — Visual Grid

- [ ] **ANIM-12**: Each lane canvas draws vertical beat indicator lines: integer beats at ~35% opacity dashed lines with beat number labels at the top; sub-beat half-marks at ~15% opacity shown only when px-per-beat ≥ 40px; quarter-beat marks shown only when px-per-beat ≥ 80px; beat 0/loop boundary uses a distinct dash pattern; ghost region beat labels are dimmed; labels suppressed when px-per-beat is too small to avoid collision
- [ ] **ANIM-13**: The hue property lane draws horizontal reference lines at the hue values corresponding to notes in the currently selected scale; each line is colored with its actual hue value; root note line is brighter (~60% opacity) and slightly thicker; non-root lines at ~25–30% opacity; note name labels (C, D, E…) shown on the left edge of the canvas when the lane is focused; grid updates live when scale or root key changes; only lines within the current visible Y range are rendered

## Animation Panel — Playback

- [ ] **ANIM-14**: A vertical playhead line is drawn across all lane canvases showing the current beat position modulo each lane's duration; style is a solid bright accent line (2px); driven by requestAnimationFrame in the canvas draw loop (not React state); when stopped, playhead sits at beat 0; if the global timeline is wider than the curve, the playhead renders at the modulo position within the primary region
- [ ] **ANIM-15**: The current beat position is derivable at RAF call time from AudioContext.currentTime and BPM — no React state update on each frame; implementation exposes a getter or module-level value readable from the canvas draw loop without triggering re-renders

## Animation Panel — Snapping

- [ ] **ANIM-16**: Holding Shift while dragging a spline control point snaps the point's X position to the nearest beat grid line and (for hue lanes only) snaps the Y position to the nearest scale note line; both axes snap simultaneously when applicable; snapping is only active while Shift is held

---

## Future Requirements (deferred)

- Scrollbar thumb / minimap notch on right edge showing current Y scroll position within full range (ANIM-10 visual indicator — optional for v1.1)
- Boundary separator line between real curve and first ghost repeat (ANIM-09 — optional for v1.1)
- COMP-01: Undo/redo with minimum 50-step depth (zundo middleware)
- COMP-02: Export canvas as PNG encoding full composition state
- PERS-01: Canvas can be saved as JSON
- PERS-02: Canvas can be loaded from JSON
- PERS-03: Composition can be shared via URL
- SHPE-06: Multi-shape per cell for complex timbres

## Out of Scope

| Item | Reason |
|------|--------|
| Per-lane timeline zoom | Spec explicitly requires global zoom shared across all lanes |
| Animated lane focus transition | Intentionally snap-only per spec |
| Ghost regions responding to pointer events | Explicitly non-interactive per spec |
| Mobile/touch optimization | Desktop web first (v1.0 constraint carried forward) |
| Server-side storage | No backend, client-only |

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| ANIM-08 | Phase 9 | — |
| ANIM-09 | Phase 9 | — |
| ANIM-10 | Phase 10 | — |
| ANIM-11 | Phase 9 | — |
| ANIM-12 | Phase 10 | — |
| ANIM-13 | Phase 10 | — |
| ANIM-14 | Phase 8 | — |
| ANIM-15 | Phase 8 | — |
| ANIM-16 | Phase 11 | — |
