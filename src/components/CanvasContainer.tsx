// src/components/CanvasContainer.tsx
// React wrapper that mounts the canvas engine after the DOM is ready.
// Phase 3: handleClick routes to selectionStore (not addShape directly — D-02).
//   Keyboard handler: Escape clears selection; Delete/Backspace removes shape (D-08, D-09).
import { useEffect, useRef } from 'react'
import { initCanvasEngine, cellAtPoint } from '../engine/canvasEngine'
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'
import { initAudioEngine } from '../engine/audioEngine'

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mount canvas engine and audio engine once after first render.
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const destroyCanvas = initCanvasEngine({ canvas, container })
    const destroyAudio = initAudioEngine()
    return () => {
      destroyCanvas()
      destroyAudio()
    }
  }, [])

  // Document-level keyboard handler (D-08, D-09, UI-SPEC Section 7)
  // Reads selectionStore synchronously — no stale closure (RESEARCH.md Pitfall 1)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const selected = selectionStore.getState().selectedCell
      if (!selected) return  // no selection — all shortcuts are no-ops

      if (e.key === 'Escape') {
        selectionStore.getState().setSelectedCell(null)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const shape = shapeStore.getState().shapes.find(
          (s) => s.col === selected.col && s.row === selected.row,
        )
        if (shape) {
          shapeStore.getState().removeShape(selected.col, selected.row)
          selectionStore.getState().setSelectedCell(null)  // D-10: close panel after remove
        }
        // Empty cell selected + Delete → no-op (shape is undefined)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])  // mount once — reads store synchronously, no stale closure issue

  // Click handler — routes to selectionStore, NOT addShape (Phase 3 refactor, D-01, D-02)
  // cellAtPoint operates in logical (CSS) pixels — getBoundingClientRect dimensions used.
  function handleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cell = cellAtPoint(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    )
    if (!cell) return
    // Same-cell click is a no-op (D-08: clicking same cell leaves selection as-is)
    const current = selectionStore.getState().selectedCell
    if (current?.col === cell.col && current?.row === cell.row) return
    selectionStore.getState().setSelectedCell(cell)
  }

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        role="application"
        aria-label="Shape music sequencer canvas"
        style={{ display: 'block', width: '100%', height: '70vh' }}
      />
      {/* Hint text — updated for Phase 3 click model (UI-SPEC Section 10) */}
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
        Click any cell to select it
      </span>
    </div>
  )
}

export default CanvasContainer
