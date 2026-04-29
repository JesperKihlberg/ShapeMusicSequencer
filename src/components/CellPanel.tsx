// src/components/CellPanel.tsx
// Right sidebar panel — shows cell content based on occupancy (D-06, CONTEXT.md)
// Phase 4: occupied mode replaced with full interactive editor (PANL-01/02/03)
// Phase 7: animRate beat-fraction selector replaced with Animate button (D-11)
import { useState, useMemo, useRef, useEffect } from 'react'
import { getVoiceAnalyser, setVoiceDistortionBypass } from '../engine/audioEngine'
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

  const [cleanMode, setCleanMode] = useState(false)

  useEffect(() => {
    if (!shape) return
    setCleanMode(false)
    setVoiceDistortionBypass(shape.id, false, shape.color.s, shape.color.l)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape?.id])

  useEffect(() => {
    if (!shape) return

    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    let rafId: number
    // dataArray is sized to fftSize/2=128; re-allocated only when a new analyser appears
    let dataArray: Uint8Array | null = null
    let lastAnalyser: AnalyserNode | null = null

    // Fill background once before the loop starts
    const w = canvas.width
    const h = canvas.height
    ctx2d.fillStyle = '#0a0f0a'
    ctx2d.fillRect(0, 0, w, h)

    function draw() {
      rafId = requestAnimationFrame(draw)

      // Re-fetch every frame — voice may not exist yet (context not running) or may have
      // been replaced by a type change (same shape.id, new AudioVoice after 60ms timeout)
      const analyser = getVoiceAnalyser(shape!.id)
      if (!analyser) return
      if (analyser !== lastAnalyser) {
        lastAnalyser = analyser
        dataArray = new Uint8Array(analyser.frequencyBinCount)
      }

      analyser.getByteTimeDomainData(dataArray!)

      const cw = canvas!.width
      const ch = canvas!.height

      // Phosphor persistence: semi-transparent dark fill decays old traces
      ctx2d!.fillStyle = 'rgba(10, 15, 10, 0.35)'
      ctx2d!.fillRect(0, 0, cw, ch)

      // Glow pass — wide, low-opacity stroke
      ctx2d!.beginPath()
      ctx2d!.strokeStyle = 'rgba(0, 255, 80, 0.18)'
      ctx2d!.lineWidth = 4

      const sliceWidth = cw / dataArray!.length
      let x = 0
      for (let i = 0; i < dataArray!.length; i++) {
        const y = ((dataArray![i] / 128.0) - 1) * (ch * 0.42) + ch / 2
        if (i === 0) ctx2d!.moveTo(x, y)
        else ctx2d!.lineTo(x, y)
        x += sliceWidth
      }
      ctx2d!.stroke()

      // Sharp core pass
      ctx2d!.beginPath()
      ctx2d!.strokeStyle = 'rgba(0, 255, 80, 0.9)'
      ctx2d!.lineWidth = 1.5
      x = 0
      for (let i = 0; i < dataArray!.length; i++) {
        const y = ((dataArray![i] / 128.0) - 1) * (ch * 0.42) + ch / 2
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

  function handleCleanToggle(): void {
    if (!shape) return
    const next = !cleanMode
    setCleanMode(next)
    setVoiceDistortionBypass(shape.id, next, shape.color.s, shape.color.l)
  }

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

          {/* Live waveform — Clean toggle + oscilloscope canvas */}
          <p className="cell-panel__section-heading">Waveform</p>
          <button
            className={cleanMode ? 'btn btn--accent' : 'btn'}
            aria-label={cleanMode ? 'Clean mode on — click to restore distortion' : 'Clean mode off — click to bypass distortion'}
            onClick={handleCleanToggle}
          >
            Clean
          </button>
          <canvas
            ref={waveCanvasRef}
            className="cell-panel__waveform"
            width={200}
            height={80}
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
