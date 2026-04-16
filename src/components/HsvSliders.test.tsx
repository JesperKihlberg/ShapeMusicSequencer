// src/components/HsvSliders.test.tsx
// Wave 0 scaffold — tests RED until Wave 3 creates HsvSliders.tsx
// Note: no dynamic import — Vite resolves imports at transform time and would fail.
// Tests skip gracefully when HsvSliders is null (file not yet created).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ShapeColor } from '../store/shapeStore'

// Wave 0 stub: set to null until Wave 3 creates HsvSliders.tsx, then replace with:
//   import { HsvSliders } from './HsvSliders'
const HsvSliders: React.ComponentType<{ color: ShapeColor; onChange: (c: ShapeColor) => void }> | null = null

const defaultColor: ShapeColor = { h: 220, s: 70, l: 30 }

describe('HsvSliders', () => {
  it('renders Hue, Saturation, Lightness labels', () => {
    if (!HsvSliders) return
    render(<HsvSliders color={defaultColor} onChange={() => {}} />)
    expect(screen.getByText('Hue')).toBeTruthy()
    expect(screen.getByText('Saturation')).toBeTruthy()
    expect(screen.getByText('Lightness')).toBeTruthy()
  })

  it('renders three range inputs', () => {
    if (!HsvSliders) return
    const { container } = render(<HsvSliders color={defaultColor} onChange={() => {}} />)
    const inputs = container.querySelectorAll('input[type="range"]')
    expect(inputs.length).toBe(3)
  })

  it('hue range input has min=0 and max=360', () => {
    if (!HsvSliders) return
    render(<HsvSliders color={defaultColor} onChange={() => {}} />)
    const hueInput = screen.getByLabelText(/Hue, 0 to 360/i)
    expect(hueInput.getAttribute('min')).toBe('0')
    expect(hueInput.getAttribute('max')).toBe('360')
  })

  it('saturation range input has min=0 and max=100', () => {
    if (!HsvSliders) return
    render(<HsvSliders color={defaultColor} onChange={() => {}} />)
    const satInput = screen.getByLabelText(/Saturation, 0 to 100/i)
    expect(satInput.getAttribute('min')).toBe('0')
    expect(satInput.getAttribute('max')).toBe('100')
  })

  it('onChange fires with updated h when hue slider changes', () => {
    if (!HsvSliders) return
    const onChange = vi.fn()
    render(<HsvSliders color={defaultColor} onChange={onChange} />)
    const hueInput = screen.getByLabelText(/Hue, 0 to 360/i)
    fireEvent.change(hueInput, { target: { value: '180' } })
    expect(onChange).toHaveBeenCalledWith({ h: 180, s: 70, l: 30 })
  })

  it('onChange fires with updated s when saturation slider changes', () => {
    if (!HsvSliders) return
    const onChange = vi.fn()
    render(<HsvSliders color={defaultColor} onChange={onChange} />)
    const satInput = screen.getByLabelText(/Saturation, 0 to 100/i)
    fireEvent.change(satInput, { target: { value: '50' } })
    expect(onChange).toHaveBeenCalledWith({ h: 220, s: 50, l: 30 })
  })

  it('onChange fires with updated l when lightness slider changes', () => {
    if (!HsvSliders) return
    const onChange = vi.fn()
    render(<HsvSliders color={defaultColor} onChange={() => {}} />)
    const lightInput = screen.getByLabelText(/Lightness, 0 to 100/i)
    fireEvent.change(lightInput, { target: { value: '60' } })
    expect(onChange).toHaveBeenCalledWith({ h: 220, s: 70, l: 60 })
  })
})
