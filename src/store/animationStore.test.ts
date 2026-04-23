// src/store/animationStore.test.ts
// Covers: ANIM-02 (per-property spline curves), ANIM-04 (independent looping curves)
// RED state: animationStore.ts does not exist yet — created in Wave 1 (07-01-PLAN.md)
import { describe, it, expect, beforeEach } from 'vitest'
import { animationStore } from './animationStore'
import type { AnimatableProperty, SplineCurve } from './animationStore'

const CURVE_SIZE: SplineCurve = { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] }
const CURVE_HUE: SplineCurve = { duration: 3, points: [{ beat: 0, value: 120 }, { beat: 3, value: 240 }] }

describe('animationStore — defaults', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
  })

  it('has empty curves record by default (D-09)', () => {
    expect(animationStore.getState().curves).toEqual({})
  })
})

describe('animationStore — setCurve (ANIM-02)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
  })

  it('setCurve stores a curve for a shape ID', () => {
    animationStore.getState().setCurve('shape-1', 'size', CURVE_SIZE)
    expect(animationStore.getState().curves['shape-1'].size).toEqual(CURVE_SIZE)
  })

  it('setCurve stores a second property on same shape', () => {
    animationStore.getState().setCurve('shape-1', 'size', CURVE_SIZE)
    animationStore.getState().setCurve('shape-1', 'hue', CURVE_HUE)
    expect(animationStore.getState().curves['shape-1'].size).toBeDefined()
    expect(animationStore.getState().curves['shape-1'].hue).toBeDefined()
  })

  it('setCurve overwrites existing curve for same property', () => {
    const firstCurve: SplineCurve = { duration: 2, points: [{ beat: 0, value: 10 }, { beat: 2, value: 20 }] }
    animationStore.getState().setCurve('shape-1', 'size', firstCurve)
    animationStore.getState().setCurve('shape-1', 'size', CURVE_SIZE)
    expect(animationStore.getState().curves['shape-1'].size).toEqual(CURVE_SIZE)
  })
})

describe('animationStore — removeCurve (ANIM-02)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
  })

  it('removeCurve deletes a property from ShapeCurves', () => {
    animationStore.getState().setCurve('shape-1', 'size', CURVE_SIZE)
    animationStore.getState().removeCurve('shape-1', 'size')
    expect(animationStore.getState().curves['shape-1'].size).toBeUndefined()
  })

  it('removeCurve no-op when property does not exist', () => {
    expect(() => {
      animationStore.getState().removeCurve('nonexistent-id', 'size')
    }).not.toThrow()
  })
})

describe('animationStore — clearShape (D-09)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
  })

  it('clearShape removes all curves for a shape', () => {
    animationStore.getState().setCurve('shape-1', 'size', CURVE_SIZE)
    animationStore.getState().setCurve('shape-1', 'hue', CURVE_HUE)
    animationStore.getState().clearShape('shape-1')
    expect(animationStore.getState().curves['shape-1']).toBeUndefined()
  })

  it('clearShape no-op when shape does not exist', () => {
    expect(() => {
      animationStore.getState().clearShape('nonexistent-id')
    }).not.toThrow()
  })
})

describe('animationStore — curve data integrity (ANIM-02, ANIM-04)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
  })

  it('SplineCurve duration is stored exactly (free-float, D-08)', () => {
    const curve: SplineCurve = { duration: 1.5, points: [{ beat: 0, value: 50 }, { beat: 1.5, value: 80 }] }
    animationStore.getState().setCurve('shape-1', 'size', curve)
    expect(animationStore.getState().curves['shape-1'].size!.duration).toBe(1.5)
  })

  it('SplinePoint beat values are stored exactly', () => {
    const curve: SplineCurve = { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 2.333, value: 80 }] }
    animationStore.getState().setCurve('shape-1', 'size', curve)
    const stored = animationStore.getState().curves['shape-1'].size!
    expect(stored.points[1].beat).toBe(2.333)
  })
})
