// Covers: CANV-02 panel modes, CANV-03 remove action
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CellPanel } from './CellPanel'
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'

describe('CellPanel', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('renders nothing when no cell is selected', () => {
    const { container } = render(<CellPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders empty-cell mode when selected cell has no shape', () => {
    selectionStore.setState({ selectedCell: { col: 2, row: 1 } })
    render(<CellPanel />)
    expect(screen.getByText('Cell (2, 1)')).toBeTruthy()
    expect(screen.getByText('This cell is empty.')).toBeTruthy()
    expect(screen.getByText('+ Add Shape')).toBeTruthy()
  })

  it('renders occupied-cell mode when selected cell has a shape', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.getByText('Cell (0, 0)')).toBeTruthy()
    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.getByText('circle')).toBeTruthy()
    expect(screen.getByText('Hue')).toBeTruthy()
    expect(screen.getByText('Remove Shape')).toBeTruthy()
  })

  it('Add Shape button calls shapeStore.addShape', () => {
    selectionStore.setState({ selectedCell: { col: 1, row: 2 } })
    const addSpy = vi.spyOn(shapeStore.getState(), 'addShape')
    render(<CellPanel />)
    fireEvent.click(screen.getByText('+ Add Shape'))
    expect(shapeStore.getState().shapes).toHaveLength(1)
    expect(shapeStore.getState().shapes[0]).toMatchObject({ col: 1, row: 2 })
    addSpy.mockRestore()
  })

  it('Remove Shape button calls removeShape and clears selection', () => {
    shapeStore.getState().addShape(3, 3)
    selectionStore.setState({ selectedCell: { col: 3, row: 3 } })
    render(<CellPanel />)
    fireEvent.click(screen.getByText('Remove Shape'))
    expect(shapeStore.getState().shapes).toHaveLength(0)
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('Remove Shape button has correct aria-label', () => {
    shapeStore.getState().addShape(2, 3)
    selectionStore.setState({ selectedCell: { col: 2, row: 3 } })
    render(<CellPanel />)
    const btn = screen.getByLabelText('Remove shape from cell column 2 row 3')
    expect(btn).toBeTruthy()
  })

  it('Add Shape button has correct aria-label', () => {
    selectionStore.setState({ selectedCell: { col: 0, row: 1 } })
    render(<CellPanel />)
    const btn = screen.getByLabelText('Add shape to cell column 0 row 1')
    expect(btn).toBeTruthy()
  })

  it('shows property values from shape color', () => {
    shapeStore.getState().addShape(0, 0)
    // Default color: h:220, s:70, l:30
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.getByText('220')).toBeTruthy()
    expect(screen.getByText('70')).toBeTruthy()
    expect(screen.getByText('30')).toBeTruthy()
  })
})
