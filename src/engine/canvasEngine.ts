// src/engine/canvasEngine.ts
// Standalone canvas engine — subscribes to shapeStore, reads sequencerActor,
// runs an independent RAF loop outside React (D-04, RESEARCH.md Pattern 3)
//
// IMPORTANT: sequencerActor import is kept even though Phase 1 only reads idle state.
//   canvas engine calls getSnapshot().value in the RAF loop (RESEARCH.md anti-patterns).
//   This import makes tsc happy and prepares for Phase 2+ behavioral transitions.
import { shapeStore, type Shape } from "../store/shapeStore";
import { sequencerActor } from '../machine/sequencerMachine'

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
export function cellAtPoint(
  canvasX: number,
  canvasY: number,
  canvasW: number,
  canvasH: number,
): { col: number; row: number } | null {
  const cellSize = Math.floor(Math.min(canvasW, canvasH) / 4)
  const gridPx = cellSize * 4
  const offsetX = Math.floor((canvasW - gridPx) / 2)
  const offsetY = Math.floor((canvasH - gridPx) / 2)
  const localX = canvasX - offsetX
  const localY = canvasY - offsetY
  if (localX < 0 || localY < 0 || localX >= gridPx || localY >= gridPx) {
    return null
  }
  return {
    col: Math.min(3, Math.floor(localX / cellSize)),
    row: Math.min(3, Math.floor(localY / cellSize)),
  }
}

// ────────────────────────────────────────────────────────────────────
// Engine initializer
// ────────────────────────────────────────────────────────────────────

interface EngineOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
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
  void sequencerActor

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Engine cannot function without a 2D context — fail loudly with a clear message
    throw new Error('[canvasEngine] Failed to acquire 2D rendering context. Hardware acceleration may be disabled.')
  }
  let rafId: number | null = null
  let dirty = true

  // ── DPR-aware resize (RESEARCH.md Pitfall 1) ──────────────────────
  function resize(): void {
    const dpr = window.devicePixelRatio || 1
    canvas.width = container.clientWidth * dpr
    canvas.height = container.clientHeight * dpr
    // Do NOT call ctx.scale here — render() sets the absolute transform each frame
    // via ctx.setTransform to prevent scale accumulation across repeated resize calls
    dirty = true
  }

  // ── Grid drawing ──────────────────────────────────────────────────
  function drawGrid(logicalW: number, logicalH: number): void {
    const size = Math.floor(Math.min(logicalW, logicalH) / 4)
    const gridPx = size * 4
    const offsetX = Math.floor((logicalW - gridPx) / 2)
    const offsetY = Math.floor((logicalH - gridPx) / 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(offsetX + i * size, offsetY)
      ctx.lineTo(offsetX + i * size, offsetY + gridPx)
      ctx.stroke()
      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY + i * size)
      ctx.lineTo(offsetX + gridPx, offsetY + i * size)
      ctx.stroke()
    }
  }

  // ── Shape drawing ─────────────────────────────────────────────────
  function drawShapes(shapes: Shape[], logicalW: number, logicalH: number): void {
    const size = Math.floor(Math.min(logicalW, logicalH) / 4)
    const gridPx = size * 4
    const offsetX = Math.floor((logicalW - gridPx) / 2)
    const offsetY = Math.floor((logicalH - gridPx) / 2)
    const radius = Math.floor(size * 0.35)
    for (const shape of shapes) {
      const cx = offsetX + shape.col * size + Math.floor(size / 2)
      const cy = offsetY + shape.row * size + Math.floor(size / 2)
      // Fill at 0.85 opacity (UI-SPEC Section 6, source: prototype drawShape())
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      const cssColor = `hsl(${shape.color.h}, ${shape.color.s}%, ${shape.color.l}%)`
      ctx.fillStyle = `hsla(${shape.color.h}, ${shape.color.s}%, ${shape.color.l}%, 0.85)`
      ctx.fill()
      // Stroke at 1.0 opacity
      ctx.strokeStyle = cssColor
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // ── Render frame ──────────────────────────────────────────────────
  function render(): void {
    if (!dirty) return
    dirty = false
    const dpr = window.devicePixelRatio || 1
    const logicalW = canvas.width / dpr
    const logicalH = canvas.height / dpr
    // Reset transform to identity then apply DPR scale — prevents accumulation
    // across repeated resize calls (RESEARCH.md Pitfall 1 fix)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#111113'
    ctx.fillRect(0, 0, logicalW, logicalH)
    drawGrid(logicalW, logicalH)
    drawShapes(shapeStore.getState().shapes, logicalW, logicalH)
  }

  // ── RAF loop ──────────────────────────────────────────────────────
  function loop(): void {
    render()
    rafId = requestAnimationFrame(loop)
  }

  // Subscribe to store — only sets dirty flag (no immediate redraw)
  const unsubscribe = shapeStore.subscribe(() => {
    dirty = true
  })

  // Observe container resize — DPR-aware canvas sizing
  const resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(container)
  resize()

  // Start the RAF loop
  rafId = requestAnimationFrame(loop)

  // Cleanup — returned as destroy() for useEffect
  return function destroy(): void {
    if (rafId !== null) cancelAnimationFrame(rafId)
    unsubscribe()
    resizeObserver.disconnect()
  }
}
