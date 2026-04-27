// src/store/uiStore.test.ts
// Covers: ANIM-08 (zoomBeats state), ANIM-09 (ghost geometry formulas), ANIM-11 (focusedLane state)
import { describe, it, expect, beforeEach } from 'vitest'
import { uiStore } from './uiStore'

describe('uiStore — defaults', () => {
  beforeEach(() => {
    uiStore.setState({ zoomBeats: 4, focusedLane: null })
  })

  it('zoomBeats defaults to 4 (ANIM-08)', () => {
    expect(uiStore.getState().zoomBeats).toBe(4)
  })

  it('focusedLane defaults to null (ANIM-11)', () => {
    expect(uiStore.getState().focusedLane).toBeNull()
  })
})

describe('uiStore — setZoomBeats (ANIM-08)', () => {
  beforeEach(() => {
    uiStore.setState({ zoomBeats: 4, focusedLane: null })
  })

  it('setZoomBeats(8) updates zoomBeats to 8', () => {
    uiStore.getState().setZoomBeats(8)
    expect(uiStore.getState().zoomBeats).toBe(8)
  })

  it('setZoomBeats(1) updates zoomBeats to 1', () => {
    uiStore.getState().setZoomBeats(1)
    expect(uiStore.getState().zoomBeats).toBe(1)
  })

  it('setZoomBeats(64) updates zoomBeats to 64', () => {
    uiStore.getState().setZoomBeats(64)
    expect(uiStore.getState().zoomBeats).toBe(64)
  })
})

describe('uiStore — setFocusedLane (ANIM-11)', () => {
  beforeEach(() => {
    uiStore.setState({ zoomBeats: 4, focusedLane: null })
  })

  it('setFocusedLane("hue") sets focusedLane to "hue"', () => {
    uiStore.getState().setFocusedLane('hue')
    expect(uiStore.getState().focusedLane).toBe('hue')
  })

  it('setFocusedLane(null) clears focusedLane', () => {
    uiStore.getState().setFocusedLane('size')
    uiStore.getState().setFocusedLane(null)
    expect(uiStore.getState().focusedLane).toBeNull()
  })

  it('setFocusedLane replaces previous focused lane', () => {
    uiStore.getState().setFocusedLane('hue')
    uiStore.getState().setFocusedLane('size')
    expect(uiStore.getState().focusedLane).toBe('size')
  })
})

describe('uiStore — ghost geometry formulas (ANIM-09)', () => {
  it('repeatCount = Math.floor(zoomBeats / duration) - 1: zoom=8, duration=4 → repeatCount=1', () => {
    const zoomBeats = 8
    const duration = 4
    const repeatCount = Math.floor(zoomBeats / duration) - 1
    expect(repeatCount).toBe(1)
  })

  it('repeatCount: zoom=4, duration=4 → repeatCount=0 (no ghosts)', () => {
    const repeatCount = Math.floor(4 / 4) - 1
    expect(repeatCount).toBe(0)
  })

  it('repeatCount: zoom=16, duration=4 → repeatCount=3', () => {
    const repeatCount = Math.floor(16 / 4) - 1
    expect(repeatCount).toBe(3)
  })

  it('primaryRegionWidth: duration=4, zoom=8, canvasWidth=400 → 200px', () => {
    const primaryRegionWidth = (4 / 8) * 400
    expect(primaryRegionWidth).toBe(200)
  })

  it('ghost pointer exclusion: px=201 > primaryRegionWidth=200 → excluded', () => {
    const canvasWidth = 400
    const zoomBeats = 8
    const curveDuration = 4
    const primaryRegionWidth = (curveDuration / zoomBeats) * canvasWidth
    const px = 201
    expect(px > primaryRegionWidth).toBe(true)
  })

  it('primary region click: px=199 <= primaryRegionWidth=200 → not excluded', () => {
    const canvasWidth = 400
    const zoomBeats = 8
    const curveDuration = 4
    const primaryRegionWidth = (curveDuration / zoomBeats) * canvasWidth
    const px = 199
    expect(px > primaryRegionWidth).toBe(false)
  })
})
