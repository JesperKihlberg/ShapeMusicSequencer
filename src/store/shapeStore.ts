// src/store/shapeStore.ts
// Zustand vanilla store with immer + zundo temporal middleware
// Pattern: createStore from zustand/vanilla — not create() — so canvas engine
//   can subscribe without React (D-04, RESEARCH.md Pattern 1)
// Middleware order: temporal outermost, immer innermost (RESEARCH.md Pitfall 3)
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'

export interface ShapeColor {
  h: number  // 0–360 (hue)
  s: number  // 0–100 (saturation)
  l: number  // 0–100 (lightness)
}

export type ShapeType = 'circle' | 'triangle' | 'square' | 'diamond' | 'star' | 'blob'

export interface Shape {
  id: string
  col: number      // 0-3
  row: number      // 0-3
  color: ShapeColor
  type: ShapeType
}

export interface ShapeState {
  shapes: Shape[]
  addShape: (col: number, row: number) => void
}

export const shapeStore = createStore<ShapeState>()(
  temporal(
    immer((set) => ({
      shapes: [],
      addShape: (col: number, row: number) =>
        set((state) => {
          const occupied = state.shapes.some(
            (s) => s.col === col && s.row === row,
          )
          if (!occupied) {
            state.shapes.push({
              id: crypto.randomUUID(),
              col,
              row,
              color: { h: 220, s: 70, l: 60 },
              type: 'circle',
            })
          }
        }),
    })),
  ),
)

// React hook — re-renders only when the selected slice changes
export const useShapeStore = <T>(selector: (state: ShapeState) => T): T =>
  useStore(shapeStore, selector)
