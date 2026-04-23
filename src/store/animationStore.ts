// src/store/animationStore.ts
// Vanilla Zustand store for per-shape spline animation curves (D-09, D-10).
// Must use createStore (not create) so audioEngine and canvasEngine can subscribe
// outside React — same pattern as playbackStore.ts, scaleStore.ts.
// ANIM-02: per-property spline curves; ANIM-04: independent loop durations
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

// D-06: The four animatable properties — all map to existing color-audio properties
export type AnimatableProperty = 'size' | 'hue' | 'saturation' | 'lightness'

// D-07: A single control point — absolute beat position within the loop window
export interface SplinePoint {
  beat: number    // absolute beat position within loop; 0 ≤ beat ≤ curve.duration
  value: number   // property value: 0–100 for size/saturation/lightness; 0–360 for hue
}

// D-07: A looping animation curve — duration is a free-float beat count
export interface SplineCurve {
  duration: number    // loop window in beats (free-float, e.g. 1.5, 3.0, 7)
  points: SplinePoint[]  // minimum 2 points (invariant enforced at UI layer)
}

// D-09: Per-shape curves — only animated properties are present (Partial)
export type ShapeCurves = Partial<Record<AnimatableProperty, SplineCurve>>

export interface AnimationState {
  curves: Record<string, ShapeCurves>  // key = shape.id; empty = no animation
  setCurve: (shapeId: string, property: AnimatableProperty, curve: SplineCurve) => void
  removeCurve: (shapeId: string, property: AnimatableProperty) => void
  clearShape: (shapeId: string) => void  // called by shapeStore.removeShape (D-09)
}

export const animationStore = createStore<AnimationState>()((set) => ({
  curves: {},  // D-09: default — no animations on any shape

  setCurve: (shapeId, property, curve) =>
    set((state) => ({
      curves: {
        ...state.curves,
        [shapeId]: {
          ...state.curves[shapeId],
          [property]: curve,
        },
      },
    })),

  removeCurve: (shapeId, property) =>
    set((state) => {
      const shapeCurves = state.curves[shapeId]
      if (!shapeCurves) return state  // no-op: shape has no curves
      const { [property]: _removed, ...rest } = shapeCurves
      return {
        curves: {
          ...state.curves,
          [shapeId]: rest as ShapeCurves,
        },
      }
    }),

  clearShape: (shapeId) =>
    set((state) => {
      if (!state.curves[shapeId]) return state  // no-op: shape not found
      const { [shapeId]: _removed, ...rest } = state.curves
      return { curves: rest }
    }),
}))

// React hook wrapper — same pattern as usePlaybackStore, useScaleStore
export const useAnimationStore = <T>(selector: (state: AnimationState) => T): T =>
  useStore(animationStore, selector)
