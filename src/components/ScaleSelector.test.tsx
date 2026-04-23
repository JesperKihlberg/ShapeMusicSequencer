// src/components/ScaleSelector.test.tsx
// Covers: PLAY-05 (root key and scale selects rendered), PLAY-06 (chromatic option)
// Wave 0: RED state — scaleStore.ts and ScaleSelector.tsx do not exist yet
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScaleSelector } from './ScaleSelector'
import { scaleStore } from '../store/scaleStore'

describe('ScaleSelector — rendering (PLAY-05)', () => {
  beforeEach(() => {
    scaleStore.setState({ rootKey: 0, scale: 'major' })
  })

  it('renders a select with aria-label "Root key"', () => {
    render(<ScaleSelector />)
    expect(screen.getByLabelText('Root key')).toBeTruthy()
  })

  it('renders a select with aria-label "Scale"', () => {
    render(<ScaleSelector />)
    expect(screen.getByLabelText('Scale')).toBeTruthy()
  })

  it('root key select has 12 options (C through B)', () => {
    render(<ScaleSelector />)
    const select = screen.getByLabelText('Root key') as HTMLSelectElement
    expect(select.options.length).toBe(12)
  })

  it('scale select has 7 options (6 named scales + chromatic)', () => {
    render(<ScaleSelector />)
    const select = screen.getByLabelText('Scale') as HTMLSelectElement
    expect(select.options.length).toBe(7)
  })

  it('root key select defaults to 0 (C)', () => {
    render(<ScaleSelector />)
    const select = screen.getByLabelText('Root key') as HTMLSelectElement
    expect(Number(select.value)).toBe(0)
  })

  it('scale select defaults to "major"', () => {
    render(<ScaleSelector />)
    const select = screen.getByLabelText('Scale') as HTMLSelectElement
    expect(select.value).toBe('major')
  })
})

describe('ScaleSelector — interaction (PLAY-05, PLAY-06)', () => {
  beforeEach(() => {
    scaleStore.setState({ rootKey: 0, scale: 'major' })
  })

  it('changing root key select updates scaleStore.rootKey', () => {
    render(<ScaleSelector />)
    fireEvent.change(screen.getByLabelText('Root key'), { target: { value: '7' } })
    expect(scaleStore.getState().rootKey).toBe(7)
  })

  it('changing scale select updates scaleStore.scale', () => {
    render(<ScaleSelector />)
    fireEvent.change(screen.getByLabelText('Scale'), { target: { value: 'dorian' } })
    expect(scaleStore.getState().scale).toBe('dorian')
  })

  it('setting scale to "chromatic" updates scaleStore (PLAY-06)', () => {
    render(<ScaleSelector />)
    fireEvent.change(screen.getByLabelText('Scale'), { target: { value: 'chromatic' } })
    expect(scaleStore.getState().scale).toBe('chromatic')
  })
})
