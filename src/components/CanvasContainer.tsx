// src/components/CanvasContainer.tsx
// React wrapper that mounts the canvas engine after the DOM is ready.
// Pattern: useEffect with empty deps → mount once; return destroy as cleanup.
// (RESEARCH.md Pattern 4, Pitfall 5 — static import, not dynamic)
import { useEffect, useRef } from 'react'
import { initCanvasEngine } from '../engine/canvasEngine'
import { cellAtPoint } from '../engine/canvasEngine'
import { shapeStore } from '../store/shapeStore'

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mount the canvas engine once after first render.
  // Returned destroy() is called on unmount (React StrictMode fires twice in dev — OK).
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const destroy = initCanvasEngine({ canvas, container })
    return destroy
  }, []) // empty deps — mount once (D-04)

  // Translate mouse click to a grid cell and dispatch addShape to the store.
  // cellAtPoint operates in logical (CSS) pixels — no DPR scaling needed here.
  // rect dimensions from getBoundingClientRect are already in CSS pixels.
  function handleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    // Use logical (CSS) pixel coordinates — consistent with cellAtPoint's coordinate space
    const logicalX = e.clientX - rect.left
    const logicalY = e.clientY - rect.top
    const logicalW = rect.width
    const logicalH = rect.height
    const cell = cellAtPoint(logicalX, logicalY, logicalW, logicalH)
    if (!cell) return
    shapeStore.getState().addShape(cell.col, cell.row)
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        role="application"
        aria-label="Shape music sequencer canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Hint text overlay — bottom-left, pointer-events: none (UI-SPEC Section 9) */}
      <span
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Click an empty cell to place a shape
      </span>
    </div>
  )
}

export default CanvasContainer
