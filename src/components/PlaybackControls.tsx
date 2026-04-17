// src/components/PlaybackControls.tsx
// Toolbar control group: BPM widget + Volume slider + Start/Stop button (D-09, D-10)
// Order (left to right): BPM → Volume → Start/Stop
import { usePlaybackStore, playbackStore } from '../store/playbackStore'

export function PlaybackControls() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const bpm = usePlaybackStore((s) => s.bpm)
  const volume = usePlaybackStore((s) => s.volume)

  function handleTogglePlayback(): void {
    playbackStore.getState().setIsPlaying(!isPlaying)
  }

  function handleDecrementBpm(): void {
    playbackStore.getState().setBpm(bpm - 1)
  }

  function handleIncrementBpm(): void {
    playbackStore.getState().setBpm(bpm + 1)
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const v = Number(e.target.value)
    if (!isNaN(v)) {
      playbackStore.getState().setBpm(v)
    }
  }

  function handleBpmBlur(e: React.FocusEvent<HTMLInputElement>): void {
    // Snap out-of-range or empty values to nearest bound on blur (UI-SPEC BPM Bounds)
    const v = Number(e.target.value)
    if (isNaN(v) || e.target.value === '') {
      playbackStore.getState().setBpm(bpm)  // restore previous valid value
    } else {
      playbackStore.getState().setBpm(v)    // store clamps to 60-180 range
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>): void {
    playbackStore.getState().setVolume(Number(e.target.value))
  }

  return (
    <div className="toolbar__controls">

      {/* BPM Widget (D-12) */}
      <div className="toolbar-control">
        <span className="toolbar-control__label">BPM</span>
        <div className="bpm-widget">
          <button
            className="bpm-widget__btn"
            aria-label="Decrease BPM"
            onClick={handleDecrementBpm}
          >
            −
          </button>
          <input
            className="bpm-widget__input"
            type="number"
            min={60}
            max={180}
            step={1}
            value={bpm}
            aria-label="BPM"
            onChange={handleBpmChange}
            onBlur={handleBpmBlur}
          />
          <button
            className="bpm-widget__btn"
            aria-label="Increase BPM"
            onClick={handleIncrementBpm}
          >
            +
          </button>
        </div>
      </div>

      {/* Volume Slider (D-11) */}
      <div className="toolbar-control">
        <span className="toolbar-control__label">Volume</span>
        <div className="slider-wrap toolbar-slider">
          <div
            className="slider-wrap__track"
            style={{ background: 'var(--color-bg-tertiary)' }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Master volume"
            onChange={handleVolumeChange}
          />
        </div>
      </div>

      {/* Start/Stop Button (D-03) */}
      <button
        className="btn btn--start-stop"
        aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
        aria-pressed={isPlaying}
        onClick={handleTogglePlayback}
      >
        {isPlaying ? 'Stop' : 'Start'}
      </button>

    </div>
  )
}

export default PlaybackControls
