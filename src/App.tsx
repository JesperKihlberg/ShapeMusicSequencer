import './styles/index.css'

export function App() {
  return (
    <div className="app-shell">
      {/* Toolbar — React renders this (D-04) */}
      <header className="toolbar">
        <span role="heading" aria-level={1} className="toolbar__title">
          Shape Music Sequencer
        </span>
      </header>

      {/* Canvas area — placeholder div; CanvasContainer added in Plan 03 */}
      <main className="canvas-area" />
    </div>
  )
}

export default App
