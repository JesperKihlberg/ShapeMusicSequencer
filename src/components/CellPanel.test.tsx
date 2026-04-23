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
    expect(screen.getByText('Cell (0, 0)')).toBeTruthy()           // header unchanged
    expect(screen.getByLabelText(/Hue, 0 to 360/i)).toBeTruthy()  // HSV slider present
    expect(screen.getByText('Remove Shape')).toBeTruthy()          // remove button still present
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

// Phase 4 occupied mode controls — RED until Wave 3 replaces CellPanel occupied mode
describe('CellPanel — Phase 4 occupied mode controls', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('renders Hue slider in occupied mode', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    // After Wave 3: HsvSliders renders an input with aria-label "Hue, 0 to 360"
    expect(screen.queryByLabelText(/Hue, 0 to 360/i)).toBeTruthy()
  })

  it('renders Size slider in occupied mode', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.queryByLabelText(/Size, 0 to 100/i)).toBeTruthy()
  })

  it('renders animation rate beat-fraction selector in occupied mode (D-13)', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.queryByRole('group', { name: /Animation rate/i })).toBeTruthy()
  })

  it('renders 5 beat-fraction buttons in animation rate selector (D-13)', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    const group = screen.queryByRole('group', { name: /Animation rate/i })
    expect(group).toBeTruthy()
    const buttons = group?.querySelectorAll('button') ?? []
    expect(buttons.length).toBe(5)
    // Labels: 1/1, 1/2, 1/4, 1/8, 1/16
    const labels = Array.from(buttons).map(b => b.textContent)
    expect(labels).toContain('1/1')
    expect(labels).toContain('1/4')
    expect(labels).toContain('1/16')
  })

  it('renders 6 shape type buttons in occupied mode', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const { container } = render(<CellPanel />)
    // After Wave 3: ShapeTypeSelector renders 6 buttons with aria-label "{type} shape"
    const typeButtons = container.querySelectorAll('[aria-label$=" shape"]')
    expect(typeButtons.length).toBeGreaterThanOrEqual(6)
  })

  it('Remove Shape button still present in Phase 4 occupied mode', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.getByText('Remove Shape')).toBeTruthy()
  })
})

// Phase 7: beat-selector removal + Animate button (D-03, D-11)
describe('CellPanel — Phase 7: Animate button replaces beat-fraction selector', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('renders "Animate" button in occupied mode (D-11)', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.getByLabelText('Open animation panel for this shape')).toBeTruthy()
  })

  it('"Animate" button has text content "Animate"', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.getByText('Animate')).toBeTruthy()
  })

  it('does NOT render beat-fraction selector in occupied mode (D-03)', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.queryByRole('group', { name: /Animation rate/i })).toBeNull()
  })

  it('does NOT render beat-fraction buttons (1/1, 1/4, 1/16) in occupied mode (D-03)', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    render(<CellPanel />)
    expect(screen.queryByText('1/1')).toBeNull()
    expect(screen.queryByText('1/4')).toBeNull()
    expect(screen.queryByText('1/16')).toBeNull()
  })
})
