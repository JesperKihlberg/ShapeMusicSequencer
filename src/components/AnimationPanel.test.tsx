// src/components/AnimationPanel.test.tsx
// Covers: ANIM-05 (bottom animation panel), ANIM-06 (draggable divider)
// RED state: AnimationPanel.tsx does not exist yet — created in Wave 3 (07-03-PLAN.md)
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimationPanel } from './AnimationPanel'
import { animationStore } from '../store/animationStore'
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'

describe('AnimationPanel — empty state (ANIM-05)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('renders empty state message when no shape selected', () => {
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByText('No curves yet. Click a shape and press Animate.')).toBeTruthy()
  })

  it('renders panel title "Animation"', () => {
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByText('Animation')).toBeTruthy()
  })

  it('renders "+ Add Curve" button', () => {
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByLabelText('Add animation curve')).toBeTruthy()
  })

  it('renders drag handle with aria-label "Resize animation panel"', () => {
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByRole('separator', { name: 'Resize animation panel' })).toBeTruthy()
  })
})

describe('AnimationPanel — with curves (ANIM-02, ANIM-03)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('renders a lane row for each active curve', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const shape = shapeStore.getState().shapes.find((s) => s.col === 0 && s.row === 0)!
    animationStore.getState().setCurve(shape.id, 'size', { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] })
    const { container } = render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(container.querySelector('[data-property="size"]')).toBeTruthy()
  })

  it('renders property name label in lane', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const shape = shapeStore.getState().shapes.find((s) => s.col === 0 && s.row === 0)!
    animationStore.getState().setCurve(shape.id, 'size', { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] })
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByText('size')).toBeTruthy()
  })

  it('renders duration input in lane', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const shape = shapeStore.getState().shapes.find((s) => s.col === 0 && s.row === 0)!
    animationStore.getState().setCurve(shape.id, 'size', { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] })
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByLabelText('size loop duration in beats')).toBeTruthy()
  })

  it('renders remove button in lane', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const shape = shapeStore.getState().shapes.find((s) => s.col === 0 && s.row === 0)!
    animationStore.getState().setCurve(shape.id, 'size', { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] })
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByLabelText('Remove size curve')).toBeTruthy()
  })
})

describe('AnimationPanel — + Add Curve disabled when all properties animated (ANIM-03)', () => {
  beforeEach(() => {
    animationStore.setState({ curves: {} })
    selectionStore.setState({ selectedCell: null })
    shapeStore.setState({ shapes: [] })
  })

  it('+ Add Curve button is disabled when all 4 properties have curves', () => {
    shapeStore.getState().addShape(0, 0)
    selectionStore.setState({ selectedCell: { col: 0, row: 0 } })
    const shape = shapeStore.getState().shapes.find((s) => s.col === 0 && s.row === 0)!
    const curve = { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] }
    animationStore.getState().setCurve(shape.id, 'size', curve)
    animationStore.getState().setCurve(shape.id, 'hue', curve)
    animationStore.getState().setCurve(shape.id, 'saturation', curve)
    animationStore.getState().setCurve(shape.id, 'lightness', curve)
    render(<AnimationPanel panelHeight={188} onHeightChange={() => {}} />)
    expect(screen.getByLabelText('All properties already animated')).toBeTruthy()
  })
})
