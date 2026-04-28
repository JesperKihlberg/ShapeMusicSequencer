// src/engine/snapFormulas.test.ts
// Unit tests for Phase 11 snap math (ANIM-16).
// Tests cover: X beat snap formula, Y hue snap formula, pixelToPoint Y-viewport formula.
// Written as Wave 0 scaffold — functions under test do not exist yet (RED on first run).
import { describe, it, expect } from 'vitest'
import { scaleNoteHues } from './noteHue'

// ── Pure snap helpers (tested inline — Wave 1 inlines these into AnimLane) ──────

// snapBeat: snap rawBeat to nearest integer, clamped to [0, duration] (D-05)
function snapBeat(rawBeat: number, duration: number): number {
  return Math.max(0, Math.min(duration, Math.round(rawBeat)))
}

// snapHue: snap rawHue to nearest .hue in scaleNoteHues output (D-06)
function snapHue(rawHue: number, rootKey: number, scale: import('../store/scaleStore').ScaleName): number {
  const noteHues = scaleNoteHues(rootKey, scale)
  return noteHues.reduce(
    (best, n) => Math.abs(n.hue - rawHue) < Math.abs(best.hue - rawHue) ? n : best
  ).hue
}

// pixelToPoint Y value (the formula from D-09) — isolated for unit testing
// Does NOT clamp to full property range here; just tests the viewport transform
function pixelToPointY(py: number, canvasHeight: number, yMin: number, yMax: number): number {
  return yMax - (py / canvasHeight) * (yMax - yMin)
}

// ── snapBeat tests ────────────────────────────────────────────────────────────

describe('snapBeat — X snap formula (ANIM-16, D-05)', () => {
  it('rounds down when fractional part < 0.5', () => {
    expect(snapBeat(0.3, 4)).toBe(0)
  })

  it('rounds up when fractional part >= 0.5', () => {
    expect(snapBeat(0.6, 4)).toBe(1)
  })

  it('clamps to duration when rounded value exceeds non-integer duration', () => {
    // rawBeat=3.7 rounds to 4, but duration=3.5 → clamp to 3.5
    expect(snapBeat(3.7, 3.5)).toBe(3.5)
  })

  it('zero case returns 0', () => {
    expect(snapBeat(0, 4)).toBe(0)
  })

  it('exact integer endpoint is not clamped', () => {
    expect(snapBeat(4.0, 4)).toBe(4)
  })
})

// ── snapHue tests ─────────────────────────────────────────────────────────────

describe('snapHue — Y hue snap formula (ANIM-16, D-06)', () => {
  it('snaps to 0 when rawHue=10 is closest to 0 in C major (hues: 0,60,120,150,210,270,330)', () => {
    expect(snapHue(10, 0, 'major')).toBe(0)
  })

  it('snaps to 60 when rawHue=40 is closer to 60 than 0 in C major', () => {
    expect(snapHue(40, 0, 'major')).toBe(60)
  })

  it('snaps to 60 when rawHue=45 (past midpoint between 0 and 60)', () => {
    expect(snapHue(45, 0, 'major')).toBe(60)
  })

  it('works on chromatic scale (12 notes, 30 hue apart) — 16 closer to 30 than 0', () => {
    expect(snapHue(16, 0, 'chromatic')).toBe(30)
  })

  it('chromatic: 14 is closer to 0 than 30', () => {
    expect(snapHue(14, 0, 'chromatic')).toBe(0)
  })

  it('rootKey=6 (F#): snaps to 180 (F# hue)', () => {
    // scaleNoteHues(6, 'major')[0].hue = (6/12)*360 = 180
    expect(snapHue(180, 6, 'major')).toBe(180)
  })
})

// ── pixelToPoint Y formula tests ──────────────────────────────────────────────

describe('pixelToPoint Y-formula — viewport-aware transform (ANIM-16, D-09)', () => {
  it('full range: py=0 (top) maps to yMax=360', () => {
    expect(pixelToPointY(0, 200, 0, 360)).toBe(360)
  })

  it('full range: py=canvasHeight (bottom) maps to yMin=0', () => {
    expect(pixelToPointY(200, 200, 0, 360)).toBe(0)
  })

  it('full range: py=100 (midpoint) maps to 180', () => {
    expect(pixelToPointY(100, 200, 0, 360)).toBe(180)
  })

  it('zoomed range (yMin=100, yMax=200): py=0 maps to 200', () => {
    expect(pixelToPointY(0, 200, 100, 200)).toBe(200)
  })

  it('zoomed range (yMin=100, yMax=200): py=100 (midpoint) maps to 150', () => {
    expect(pixelToPointY(100, 200, 100, 200)).toBe(150)
  })

  it('zoomed range (yMin=100, yMax=200): py=200 (bottom) maps to 100', () => {
    expect(pixelToPointY(200, 200, 100, 200)).toBe(100)
  })
})
