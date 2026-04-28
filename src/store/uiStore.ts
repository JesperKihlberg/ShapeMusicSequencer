// src/store/uiStore.ts
// Vanilla Zustand store for pure UI state: zoom level and lane focus (D-01 to D-03).
// Matches playbackStore.ts structure exactly — createStore + useStore hook wrapper.
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AnimatableProperty } from './animationStore'

export interface UiState {
  zoomBeats: number                          // global visible beat span; default 4 (ANIM-08)
  focusedLane: AnimatableProperty | null     // null = no lane focused; default null (ANIM-11)
  yViewport: Partial<Record<AnimatableProperty, { min: number; max: number }>>  // per-lane Y viewport; absent key = full range (ANIM-10, D-11)
  setZoomBeats: (beats: number) => void
  setFocusedLane: (prop: AnimatableProperty | null) => void
  setYViewport: (prop: AnimatableProperty, viewport: { min: number; max: number }) => void  // per-lane Y scroll/zoom (ANIM-10)
}

export const uiStore = createStore<UiState>()((set) => ({
  zoomBeats: 4,
  focusedLane: null,
  yViewport: {},
  setZoomBeats: (beats: number) => set({ zoomBeats: Number.isFinite(beats) && beats > 0 ? beats : 4 }),
  setFocusedLane: (prop: AnimatableProperty | null) => set({ focusedLane: prop }),
  setYViewport: (prop, viewport) => set((state) => ({
    yViewport: { ...state.yViewport, [prop]: viewport },
  })),
}))

// React hook wrapper — same pattern as usePlaybackStore
export const useUiStore = <T>(selector: (state: UiState) => T): T =>
  useStore(uiStore, selector)
