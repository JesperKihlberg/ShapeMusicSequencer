---
phase: 09-timeline-zoom-ghosts-and-lane-focus
plan: "01"
subsystem: animation-panel
tags: [zustand, canvas, zoom, ghosts, lane-focus, ui-state]
dependency_graph:
  requires: []
  provides: [uiStore, zoomBeats-state, focusedLane-state, drawLaneCanvas-zoom, zoom-buttons-ui, ghost-rendering, lane-focus-toggle]
  affects: [src/components/AnimationPanel.tsx, src/styles/index.css]
tech_stack:
  added: [uiStore (Zustand vanilla)]
  patterns: [createStore + useStore hook wrapper, ctx.save/clip/translate/restore for ghost passes, BEM className joining, selectedPointsRef stale-closure fix]
key_files:
  created:
    - src/store/uiStore.ts
    - src/store/uiStore.test.ts
  modified:
    - src/components/AnimationPanel.tsx
    - src/styles/index.css
decisions:
  - "uiStore uses Zustand vanilla (createStore) matching playbackStore.ts pattern exactly — no Immer needed for flat setters"
  - "Ghost rendering lives in the RAF loop caller (not inside drawLaneCanvas) — keeps drawLaneCanvas pure and reusable for ghost passes"
  - "selectedPointsRef ref pattern fixes stale closure in RAF loop without adding selectedPoints to effect deps"
  - "zoomBeats added to useEffect deps so stopped-state draw reruns on zoom change"
  - "Ghost pointer exclusion applied to both pointerdown and pointermove to prevent drag across ghost boundary"
metrics:
  duration_seconds: 361
  completed_date: "2026-04-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 9 Plan 01: uiStore, Zoom Buttons, Ghost Rendering, and Lane Focus Summary

**One-liner:** Zustand uiStore holding zoomBeats (default 4) and focusedLane (default null), wired into AnimationPanel with 7-button zoom segmented control, ghost curve rendering at 0.30 opacity, and label-column lane focus toggle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create uiStore.ts and uiStore.test.ts | 8db949a | src/store/uiStore.ts, src/store/uiStore.test.ts |
| 2 | Extend drawLaneCanvas + add zoom UI and lane focus | de560f8 | src/components/AnimationPanel.tsx, src/styles/index.css |

## What Was Built

### uiStore (src/store/uiStore.ts)
New Zustand vanilla store following playbackStore.ts pattern exactly. Exports `uiStore`, `useUiStore`, and `UiState`. State fields: `zoomBeats: number` (default 4, ANIM-08) and `focusedLane: AnimatableProperty | null` (default null, ANIM-11). Setters are flat — no Immer needed.

### uiStore.test.ts (14 tests, all green)
Covers ANIM-08 (zoomBeats defaults + setters), ANIM-09 (ghost geometry formulas as pure math), and ANIM-11 (focusedLane defaults + setters). Tests follow playbackStore.test.ts structure with `beforeEach` reset pattern.

### drawLaneCanvas extension (AnimationPanel.tsx)
Added optional `zoomBeats?: number` as 8th parameter. `xDenominator = zoomBeats ?? curve.duration` governs the X-axis in both `toPixel` (beat mapping) and the playhead position (modulo stays `curve.duration`; display denominator uses `xDenominator`).

### Zoom segmented control (AnimationPanel.tsx header)
7 buttons `[1, 2, 4, 8, 16, 32, 64]` rendered left of "+ Add Curve" using `zoom-selector` / `zoom-selector__btn` / `zoom-selector__btn--active` CSS classes. Active button reflects `uiStore.zoomBeats`. Click calls `uiStore.getState().setZoomBeats(v)`.

### Ghost rendering (AnimationPanel.tsx RAF loop + stopped draw)
Both the RAF tick and stopped-state draw now render ghost passes after the primary draw:
- `repeatCount = Math.floor(zoomBeats / curve.duration) - 1` full copies
- Each ghost: `ctx.save()` → `globalAlpha = 0.30` → `clip` to ghost rect → `translate` origin → `drawLaneCanvas` with ghost width → `ctx.restore()`
- Partial ghost at right edge when `zoomBeats % curve.duration !== 0`

### Lane focus toggle (AnimLane in AnimationPanel.tsx)
AnimLane reads `focusedLane` from `useUiStore`. Applies `.anim-lane--focused` (160px) or `.anim-lane--compressed` (44px) CSS modifier classes. Label column click toggles focus via `uiStore.getState().setFocusedLane()`. Remove button uses `e.stopPropagation()` to prevent bubbling to label-col. Ghost pointer exclusion in `handleCanvasPointerDown` and `handleCanvasPointerMove` ignores events where `px > primaryRegionWidth`.

### selectedPointsRef fix
Added `const selectedPointsRef = useRef(selectedPoints)` + sync effect to fix the stale-closure bug in the RAF loop (RESEARCH pitfall 1). RAF tick uses `selectedPointsRef.current[prop]` instead of the stale `selectedPoints[prop]`.

### CSS additions (src/styles/index.css)
Phase 9 section appended at bottom: `.zoom-selector`, `.zoom-selector__btn`, `.zoom-selector__btn--active`, `.zoom-selector__btn:focus-visible`, `.anim-lane--focused`, `.anim-lane--compressed`, `.anim-lane__label-col { cursor: pointer }`.

## Verification

- `npx tsc --noEmit` — exits 0, zero TypeScript errors
- `npx vitest run src/store/uiStore.test.ts` — 14/14 tests pass
- `npx vitest run` — 192/194 tests pass; 2 pre-existing failures in CellPanel.test.tsx (not regressions)

## Deviations from Plan

### Auto-additions (Rule 2)

**1. [Rule 2 - Missing critical functionality] Ghost rendering added in Task 2**

The plan's Task 2 action described the ghost rendering pattern in PATTERNS.md Modification 2 but did not list ghost passes in Task 2's explicit action steps (only zoom buttons and drawLaneCanvas extension were listed). Since ghost rendering is the core deliverable of ANIM-09 and depends on the same `zoomBeats` parameter being wired in Task 2, it was included in this task rather than deferring to Wave 2. Wave 2 can now build on a fully working ghost implementation.

- **Found during:** Task 2
- **Action:** Implemented ghost passes in RAF loop and stopped-state draw alongside the primary drawLaneCanvas extension
- **Files modified:** src/components/AnimationPanel.tsx

**2. [Rule 2 - Missing critical functionality] Lane focus (ANIM-11) implemented in Task 2**

PATTERNS.md Modification 4 described AnimLane lane focus changes. The plan's Task 2 action listed only zoom buttons, drawLaneCanvas extension, and CSS — but lane focus CSS classes (`.anim-lane--focused`, `.anim-lane--compressed`) without the corresponding JSX and store wiring would leave orphaned CSS. Added the full AnimLane focus implementation in the same commit.

- **Found during:** Task 2
- **Action:** Added focusedLane reads, CSS class application, label-col click handler, remove button stopPropagation, ghost pointer exclusion to AnimLane
- **Files modified:** src/components/AnimationPanel.tsx

## Known Stubs

None — all features are fully wired. Ghost rendering, zoom buttons, and lane focus are all connected to uiStore and produce visible output.

## Threat Flags

No new security-relevant surface beyond what the plan's threat model accounts for. All new input paths (zoom button clicks, label-col clicks) are typed button events with no external input.

## Self-Check: PASSED

- [x] src/store/uiStore.ts exists: FOUND
- [x] src/store/uiStore.test.ts exists: FOUND
- [x] src/components/AnimationPanel.tsx modified: FOUND
- [x] src/styles/index.css modified: FOUND
- [x] Commit 8db949a exists: FOUND
- [x] Commit de560f8 exists: FOUND
- [x] npx tsc --noEmit exits 0: PASS
- [x] npx vitest run src/store/uiStore.test.ts: 14/14 PASS
