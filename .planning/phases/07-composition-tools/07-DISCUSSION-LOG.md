# Phase 7: Composition Tools — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 07-composition-tools
**Areas discussed:** Undo/redo scope, PNG export, Spline data model, Animation panel UX

---

## Undo/redo scope

| Option | Description | Selected |
|--------|-------------|----------|
| Shape placement/removal only | addShape/removeShape tracked; updateShape not undoable. | |
| All shape mutations | addShape, removeShape, updateShape all tracked with debouncing. | |
| Everything including playback state | Shape + BPM + key/scale all undoable. | |
| Skip to later phase | Undo/redo deferred entirely. | ✓ |

**User's choice:** Deferred to a later phase.
**Notes:** "skip to later fase" — user explicitly does not want undo/redo in Phase 7. zundo temporal middleware already in shapeStore; wiring will be trivial when the time comes.

---

## PNG export

| Option | Description | Selected |
|--------|-------------|----------|
| Live canvas snapshot | canvas.toDataURL('image/png') as-is. | |
| Clean composition render | Off-screen canvas, clean background, fixed resolution. | |
| Annotated export | Snapshot + embedded metadata text overlay. | |
| Skip to later phase | Export deferred entirely. | ✓ |

**User's choice:** Deferred to a later phase.
**Notes:** "skip to later fase" — user explicitly does not want PNG export in Phase 7.

---

## Spline data model

### Animatable properties

| Option | Selected |
|--------|----------|
| size | ✓ |
| hue | ✓ |
| saturation | ✓ |
| lightness | ✓ |

**Notes:** All four color-mapped properties are animatable.

### Curve structure

| Option | Description | Selected |
|--------|-------------|----------|
| `{t, value}` control points per property | Simple, serializable, easy to interpolate. | ✓ (with beat modification) |
| Cubic bezier handles | Full `{t, value, handleIn, handleOut}`. More complex. | |
| Flat sampled array | Pre-sampled, no control point editing. | |

**User's choice:** `{beat, value}` control points — using **absolute beat positions** (not 0–1 normalized).
**Notes:** User specified: "make sure that the duration can be changed without changing the points relative position in the beat. changing curve length should only lengthen or shorten the beat window not alter the beat relative position of the points." This drives the beat-absolute coordinate system.

### Curve location

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on Shape as `curves` field | `Shape.curves?: { size?, hue?, ... }` | |
| Separate animationStore | New Zustand store keyed by shape ID. | ✓ |
| Separate curves file / JSON | Outside shape model entirely. | |

**User's choice:** Separate animationStore.

### LFO migration

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-convert on first panel open | animRate → sine spline silently on first panel open. | |
| Auto-convert all on load | Bulk conversion on startup. | |
| No animation by default | New shapes start with steady sound, no animation. | ✓ |

**User's choice:** "When creating a shape no animations should be present — only a steady sound and volume."
**Notes:** This supersedes the INGEST-CONFLICTS.md staged migration plan. LFO is simply removed; no migration. Users add animation fresh.

### animRate removal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove animRate entirely | Drop from Shape interface, remove LFO code. | ✓ |
| Keep as legacy fallback | animRate=null for new shapes, old shapes keep it. | |

**User's choice:** Remove animRate entirely.

---

## Animation panel UX

### How panel opens

| Option | Description | Selected |
|--------|-------------|----------|
| Button in CellPanel | "Animate" button in existing side panel. | ✓ |
| Double-click canvas | Double-click shape opens animation panel. | |
| Toolbar toggle | Animate mode toggle switches click behavior. | |

**User's choice:** Button in CellPanel.

### Lane visuals

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: polyline + draggable dots | Straight segments, drag to edit. | ✓ |
| Smooth bezier curves | Visually richer, more complex. | |
| Step/staircase | Holds value until next point. | |

**User's choice:** Minimal polyline with draggable dots.

### Lane layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked rows, one per active property | Only active curves shown, + button to add. | ✓ |
| Tab strip | One tab per property, one visible at a time. | |
| All 4 lanes always visible | Full overview, empty lanes grayed. | |

**User's choice:** Stacked rows, active curves only.

### Divider UX

| Option | Description | Selected |
|--------|-------------|----------|
| Drag handle on top edge | Drag up/down to resize, collapses to strip. | ✓ |
| Fixed size with toggle | Fixed height, collapse arrow. | |
| CSS resize handle | Browser-native `resize: vertical`. | |

**User's choice:** Drag handle on top edge of panel.

---

## Claude's Discretion

- Linear interpolation between control points (no bezier in Phase 7)
- Click on polyline to insert a new control point
- Minimum 2 control points per curve
- animationStore default: `{ curves: {} }`
- Panel height: 180px default, 40px min (collapsed), 50% viewport max
- No playhead cursor in animation panel

## Deferred Ideas

- Undo/redo (COMP-01) — explicitly deferred by user
- PNG export (COMP-02) — explicitly deferred by user
- Playhead cursor in animation panel — future phase
- Smooth bezier interpolation — future phase
- Star percussion sound design — separate from spline system
