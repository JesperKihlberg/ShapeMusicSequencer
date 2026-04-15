// src/engine/audioEngine.ts
// Pure color-to-audio mapping functions — no AudioContext, no side effects
// These are the mathematical heart of the audio engine, testable in jsdom.
// COLR-01: hue → frequency; COLR-02: saturation → distortion; COLR-03: lightness → filter
// SHPE-01: shape type → waveform descriptor
import type { ShapeColor, ShapeType } from '../store/shapeStore'

// Wave type string used internally — 'pulse' and 'blob' are non-standard OscillatorType values
// 'pulse' → createPeriodicWave (square-ish with PWM)
// 'blob'  → noise + sine mix
export type WaveDescriptor = OscillatorType | 'pulse' | 'blob'

// D-02: hue → pitch class (semitone 0–11)
// 30° per semitone: hue 0° = C, 30° = C#, 60° = D, ... 330° = B
function hueToSemitone(h: number): number {
  return Math.round((h % 360) / 30) % 12
}

// D-03: lightness → octave (1–8, linear mapping)
// l=0 → octave 1 (C1 = ~32.7 Hz), l=100 → octave 8 (C8 = ~4186 Hz)
// Uses Math.floor so l=50 → floor(3.5) = 3 → octave 4 (C4 = 261 Hz), not octave 5
function lightnessToOctave(l: number): number {
  const clamped = Math.max(0, Math.min(100, l))
  return 1 + Math.floor((clamped / 100) * 7)
}

// COLR-01: color → frequency (Hz) using MIDI formula 440 * 2^((n-69)/12)
// MIDI note formula: 12 + octave*12 + semitone
//   C1 = MIDI 24 = 32.70 Hz, C4 = MIDI 60 = 261.63 Hz, C8 = MIDI 108 = 4186 Hz
export function colorToFrequency(color: ShapeColor): number {
  const semitone = hueToSemitone(color.h)
  const octave = lightnessToOctave(color.l)
  const midiNote = 12 + octave * 12 + semitone
  return 440 * Math.pow(2, (midiNote - 69) / 12)
}

// COLR-02: saturation → WaveShaper distortion curve (Float32Array, 256 samples)
// saturation=0 → identity (linear passthrough, no distortion)
// saturation=100 → soft-clip (k=200, heavy overdrive)
// Formula: curve[i] = ((PI + k) * x) / (PI + k * |x|), k = (sat/100) * 200
export function makeDistortionCurve(saturation: number): Float32Array {
  const SAMPLES = 256
  const curve = new Float32Array(SAMPLES)
  const intensity = Math.max(0, Math.min(100, saturation)) / 100
  const k = intensity * 200  // drive: 0 at clean, 200 at full distortion
  for (let i = 0; i < SAMPLES; i++) {
    const x = (i * 2) / SAMPLES - 1  // maps [0, SAMPLES) → [-1.0, ~+1.0)
    if (intensity < 0.01) {
      curve[i] = x  // identity passthrough
    } else {
      // Soft-clip (RESEARCH.md Pattern 6): bounded to (-1, +1), non-linear
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
    }
  }
  return curve
}

// COLR-03: lightness → filter cutoff frequency (Hz)
// Exponential mapping: minHz=100, maxHz=8000
// Formula: 100 * (8000/100)^t where t = l/100
// Low l = dark/muffled (100 Hz); high l = bright/open (8000 Hz)
export function lightnessToFilterCutoff(l: number): number {
  const minHz = 100
  const maxHz = 8000
  const t = Math.max(0, Math.min(100, l)) / 100
  return minHz * Math.pow(maxHz / minHz, t)
}

// SHPE-01 + D-05: shape type → base waveform descriptor
// 'pulse' and 'blob' are handled specially in createVoice (Plan 03)
export function shapeTypeToWave(type: ShapeType): WaveDescriptor {
  switch (type) {
    case 'circle':   return 'sine'
    case 'triangle': return 'triangle'
    case 'square':   return 'square'
    case 'star':     return 'sawtooth'
    case 'diamond':  return 'pulse'
    case 'blob':     return 'blob'
  }
}
