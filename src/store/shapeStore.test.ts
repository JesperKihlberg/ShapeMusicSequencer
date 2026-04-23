// Covers: CANV-01 store behavior
import { describe, it, expect, beforeEach } from 'vitest'
import { shapeStore } from './shapeStore'

describe('shapeStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    shapeStore.setState({ shapes: [] })
    // Clear temporal history
    shapeStore.temporal.getState().clear()
  })

  it('addShape adds a shape to an empty cell', () => {
    shapeStore.getState().addShape(0, 0)
    const { shapes } = shapeStore.getState()
    expect(shapes).toHaveLength(1)
  })

  it('addShape ignores placement on an occupied cell', () => {
    shapeStore.getState().addShape(1, 2)
    shapeStore.getState().addShape(1, 2) // duplicate
    const { shapes } = shapeStore.getState()
    expect(shapes).toHaveLength(1)
  })

  it('shapes array has correct col/row after addShape', () => {
    shapeStore.getState().addShape(2, 3)
    const { shapes } = shapeStore.getState()
    expect(shapes[0]).toMatchObject({ col: 2, row: 3 })
  })

  it('each shape gets a unique id', () => {
    shapeStore.getState().addShape(0, 0)
    shapeStore.getState().addShape(0, 1)
    const { shapes } = shapeStore.getState()
    expect(shapes[0]?.id).toBeTruthy()
    expect(shapes[1]?.id).toBeTruthy()
    expect(shapes[0]?.id).not.toBe(shapes[1]?.id)
  })

  it('shape has required fields: id, col, row, color, type', () => {
    shapeStore.getState().addShape(3, 3)
    const shape = shapeStore.getState().shapes[0]
    expect(shape).toBeDefined()
    expect(typeof shape?.id).toBe('string')
    expect(typeof shape?.col).toBe('number')
    expect(typeof shape?.row).toBe('number')
    expect(shape?.color).toEqual({ h: 220, s: 70, l: 30 })
    expect(shape?.type).toBe('circle')
  })

  it('can place shapes in all 16 cells', () => {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        shapeStore.getState().addShape(col, row)
      }
    }
    expect(shapeStore.getState().shapes).toHaveLength(16)
  })

  it('addShape allows shapes in different cells', () => {
    shapeStore.getState().addShape(0, 0)
    shapeStore.getState().addShape(1, 0)
    shapeStore.getState().addShape(0, 1)
    expect(shapeStore.getState().shapes).toHaveLength(3)
  })
})

describe('shapeStore — removeShape', () => {
  beforeEach(() => {
    shapeStore.setState({ shapes: [] })
    shapeStore.temporal.getState().clear()
  })

  it('removeShape removes a shape at the given cell', () => {
    shapeStore.getState().addShape(0, 0)
    expect(shapeStore.getState().shapes).toHaveLength(1)
    shapeStore.getState().removeShape(0, 0)
    expect(shapeStore.getState().shapes).toHaveLength(0)
  })

  it('removeShape is a no-op when cell is empty', () => {
    shapeStore.getState().addShape(1, 1)
    shapeStore.getState().removeShape(2, 2)  // no shape here
    expect(shapeStore.getState().shapes).toHaveLength(1)
  })

  it('removeShape removes only the matching cell, not others', () => {
    shapeStore.getState().addShape(0, 0)
    shapeStore.getState().addShape(1, 1)
    shapeStore.getState().addShape(2, 2)
    shapeStore.getState().removeShape(1, 1)
    const shapes = shapeStore.getState().shapes
    expect(shapes).toHaveLength(2)
    expect(shapes.some((s) => s.col === 1 && s.row === 1)).toBe(false)
    expect(shapes.some((s) => s.col === 0 && s.row === 0)).toBe(true)
    expect(shapes.some((s) => s.col === 2 && s.row === 2)).toBe(true)
  })

  it('cell is available for new shape after removeShape', () => {
    shapeStore.getState().addShape(3, 3)
    shapeStore.getState().removeShape(3, 3)
    shapeStore.getState().addShape(3, 3)
    expect(shapeStore.getState().shapes).toHaveLength(1)
    expect(shapeStore.getState().shapes[0]).toMatchObject({ col: 3, row: 3 })
  })
})

describe('shapeStore — Phase 4 fields and updateShape', () => {
  beforeEach(() => {
    shapeStore.setState({ shapes: [] })
    shapeStore.temporal.getState().clear()
  })

  it('addShape creates shape with size=50 by default', () => {
    shapeStore.getState().addShape(0, 0)
    const shape = shapeStore.getState().shapes[0]
    expect(shape?.size).toBe(50)
  })

  it('addShape creates shape without animRate field (Phase 7 D-03: animRate removed)', () => {
    shapeStore.getState().addShape(0, 0)
    const shape = shapeStore.getState().shapes[0]
    expect(shape).not.toHaveProperty('animRate')
  })

  it('updateShape patches color on existing shape', () => {
    shapeStore.getState().addShape(0, 0)
    const id = shapeStore.getState().shapes[0]!.id
    shapeStore.getState().updateShape(id, { color: { h: 180, s: 50, l: 60 } })
    const shape = shapeStore.getState().shapes[0]
    expect(shape?.color).toEqual({ h: 180, s: 50, l: 60 })
  })

  it('updateShape patches size on existing shape', () => {
    shapeStore.getState().addShape(0, 0)
    const id = shapeStore.getState().shapes[0]!.id
    shapeStore.getState().updateShape(id, { size: 75 })
    expect(shapeStore.getState().shapes[0]?.size).toBe(75)
  })

  it('updateShape patches animRate on existing shape', () => {
    shapeStore.getState().addShape(0, 0)
    const id = shapeStore.getState().shapes[0]!.id
    shapeStore.getState().updateShape(id, { animRate: 4 })
    expect(shapeStore.getState().shapes[0]?.animRate).toBe(4)
  })

  it('updateShape is a no-op when id not found', () => {
    shapeStore.getState().addShape(0, 0)
    const before = shapeStore.getState().shapes[0]?.color
    shapeStore.getState().updateShape('non-existent-id', { size: 99 })
    expect(shapeStore.getState().shapes[0]?.color).toEqual(before)
    expect(shapeStore.getState().shapes).toHaveLength(1)
  })
})
