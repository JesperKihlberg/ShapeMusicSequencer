// src/components/CellPanel.tsx
// Right sidebar panel — shows cell content based on occupancy (D-06, CONTEXT.md)
// Phase 4: occupied mode replaced with full interactive editor (PANL-01/02/03)
// Phase 7: animRate beat-fraction selector replaced with Animate button (D-11)
import { useMemo, useRef, useEffect } from 'react'
import { getVoiceAnalyser } from '../engine/audioEngine'
import { useSelectionStore } from '../store/selectionStore'
import { selectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
import { shapeStore } from '../store/shapeStore'
import type { Shape } from '../store/shapeStore'
import { selectShapeAt } from '../store/selectors'
import { HsvSliders } from './HsvSliders'
import { ShapeTypeSelector } from './ShapeTypeSelector'

interface CellPanelProps {
  onAnimate?: () => void
}

export function CellPanel({ onAnimate }: CellPanelProps = {}) {
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  const shapeSelector = useMemo(
    () => selectedCell ? selectShapeAt(selectedCell.col, selectedCell.row) : () => undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCell?.col, selectedCell?.row],
  )
  const shape = useShapeStore(shapeSelector)

  const waveCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!shape) return
    const analyser = getVoiceAnalyser(shape.id)
    if (!analyser) return

    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const bufferLength = analyser.frequencyBinCount  // fftSize / 2 = 128
    const dataArray = new Uint8Array(bufferLength)
    let rafId: number

    function draw() {
      rafId = requestAnimationFrame(draw)
      analyser!.getByteTimeDomainData(dataArray)

      const w = canvas!.width
      const h = canvas!.height
      ctx2d!.clearRect(0, 0, w, h)

      ctx2d!.beginPath()
      ctx2d!.strokeStyle = 'var(--color-accent, #7c6af7)'
      ctx2d!.lineWidth = 1.5

      const sliceWidth = w / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0  // 0–2 range
        const y = (v / 2) * h           // 0–h
        if (i === 0) ctx2d!.moveTo(x, y)
        else ctx2d!.lineTo(x, y)
        x += sliceWidth
      }
      ctx2d!.stroke()
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [shape?.id])  // re-run when selected shape changes

  if (!selectedCell) return null

  const { col, row } = selectedCell

  function handleAddShape(): void {
    shapeStore.getState().addShape(col, row)
  }

  function handleRemoveShape(): void {
    shapeStore.getState().removeShape(col, row)
    selectionStore.getState().setSelectedCell(null)
  }

  function handleUpdateShape(patch: Partial<Shape>): void {
    if (!shape) return
    shapeStore.getState().updateShape(shape.id, patch)
  }

  return (
    <aside
      role="complementary"
      aria-label="Cell editor"
      className="cell-panel"
    >
      <header className="cell-panel__header">
        <h2 className="cell-panel__title">Cell ({col}, {row})</h2>
      </header>

      {shape ? (
        <div className="cell-panel__body">

          {/* Color section — PANL-01 (D-01/02/03) */}
          <p className="cell-panel__section-heading">Color</p>
          <HsvSliders
            color={shape.color}
            onChange={(color) => handleUpdateShape({ color })}
          />

          <hr className="cell-panel__divider" />

          {/* Size section — PANL-02 (D-04/05/06) */}
          <p className="cell-panel__section-heading">Size</p>
          <div className="control-group">
            <div className="control-group__label-row">
              <label className="control-group__label" htmlFor="slider-size">Size</label>
              <span className="control-group__readout">{shape.size}%</span>
            </div>
            <div className="slider-wrap">
              <div
                className="slider-wrap__track"
                style={{ background: 'var(--color-bg-tertiary)' }}
              />
              <input
                id="slider-size"
                type="range"
                min={0}
                max={100}
                value={shape.size}
                onChange={(e) => handleUpdateShape({ size: Number(e.target.value) })}
                aria-label="Size, 0 to 100"
              />
            </div>
          </div>

          <hr className="cell-panel__divider" />

          {/* Shape type section — D-07/08 */}
          <p className="cell-panel__section-heading">Shape</p>
          <ShapeTypeSelector
            currentType={shape.type}
            shapeColor={shape.color}
            onChange={(type) => handleUpdateShape({ type })}
          />

          <hr className="cell-panel__divider" />

          {/* Animation section — Phase 7: Animate button (D-11) */}
          <p className="cell-panel__section-heading">Animation</p>
          <button
            className="btn btn--accent"
            aria-label="Open animation panel for this shape"
            onClick={onAnimate}
          >
            Animate
          </button>

          <hr className="cell-panel__divider" />

          {/* Live waveform — Task 2 */}
          <p className="cell-panel__section-heading">Waveform</p>
          <canvas
            ref={waveCanvasRef}
            className="cell-panel__waveform"
            width={200}
            height={60}
            aria-label="Live waveform of selected voice"
          />

          <hr className="cell-panel__divider" />

          {/* Remove Shape — unchanged from Phase 3 */}
          <button
            className="btn btn--danger"
            onClick={handleRemoveShape}
            aria-label={`Remove shape from cell column ${col} row ${row}`}
          >
            Remove Shape
          </button>

        </div>
      ) : (
        <div className="cell-panel__body">
          <p className="cell-panel__empty-text">This cell is empty.</p>
          <button
            className="btn btn--accent"
            onClick={handleAddShape}
            aria-label={`Add shape to cell column ${col} row ${row}`}
          >
            + Add Shape
          </button>
        </div>
      )}
    </aside>
  )
}

export default CellPanel
