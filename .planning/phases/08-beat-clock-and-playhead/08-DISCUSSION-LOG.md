# Phase 8: Beat Clock and Playhead — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 08-beat-clock-and-playhead
**Areas discussed:** Beat clock source, Playhead RAF loop, Stopped state behavior, Playhead visual style

---

## Beat Clock Source

| Option | Description | Selected |
|--------|-------------|----------|
| Export a getter from audioEngine | Add `export function getAudioContext()` — canvasEngine and lane RAF call it directly | |
| New beatClock module | `src/engine/beatClock.ts` exports `getCurrentBeat(bpm)` — single pure function, no audioCtx exposure | ✓ |
| Keep performance.now() | Use existing formula without a dedicated module | |

**User's choice:** New `beatClock.ts` module with a single pure `getCurrentBeat(bpm: number): number` function  
**Notes:** User specified exact implementation: `return (performance.now() / 1000) * (bpm / 60)`. The goal is a single source of truth for the formula that already exists in two places (audioEngine.ts:470 and canvasEngine.ts:161). No audioCtx export needed — performance.now() is sufficient and already in sync with the audio engine.

---

## Playhead RAF Loop

| Option | Description | Selected |
|--------|-------------|----------|
| Shared RAF in AnimationPanel | Single useEffect RAF loop in AnimationPanel.tsx drives all lane redraws | ✓ |
| New animationEngine module | src/engine/animationEngine.ts owns the RAF loop, calls drawPlayhead on lane canvases | |
| Piggyback on canvasEngine RAF | Extend canvasEngine.ts to trigger lane redraws via callback | |

**User's choice:** Shared RAF subscription in AnimationPanel  
**Notes:** Lanes are React components, so AnimationPanel.tsx is the natural home.

**Follow-up question: full redraw vs overlay**

| Option | Description | Selected |
|--------|-------------|----------|
| Redraw full lane canvas each frame | Clear + repaint curve + playhead together per frame | ✓ |
| Overlay canvas | Second transparent canvas on top for playhead only | |

**User's choice:** Redraw full lane canvas each frame  
**Notes:** Simpler code; avoids stacking/z-index complexity. Lanes are small so the per-frame cost is acceptable.

---

## Stopped State Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Beat 0 (left edge) — as spec says | Playhead resets to beat 0 when stopped; independent of frozenBeatPos | ✓ |
| Freeze at last beat position | Mirror frozenBeatPos pattern — playhead freezes at stop instant | |

**User's choice:** Beat 0 as spec requires  
**Notes:** The lane playhead is independent of `frozenBeatPos` (which serves the main canvas shape rendering). Clean reset at beat 0.

---

## Playhead Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode #6366f1 to match --color-accent | Simple, consistent with design system | ✓ |
| Read CSS variable at runtime | getComputedStyle().getPropertyValue('--color-accent') once at setup | |
| White with high opacity | rgba(255,255,255,0.9) — neutral, no color system dependency | |

**User's choice:** Hardcode `#6366f1`  
**Notes:** Acceptable for PoC; if accent color changes, update both CSS and this constant.

---

## Claude's Discretion

- Draw order: playhead drawn last (on top of curve and control points)
- Opacity: 1.0 (full opacity)
- RAF cleanup: `cancelAnimationFrame(rafId)` in useEffect return

## Deferred Ideas

None.
