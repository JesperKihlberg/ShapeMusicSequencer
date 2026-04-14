# Phase 1: Scaffold - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a running React + TypeScript dev environment with a visible 4x4 grid canvas. Clicking any empty grid cell places a circle shape in that cell, strictly snapped to cell center. No audio in this phase — just scaffold, architecture wiring, and grid interaction.

</domain>

<decisions>
## Implementation Decisions

### Build Tooling
- **D-01:** Use **Vite** as the build tool and dev server. No Create React App, no Next.js.
- **D-02:** TypeScript **strict mode on** (`strict: true` in tsconfig). No relaxed config.

### Canvas Rendering
- **D-03:** Render shapes on an **HTML Canvas element** — same approach as the prototype. Not DOM/CSS, not SVG.
- **D-04:** Architecture is three-layer, fully wired from Phase 1:
  - **Zustand + Immer** middleware for shape data store (position, color, size, waveform type, audio params). **zundo** temporal middleware for undo/redo.
  - **XState** behavioral FSM for sequencer modes: `idle`, `playing`, `selected`, `dragging`, `playingDragging`. User interactions are typed events sent to the machine; the machine fires actions that delegate data mutations to Zustand. The two layers never overlap in responsibility.
  - **Canvas engine outside React** — subscribes directly to Zustand raw store API (no React re-renders), reads behavioral mode from XState via sync call, runs independent RAF loop at 60fps.
  - **React renders only** the toolbar and shape editor panels — never touches the canvas.
- **D-05:** All three layers (Zustand store, XState machine, canvas engine) are scaffolded in Phase 1 — even if stubs. No refactoring in Phase 2.

### Grid Cell Design
- **D-06:** Grid cells are **square**, sized dynamically from container dimensions so the 4x4 grid fills the available space. Cell size = `min(containerWidth, containerHeight) / 4`.
- **D-07:** Shapes are centered at cell midpoints. Clicking a cell snaps placement to the cell center — no free-form positioning.
- **D-08:** Visual treatment: **subtle grid lines only** (low opacity). Empty cells are plain space. A placed shape visually fills/represents its cell.

### Prototype Relationship
- **D-09:** Build React app **from first principles** — do not port prototype code. The architecture (Zustand + XState + standalone canvas engine) is sufficiently different that copying vanilla JS event handlers would create more confusion than value.
- **D-10:** `shape_music_sequencer.html` is **kept in the repo** as an archive reference (not linked from the app). Useful for reviewing working drawing/audio logic during development.

### Claude's Discretion
- Selectors defined outside the Zustand store (per user intent — avoid unnecessary re-renders).
- Specific XState version (v4 vs v5), Zustand version, zundo version — Claude to use latest stable.
- ESLint / Prettier configuration — standard setup, Claude decides specifics.
- Project directory structure (where to put store, machine, canvas engine) — Claude decides.
- Shape size relative to cell size — Claude decides appropriate proportion.
- Canvas background color and grid line opacity/color — Claude decides, subtle dark or neutral theme.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Prototype
- `shape_music_sequencer.html` — Working vanilla JS prototype. Kept as archive reference. Do not port; use only to understand color-to-audio math and shape drawing logic for later phases.

### Project Specs
No external ADRs or specs — requirements fully captured in REQUIREMENTS.md and decisions above.

### Requirements Coverage
- **CANV-01** (Phase 1): User can place a shape on any empty grid cell (4x4, up to 16 cells)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shape_music_sequencer.html`: Contains working implementations of:
  - `drawShape()` — canvas drawing for all 5 shape types (circle, square, triangle, diamond, star)
  - `colorToFreq()` — hue-to-frequency mapping (useful reference for Phase 2)
  - `colorToWaveform()` — shape type to oscillator waveform mapping (Phase 2)
  - `hexToRgb()` — color utility
  - `roundRect()` — canvas helper for rounded rects
  - Grid background drawing with `strokeStyle` + `lineWidth`

### Established Patterns
- None yet — Phase 1 establishes the patterns.

### Integration Points
- Phase 1 establishes the `useShapeStore` (Zustand), `sequencerMachine` (XState), and `canvasEngine` module that all subsequent phases extend.

</code_context>

<specifics>
## Specific Ideas

- The canvas engine subscribes to Zustand **outside React** using the raw store subscription API (`store.subscribe()`), not React hooks. This is a deliberate architecture choice to keep the 60fps loop decoupled from React's render cycle.
- XState machine guards invalid combinations structurally — e.g., cannot be simultaneously dragging and editing (no boolean flag soup).
- zundo wraps the store automatically — "zero extra code" for undo/redo.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-scaffold*
*Context gathered: 2026-04-14*
