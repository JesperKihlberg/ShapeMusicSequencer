// src/components/PlaybackControls.tsx
// Toolbar control group: BPM widget + Volume slider + Start/Stop button (D-09, D-10)
// Order (left to right): BPM → Volume → Start/Stop
import { useState } from 'react'
import { usePlaybackStore, playbackStore } from '../store/playbackStore'

export function PlaybackControls() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const bpm = usePlaybackStore((s) => s.bpm)
  const volume = usePlaybackStore((s) => s.volume)

  // Local string state keeps the input stable while the user is mid-type.
  // Store only updates on blur/button-click, preventing store-driven re-renders
  // from overwriting partially-typed values (e.g. typing "5" before "50").
  const [bpmInput, setBpmInput] = useState<string | null>(null)
  const displayBpm = bpmInput ?? String(bpm)

  function handleTogglePlayback(): void {
    playbackStore.getState().setIsPlaying(!isPlaying)
  }

  function handleDecrementBpm(): void {
    playbackStore.getState().setBpm(bpm - 1)
    setBpmInput(null)
  }

  function handleIncrementBpm(): void {
    playbackStore.getState().setBpm(bpm + 1)
    setBpmInput(null)
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setBpmInput(e.target.value)
  }

  function handleBpmBlur(): void {
    const v = Number(bpmInput)
    if (bpmInput !== null && !isNaN(v) && v >= 60 && v <= 180) {
      playbackStore.getState().setBpm(v)
    }
    setBpmInput(null)
  }

  function handleBpmKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBpmBlur()
      ;(e.target as HTMLInputElement).blur()
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
            value={displayBpm}
            aria-label="BPM"
            onChange={handleBpmChange}
            onBlur={handleBpmBlur}
            onKeyDown={handleBpmKeyDown}
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
