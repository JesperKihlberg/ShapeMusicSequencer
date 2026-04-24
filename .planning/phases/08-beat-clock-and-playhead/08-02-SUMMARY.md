---
phase: 8
plan: "08-02"
subsystem: ui
tags: [playhead, raf-loop, animation-panel, canvas, anim-14]
dependency_graph:
  requires: [beatClock.ts, playbackStore, animationStore]
  provides: [playhead-line, raf-loop-in-AnimationPanel]
  affects: [src/components/AnimationPanel.tsx]
tech_stack:
  added: []
  patterns: [raf-loop-useEffect, vanilla-zustand-in-raf, canvas-ref-registration]
key_files:
  created: []
  modified:
    - src/components/AnimationPanel.tsx
decisions:
  - "D-03: RAF loop redraws entire lane canvas (curve + playhead) each frame — no overlay canvas"
  - "D-04: isPlaying read via usePlaybackStore hook so useEffect re-runs on transition; bpm read vanilla inside RAF to avoid re-renders"
  - "D-05: Stopped state draws playhead at x=0 on all lanes (beat 0, left edge)"
  - "D-06: Playhead hardcoded #6366f1 (--color-accent), 2px solid, full canvas height, drawn last"
  - "Canvas ref registration: AnimLane calls onCanvasRef in useEffect with cleanup; AnimationPanel holds Map<AnimatableProperty, HTMLCanvasElement>"
metrics:
  duration: "2 minutes"
  completed: "2026-04-24T12:59:49Z"
  tasks_completed: 2
  files_changed: 1
---

# Phase 8 Plan 02: Playhead — drawLaneCanvas extension and RAF loop Summary

RAF-driven 2px #6366f1 playhead sweeps across all AnimationPanel lane canvases in sync with the beat clock; each lane independently tracks beat modulo its own curve duration (polyrhythm); snaps to x=0 when stopped. Zero React re-renders triggered by RAF frames.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend drawLaneCanvas with optional playheadBeat parameter | 94858c5 | src/components/AnimationPanel.tsx |
| 2 | Add RAF playhead loop to AnimationPanel | cc7a841 | src/components/AnimationPanel.tsx |

## What Was Built

- `drawLaneCanvas` extended with `playheadBeat?: number` as 7th parameter. When provided, draws a solid 2px `#6366f1` vertical line at `(beat % curve.duration) / curve.duration * w`. Drawn last in the function body (on top of curve polyline and control points). Defaults to `x=0` when undefined — stopped-state behaviour with no call-site changes required.

- `AnimLaneProps` extended with `onCanvasRef: (property: AnimatableProperty, ref: HTMLCanvasElement | null) => void`. Each `AnimLane` instance calls this in a `useEffect` with mount (register) and cleanup (unregister) — providing the parent with a stable `Map<AnimatableProperty, HTMLCanvasElement>`.

- `AnimationPanel` now holds:
  - `laneCanvasRefs`: `useRef<Map<AnimatableProperty, HTMLCanvasElement>>(new Map())` — canvas ref map
  - `handleCanvasRef`: stable `useCallback` that inserts/deletes from the map
  - `isPlaying`: from `usePlaybackStore` — triggers `useEffect` re-run on playback state change
  - RAF `useEffect` with `[isPlaying, shape]` deps: starts loop on play, cancels + redraws at beat 0 on stop, cancels on unmount

- Inside the RAF `tick` callback: `playbackStore.getState()` (vanilla Zustand, no hook) reads `bpm`; `getCurrentBeat(bpm)` computes current beat; `drawLaneCanvas` is called per visible lane with the beat — each lane independently shows its own phase via `beat % curve.duration`.

## Verification Results

- `npx tsc --noEmit`: zero errors (confirmed twice — after Task 1 and after Task 2)
- `grep playheadBeat AnimationPanel.tsx`: appears in signature (line 257) and body (lines 313–314)
- `grep requestAnimationFrame AnimationPanel.tsx`: appears in RAF loop useEffect (lines 81, 86)
- `grep "playbackStore.getState" AnimationPanel.tsx`: appears inside RAF tick callback (line 70)
- `grep getCurrentBeat AnimationPanel.tsx`: import (line 10) and RAF tick call (line 71)
- `grep onCanvasRef AnimationPanel.tsx`: interface, component signature, useEffect, and JSX prop all present

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — playhead is fully wired to `playbackStore.getState().bpm` and `getCurrentBeat`. The RAF loop reads live beat position every frame.

## Threat Flags

No new security-relevant surface introduced. All Canvas2D draw calls use arithmetic-derived pixel positions from user-authored curve data — no string interpolation, no DOM injection, no network access.

## Self-Check: PASSED

Files confirmed present:
- src/components/AnimationPanel.tsx: FOUND (modified)

Commits confirmed:
- 94858c5: Task 1 — extend drawLaneCanvas
- cc7a841: Task 2 — RAF playhead loop
