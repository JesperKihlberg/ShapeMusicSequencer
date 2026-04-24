// src/engine/beatClock.ts
// Single source of truth for beat position derived from wall-clock time (ANIM-15).
// _startTimeMs is captured whenever playback starts so that beat 0 always
// corresponds to the moment Play was pressed — not page-load time.
// Usage: const beat = getCurrentBeat(playbackStore.getState().bpm)
let _startTimeMs = 0

export function markPlaybackStart(): void {
  _startTimeMs = performance.now()
}

export function getCurrentBeat(bpm: number): number {
  return ((performance.now() - _startTimeMs) / 1000) * (bpm / 60)
}
