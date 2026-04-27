# Phase 9: Timeline Zoom, Ghosts, and Lane Focus — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 09-timeline-zoom-ghosts-and-lane-focus
**Areas discussed:** Zoom state location, Ghost rendering approach, Lane focus state & height, Zoom control UI

---

## Zoom State Location

| Option | Description | Selected |
|--------|-------------|----------|
| animationStore | Lives alongside curve data; RAF loop already reads it | |
| playbackStore | Lives with BPM and isPlaying; conceptually audio-focused | |
| New uiStore | Clean separation of UI state; adds a third store | ✓ |

**User's choice:** New uiStore
**Notes:** Both `zoomBeats` and `focusedLane` should live in the new `uiStore` — both are pure UI state.

---

## Ghost Rendering Approach

### Ghost draw architecture

| Option | Description | Selected |
|--------|-------------|----------|
| RAF loop calls drawLaneCanvas multiple times | Pass beatOffset per repetition; loop handles ghost count | ✓ |
| drawLaneCanvas handles repetition internally | Add zoomBeats param; function loops internally | |
| You decide | Claude picks cleanest approach | |

**User's choice:** RAF loop calls drawLaneCanvas multiple times (recommended)

### Ghost clipping

| Option | Description | Selected |
|--------|-------------|----------|
| ctx.save/translate/clip per ghost pass | Standard canvas 2D; each ghost clipped to its region | ✓ |
| Offset x-pixel via beatOffset param | Shifts toPixel() internally; leaks geometry into pure function | |
| You decide | Claude keeps drawLaneCanvas cleanest | |

**User's choice:** ctx.save/translate/clip per ghost pass (recommended)

---

## Lane Focus State & Height

### Height mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| CSS class on each anim-lane | .anim-lane--focused / .anim-lane--compressed classes | ✓ |
| Inline style on each anim-lane | Component computes height number; style={{ height }} | |
| You decide | Claude picks cleanest | |

**User's choice:** CSS class on each anim-lane (recommended)

### Compressed lane content

| Option | Description | Selected |
|--------|-------------|----------|
| Compressed curve — same drawLaneCanvas, smaller canvas | Canvas just shorter; drawLaneCanvas scales to canvas height | ✓ |
| Flat line or silhouette only | Simplified representation; separate draw path | |
| You decide | Claude picks simplest useful representation | |

**User's choice:** Compressed curve — same drawLaneCanvas but smaller canvas (recommended)

---

## Zoom Control UI

### Input form

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented buttons: 1 2 4 8 16 32 64 | 7 discrete buttons; matches ANIM-08 common values | ✓ |
| Range slider (1–64) | Continuous; non-power-of-2 values not useful | |
| Number input with increment/decrement | Compact but tedious for large changes | |

**User's choice:** Segmented buttons: 1 2 4 8 16 32 64 (recommended)

### Header position

| Option | Description | Selected |
|--------|-------------|----------|
| Left of the Add Curve button | Zoom = global control; Add Curve = per-shape action | ✓ |
| Right of the Add Curve button | Keeps Add Curve in current position | |
| You decide | Claude places based on existing layout | |

**User's choice:** Left of the Add Curve button (recommended)

---

## Claude's Discretion

- Partial ghost at right edge (when zoomBeats % curve.duration ≠ 0): clipped partial copy using same ghost approach
- Separator line between primary and first ghost: Claude decides at implementation time
- Compressed lane height exact value: 44px (midpoint of 40–48px spec range)

## Deferred Ideas

- Optional ghost boundary separator line (REQUIREMENTS.md explicitly marks as optional)
- Y-axis scroll/zoom (ANIM-10) — Phase 10
- Beat indicator lines (ANIM-12) — Phase 10
- Hue scale grid (ANIM-13) — Phase 10
