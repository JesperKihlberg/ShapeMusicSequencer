import './styles/index.css'
import { CanvasContainer } from './components/CanvasContainer'

export function App() {
  return (
    <div className="app-shell">
      {/* Toolbar — React renders this (D-04) */}
      <header className="toolbar">
        <span role="heading" aria-level={1} className="toolbar__title">
          Shape Music Sequencer
        </span>
      </header>

      {/* Canvas area — CanvasContainer mounts the engine after DOM is ready */}
      <main className="canvas-area">
        <CanvasContainer />
      </main>
    </div>
  )
}

export default App
