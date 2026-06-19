---
task: make the cell edit panel resizable
slug: cell-panel-resizable
date: 2026-04-29
status: planned
---

# Cell Edit Panel — Resizable Width

## Goal

Add a drag handle to the left edge of the cell panel wrapper so the user can resize its width with the mouse, mirroring the pattern already used for the animation panel's height.

## Context

- `App.tsx` already manages `panelHeight` state for the animation panel via mouse drag — use the same pattern for panel width.
- `.cell-panel-wrapper` in `index.css` has a hard-coded `width: 240px`. That becomes a CSS variable driven by an inline style, exactly as `animation-panel-host` uses `height`.
- The drag handle sits on the **left** border of the wrapper (between the canvas and the panel) and responds to `mousedown` → `mousemove` on `window` → `mouseup`.
- Minimum width: 180px. Maximum width: 480px. Default: 240px (unchanged from today).
- No new dependencies. Pure React state + CSS.

## Tasks

- [ ] **1. Add `panelWidth` state and resize handler in `App.tsx`**
  - Add `const [panelWidth, setPanelWidth] = useState(240)` alongside the existing `panelHeight` state.
  - Write a `handlePanelResizeStart` callback (mousedown on handle): attach `mousemove` and `mouseup` listeners to `window`, compute new width as `window.innerWidth - e.clientX`, clamp to `[180, 480]`, call `setPanelWidth`. Remove listeners on mouseup or component unmount.
  - Pass `panelWidth` as an inline style `width` override on `.cell-panel-wrapper`: `style={{ visibility: ..., width: panelWidth }}`.

- [ ] **2. Add the drag handle element and CSS**
  - Inside `.cell-panel-wrapper` (in `App.tsx`), prepend a `<div className="cell-panel-resize-handle" onMouseDown={handlePanelResizeStart} />` as the first child, before `<CellPanel>`.
  - In `index.css`, add `.cell-panel-resize-handle` styles:
    - `width: 4px`, `cursor: col-resize`, `flex-shrink: 0`
    - `background: transparent` with `:hover` changing to `var(--color-border-secondary)` so the handle is discoverable but unobtrusive.
    - `user-select: none` to suppress text selection during drag.
  - Remove the hard-coded `width: 240px` from `.cell-panel-wrapper` (width is now driven by inline style). Keep `flex-shrink: 0` and all other properties.
  - Add `min-width: 180px; max-width: 480px` to `.cell-panel-wrapper` as CSS-level guards (belt-and-suspenders alongside the JS clamp).

- [ ] **3. Prevent canvas resize side-effects and verify**
  - The canvas area is a flex row; when the panel grows it must not push the canvas off-screen. Verify `.canvas-area` uses `min-width: 0` on `CanvasContainer` (or its wrapper) so it can shrink. Add `min-width: 0` to `.canvas-container` if missing.
  - Manual smoke test: drag the handle left and right, confirm panel resizes, canvas reflows, waveform canvas and sliders remain fully functional, no layout overflow appears.

## Files to Change

- `src/App.tsx` — add `panelWidth` state, `handlePanelResizeStart` callback, pass inline `width` style to `.cell-panel-wrapper`, add `<div className="cell-panel-resize-handle">` as first child of wrapper
- `src/styles/index.css` — replace `width: 240px` on `.cell-panel-wrapper` with `min-width`/`max-width` guards; add `.cell-panel-resize-handle` rule; add `min-width: 0` to canvas container if needed
