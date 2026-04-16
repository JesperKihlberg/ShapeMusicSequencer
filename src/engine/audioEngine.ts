// src/engine/audioEngine.ts
// Pure color-to-audio mapping functions — no AudioContext, no side effects
// These are the mathematical heart of the audio engine, testable in jsdom.
// COLR-01: hue → frequency; COLR-02: saturation → distortion; COLR-03: lightness → filter
// SHPE-01: shape type → waveform descriptor
import type { ShapeColor, ShapeType, Shape } from '../store/shapeStore'
import { shapeStore } from '../store/shapeStore'

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

// ─────────────────────────────────────────────────────────────────────────────
// AudioVoice — nodes owned by one shape's voice (D-09)
// noiseSource is only present for blob shapes
// ─────────────────────────────────────────────────────────────────────────────
export interface AudioVoice {
  oscillator: OscillatorNode | AudioBufferSourceNode  // OscillatorNode for all types except blob
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
  noiseSource?: AudioBufferSourceNode  // blob only
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singletons (D-12)
// ─────────────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
const voices = new Map<string, AudioVoice>()

// D-11: lazy-init — MUST be called inside a user-gesture callback (shapeStore.subscribe
// fires because the user clicked a grid cell)
// Returns null if AudioContext is unavailable (e.g., jsdom test environment, headless browser)
function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.15  // headroom for 16 simultaneous voices (Pitfall 6)
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse wave helper — cached per AudioContext (D-05, Pattern 7)
// 25% duty cycle via Fourier series: b_n = (2/(n*PI)) * sin(n*PI*0.25)
// ─────────────────────────────────────────────────────────────────────────────
let cachedPulseWave: PeriodicWave | null = null
function getPulseWave(ctx: AudioContext): PeriodicWave {
  if (cachedPulseWave) return cachedPulseWave
  const N = 16
  const D = 0.25
  const real = new Float32Array(N)
  const imag = new Float32Array(N)
  real[0] = 0
  imag[0] = 0
  for (let n = 1; n < N; n++) {
    imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * D)
  }
  cachedPulseWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  return cachedPulseWave
}

// ─────────────────────────────────────────────────────────────────────────────
// White noise buffer — 2s loop (Pattern 8, RESEARCH.md)
// ─────────────────────────────────────────────────────────────────────────────
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

// ─────────────────────────────────────────────────────────────────────────────
// createVoice — builds the signal chain for one shape (D-09, Pattern 4)
// Signal path (standard): OscillatorNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain
// Signal path (blob):      [noiseSource + sineOsc] → mixer GainNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain
// Gain ramp-in: start at 0, ramp to 0.4 in 10ms to avoid click artifact (Pitfall 2)
// ─────────────────────────────────────────────────────────────────────────────
function createVoice(shape: Shape): void {
  const ctx = getAudioContext()
  if (!ctx) return  // No Web Audio API (e.g., jsdom) — skip silently
  const mg = masterGain!

  const waveshaper = ctx.createWaveShaper()
  waveshaper.curve = makeDistortionCurve(shape.color.s)
  waveshaper.oversample = '2x'

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = lightnessToFilterCutoff(shape.color.l)
  filter.Q.value = 1

  const gainNode = ctx.createGain()
  // Ramp from 0 to 0.4 to avoid click artifact (Pitfall 2)
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01)

  const waveDesc = shapeTypeToWave(shape.type)
  const freq = colorToFrequency(shape.color)

  if (waveDesc === 'blob') {
    // Blob: 70% noise + 30% sine (Pattern 8)
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = createNoiseBuffer(ctx)
    noiseSource.loop = true

    const sineOsc = ctx.createOscillator()
    sineOsc.type = 'sine'
    sineOsc.frequency.value = freq

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.7
    const sineGain = ctx.createGain()
    sineGain.gain.value = 0.3
    const mixer = ctx.createGain()
    mixer.gain.value = 1

    // Override filter type for blob — bandpass gives drum-like character
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 2

    noiseSource.connect(noiseGain)
    noiseGain.connect(mixer)
    sineOsc.connect(sineGain)
    sineGain.connect(mixer)
    mixer.connect(waveshaper)
    waveshaper.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(mg)

    noiseSource.start()
    sineOsc.start()

    voices.set(shape.id, { oscillator: sineOsc, waveshaper, filter, gainNode, noiseSource })
  } else {
    // Standard oscillator path (circle, triangle, square, star, diamond)
    const osc = ctx.createOscillator()

    if (waveDesc === 'pulse') {
      osc.setPeriodicWave(getPulseWave(ctx))
    } else {
      osc.type = waveDesc as OscillatorType
    }
    osc.frequency.value = freq

    osc.connect(waveshaper)
    waveshaper.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(mg)

    osc.start()
    voices.set(shape.id, { oscillator: osc, waveshaper, filter, gainNode })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// initAudioEngine — call once from CanvasContainer useEffect (mirrors initCanvasEngine)
// Returns destroy() for React useEffect cleanup
// ─────────────────────────────────────────────────────────────────────────────
export function initAudioEngine(): () => void {
  let prevShapeIds = new Set<string>()

  const unsubscribe = shapeStore.subscribe((state) => {
    const curr = state.shapes
    const currIds = new Set(curr.map((s) => s.id))

    // Detect additions — create voice for any shape not yet in voices Map
    for (const shape of curr) {
      if (!voices.has(shape.id)) {
        createVoice(shape)
      }
    }

    // Detect removals — ramp gain to 0 then stop/disconnect (Phase 3, CANV-03)
    // Gain ramp-out prevents audible click artifact (RESEARCH.md Pitfall 2, Pattern 5)
    for (const id of prevShapeIds) {
      if (!currIds.has(id)) {
        const voice = voices.get(id)
        if (voice) {
          const ctx = getAudioContext()
          if (ctx) {
            // Ramp gain to 0 in τ=0.015s to eliminate click artifact (4τ ≈ 60ms)
            voice.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
          }
          setTimeout(() => {
            try { voice.oscillator.stop() } catch { /* already stopped */ }
            if (voice.noiseSource) {
              try { voice.noiseSource.stop() } catch { /* already stopped */ }
            }
            voice.gainNode.disconnect()
            voices.delete(id)
          }, 60)  // 60ms = ~4 time constants at τ=0.015s → gain < 2% of original
        }
      }
    }

    // Update prevShapeIds for next subscription fire
    prevShapeIds = new Set(currIds)
  })

  return function destroy(): void {
    unsubscribe()
    // Stop all voices on cleanup (e.g., React StrictMode double-invoke)
    voices.forEach((voice) => {
      try { voice.oscillator.stop() } catch { /* already stopped */ }
      if (voice.noiseSource) {
        try { voice.noiseSource.stop() } catch { /* already stopped */ }
      }
    })
    voices.clear()
    cachedPulseWave = null
    if (audioCtx) {
      void audioCtx.close()
      audioCtx = null
      masterGain = null
    }
  }
}
