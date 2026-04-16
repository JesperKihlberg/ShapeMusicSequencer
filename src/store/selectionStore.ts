// src/store/selectionStore.ts
// Vanilla Zustand store for selected canvas cell — NOT React state.
// Must use createStore (not create) so canvasEngine.ts can subscribe
// outside React (D-04, RESEARCH.md Pattern 1, Pitfall 3).
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export interface SelectionState {
  selectedCell: { col: number; row: number } | null
  setSelectedCell: (cell: { col: number; row: number } | null) => void
}

export const selectionStore = createStore<SelectionState>()((set) => ({
  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),
}))

// React hook wrapper — same pattern as useShapeStore in shapeStore.ts
export const useSelectionStore = <T>(selector: (state: SelectionState) => T): T =>
  useStore(selectionStore, selector)
