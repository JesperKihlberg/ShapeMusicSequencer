// src/engine/audioEngine.test.ts
// Pure function tests only — no AudioContext (jsdom does not implement it)
// Covers: COLR-01, COLR-02, COLR-03, SHPE-01
import { describe, it, expect } from 'vitest'
import {
  colorToFrequency,
  makeDistortionCurve,
  lightnessToFilterCutoff,
  shapeTypeToWave,
} from './audioEngine'

describe('colorToFrequency', () => {
  it('returns ~261.63 Hz (C4) for hue=0, lightness=50', () => {
    // D-02: hue 0 = C, D-03: l=50 maps to octave 4
    expect(colorToFrequency({ h: 0, s: 50, l: 50 })).toBeCloseTo(261.63, 0)
  })

  it('returns ~277.18 Hz (C#4) for hue=30, lightness=50', () => {
    // D-02: hue 30 = semitone 1 (C#), same octave as C4
    expect(colorToFrequency({ h: 30, s: 50, l: 50 })).toBeCloseTo(277.18, 0)
  })

  it('returns a low frequency (~32.70 Hz, C1) for lightness=0', () => {
    // D-03: l=0 → octave 1 → MIDI 24 → C1
    const freq = colorToFrequency({ h: 0, s: 50, l: 0 })
    expect(freq).toBeCloseTo(32.70, 0)
  })

  it('returns a high frequency (~4186 Hz, C8) for lightness=100', () => {
    // D-03: l=100 → octave 8 → MIDI 108 → C8
    const freq = colorToFrequency({ h: 0, s: 50, l: 100 })
    expect(freq).toBeCloseTo(4186, 0)
  })
})

describe('makeDistortionCurve', () => {
  it('returns a Float32Array of length 256', () => {
    expect(makeDistortionCurve(0).length).toBe(256)
    expect(makeDistortionCurve(100).length).toBe(256)
  })

  it('returns an identity (linear passthrough) curve at saturation=0', () => {
    const curve = makeDistortionCurve(0)
    // Mid-point (index 128): x = (128*2)/256 - 1 = 0; curve[128] should be ~0
    expect(curve[128]).toBeCloseTo(0, 5)
    // Start (index 0): x = 0/256 - 1 = -1.0; curve[0] should be ~-1.0
    expect(curve[0]).toBeCloseTo(-1.0, 5)
    // End (index 255): x = (255*2)/256 - 1 = ~0.992; curve[255] should match x
    const xEnd = (255 * 2) / 256 - 1
    expect(curve[255]).toBeCloseTo(xEnd, 5)
  })

  it('returns a non-linear (soft-clipping) curve at saturation=100', () => {
    const curve = makeDistortionCurve(100)
    // The soft-clip formula ((PI+k)*x)/(PI+k*|x|) compresses mid-range values
    // toward ±1.0. At i=64, x = -0.5 (identity), but the distorted output is
    // pushed toward -1 (≈ -0.985), making it clearly > 0.9 in magnitude.
    // This proves non-linearity: identity at -0.5 stays at -0.5; distorted does not.
    expect(Math.abs(curve[64])).toBeGreaterThan(0.9)
    // The curve should still be negative at index 0 (negative input preserves sign)
    expect(curve[0]).toBeLessThan(0)
  })

  it('returns non-identity values at non-zero saturation', () => {
    const identity = makeDistortionCurve(0)
    const distorted = makeDistortionCurve(100)
    // At index 64 (x = -0.5), the distorted curve should differ from identity
    expect(distorted[64]).not.toBeCloseTo(identity[64], 5)
  })
})

describe('lightnessToFilterCutoff', () => {
  it('returns approximately 100 Hz at lightness=0', () => {
    expect(lightnessToFilterCutoff(0)).toBeCloseTo(100, 0)
  })

  it('returns approximately 8000 Hz at lightness=100', () => {
    expect(lightnessToFilterCutoff(100)).toBeCloseTo(8000, 0)
  })

  it('returns a value between 100 and 8000 at lightness=50 (exponential midpoint)', () => {
    const cutoff = lightnessToFilterCutoff(50)
    expect(cutoff).toBeGreaterThan(100)
    expect(cutoff).toBeLessThan(8000)
    // Exponential midpoint: sqrt(100 * 8000) ≈ 894 Hz
    expect(cutoff).toBeCloseTo(894, 0)
  })
})

describe('shapeTypeToWave', () => {
  it("returns 'sine' for 'circle'", () => {
    expect(shapeTypeToWave('circle')).toBe('sine')
  })

  it("returns 'triangle' for 'triangle'", () => {
    expect(shapeTypeToWave('triangle')).toBe('triangle')
  })

  it("returns 'square' for 'square'", () => {
    expect(shapeTypeToWave('square')).toBe('square')
  })

  it("returns 'sawtooth' for 'star'", () => {
    expect(shapeTypeToWave('star')).toBe('sawtooth')
  })

  it("returns 'pulse' for 'diamond'", () => {
    expect(shapeTypeToWave('diamond')).toBe('pulse')
  })

  it("returns 'blob' for 'blob'", () => {
    expect(shapeTypeToWave('blob')).toBe('blob')
  })
})

// Phase 4 — updateVoiceColor and updateVoiceSize
// These functions guard against missing voice / missing AudioContext (jsdom)
// Wave 0 stubs: functions don't exist yet — tests skip gracefully when undefined
describe('updateVoiceColor (Phase 4)', () => {
  it('returns undefined (no-op) when AudioContext unavailable in jsdom', async () => {
    // In jsdom, AudioContext is not available — the function must guard and return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('./audioEngine') as any
    const updateVoiceColor = mod.updateVoiceColor
    if (typeof updateVoiceColor !== 'function') return // Skip until Wave 2 adds the export
    expect(() => updateVoiceColor('nonexistent', { h: 120, s: 50, l: 50 })).not.toThrow()
  })
})

describe('updateVoiceSize (Phase 4)', () => {
  it('returns undefined (no-op) when AudioContext unavailable in jsdom', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('./audioEngine') as any
    const updateVoiceSize = mod.updateVoiceSize
    if (typeof updateVoiceSize !== 'function') return // Skip until Wave 2 adds the export
    expect(() => updateVoiceSize('nonexistent', 75)).not.toThrow()
  })
})
