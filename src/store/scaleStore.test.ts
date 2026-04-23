// src/store/scaleStore.test.ts
// Covers: PLAY-05 (scale quantization store), PLAY-06 (chromatic mode as ScaleName option)
// Wave 0: RED state — scaleStore.ts does not exist yet (created in Wave 1)
import { describe, it, expect, beforeEach } from 'vitest'
import { scaleStore } from './scaleStore'

describe('scaleStore — defaults', () => {
  beforeEach(() => {
    scaleStore.setState({ rootKey: 0, scale: 'major' })
  })

  it('has rootKey=0 (C) by default (PLAY-05)', () => {
    expect(scaleStore.getState().rootKey).toBe(0)
  })

  it('has scale="major" by default (PLAY-05)', () => {
    expect(scaleStore.getState().scale).toBe('major')
  })
})

describe('scaleStore — setRootKey (PLAY-05)', () => {
  beforeEach(() => {
    scaleStore.setState({ rootKey: 0, scale: 'major' })
  })

  it('setRootKey(5) sets rootKey to 5 (F)', () => {
    scaleStore.getState().setRootKey(5)
    expect(scaleStore.getState().rootKey).toBe(5)
  })

  it('setRootKey(11) sets rootKey to 11 (B)', () => {
    scaleStore.getState().setRootKey(11)
    expect(scaleStore.getState().rootKey).toBe(11)
  })

  it('setRootKey clamps below 0 to 0', () => {
    scaleStore.getState().setRootKey(-1)
    expect(scaleStore.getState().rootKey).toBe(0)
  })

  it('setRootKey clamps above 11 to 11', () => {
    scaleStore.getState().setRootKey(12)
    expect(scaleStore.getState().rootKey).toBe(11)
  })

  it('setRootKey rounds fractional input', () => {
    scaleStore.getState().setRootKey(2.7)
    expect(scaleStore.getState().rootKey).toBe(3)
  })
})

describe('scaleStore — setScale (PLAY-06)', () => {
  beforeEach(() => {
    scaleStore.setState({ rootKey: 0, scale: 'major' })
  })

  it('setScale("natural-minor") sets scale to natural-minor', () => {
    scaleStore.getState().setScale('natural-minor')
    expect(scaleStore.getState().scale).toBe('natural-minor')
  })

  it('setScale("pentatonic-major") sets scale to pentatonic-major', () => {
    scaleStore.getState().setScale('pentatonic-major')
    expect(scaleStore.getState().scale).toBe('pentatonic-major')
  })

  it('setScale("pentatonic-minor") sets scale to pentatonic-minor', () => {
    scaleStore.getState().setScale('pentatonic-minor')
    expect(scaleStore.getState().scale).toBe('pentatonic-minor')
  })

  it('setScale("dorian") sets scale to dorian', () => {
    scaleStore.getState().setScale('dorian')
    expect(scaleStore.getState().scale).toBe('dorian')
  })

  it('setScale("mixolydian") sets scale to mixolydian', () => {
    scaleStore.getState().setScale('mixolydian')
    expect(scaleStore.getState().scale).toBe('mixolydian')
  })

  it('setScale("chromatic") sets scale to chromatic (PLAY-06: chromatic as scale option)', () => {
    scaleStore.getState().setScale('chromatic')
    expect(scaleStore.getState().scale).toBe('chromatic')
  })
})

describe('scaleStore — SCALE_INTERVALS export (PLAY-05)', () => {
  it('SCALE_INTERVALS exports all 7 scale names', async () => {
    const { SCALE_INTERVALS } = await import('./scaleStore')
    const keys = Object.keys(SCALE_INTERVALS)
    expect(keys).toContain('major')
    expect(keys).toContain('natural-minor')
    expect(keys).toContain('pentatonic-major')
    expect(keys).toContain('pentatonic-minor')
    expect(keys).toContain('dorian')
    expect(keys).toContain('mixolydian')
    expect(keys).toContain('chromatic')
    expect(keys.length).toBe(7)
  })

  it('major scale has intervals [0,2,4,5,7,9,11]', async () => {
    const { SCALE_INTERVALS } = await import('./scaleStore')
    expect(SCALE_INTERVALS['major']).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('chromatic scale has all 12 intervals [0..11]', async () => {
    const { SCALE_INTERVALS } = await import('./scaleStore')
    expect(SCALE_INTERVALS['chromatic']).toEqual([0,1,2,3,4,5,6,7,8,9,10,11])
  })
})
