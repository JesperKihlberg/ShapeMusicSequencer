// src/store/scaleStore.ts
// Vanilla Zustand store for key/scale state (PLAY-05, PLAY-06).
// Must use createStore (not create) so audioEngine can subscribe outside React.
// Same pattern as playbackStore.ts.
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

// PLAY-05: 6 named musical scales + chromatic (identity passthrough)
// PLAY-06: 'chromatic' is a ScaleName option, not a separate boolean toggle
export type ScaleName =
  | 'major'
  | 'natural-minor'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'dorian'
  | 'mixolydian'
  | 'chromatic'

// Scale intervals as semitone offsets from root key (0 = root).
// Exported so audioEngine.ts can import SCALE_INTERVALS directly without
// going through React (avoids circular dependency through component layer).
export const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  'major':            [0, 2, 4, 5, 7, 9, 11],
  'natural-minor':    [0, 2, 3, 5, 7, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  'dorian':           [0, 2, 3, 5, 7, 9, 10],
  'mixolydian':       [0, 2, 4, 5, 7, 9, 10],
  'chromatic':        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

export interface ScaleState {
  rootKey: number       // 0–11 (C=0, C#=1, ..., B=11); default 0
  scale: ScaleName      // default 'major'
  setRootKey: (key: number) => void
  setScale: (scale: ScaleName) => void
}

export const scaleStore = createStore<ScaleState>()((set) => ({
  rootKey: 0,
  scale: 'major',
  // Clamp to [0, 11] and round to integer (prevents out-of-bounds array access)
  setRootKey: (key: number) => set({ rootKey: Math.round(Math.max(0, Math.min(11, key))) }),
  setScale: (scale: ScaleName) => set({ scale }),
}))

// React hook wrapper — same pattern as usePlaybackStore, useSelectionStore, useShapeStore
export const useScaleStore = <T>(selector: (state: ScaleState) => T): T =>
  useStore(scaleStore, selector)
