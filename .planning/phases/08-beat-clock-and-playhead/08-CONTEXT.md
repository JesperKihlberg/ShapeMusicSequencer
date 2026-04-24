# Phase 8: Beat Clock and Playhead — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a RAF-driven playhead line that sweeps across every lane canvas in `AnimationPanel.tsx` in sync with the beat. The playhead position reflects each lane's curve duration (modulo beat), is driven entirely by `requestAnimationFrame` (no React state updates per frame), and sits at beat 0 when playback is stopped.

Requirements in scope: ANIM-14, ANIM-15.

</domain>

<decisions>
## Implementation Decisions

### Beat Clock (ANIM-15)

- **D-01:** Create `src/engine/beatClock.ts` — a single pure exported function:
  ```ts
  export function getCurrentBeat(bpm: number): number {
    return (performance.now() / 1000) * (bpm / 60)
  }
  ```
  This deduplicates the formula already duplicated in `audioEngine.ts:470` and `canvasEngine.ts:161`. Both engines AND the new lane RAF import from this module. `audioEngine.ts` is left unchanged (no `audioCtx` export needed). The function is pure and trivially testable.

### Playhead RAF Loop (ANIM-14)

- **D-02:** The RAF loop lives in `AnimationPanel.tsx` — a single `useEffect` starts a `requestAnimationFrame` loop that drives playhead redraws across all lane canvases. Lane canvases pass their canvas refs up (or the loop reads them via a refs array). No new engine module.
- **D-03:** Each frame, the loop redraws the **entire lane canvas** (curve + playhead together). No overlay canvas. `drawLaneCanvas` (already a pure function in `AnimationPanel.tsx:191`) is called per lane each frame during playback, passing the current beat position. This is the simplest path and avoids stacking/z-index complexity.
- **D-04:** The RAF loop only runs when `isPlaying` is true. When stopped, the loop cancels itself and the lane canvases are redrawn once at beat 0 (left edge).

### Stopped State

- **D-05:** When playback stops, the playhead sits at beat 0 (left edge of the lane canvas) on all lanes — exactly as spec ANIM-14 requires. The `frozenBeatPos` pattern in `canvasEngine.ts` is unrelated (it holds the visual shape position for the main canvas); the lane playhead ignores it and always resets to 0.

### Playhead Visual Style

- **D-06:** Playhead is a solid 2px vertical line. Color: hardcoded `#6366f1` to match `--color-accent` from `src/styles/index.css`. If the accent color changes in the future, both the CSS variable and this constant need updating — acceptable for PoC scope.

### Claude's Discretion

- Playhead draw order: drawn last (on top of the curve polyline and control points) so it is always visible.
- Opacity: full opacity (1.0) to distinguish from curve elements.
- The RAF loop cleanup: `useEffect` returns a cancel function that calls `cancelAnimationFrame(rafId)` — same lifecycle pattern as `initCanvasEngine` in the main canvas.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ANIM-14 (playhead line spec) and ANIM-15 (beat clock spec)
- `.planning/ROADMAP.md` — Phase 8 success criteria

### Architecture
- `.planning/milestones/v1.0-phases/01-scaffold/01-CONTEXT.md` — D-04 three-layer architecture; canvasEngine subscribes to Zustand vanilla stores via `.subscribe()`, not React; RAF loop is independent of React
- `.planning/milestones/v1.0-phases/07-composition-tools/07-CONTEXT.md` — D-14/D-15 lane canvas draw loop, `drawLaneCanvas` pure function, `animationStore` structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/canvasEngine.ts` — `frozenBeatPos` pattern: understand it but the lane playhead is independent of it
- `src/components/AnimationPanel.tsx:191` — `drawLaneCanvas(ctx, w, h, curve, property, selectedPointIdx)` pure function; Phase 8 extends it with an optional `playheadBeat?: number` parameter
- `src/store/playbackStore.ts` — `usePlaybackStore` hook and `playbackStore.getState()` for reading `isPlaying` and `bpm` from inside the RAF loop

### Established Patterns
- Beat position formula: `(performance.now() / 1000) * (bpm / 60)` — used in both engines today, to be extracted to `beatClock.ts`
- RAF lifecycle: start in `useEffect`, return `cancelAnimationFrame(rafId)` as cleanup — matches `initCanvasEngine` pattern
- Dirty-flag vs always-draw: lanes already redraw on every React render; the RAF loop during playback replaces this with every-frame redraws

### Integration Points
- `AnimationPanel.tsx` — RAF loop added here; `LaneCanvas` component (defined inline around line 262) gains a canvas ref forwarded to the parent loop
- `src/engine/beatClock.ts` — NEW file; also refactor the existing formula in `canvasEngine.ts:161` and `audioEngine.ts:470` to call this instead

</code_context>

<specifics>
## Specific Ideas

- User explicitly specified the `beatClock.ts` module structure as: `export function getCurrentBeat(bpm: number): number { return (performance.now() / 1000) * (bpm / 60) }` — use this exact signature.
- The playhead modulo is per-lane: `beatPos % curve.duration` gives the position within that lane's loop window. Each lane independently shows its own phase (polyrhythm).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-beat-clock-and-playhead*
*Context gathered: 2026-04-24*
