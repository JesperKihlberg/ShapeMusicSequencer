// src/components/CellPanel.tsx
// Right sidebar panel — shows cell content based on occupancy (D-06, CONTEXT.md)
// Phase 4: occupied mode replaced with full interactive editor (PANL-01/02/03)
// Phase 5: animRate section replaced with beat-fraction selector (D-06, D-13)
import { useMemo } from 'react'
import { useSelectionStore } from '../store/selectionStore'
import { selectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
import { shapeStore } from '../store/shapeStore'
import type { Shape } from '../store/shapeStore'
import { selectShapeAt } from '../store/selectors'
import { HsvSliders } from './HsvSliders'
import { ShapeTypeSelector } from './ShapeTypeSelector'
import { usePlaybackStore, computeLfoHz, type BeatFraction } from '../store/playbackStore'

const FRACTIONS: { value: BeatFraction; label: string; ariaLabel: string }[] = [
  { value: 1,  label: '1/1',  ariaLabel: 'One bar' },
  { value: 2,  label: '1/2',  ariaLabel: 'Half note' },
  { value: 4,  label: '1/4',  ariaLabel: 'Quarter note' },
  { value: 8,  label: '1/8',  ariaLabel: 'Eighth note' },
  { value: 16, label: '1/16', ariaLabel: 'Sixteenth note' },
]

export function CellPanel() {
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  const bpm = usePlaybackStore((s) => s.bpm)
  const shapeSelector = useMemo(
    () => selectedCell ? selectShapeAt(selectedCell.col, selectedCell.row) : () => undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCell?.col, selectedCell?.row],
  )
  const shape = useShapeStore(shapeSelector)

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

          {/* Animation section — Phase 5: beat-fraction selector (D-06, D-13) */}
          <p className="cell-panel__section-heading">Animation</p>
          <div className="control-group">
            <div className="control-group__label-row">
              <label className="control-group__label">Rate</label>
              <span className="control-group__readout">
                {computeLfoHz(shape.animRate, bpm).toFixed(1)} Hz
              </span>
            </div>
            <div
              className="beat-selector"
              role="group"
              aria-label="Animation rate"
            >
              {FRACTIONS.map((frac) => (
                <button
                  key={frac.value}
                  className={`beat-selector__btn${shape.animRate === frac.value ? ' beat-selector__btn--active' : ''}`}
                  aria-pressed={shape.animRate === frac.value}
                  aria-label={frac.ariaLabel}
                  onClick={() => handleUpdateShape({ animRate: frac.value })}
                >
                  {frac.label}
                </button>
              ))}
            </div>
          </div>

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
