# Roadmap: Shape Music Sequencer

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-04-24)
- **v1.1 Animation Panel improvements** — Phases 8–11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–7) — SHIPPED 2026-04-24</summary>

- [x] Phase 1: Scaffold (4/4 plans) — completed 2026-04-14
- [x] Phase 2: Audio Engine (3/3 plans) — completed 2026-04-17
- [x] Phase 3: Canvas Interaction (4/4 plans) — completed 2026-04-17
- [x] Phase 4: Shape Panel & Animation (5/5 plans) — completed 2026-04-21
- [x] Phase 5: Playback Controls (5/5 plans) — completed 2026-04-22
- [x] Phase 6: Full Visual Language (4/4 plans) — completed 2026-04-23
- [x] Phase 7: Composition Tools (6/6 plans + 1 FIX) — completed 2026-04-24

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Animation Panel improvements

- [x] **Phase 8: Beat Clock and Playhead** - RAF-derived beat position and visible playhead line across all lanes — completed 2026-04-24
- [x] **Phase 9: Timeline Zoom, Ghosts, and Lane Focus** - Global zoom control, ghost curve repetitions, and per-lane focus toggle — completed 2026-04-27
- [ ] **Phase 10: Visual Reference Grids** - Beat indicator lines, hue scale grid, and Y-axis scroll/zoom per lane
- [ ] **Phase 11: Shift+Drag Snapping** - Shift-key snap of control points to beat lines and scale note lines

---

## Phase Details

### Phase 8: Beat Clock and Playhead
**Goal**: Users can see where playback is in time — a bright vertical line sweeps across every lane canvas in sync with the beat
**Depends on**: Nothing (extends existing canvasEngine draw loop)
**Requirements**: ANIM-15, ANIM-14
**Success Criteria** (what must be TRUE):
  1. During playback a solid 2px accent-colored vertical line moves continuously across all lane canvases
  2. The playhead position reflects the correct beat modulo each lane's curve duration (polyrhythm lanes each show their own phase)
  3. When playback is stopped the playhead sits at beat 0 (left edge) on all lanes
  4. The playhead position never triggers a React re-render — it is driven entirely by requestAnimationFrame
**Plans**: 2 plans
Plans:
- [x] 08-01-PLAN.md — Extract beat formula to beatClock.ts; refactor canvasEngine and audioEngine
- [x] 08-02-PLAN.md — Extend drawLaneCanvas with playheadBeat param; add RAF loop to AnimationPanel
**UI hint**: yes

### Phase 9: Timeline Zoom, Ghosts, and Lane Focus
**Goal**: Users can control how much of the timeline is visible and focus individual lanes for detail editing
**Depends on**: Phase 8
**Requirements**: ANIM-08, ANIM-09, ANIM-11
**Success Criteria** (what must be TRUE):
  1. A zoom control in the animation panel header changes the visible beat span (1–64 beats) and all lanes update simultaneously
  2. When a lane's curve duration is shorter than the zoom span, semi-transparent ghost copies (30% opacity) fill the remaining viewport and cannot be clicked or dragged
  3. Clicking a lane's label column snaps it to 160px tall; all other lanes compress to 40–48px; clicking the focused lane collapses it back — no transition animation
  4. Only one lane is focused at a time; on first load no lane is focused
**Plans**: 2 plans
Plans:
- [x] 09-01-PLAN.md — Create uiStore (zoomBeats + focusedLane), extend drawLaneCanvas with zoomBeats param, add zoom segmented buttons to header, ghost rendering, lane focus toggle
- [x] 09-02-PLAN.md — Verify ghost rendering, lane focus, and pointer exclusion (all delivered in Plan 01 as Rule 2 auto-additions)
**UI hint**: yes

### Phase 10: Visual Reference Grids
**Goal**: Users can read pitch and time context directly from lane canvases — beat lines tell them where beats fall, the hue lane shows what notes are in key, and each lane's Y-axis is independently scrollable and zoomable
**Depends on**: Phase 9
**Requirements**: ANIM-12, ANIM-13, ANIM-10
**Success Criteria** (what must be TRUE):
  1. Dashed vertical lines mark every integer beat (~35% opacity) with beat-number labels at the top; sub-beat and quarter-beat marks appear only when there is enough pixel space to avoid label collision
  2. Beat 0 and loop boundaries use a visibly distinct dash pattern; beat labels inside ghost regions are dimmed compared to primary region labels
  3. The hue lane draws horizontal lines at the hue values corresponding to notes in the active scale, each line colored with its actual hue; the root note line is brighter and slightly thicker; note name labels appear on the left edge when the lane is focused
  4. The hue scale grid updates immediately when the user changes the root key or scale
  5. Scrolling the mouse wheel over a lane pans its Y-axis; Ctrl/Cmd+scroll zooms the visible value range; scrolling is clamped so the full property range remains reachable
**Plans**: TBD
**UI hint**: yes

### Phase 11: Shift+Drag Snapping
**Goal**: Users can precisely align control points to beat boundaries and scale note pitches by holding Shift while dragging
**Depends on**: Phase 10
**Requirements**: ANIM-16
**Success Criteria** (what must be TRUE):
  1. Holding Shift while dragging a control point on any lane snaps its X position to the nearest beat grid line
  2. Holding Shift while dragging a control point on the hue lane additionally snaps its Y position to the nearest scale note line
  3. Both axes snap simultaneously on the hue lane when Shift is held
  4. Releasing Shift mid-drag immediately returns to free-drag behavior without dropping the point
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffold | v1.0 | 4/4 | Complete | 2026-04-14 |
| 2. Audio Engine | v1.0 | 3/3 | Complete | 2026-04-17 |
| 3. Canvas Interaction | v1.0 | 4/4 | Complete | 2026-04-17 |
| 4. Shape Panel & Animation | v1.0 | 5/5 | Complete | 2026-04-21 |
| 5. Playback Controls | v1.0 | 5/5 | Complete | 2026-04-22 |
| 6. Full Visual Language | v1.0 | 4/4 | Complete | 2026-04-23 |
| 7. Composition Tools | v1.0 | 6/6+FIX | Complete | 2026-04-24 |
| 8. Beat Clock and Playhead | v1.1 | 2/2 | Complete | 2026-04-24 |
| 9. Timeline Zoom, Ghosts, and Lane Focus | v1.1 | 2/2 | Complete | 2026-04-27 |
| 10. Visual Reference Grids | v1.1 | 0/? | Not started | - |
| 11. Shift+Drag Snapping | v1.1 | 0/? | Not started | - |
