// src/components/ShapeTypeSelector.test.tsx
// Wave 0 scaffold — tests RED until Wave 3 creates ShapeTypeSelector.tsx
// Note: no dynamic import — Vite resolves imports at transform time and would fail.
// Tests skip gracefully when ShapeTypeSelector is null (file not yet created).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ShapeType, ShapeColor } from '../store/shapeStore'

// Wave 0 stub: set to null until Wave 3 creates ShapeTypeSelector.tsx, then replace with:
//   import { ShapeTypeSelector } from './ShapeTypeSelector'
const ShapeTypeSelector: React.ComponentType<{
  currentType: ShapeType
  shapeColor: ShapeColor
  onChange: (type: ShapeType) => void
}> | null = null

const ALL_TYPES: ShapeType[] = ['circle', 'triangle', 'square', 'diamond', 'star', 'blob']
const defaultColor: ShapeColor = { h: 220, s: 70, l: 30 }

describe('ShapeTypeSelector', () => {
  it('renders 6 type buttons', () => {
    if (!ShapeTypeSelector) return
    render(<ShapeTypeSelector currentType="circle" shapeColor={defaultColor} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(6)
  })

  it('each button has aria-label "{type} shape"', () => {
    if (!ShapeTypeSelector) return
    render(<ShapeTypeSelector currentType="circle" shapeColor={defaultColor} onChange={() => {}} />)
    for (const type of ALL_TYPES) {
      expect(screen.getByLabelText(`${type} shape`)).toBeTruthy()
    }
  })

  it('active type button has aria-pressed="true"', () => {
    if (!ShapeTypeSelector) return
    render(<ShapeTypeSelector currentType="triangle" shapeColor={defaultColor} onChange={() => {}} />)
    const activeBtn = screen.getByLabelText('triangle shape')
    expect(activeBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('non-active type buttons have aria-pressed="false"', () => {
    if (!ShapeTypeSelector) return
    render(<ShapeTypeSelector currentType="circle" shapeColor={defaultColor} onChange={() => {}} />)
    const triangleBtn = screen.getByLabelText('triangle shape')
    expect(triangleBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking a type button calls onChange with that type', () => {
    if (!ShapeTypeSelector) return
    const onChange = vi.fn()
    render(<ShapeTypeSelector currentType="circle" shapeColor={defaultColor} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('triangle shape'))
    expect(onChange).toHaveBeenCalledWith('triangle')
  })
})
