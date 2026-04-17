// Integration tests for CanvasContainer — Phase 3 (CANV-02, CANV-03)
// Covers: click-to-select, Escape clear, Delete/Backspace remove
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { CanvasContainer } from './CanvasContainer'
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'

function setCanvasSize(canvas: HTMLCanvasElement, width: number, height: number): void {
  Object.defineProperty(canvas, 'width', { value: width, configurable: true })
  Object.defineProperty(canvas, 'height', { value: height, configurable: true })
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: width, bottom: height,
    width, height, x: 0, y: 0, toJSON: () => ({}),
  })
}

describe('CanvasContainer — click-to-select (Phase 3)', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clicking a cell sets selectionStore.selectedCell', () => {
    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!
    // 400x400: cellSize=100, no offset. Click at (50,50) → col=0, row=0
    setCanvasSize(canvas, 400, 400)
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })
    expect(selectionStore.getState().selectedCell).toEqual({ col: 0, row: 0 })
  })

  it('clicking a cell does NOT call shapeStore.addShape directly', () => {
    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!
    setCanvasSize(canvas, 400, 400)
    const addShapeSpy = vi.spyOn(shapeStore.getState(), 'addShape')
    shapeStore.setState(shapeStore.getState())
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })
    expect(addShapeSpy).not.toHaveBeenCalled()
    expect(shapeStore.getState().shapes).toHaveLength(0)
    addShapeSpy.mockRestore()
  })

  it('clicking the same cell twice is a no-op on the second click', () => {
    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!
    setCanvasSize(canvas, 400, 400)
    const setSelectedSpy = vi.spyOn(selectionStore.getState(), 'setSelectedCell')
    selectionStore.setState(selectionStore.getState())
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })  // same cell
    // setSelectedCell should only be called once (second click is same cell → no-op)
    expect(setSelectedSpy).toHaveBeenCalledTimes(1)
    setSelectedSpy.mockRestore()
  })

  it('clicking outside grid bounds does not change selection', () => {
    // Use 600x400: cellSize=100, gridPx=400, offsetX=100 — clicks at x=10 are in gutter
    const { container } = render(<CanvasContainer />)
    const canvas = container.querySelector('canvas')!
    setCanvasSize(canvas, 600, 400)
    selectionStore.setState({ selectedCell: null })
    fireEvent.click(canvas, { clientX: 10, clientY: 200 })  // x=10 is in left gutter (offsetX=100)
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('hint text says "Click any cell to select it"', () => {
    const { container } = render(<CanvasContainer />)
    expect(container.textContent).toContain('Click any cell to select it')
  })
})

describe('CanvasContainer — keyboard shortcuts (Phase 3)', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('Escape clears selection', () => {
    render(<CanvasContainer />)
    selectionStore.setState({ selectedCell: { col: 1, row: 1 } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('Delete while occupied cell selected removes shape and clears selection', () => {
    shapeStore.getState().addShape(2, 2)
    selectionStore.setState({ selectedCell: { col: 2, row: 2 } })
    render(<CanvasContainer />)
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(shapeStore.getState().shapes).toHaveLength(0)
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('Backspace while occupied cell selected removes shape and clears selection', () => {
    shapeStore.getState().addShape(0, 3)
    selectionStore.setState({ selectedCell: { col: 0, row: 3 } })
    render(<CanvasContainer />)
    fireEvent.keyDown(document, { key: 'Backspace' })
    expect(shapeStore.getState().shapes).toHaveLength(0)
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('Delete while empty cell selected is a no-op', () => {
    selectionStore.setState({ selectedCell: { col: 1, row: 1 } })
    render(<CanvasContainer />)
    fireEvent.keyDown(document, { key: 'Delete' })
    // Cell is empty, nothing to remove
    expect(shapeStore.getState().shapes).toHaveLength(0)
    // Selection cleared only when a shape is present; empty cell + Delete = no-op
    // (RESEARCH.md Pattern 7: shape is undefined → if(shape) guard)
    expect(selectionStore.getState().selectedCell).toEqual({ col: 1, row: 1 })
  })

  it('keyboard shortcuts do nothing when no cell is selected', () => {
    render(<CanvasContainer />)
    shapeStore.getState().addShape(0, 0)
    // No selection — Delete should not remove the shape
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(shapeStore.getState().shapes).toHaveLength(1)
  })
})

describe('CanvasContainer — input-element guard (quick-260417-klm)', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('Backspace with non-input target (div) removes selected shape', () => {
    shapeStore.getState().addShape(1, 1)
    selectionStore.setState({ selectedCell: { col: 1, row: 1 } })
    render(<CanvasContainer />)
    const div = document.createElement('div')
    document.body.appendChild(div)
    div.focus()
    fireEvent.keyDown(document, { key: 'Backspace', target: div })
    expect(shapeStore.getState().shapes).toHaveLength(0)
    document.body.removeChild(div)
  })

  it('Backspace with HTMLInputElement as target does NOT remove selected shape', () => {
    shapeStore.getState().addShape(1, 1)
    selectionStore.setState({ selectedCell: { col: 1, row: 1 } })
    render(<CanvasContainer />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(shapeStore.getState().shapes).toHaveLength(1)
    document.body.removeChild(input)
  })

  it('Delete with HTMLTextAreaElement as target does NOT remove selected shape', () => {
    shapeStore.getState().addShape(2, 0)
    selectionStore.setState({ selectedCell: { col: 2, row: 0 } })
    render(<CanvasContainer />)
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    fireEvent.keyDown(textarea, { key: 'Delete' })
    expect(shapeStore.getState().shapes).toHaveLength(1)
    document.body.removeChild(textarea)
  })

  it('Escape with HTMLInputElement as target does NOT clear selection', () => {
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CanvasContainer />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(selectionStore.getState().selectedCell).toEqual({ col: 0, row: 0 })
    document.body.removeChild(input)
  })
})
