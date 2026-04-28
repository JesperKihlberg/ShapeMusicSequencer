// src/engine/noteHue.test.ts
// Unit tests for scaleNoteHues pure utility (ANIM-13, D-06).
// Tests are written first (TDD RED) — noteHue.ts does not exist yet.
import { describe, it, expect } from 'vitest'
// noteHue.ts does not exist yet — these tests MUST fail on first run
import { scaleNoteHues } from './noteHue'

describe('scaleNoteHues (ANIM-13)', () => {
  it('returns 7 notes for major scale', () => {
    expect(scaleNoteHues(0, 'major')).toHaveLength(7)
  })

  it('first note has isRoot: true for rootKey=0, major', () => {
    const notes = scaleNoteHues(0, 'major')
    expect(notes[0].isRoot).toBe(true)
  })

  it('rootKey=0 (C): first note hue is 0', () => {
    const notes = scaleNoteHues(0, 'major')
    expect(notes[0].hue).toBe(0)
  })

  it('rootKey=6 (F#): first note hue is 180', () => {
    const notes = scaleNoteHues(6, 'major')
    expect(notes[0].hue).toBe(180)
  })
})
