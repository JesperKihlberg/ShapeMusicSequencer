import './styles/index.css'
import { CanvasContainer } from './components/CanvasContainer'
import { CellPanel } from './components/CellPanel'
import { useSelectionStore } from './store/selectionStore'

export function App() {
  const selectedCell = useSelectionStore((s) => s.selectedCell)

  return (
    <div className="app-shell">
      {/* Toolbar — React renders this (D-04) */}
      <header className="toolbar">
        <span role="heading" aria-level={1} className="toolbar__title">
          Shape Music Sequencer
        </span>
      </header>

      {/* Canvas area — flex row: canvas + cell panel (D-06, UI-SPEC Section 5) */}
      <main className="canvas-area">
        <CanvasContainer />
        {/* Panel wrapper: display:none when no selection prevents layout shift (Pitfall 4) */}
        <div
          className="cell-panel-wrapper"
          style={{ display: selectedCell ? 'flex' : 'none' }}
        >
          <CellPanel />
        </div>
      </main>
    </div>
  )
}

export default App
