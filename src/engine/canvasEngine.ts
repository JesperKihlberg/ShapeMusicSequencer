// src/engine/canvasEngine.ts
// Standalone canvas engine — subscribes to shapeStore, reads sequencerActor,
// runs an independent RAF loop outside React (D-04, RESEARCH.md Pattern 3)
//
// IMPORTANT: sequencerActor import is kept even though Phase 1 only reads idle state.
//   canvas engine calls getSnapshot().value in the RAF loop (RESEARCH.md anti-patterns).
//   This import makes tsc happy and prepares for Phase 2+ behavioral transitions.
import { shapeStore, type Shape } from "../store/shapeStore";
import { sequencerActor } from "../machine/sequencerMachine";
import { selectionStore } from "../store/selectionStore";
import { drawShape } from './drawShape'
import { playbackStore } from '../store/playbackStore'
import { animationStore } from '../store/animationStore'
import type { SplineCurve } from '../store/animationStore'
import { getCurrentBeat } from './beatClock'

// frozenBeatPos: beat position captured at the instant Stop is pressed.
// null means playback is live; non-null means use this position for curve evaluation.
let frozenBeatPos: number | null = null

// ────────────────────────────────────────────────────────────────────
// Pure helper — exported for isolated unit testing (Plan 03, Task 1)
// ────────────────────────────────────────────────────────────────────

/**
 * Map a logical-pixel click coordinate to a grid cell.
 *
 * ALL arguments must be in logical (CSS) pixels — do NOT pass DPR-scaled
 * canvas-pixel values. Use getBoundingClientRect() dimensions for canvasW/H
 * and (clientX - rect.left) / (clientY - rect.top) for the click position.
 *
 * Cell math contract (UI-SPEC Section 7, RESEARCH.md Grid Cell Math):
 *   cellSize = Math.floor(Math.min(canvasW, canvasH) / 4)
 *   gridPx   = cellSize * 4
 *   offsetX  = Math.floor((canvasW - gridPx) / 2)
 *   offsetY  = Math.floor((canvasH - gridPx) / 2)
 *
 * Returns null if the point is outside the grid area
 * (localX < 0 || localY < 0 || localX >= gridPx || localY >= gridPx).
 */
export function cellAtPoint(canvasX: number, canvasY: number, canvasW: number, canvasH: number): { col: number; row: number } | null {
  const cellSize = Math.floor(Math.min(canvasW, canvasH) / 4);
  const gridPx = cellSize * 4;
  const offsetX = Math.floor((canvasW - gridPx) / 2);
  const offsetY = Math.floor((canvasH - gridPx) / 2);
  const localX = canvasX - offsetX;
  const localY = canvasY - offsetY;
  if (localX < 0 || localY < 0 || localX >= gridPx || localY >= gridPx) {
    return null;
  }
  return {
    col: Math.min(3, Math.floor(localX / cellSize)),
    row: Math.min(3, Math.floor(localY / cellSize)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// evalCurveAtBeat — evaluate a SplineCurve at a given beat position (looping).
// Linear interpolation between the two nearest in-window control points.
// Points with beat > duration are excluded (outside the loop window).
// Mirrors the implementation in audioEngine.ts — kept separate to avoid
// cross-engine imports. Both engines are standalone (D-04 three-layer arch).
// ─────────────────────────────────────────────────────────────────────────────
function evalCurveAtBeat(curve: SplineCurve, beatPos: number): number {
  const pos = curve.duration > 0 ? beatPos % curve.duration : 0
  const active = curve.points
    .filter((p) => p.beat <= curve.duration)
    .sort((a, b) => a.beat - b.beat)
  if (active.length === 0) return 0
  if (active.length === 1) return active[0].value
  let lo = active[active.length - 1]
  let hi = active[0]
  for (let i = 0; i < active.length - 1; i++) {
    if (active[i].beat <= pos && pos < active[i + 1].beat) {
      lo = active[i]
      hi = active[i + 1]
      break
    }
  }
  if (lo.beat === hi.beat) return lo.value
  const segLength = hi.beat - lo.beat
  if (segLength <= 0) return lo.value
  const t = (pos - lo.beat) / segLength
  return lo.value + t * (hi.value - lo.value)
}

// ────────────────────────────────────────────────────────────────────
// Engine initializer
// ────────────────────────────────────────────────────────────────────

interface EngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
}

/**
 * Initialize the canvas engine.
 *
 * - Subscribes once to shapeStore (dirty-flag pattern — RESEARCH.md Pattern 3)
 * - Observes container resize via ResizeObserver (sets DPR-aware canvas size)
 * - Runs a RAF loop that only redraws when dirty === true
 *
 * Returns a `destroy()` function for cleanup in React's useEffect return.
 */
export function initCanvasEngine({ canvas, container }: EngineOptions): () => void {
  // sequencerActor is read synchronously in RAF loop for Phase 2+ — reference kept
  void sequencerActor;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Engine cannot function without a 2D context — fail loudly with a clear message
    throw new Error("[canvasEngine] Failed to acquire 2D rendering context. Hardware acceleration may be disabled.");
  }
  let rafId: number | null = null;
  let dirty = true;

  // ── DPR-aware resize (RESEARCH.md Pitfall 1) ──────────────────────
  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    // Do NOT call ctx.scale here — render() sets the absolute transform each frame
    // via ctx.setTransform to prevent scale accumulation across repeated resize calls
    dirty = true;
  }

  // ── Grid drawing ──────────────────────────────────────────────────
  function drawGrid(logicalW: number, logicalH: number): void {
    const size = Math.floor(Math.min(logicalW, logicalH) / 4);
    const gridPx = size * 4;
    const offsetX = Math.floor((logicalW - gridPx) / 2);
    const offsetY = Math.floor((logicalH - gridPx) / 2);
    if (!ctx) return; // Defensive check for TypeScript strictNullChecks
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(offsetX + i * size, offsetY);
      ctx.lineTo(offsetX + i * size, offsetY + gridPx);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * size);
      ctx.lineTo(offsetX + gridPx, offsetY + i * size);
      ctx.stroke();
    }
  }

  // ── Shape drawing ─────────────────────────────────────────────────
  function drawShapes(shapes: Shape[], logicalW: number, logicalH: number): void {
    const cellSize = Math.floor(Math.min(logicalW, logicalH) / 4)  // renamed from 'size' to avoid shadowing shape.size
    const gridPx = cellSize * 4
    const offsetX = Math.floor((logicalW - gridPx) / 2)
    const offsetY = Math.floor((logicalH - gridPx) / 2)
    if (!ctx) return  // Defensive check for TypeScript strictNullChecks
    // D-03/D-04 (Phase 7): pulseScale removed — shapes render at base size unless
    // an animationStore size curve is active for this shape.
    // Beat position for curve evaluation: delegated to beatClock.ts (ANIM-15)
    const { bpm } = playbackStore.getState()
    const liveBeatPos = getCurrentBeat(bpm)
    const curves = animationStore.getState().curves

    for (const shape of shapes) {
      const cx = offsetX + shape.col * cellSize + Math.floor(cellSize / 2)
      const cy = offsetY + shape.row * cellSize + Math.floor(cellSize / 2)

      // Determine effective size: base size OR spline-modulated size if curve present.
      // frozenBeatPos is non-null while stopped — use it so the shape holds its
      // last animated position rather than snapping back to shape.size.
      let effectiveSize = shape.size
      const shapeCurves = curves[shape.id]
      const evalBeat = frozenBeatPos !== null ? frozenBeatPos : liveBeatPos
      if (shapeCurves?.size) {
        effectiveSize = evalCurveAtBeat(shapeCurves.size, evalBeat)
      }

      // Determine effective color: base color OR curve-modulated HSL if curves present.
      // frozenBeatPos is respected here (same as effectiveSize) so the shape holds its
      // last animated color when stopped rather than snapping back to shape.color.
      let effectiveColor = { ...shape.color }
      if (shapeCurves?.hue) {
        effectiveColor.h = Math.max(0, Math.min(360, evalCurveAtBeat(shapeCurves.hue, evalBeat)))
      }
      if (shapeCurves?.saturation) {
        effectiveColor.s = Math.max(0, Math.min(100, evalCurveAtBeat(shapeCurves.saturation, evalBeat)))
      }
      if (shapeCurves?.lightness) {
        effectiveColor.l = Math.max(0, Math.min(100, evalCurveAtBeat(shapeCurves.lightness, evalBeat)))
      }

      // D-05: shape.size=50 → (50/50)=1.0 → same base radius as Phase 3
      const radius = Math.floor(cellSize * 0.35 * (effectiveSize / 50))
      drawShape(ctx, cx, cy, radius, shape.type, effectiveColor)
    }
  }

  // ── Selection highlight ───────────────────────────────────────────────
  // Draws a 2px inset border on the selected cell (D-07, UI-SPEC Section 6)
  // Reads selectionStore synchronously — no React, no hooks
  // Renders AFTER drawShapes so the highlight appears on top of shapes
  function drawSelection(
    selectedCell: { col: number; row: number } | null,
    logicalW: number,
    logicalH: number,
  ): void {
    if (!selectedCell || !ctx) return
    const size = Math.floor(Math.min(logicalW, logicalH) / 4)
    const gridPx = size * 4
    const offsetX = Math.floor((logicalW - gridPx) / 2)
    const offsetY = Math.floor((logicalH - gridPx) / 2)
    const x = offsetX + selectedCell.col * size
    const y = offsetY + selectedCell.row * size
    // 2px inset stroke — stays within cell, does not bleed onto adjacent cells
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.90)'  // --color-accent at 90% opacity
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
  }

  // ── Render frame ──────────────────────────────────────────────────
  function render(): void {
    // Always redraw when shapes exist — animationStore curves change shape size every frame (UI-SPEC Pitfall 3 / RESEARCH.md Pattern 7)
    if (shapeStore.getState().shapes.length > 0) dirty = true
    if (!dirty) return;
    dirty = false;
    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / dpr;
    if (!ctx) return; // Defensive check for TypeScript strictNullChecks
    // Reset transform to identity then apply DPR scale — prevents accumulation
    // across repeated resize calls (RESEARCH.md Pitfall 1 fix)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#111113";
    ctx.fillRect(0, 0, logicalW, logicalH);
    drawGrid(logicalW, logicalH);
    drawShapes(shapeStore.getState().shapes, logicalW, logicalH);
    drawSelection(selectionStore.getState().selectedCell, logicalW, logicalH)
  }

  // ── RAF loop ──────────────────────────────────────────────────────
  function loop(): void {
    render();
    rafId = requestAnimationFrame(loop);
  }

  // Subscribe to shape and selection stores — either change sets dirty flag
  const unsubscribeShape = shapeStore.subscribe(() => { dirty = true })
  const unsubscribeSelection = selectionStore.subscribe(() => { dirty = true })
  // Phase 5/7: subscribe to playbackStore — isPlaying/bpm/volume changes trigger redraw.
  // Capture frozenBeatPos at the instant playback stops so drawShapes can hold position.
  const unsubscribePlayback = playbackStore.subscribe(() => {
    const { isPlaying, bpm } = playbackStore.getState()
    if (!isPlaying) {
      frozenBeatPos = (performance.now() / 1000 * bpm) / 60
    } else {
      frozenBeatPos = null
    }
    dirty = true
  })
  // Phase 7: subscribe to animationStore — curve changes trigger redraw
  const unsubscribeAnimation = animationStore.subscribe(() => { dirty = true })

  // Observe container resize — DPR-aware canvas sizing
  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(container);
  resize();

  // Start the RAF loop
  rafId = requestAnimationFrame(loop);

  // Cleanup — returned as destroy() for useEffect
  return function destroy(): void {
    if (rafId !== null) cancelAnimationFrame(rafId)
    unsubscribeShape()
    unsubscribeSelection()
    unsubscribePlayback()  // Phase 5/7: clean up playback subscription (Pitfall 3)
    unsubscribeAnimation()  // Phase 7: clean up animationStore subscription
    resizeObserver.disconnect()
    frozenBeatPos = null   // Reset freeze state on engine teardown
  }
}
