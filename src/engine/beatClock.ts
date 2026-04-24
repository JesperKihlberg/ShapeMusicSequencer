// src/engine/beatClock.ts
// Single source of truth for beat position derived from wall-clock time (ANIM-15).
// Pure function — no AudioContext dependency, no module state.
// Usage: const beat = getCurrentBeat(playbackStore.getState().bpm)
export function getCurrentBeat(bpm: number): number {
  return (performance.now() / 1000) * (bpm / 60)
}
