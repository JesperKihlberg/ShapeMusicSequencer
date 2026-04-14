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
    expect(typeof shape?.color).toBe('string')
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
