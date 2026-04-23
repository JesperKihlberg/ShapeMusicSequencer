// src/store/playbackStore.ts
// Vanilla Zustand store for global playback state (D-14).
// Must use createStore (not create) so audioEngine and canvasEngine can subscribe
// outside React (same pattern as selectionStore.ts and shapeStore.ts).
//
// Also exports:
//   BeatFraction — the type for Shape.animRate (D-07)
//   computeLfoHz — pure function: (fraction, bpm) → Hz (D-06)
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

// TODO(Phase 7 Wave 2a): remove BeatFraction and computeLfoHz after audioEngine LFO removal
// TODO(Phase 7 Wave 3): remove after CellPanel animRate section removal
// D-07: BeatFraction represents the denominator of 1/N (e.g., 4 = quarter note).
// Stored as numeric denominator so the formula is clean: (bpm / 60) * (1 / fraction).
// Values correspond to: 1/1 (one bar), 1/2 (half note), 1/4 (quarter note),
//                        1/8 (eighth note), 1/16 (sixteenth note)
export type BeatFraction = 1 | 2 | 4 | 8 | 16

// D-06: LFO Hz formula — (bpm / 60) * fraction
// fraction is a beat multiplier: 1 = 1 pulse/beat (slow), 16 = 16 pulses/beat (fast).
// Examples: computeLfoHz(1, 120) = 2 Hz; computeLfoHz(4, 120) = 8 Hz; computeLfoHz(16, 120) = 32 Hz
export function computeLfoHz(fraction: BeatFraction, bpm: number): number {
  return (bpm / 60) * fraction
}

export interface PlaybackState {
  isPlaying: boolean    // D-14: defaults true (preserves current auto-start behavior)
  bpm: number           // D-08: range 60–180, default 120, integer only
  volume: number        // D-14: range 0–1, default 0.8
  setIsPlaying: (v: boolean) => void
  setBpm: (v: number) => void
  setVolume: (v: number) => void
}

export const playbackStore = createStore<PlaybackState>()((set) => ({
  isPlaying: true,    // D-14: true = preserves current auto-start behavior
  bpm: 120,           // D-08: default 120 BPM
  volume: 0.8,        // D-14: default 0.8
  setIsPlaying: (v: boolean) => set({ isPlaying: v }),
  setBpm: (v: number) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
  setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
}))

// React hook wrapper — same pattern as useSelectionStore, useShapeStore
export const usePlaybackStore = <T>(selector: (state: PlaybackState) => T): T =>
  useStore(playbackStore, selector)
