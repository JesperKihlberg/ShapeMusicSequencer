# Phase 11: Shift+Drag Snapping — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 11-shift-drag-snapping
**Areas discussed:** Snap-while-insert, Y-viewport bug, Snap visual feedback

---

## Snap-while-insert

| Option | Description | Selected |
|--------|-------------|----------|
| Snap on insert too | If holding Shift to get a precise beat position, the new point snaps on click. Consistent: Shift = snap, always. | ✓ |
| Drag only — no snap on insert | Insert always free-places; only dragging snaps. Matches literal ANIM-16 wording. | |

**User's choice:** Snap on insert too
**Notes:** Consistent behavior preferred — Shift means snap in all pointer interactions, not just drag.

---

## Y-viewport bug

| Option | Description | Selected |
|--------|-------------|----------|
| Fix it in Phase 11 | pixelToPoint needs correct viewport-aware coords for snap math anyway; fixing is zero-extra-work and also fixes the existing drag-while-Y-zoomed off-by-range bug. | ✓ |
| Keep as-is, fix separately | Leave pixelToPoint on full range; track Y-viewport drag bug as separate quick task; snap uses a parallel viewport-aware path. | |

**User's choice:** Fix it in Phase 11
**Notes:** Fixing pixelToPoint to use yViewport is in-scope since snap correctness depends on it.

---

## Snap visual feedback

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator — silent snap | Point just moves to grid line. Simple. | |
| Snapped point changes color | Selected point renders with distinct fill/stroke when Shift held and on grid line. | ✓ |
| You decide | Claude picks whichever is cleaner for PoC. | |

**User's choice:** Snapped point changes color
**Notes:** Visual feedback makes snap state visible at a glance.

---

## Claude's Discretion

- Exact snapped point color/style (fill, stroke, glow)
- Whether snap state is tracked via ref or derived inline
- Exact mechanism for passing snap state to drawLaneCanvas (DrawOptions flag vs separate param vs ref-based)

## Deferred Ideas

None.
