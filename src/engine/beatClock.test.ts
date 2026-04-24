// src/engine/beatClock.test.ts
// TDD RED→GREEN for getCurrentBeat — Plan 08-01 (ANIM-15)
// Covers: pure beat-position function with no side effects
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCurrentBeat } from './beatClock'

describe('getCurrentBeat', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 0 at t=0ms for any BPM', () => {
    vi.mocked(performance.now).mockReturnValue(0)
    expect(getCurrentBeat(120)).toBe(0)
    expect(getCurrentBeat(60)).toBe(0)
    expect(getCurrentBeat(180)).toBe(0)
  })

  it('returns 2.0 at t=1000ms with 120 BPM', () => {
    // 120 bpm / 60 * 1 sec = 2 beats
    vi.mocked(performance.now).mockReturnValue(1000)
    expect(getCurrentBeat(120)).toBeCloseTo(2.0, 10)
  })

  it('returns 1.0 at t=1000ms with 60 BPM', () => {
    // 60 bpm / 60 * 1 sec = 1 beat
    vi.mocked(performance.now).mockReturnValue(1000)
    expect(getCurrentBeat(60)).toBeCloseTo(1.0, 10)
  })

  it('returns 1.5 at t=500ms with 180 BPM', () => {
    // 180 bpm / 60 * 0.5 sec = 1.5 beats
    vi.mocked(performance.now).mockReturnValue(500)
    expect(getCurrentBeat(180)).toBeCloseTo(1.5, 10)
  })

  it('is a pure function — no side effects, calling twice with same args returns same value', () => {
    vi.mocked(performance.now).mockReturnValue(2000)
    const first = getCurrentBeat(120)
    const second = getCurrentBeat(120)
    expect(first).toBe(second)
  })
})
