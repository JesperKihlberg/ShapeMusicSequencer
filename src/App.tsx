import './styles/index.css'
import { CanvasContainer } from './components/CanvasContainer'
import { CellPanel } from './components/CellPanel'
import { PlaybackControls } from './components/PlaybackControls'
import { ScaleSelector } from './components/ScaleSelector'
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
        {/* Toolbar controls group — right-aligned; order: Scale | BPM | Volume | Start/Stop */}
        <div className="toolbar__controls">
          <ScaleSelector />
          <PlaybackControls />
        </div>
      </header>

      {/* Canvas area — flex row: canvas + cell panel (D-06, UI-SPEC Section 5) */}
      <main className="canvas-area">
        <CanvasContainer />
        {/* Panel wrapper: visibility:hidden keeps 240px reserved so canvas never resizes */}
        <div
          className="cell-panel-wrapper"
          style={{ visibility: selectedCell ? 'visible' : 'hidden' }}
        >
          <CellPanel />
        </div>
      </main>
    </div>
  )
}

export default App
