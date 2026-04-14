// Integration tests for CanvasContainer — Plan 04 (CANV-01)
// Covers: click-to-place flow end-to-end: mouse event → cellAtPoint → shapeStore.addShape
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { CanvasContainer } from './CanvasContainer'
import { shapeStore } from '../store/shapeStore'

// Helper: set up canvas dimensions for jsdom (defaults to 0x0)
function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  Object.defineProperty(canvas, 'width', { value: width, configurable: true })
  Object.defineProperty(canvas, 'height', { value: height, configurable: true })
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: width, bottom: height,
    width, height, x: 0, y: 0, toJSON: () => ({}),
  })
}

describe('CanvasContainer integration — click-to-place', () => {
  beforeEach(() => {
    shapeStore.setState({ shapes: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clicking an empty cell calls shapeStore.addShape with correct col/row', () => {
    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!

    // 400x400: cellSize=100, no offset. Click at (50,50) → col=0, row=0
    setCanvasSize(canvas, 400, 400)

    // Spy AFTER render so we intercept the actual state object the component uses
    const state = shapeStore.getState()
    const addShapeSpy = vi.spyOn(state, 'addShape')
    // Replace the state object so the component's getState() returns our spied version
    shapeStore.setState(state)

    fireEvent.click(canvas, { clientX: 50, clientY: 50 })

    expect(shapeStore.getState().shapes).toHaveLength(1)
    expect(shapeStore.getState().shapes[0]).toMatchObject({ col: 0, row: 0 })
    addShapeSpy.mockRestore()
  })

  it('clicking an occupied cell does not add a second shape', () => {
    // Pre-place a shape at col=0, row=0
    shapeStore.getState().addShape(0, 0)
    expect(shapeStore.getState().shapes).toHaveLength(1)

    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!

    setCanvasSize(canvas, 400, 400)

    // Click the same occupied cell
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })

    // Store still has only 1 shape — occupied cell guard in addShape
    expect(shapeStore.getState().shapes).toHaveLength(1)
  })
})
