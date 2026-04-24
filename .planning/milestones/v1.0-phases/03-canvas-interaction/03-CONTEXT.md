# Phase 3: Canvas Interaction - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can fully manage shapes on the canvas — clicking any cell opens a cell editor panel (always, regardless of occupancy), placing new shapes, and removing existing ones — with each action immediately reflected in live audio. Phase 2 already wires audio playback; Phase 3 adds selection UI and removal only.

**Not in scope:** Dragging shapes to reposition, editing shape properties (Phase 4), playback controls (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Click Routing
- **D-01:** No per-shape hit-testing needed. The existing `cellAtPoint()` function in `canvasEngine.ts` is sufficient — a click resolves to a `{col, row}` cell, and the cell's occupancy determines panel content.
- **D-02:** Clicking any cell (occupied or empty) always opens the cell editor panel. Empty cell → panel shows a "place shape" option. Occupied cell → panel shows shape properties and a remove action.
- **D-03:** Phase 3 does not introduce new audio wiring. Shapes already play continuously from Phase 2. Clicking just opens the editor.

### Selection State
- **D-04:** Selected cell state lives in a **separate Zustand store** (`selectionStore` or similar) — not in `shapeStore` and not in React local state. This allows the canvas engine to read selected cell directly via store subscription (same vanilla store pattern as `shapeStore`) to draw the selection highlight.
- **D-05:** XState machine states `selected`, `dragging`, `playingDragging` remain stubs. No XState transitions are wired in Phase 3 — selection is handled entirely through the Zustand selection store.

### Panel Placement & Behavior
- **D-06:** The cell editor panel is a **fixed sidebar on the right side** of the app. It's a React component rendered by `App.tsx` alongside `CanvasContainer`. The panel is hidden when no cell is selected.
- **D-07:** Selected cell is highlighted with a **visible border/outline** on the canvas cell (drawn in the canvas engine's RAF loop when selection store has a value).
- **D-08:** Clicking a different cell **switches selection** (panel updates to new cell content). Pressing **Escape** closes the panel and clears selection.

### Remove Shape UX
- **D-09:** Removing a shape requires **two mechanisms**:
  1. A "Remove" button inside the cell editor panel (primary, discoverable)
  2. Delete/Backspace keyboard shortcut while a cell with a shape is selected
- **D-10:** After removing a shape, the **panel closes and selection clears**. The canvas returns to unselected state. The now-empty cell is immediately available for a new shape.

### Claude's Discretion
- Name and file location of the new selection store (e.g., `src/store/selectionStore.ts`)
- Exact visual style of the cell selection highlight (color, opacity, border width — consistent with the app's dark theme)
- Panel component structure and styling (sidebar width, typography, button placement)
- Keyboard event listener placement (document-level keydown in `CanvasContainer` or `App`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.planning/phases/01-scaffold/01-CONTEXT.md` — D-04 three-layer architecture (Zustand + XState + canvas engine); canvas engine subscribes to Zustand vanilla store, not React
- `.planning/phases/02-audio-engine/02-CONTEXT.md` — D-09 audio lifecycle (shape store drives voice creation/destruction); D-12 singleton AudioContext

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 3 covers: CANV-02, CANV-03

### Existing Prototype
- `shape_music_sequencer.html` — Reference only; contains the original click-to-select and remove logic in vanilla JS

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/canvasEngine.ts:31` — `cellAtPoint(x, y, w, h)` pure function already exported. Phase 3 uses this as-is for click-to-cell routing. No new hit-testing needed.
- `src/store/selectors.ts` — `selectShapeAt(col, row)`, `selectShapeById(id)` selectors already exist. Panel can use these to look up the shape in the selected cell.
- `src/store/shapeStore.ts` — `ShapeState` has `addShape` but no `removeShape` action yet. Phase 3 must add `removeShape(col: number, row: number)` or `removeShapeById(id: string)` to the store.
- `src/machine/sequencerMachine.ts` — `selected`, `dragging`, `playingDragging` state stubs remain untouched in Phase 3.

### Established Patterns
- **Zustand vanilla store** (`createStore` not `create`) — new `selectionStore` must follow this pattern so the canvas engine can subscribe without React
- **Singleton exports** — `shapeStore`, `sequencerActor` are module-level singletons; `selectionStore` should follow the same pattern
- **`useStore` hook wrapper** — `useShapeStore` wraps `useStore(shapeStore, selector)`; `useSelectionStore` should follow the same pattern
- **Canvas engine subscribes to store** — `canvasEngine.ts` already calls `shapeStore.subscribe()`; it will add a second subscription to `selectionStore` for the highlight

### Integration Points
- `CanvasContainer.tsx` — current `handleClick` calls `shapeStore.getState().addShape()` unconditionally. Phase 3 changes this: click → update `selectionStore.selectedCell` → panel opens/switches.
- `App.tsx` — currently renders toolbar + `CanvasContainer`. Phase 3 adds the sidebar panel component alongside `CanvasContainer`.
- `canvasEngine.ts` → `drawGrid` or a new `drawSelection` function reads `selectionStore` to overlay the cell highlight on the selected cell.
- `audioEngine.ts` — `removeShapeById` in the store must trigger voice destruction. Audio engine already subscribes to shapeStore; it will detect the removal and destroy the voice (same pattern as voice creation on add).

</code_context>

<specifics>
## Specific Ideas

- The selection store is separate from shape store — different lifecycle and different subscribers. Canvas engine reads it for highlight; panel component reads it for content; `CanvasContainer` writes to it on click.
- The cell editor panel for an **empty cell** should offer a way to place a shape (e.g., a "+" / "Add shape" button). This replaces the current behavior where clicking an empty cell immediately places a shape.
- The cell editor panel for an **occupied cell** shows the shape's properties (read-only in Phase 3 — editing comes in Phase 4) plus the Remove button.
- Keyboard Escape handler: document-level `keydown` listener, only fires when a cell is selected, clears selection and closes panel.

</specifics>

<deferred>
## Deferred Ideas

- **Drag to reposition** — XState `dragging` and `playingDragging` states exist as stubs. Dragging a shape to a different cell is a Phase 3+ capability but was explicitly deferred from Phase 3 scope.

</deferred>

---

*Phase: 03-canvas-interaction*
*Context gathered: 2026-04-15*
