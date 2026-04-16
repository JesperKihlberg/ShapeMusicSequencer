// src/components/CellPanel.tsx
// Right sidebar panel — shows cell content based on occupancy (D-06, CONTEXT.md)
// Reads: selectionStore (selectedCell), shapeStore (shape at cell)
// Writes: shapeStore.addShape, shapeStore.removeShape, selectionStore.setSelectedCell
import { useMemo } from 'react'
import { useSelectionStore } from '../store/selectionStore'
import { selectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
import { shapeStore } from '../store/shapeStore'
import { selectShapeAt } from '../store/selectors'

export function CellPanel() {
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  // Memoize selector to avoid new function reference each render (RESEARCH.md open question)
  const shapeSelector = useMemo(
    () => selectedCell ? selectShapeAt(selectedCell.col, selectedCell.row) : () => undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCell?.col, selectedCell?.row],
  )
  const shape = useShapeStore(shapeSelector)

  // No cell selected — render nothing; display:none handled on wrapper in App.tsx
  if (!selectedCell) return null

  const { col, row } = selectedCell

  function handleAddShape(): void {
    shapeStore.getState().addShape(col, row)
    // Panel stays open — useShapeStore re-renders with new shape (occupied mode)
  }

  function handleRemoveShape(): void {
    shapeStore.getState().removeShape(col, row)
    selectionStore.getState().setSelectedCell(null)  // D-10: close panel after remove
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
          <div className="cell-panel__props">
            <div className="cell-panel__prop-row">
              <span className="cell-panel__prop-label">Type</span>
              <span className="cell-panel__prop-value">{shape.type}</span>
            </div>
            <div className="cell-panel__prop-row">
              <span className="cell-panel__prop-label">Hue</span>
              <span className="cell-panel__prop-value">{shape.color.h}</span>
            </div>
            <div className="cell-panel__prop-row">
              <span className="cell-panel__prop-label">Saturation</span>
              <span className="cell-panel__prop-value">{shape.color.s}</span>
            </div>
            <div className="cell-panel__prop-row">
              <span className="cell-panel__prop-label">Lightness</span>
              <span className="cell-panel__prop-value">{shape.color.l}</span>
            </div>
          </div>
          <hr className="cell-panel__divider" />
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
