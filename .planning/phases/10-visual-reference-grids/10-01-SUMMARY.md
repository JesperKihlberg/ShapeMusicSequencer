---
phase: "10"
plan: "01"
subsystem: animation-panel
tags: [canvas, zustand, tdd, y-viewport, draw-options, wheel-handler]
dependency_graph:
  requires: []
  provides: [DrawOptions-interface, yViewport-state, scaleNoteHues-utility, onWheel-handler]
  affects: [AnimationPanel.tsx, uiStore.ts]
tech_stack:
  added: [src/engine/noteHue.ts]
  patterns: [DrawOptions-options-object, per-lane-yViewport-map, imperative-wheel-listener]
key_files:
  created:
    - src/engine/noteHue.ts
    - src/engine/noteHue.test.ts
  modified:
    - src/store/uiStore.ts
    - src/store/uiStore.test.ts
    - src/components/AnimationPanel.tsx
decisions:
  - "DrawOptions interface added as optional 9th param to drawLaneCanvas — non-breaking; all existing callers continue to work without changes"
  - "yViewport stored as Partial<Record<AnimatableProperty, {min,max}>> in uiStore; absent key = full range default (no migration)"
  - "onWheel handler uses imperative addEventListener with passive:false to allow e.preventDefault(); delta capped at 50 for trackpad/mouse normalization"
  - "RAF tick reads yViewport+scaleStore.getState() each frame (same getState() pattern as zoomBeats); no new subscriptions"
  - "AnimLane static draw useEffect subscribes to yViewport via useUiStore so it re-runs on Y scroll/zoom while stopped"
  - "Ghost passes all receive isGhostRegion:true via spread of primaryOptions — 6 total call sites updated (3 RAF + 3 static)"
metrics:
  duration_seconds: 410
  completed_date: "2026-04-28"
  tasks_completed: 3
  files_changed: 5
---

# Phase 10 Plan 01: Foundation — store, utility, DrawOptions, Y-axis transform, wheel handler, call-site wiring Summary

**One-liner:** Non-rendering foundation for Phase 10 — scaleNoteHues utility, yViewport state, DrawOptions interface, Y-axis toPixel transform, imperative wheel handler, and all 6 ghost call sites updated with options.

## What Was Built

Plan 01 lays the infrastructure that all three Phase 10 features (ANIM-10, ANIM-12, ANIM-13) share. No new canvas drawing passes were added — those come in Plan 02. This plan installs the plumbing:

1. **`src/engine/noteHue.ts`** — Pure `scaleNoteHues(rootKey, scale)` utility returning `NoteHue[]` (hue, semitone, isRoot). Inverts the `audioEngine.ts` hue→semitone formula. Reusable by Phase 11 snap-to-scale.

2. **`src/store/uiStore.ts`** — Extended `UiState` with `yViewport: Partial<Record<AnimatableProperty, {min, max}>>` and `setYViewport` action. Absent key = full range. Pattern matches existing `focusedLane`/`zoomBeats` flat setters.

3. **`src/components/AnimationPanel.tsx`**:
   - `DrawOptions` interface (yMin, yMax, isFocused, rootKey, scale, isGhostRegion)
   - `drawLaneCanvas` gains optional 9th param `options?: DrawOptions`
   - `toPixel` Y-axis transform uses `yMin/yMax` from options, falls back to full property range
   - RAF tick reads `yViewport[prop]` and `scaleStore.getState()` each frame; passes `primaryOptions` to primary draw and `{...primaryOptions, isGhostRegion: true}` to all ghost draws
   - AnimLane static draw useEffect subscribes to `yViewport` via `useUiStore`; includes `isFocused` in options; `yViewport` and `isFocused` added to effect deps
   - `onWheel` imperative listener (`{ passive: false }`) on each AnimLane canvas: plain scroll pans Y viewport, Ctrl/Cmd+scroll zooms around midpoint; both hard-clamped to full property range

## Tasks

| # | Name | Commit | Type |
|---|------|--------|------|
| 1 | Write failing tests for noteHue and yViewport (RED) | 0998d34 | test |
| 2 | Implement noteHue.ts and extend uiStore with yViewport | 4f99ada | feat |
| 3 | DrawOptions, updated drawLaneCanvas, onWheel, all call sites | 68c4d23 | feat |

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Added scaleStore imports to stopped-state draw block**
- **Found during:** Task 3
- **Issue:** The plan specified building options only in the RAF tick and AnimLane static draw useEffect. The stopped-state draw block (the `else` branch in the isPlaying useEffect) also calls drawLaneCanvas with ghosts and needed the same options pattern to avoid Y viewport resetting when playback transitions to stopped.
- **Fix:** Added equivalent `stoppedOptions` construction (with stoppedFullMin/Max, stoppedYVp, stoppedRootKey/scale) to the stopped-state block. All ghost calls in that block also pass `isGhostRegion: true`.
- **Files modified:** src/components/AnimationPanel.tsx
- **Commit:** 68c4d23

**2. [Rule 2 - Missing functionality] Added `isFocused` to static draw useEffect dependency array**
- **Found during:** Task 3
- **Issue:** The plan dependency array was `[curve, property, selectedPointIdx, canvasSize, yViewport]`. Since `isFocused` is now passed in `primaryOptions` (for note name label rendering in Plan 02), it must be a dep or labels won't update when focus toggles while stopped.
- **Fix:** Added `isFocused` to the effect's dependency array.
- **Files modified:** src/components/AnimationPanel.tsx
- **Commit:** 68c4d23

None of the above required Rule 4 consultation — both are correctness requirements for existing feature contracts.

## Test Results

```
Test Files  1 failed | 17 passed (18)
Tests       2 failed | 199 passed (201)
```

- 7 new tests added (4 noteHue + 3 yViewport) — all pass
- 2 failing tests are pre-existing CellPanel failures unrelated to Phase 10
- `npx tsc --noEmit` — zero errors

## Known Stubs

None. Plan 01 is infrastructure only — no rendering passes, no UI text, no data flows to display. DrawOptions fields `isFocused`, `rootKey`, `scale`, and `isGhostRegion` are wired through to `drawLaneCanvas` but are not yet consumed inside the function body (Plan 02 adds the drawing passes that use them). This is intentional — the interface is complete; the rendering is the Plan 02 deliverable.

## Threat Surface Scan

T-10-01 (WheelEvent deltaY DoS): Mitigated — `Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50)` caps raw delta at 50; output range hard-clamped to `[fullMin, fullMax]`.

T-10-02 (yViewport tampering): Accepted per threat register — in-memory browser state only, user controls their own viewport.

No new threat surface beyond what was in the plan's threat model.

## Self-Check

Checking created/modified files and commits...

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/engine/noteHue.ts | FOUND |
| src/engine/noteHue.test.ts | FOUND |
| src/store/uiStore.ts | FOUND |
| src/store/uiStore.test.ts | FOUND |
| src/components/AnimationPanel.tsx | FOUND |
| commit 0998d34 (RED tests) | FOUND |
| commit 4f99ada (GREEN implementation) | FOUND |
| commit 68c4d23 (DrawOptions + wiring) | FOUND |
