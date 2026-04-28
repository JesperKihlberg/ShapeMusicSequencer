// src/engine/noteHue.ts
// Pure utility: maps scale notes to their hue values on the 0–360 scale (ANIM-13, D-06).
// Inverse of the audioEngine.ts formula: hueSemitone = (hClamped / 360) * 12
// i.e. hue = (semitone / 12) * 360
// Reused by Phase 11 (Shift+snap to scale note lines).
import { SCALE_INTERVALS, type ScaleName } from '../store/scaleStore'

export interface NoteHue {
  hue: number       // 0–360; the hue canvas value for this note
  semitone: number  // 0–11; chromatic index (C=0)
  isRoot: boolean   // true only for the root note (interval === 0)
}

/**
 * Returns one NoteHue entry per note in the given scale, in scale-interval order.
 * Hue formula: ((rootKey + interval) % 12) / 12 * 360
 */
export function scaleNoteHues(rootKey: number, scale: ScaleName): NoteHue[] {
  return SCALE_INTERVALS[scale].map((interval) => {
    const semitone = (rootKey + interval) % 12
    const hue = (semitone / 12) * 360
    return { hue, semitone, isRoot: interval === 0 }
  })
}
