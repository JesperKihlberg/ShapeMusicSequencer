---
status: complete
---

# Quick Task 260428: when first adding an animation curve the curve is not drawn

## What was done

Fixed `AnimLane` in `src/components/AnimationPanel.tsx` so the curve draws immediately when first added.

**Root cause:** Two separate effects — one ResizeObserver (sets canvas dimensions) and one draw effect (renders curve) — were decoupled. On first mount the draw effect fired with `canvas.width = 0`, drew nothing, then ResizeObserver set real dimensions but didn't trigger a redraw since canvas size wasn't in the draw effect's dependency array.

**Fix:** Added `canvasSize` state (`{ w, h }`) to `AnimLane`. The ResizeObserver now calls `setCanvasSize` after resizing the canvas, and `canvasSize` was added to the draw effect's deps — guaranteeing a redraw after the first resize fires.

## Commit

`766e7a3` fix(anim): redraw AnimLane curve after canvas resize on first add
