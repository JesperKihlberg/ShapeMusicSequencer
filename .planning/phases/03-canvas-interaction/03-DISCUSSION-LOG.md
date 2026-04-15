# Phase 3: Canvas Interaction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 03-canvas-interaction
**Areas discussed:** Click routing logic, Selection model & panel placement, Remove shape UX, XState wiring for selected state

---

## Click routing logic

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas engine exposes shapeAtPoint() | Pure function in canvasEngine.ts for per-shape hit testing | |
| CanvasContainer does the hit-test | Iterates shapes from store, computes distance from center | |
| Store selector handles it | shapeAtPoint selector with spatial math | |
| Cell-based only (user clarification) | No per-shape hit testing — cellAtPoint() is sufficient | ✓ |

**User's choice:** No per-shape hit testing needed. We only care about the cell that is clicked. Clicking a cell opens an editor for adding/editing/deleting the contained shapes.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cell editor panel always opens | Any cell click opens the panel regardless of occupancy | ✓ |
| Two modes | Empty = place immediately, occupied = open editor | |
| Always open panel, never auto-place | Click always opens panel, placement requires button inside | |

**User's choice:** Cell editor panel always opens regardless of occupancy.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Shape is already playing (Phase 2) | Clicking just opens editor, no new audio wiring | ✓ |
| Phase 3 connects click to audio | Phase 3 would establish the audio-click connection | |

**User's choice:** Shapes are already playing from Phase 2 — clicking just opens the editor.

---

## Selection model & panel placement

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed sidebar (right side) | Persistent panel zone on the right of the app | ✓ |
| Floating overlay near clicked cell | Popover/tooltip positioned near clicked cell | |
| Bottom drawer / sheet | Panel slides up from bottom | |

**User's choice:** Fixed sidebar on the right side.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight border on selected cell | Visible border/outline on selected cell | ✓ |
| Glow/halo on shape | Soft glow or shadow on selected shape | |
| No canvas highlight | Only open panel indicates selection | |

**User's choice:** Highlight border on the selected cell.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Click elsewhere or Escape | Click outside grid or Escape dismisses | |
| Explicit close button only | Panel has X button, clicking elsewhere doesn't dismiss | |
| Click other cell switches; Escape closes | Different cell = switch; Escape = close panel | ✓ |

**User's choice:** Click any other cell switches selection; Escape closes the panel.

---

## Remove shape UX

| Option | Description | Selected |
|--------|-------------|----------|
| Remove button inside panel | Deliberate button in the cell editor panel | |
| Delete/Backspace key shortcut | Keyboard shortcut while cell selected | |
| Both: button + keyboard shortcut | Panel button for discoverability + Delete key for speed | ✓ |

**User's choice:** Both: Remove button in panel AND Delete/Backspace keyboard shortcut.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Panel stays open showing empty cell | After remove, panel shows empty cell state | |
| Panel closes, selection clears | Remove closes panel, canvas returns to unselected | ✓ |
| Panel stays, grayed out | Panel remains with disabled state | |

**User's choice:** Panel closes and selection clears after removing a shape.

---

## XState wiring for selected state

| Option | Description | Selected |
|--------|-------------|----------|
| selected state only, no dragging | Wire playing↔selected via SELECT/DESELECT events | |
| selected + dragging both in Phase 3 | Wire both selection and drag-to-reposition | |
| Don't use XState — local React state | Keep panel open/closed as React useState | |
| Separate Zustand store (user choice) | Selection state in its own Zustand store | ✓ |

**User's choice:** A separate Zustand store holds the selected cell state. XState machine stubs remain untouched.

**Notes:** User clarified they want a separate Zustand store (not XState, not React local state, not the existing shapeStore). This is consistent with the canvas engine needing to read selection state for drawing the cell highlight without going through React.

---

## Claude's Discretion

- Name and file location of the new selection store
- Exact visual style of the cell selection highlight
- Panel component structure and styling
- Keyboard event listener placement

## Deferred Ideas

- Drag to reposition shapes (XState dragging/playingDragging stubs remain for a future phase)
