// src/store/uiStore.ts
// Vanilla Zustand store for pure UI state: zoom level and lane focus (D-01 to D-03).
// Matches playbackStore.ts structure exactly — createStore + useStore hook wrapper.
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AnimatableProperty } from './animationStore'

export interface UiState {
  zoomBeats: number                          // global visible beat span; default 4 (ANIM-08)
  focusedLane: AnimatableProperty | null     // null = no lane focused; default null (ANIM-11)
  setZoomBeats: (beats: number) => void
  setFocusedLane: (prop: AnimatableProperty | null) => void
}

export const uiStore = createStore<UiState>()((set) => ({
  zoomBeats: 4,
  focusedLane: null,
  setZoomBeats: (beats: number) => set({ zoomBeats: Number.isFinite(beats) && beats > 0 ? beats : 4 }),
  setFocusedLane: (prop: AnimatableProperty | null) => set({ focusedLane: prop }),
}))

// React hook wrapper — same pattern as usePlaybackStore
export const useUiStore = <T>(selector: (state: UiState) => T): T =>
  useStore(uiStore, selector)
