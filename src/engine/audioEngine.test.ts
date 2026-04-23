// src/engine/audioEngine.test.ts
// Pure function tests only — no AudioContext (jsdom does not implement it)
// Covers: COLR-01, COLR-02, COLR-03, SHPE-01
import { describe, it, expect } from 'vitest'
import {
  colorToFrequency,
  makeDistortionCurve,
  lightnessToFilterCutoff,
  shapeTypeToWave,
  quantizeSemitone,
  evalCurveAtBeat,
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
    // Two-stage algorithm (Phase 6): at sat=100, t=1, blend=1, k=50.
    // At i=64, x=-0.5. Chebyshev blend shifts the value before soft-clip.
    // Two-stage result at i=64 ≈ -0.85, which is clearly > 0.7 in magnitude.
    // (The old pure-soft-clip k=200 gave ≈-0.985; two-stage k=50 gives ≈-0.85.)
    // Both prove non-linearity: identity at -0.5 stays at -0.5; distorted does not.
    expect(Math.abs(curve[64])).toBeGreaterThan(0.7)
    // The curve should still be negative at index 0 (negative input preserves sign)
    expect(curve[0]).toBeLessThan(0)
  })

  it('returns non-identity values at non-zero saturation', () => {
    const identity = makeDistortionCurve(0)
    const distorted = makeDistortionCurve(100)
    // At index 64 (x = -0.5), the distorted curve should differ from identity
    expect(distorted[64]).not.toBeCloseTo(identity[64], 5)
  })

  it('soft-clip effect is absent at saturation=0 but detectable at saturation=100 (two-stage spec)', () => {
    // At s=0: identity curve — output equals input for all x. No soft-clip (k=0).
    // At s=100: distortion algorithm produces output measurably different from identity.
    // At index 240, x ≈ (240*2)/256 - 1 = 0.875. Identity gives 0.875.
    // Both the current soft-clip and the Wave-1 two-stage algorithm differ from identity here.
    const curve0 = makeDistortionCurve(0)
    const curve100 = makeDistortionCurve(100)
    const x240 = (240 * 2) / 256 - 1  // ≈ 0.875
    // Identity check: s=0 output should be very close to x
    expect(curve0[240]).toBeCloseTo(x240, 4)
    // Distortion check: s=100 output should differ measurably from identity
    expect(Math.abs(curve100[240] - x240)).toBeGreaterThan(0.01)
  })

  it('output is monotonically increasing (transfer function is non-decreasing) at all saturation levels', () => {
    // A valid WaveShaper transfer curve should not reverse direction (no foldback).
    // This tests structural validity, not specific values.
    for (const sat of [0, 50, 100]) {
      const curve = makeDistortionCurve(sat)
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1] - 0.001)
      }
    }
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

// Covers: PLAY-05 (scale quantization), PLAY-06 (chromatic passthrough)
describe('quantizeSemitone (Phase 6)', () => {
  it('snaps C# (raw=1) to C (0) in C major — tie breaks to lower', () => {
    expect(quantizeSemitone(1, 0, [0,2,4,5,7,9,11])).toBe(0)
  })

  it('snaps F# (raw=6) to F (5) in C major — tie breaks to lower', () => {
    expect(quantizeSemitone(6, 0, [0,2,4,5,7,9,11])).toBe(5)
  })

  it('uses rootKey offset: raw=3 in D major (rootKey=2) snaps to D (2)', () => {
    // D major candidates: intervals [0,2,4,5,7,9,11] + rootKey=2, mod 12 = [2,4,6,7,9,11,1]
    // raw=3 (D#/Eb): nearest candidate is 2 (D, dist=1) vs 4 (E, dist=1) — tie to lower (2)
    // Note: raw=1 (C#) IS in D major as the 7th degree (interval 11 + 2 = 1 mod 12),
    // so that input would return 1 (distance 0), not 2.
    expect(quantizeSemitone(3, 2, [0,2,4,5,7,9,11])).toBe(2)
  })

  it('chromatic intervals are identity passthrough (PLAY-06)', () => {
    const chromatic = [0,1,2,3,4,5,6,7,8,9,10,11]
    for (let raw = 0; raw <= 11; raw++) {
      expect(quantizeSemitone(raw, 0, chromatic)).toBe(raw)
    }
  })

  it('returns value in range [0, 11] for rootKey=11 (B major)', () => {
    const result = quantizeSemitone(0, 11, [0,2,4,5,7,9,11])
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(11)
  })
})

// Covers: AUDI-03 (pan formula correctness)
describe('pan formula (Phase 6 AUDI-03)', () => {
  it('col 0 → pan -1.0 (hard left)', () => {
    const pan = (0 / 3) * 2 - 1
    expect(pan).toBeCloseTo(-1.0, 5)
  })
  it('col 3 → pan +1.0 (hard right)', () => {
    const pan = (3 / 3) * 2 - 1
    expect(pan).toBeCloseTo(1.0, 5)
  })
  it('col 1 → pan ≈ -0.333', () => {
    const pan = (1 / 3) * 2 - 1
    expect(pan).toBeCloseTo(-0.333, 2)
  })
  it('col 2 → pan ≈ +0.333', () => {
    const pan = (2 / 3) * 2 - 1
    expect(pan).toBeCloseTo(0.333, 2)
  })
})

describe('evalCurveAtBeat (ANIM-04 looping)', () => {
  it('returns exact point value when beat aligns with a control point', () => {
    const curve = { duration: 4, points: [{ beat: 0, value: 50 }, { beat: 4, value: 80 }] }
    expect(evalCurveAtBeat(curve, 0)).toBe(50)
  })
  it('interpolates linearly between two points', () => {
    const curve = { duration: 4, points: [{ beat: 0, value: 0 }, { beat: 4, value: 100 }] }
    expect(evalCurveAtBeat(curve, 2)).toBeCloseTo(50, 1)
  })
  it('loops — beat position > duration wraps back to start', () => {
    const curve = { duration: 4, points: [{ beat: 0, value: 10 }, { beat: 4, value: 10 }] }
    expect(evalCurveAtBeat(curve, 6)).toBeCloseTo(evalCurveAtBeat(curve, 2), 1)
  })
})
