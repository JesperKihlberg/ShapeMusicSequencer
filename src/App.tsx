import './styles/index.css'
import { useState, useCallback } from 'react'
import { CanvasContainer } from './components/CanvasContainer'
import { CellPanel } from './components/CellPanel'
import { PlaybackControls } from './components/PlaybackControls'
import { ScaleSelector } from './components/ScaleSelector'
import { AnimationPanel } from './components/AnimationPanel'
import { useSelectionStore } from './store/selectionStore'

const PANEL_DEFAULT = 188  // matches AnimationPanel constant

export function App() {
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  const [panelHeight, setPanelHeight] = useState(PANEL_DEFAULT)

  const handleAnimate = useCallback(() => {
    // Restore panel from collapsed if needed (D-12)
    setPanelHeight(h => h <= 40 ? 180 : h)
  }, [])

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
          <CellPanel onAnimate={handleAnimate} />
        </div>
      </main>

      {/* Animation panel host — third flex child of .app-shell (Phase 7, D-12) */}
      <div
        className="animation-panel-host"
        style={{ height: `${panelHeight}px` }}
      >
        <AnimationPanel
          panelHeight={panelHeight}
          onHeightChange={setPanelHeight}
        />
      </div>
    </div>
  )
}

export default App
