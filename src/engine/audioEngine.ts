// src/engine/audioEngine.ts
// Pure color-to-audio mapping functions — no AudioContext, no side effects
// These are the mathematical heart of the audio engine, testable in jsdom.
// COLR-01: hue → frequency; COLR-02: saturation → distortion; COLR-03: lightness → filter
// SHPE-01: shape type → waveform descriptor
import type { ShapeColor, ShapeType, Shape } from '../store/shapeStore'
import { shapeStore } from '../store/shapeStore'
import { playbackStore } from '../store/playbackStore'
import { animationStore } from '../store/animationStore'
import type { AnimatableProperty, SplineCurve } from '../store/animationStore'
import { scaleStore, SCALE_INTERVALS } from '../store/scaleStore'

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
// Two-stage algorithm (Phase 6 CONTEXT.md):
//   Stage 1 (s 0–50): Chebyshev T2/T3 harmonic blend — warm 2nd/3rd harmonics
//   Stage 2 (s 50–100): soft-clip limiter — increasingly compressed character
// saturation=0 → identity (linear passthrough, no distortion)
// saturation=100 → full harmonic stack + soft-clip
export function makeDistortionCurve(saturation: number): Float32Array {
  const SAMPLES = 256
  const curve = new Float32Array(SAMPLES)
  const t = Math.max(0, Math.min(100, saturation)) / 100

  // Stage 1: Chebyshev T2/T3 harmonic blend
  // blend=0 at s=0 (pure fundamental — identity), blend=1 at s=50 (full harmonic stack)
  const blend = Math.min(1, t / 0.5)

  // Stage 2: soft-clip strength
  // k=0 at s≤50 (no clip), k=50 at s=100 (full character soft-clip)
  const k = Math.max(0, (t - 0.5) / 0.5) * 50

  const softClip = (x: number): number => {
    if (k === 0) return x
    return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
  }

  for (let i = 0; i < SAMPLES; i++) {
    const x = (i * 2) / SAMPLES - 1  // maps [0, SAMPLES) → [-1.0, ~+1.0)

    // Chebyshev T1 (fundamental), T2 (2nd harmonic), T3 (3rd harmonic)
    const T1 = x
    const T2 = 2 * x * x - 1
    const T3 = x * (4 * x * x - 3)

    // Normalise: at blend=0 weight is 1.0 so T1/1.0 = x (identity).
    // At blend=1 weight is 1.8 (T2 weight 0.5, T3 weight 0.3).
    const harmonicWeight = 1.0 + blend * (0.5 + 0.3)
    const chebyshev = (T1 + blend * 0.5 * T2 + blend * 0.3 * T3) / harmonicWeight

    curve[i] = Math.max(-1, Math.min(1, softClip(chebyshev)))
  }

  return curve
}

// PLAY-05, PLAY-06: snap a raw semitone (0–11 from hueToSemitone) to the nearest
// in-scale semitone. Returns a value in [0, 11].
//
// Algorithm: build absolute candidate set (scaleIntervals shifted by rootKey, mod 12),
// find the candidate with minimum circular distance. Tie-breaking: lower candidate wins
// (because candidates are generated in ascending interval order and < is strict).
//
// Chromatic passthrough: when scaleIntervals = [0,1,...,11], every semitone is a candidate
// so the function returns rawSemitone unchanged — no special case needed.
export function quantizeSemitone(
  rawSemitone: number,
  rootKey: number,
  scaleIntervals: number[],
): number {
  // Build absolute semitone candidates: shift each interval by rootKey, wrap mod 12
  const candidates = scaleIntervals.map((i) => (i + rootKey) % 12)
  let best = candidates[0]
  let bestDist = 13  // sentinel larger than max possible circular distance (6)
  for (const c of candidates) {
    // Circular (pitch-class) distance: semitones are mod-12 so B(11) and C(0) are 1 apart
    const dist = Math.min(Math.abs(rawSemitone - c), 12 - Math.abs(rawSemitone - c))
    if (dist < bestDist) {  // strict < → ties go to first (lower) candidate encountered
      bestDist = dist
      best = c
    }
  }
  return best
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
// Phase 7: LFO nodes removed — gain driven directly (no dcOffset/lfoOscillator/lfoGain)
// ─────────────────────────────────────────────────────────────────────────────
export interface AudioVoice {
  oscillator: OscillatorNode | AudioBufferSourceNode  // OscillatorNode for all types except blob
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
  panner: StereoPannerNode               // Phase 6 AUDI-03: column → stereo position
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
// evalCurveAtBeat — evaluate a SplineCurve at a given beat position (looping).
// Linear interpolation between the two nearest in-window control points.
// Points with beat > duration are excluded (outside the loop window).
// ─────────────────────────────────────────────────────────────────────────────
export function evalCurveAtBeat(curve: SplineCurve, beatPos: number): number {
  const pos = curve.duration > 0 ? beatPos % curve.duration : 0
  const active = curve.points
    .filter((p) => p.beat <= curve.duration)
    .sort((a, b) => a.beat - b.beat)
  if (active.length === 0) return 0
  if (active.length === 1) return active[0].value
  let lo = active[active.length - 1]
  let hi = active[0]
  for (let i = 0; i < active.length - 1; i++) {
    if (active[i].beat <= pos && pos < active[i + 1].beat) {
      lo = active[i]
      hi = active[i + 1]
      break
    }
  }
  if (lo.beat === hi.beat) return lo.value
  const segLength = hi.beat - lo.beat
  if (segLength <= 0) return lo.value
  const t = (pos - lo.beat) / segLength
  return lo.value + t * (hi.value - lo.value)
}

// ─────────────────────────────────────────────────────────────────────────────
// createVoice — builds the signal chain for one shape (D-09, Pattern 4)
// Signal path (standard): OscillatorNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain
// Signal path (blob):      [noiseSource + sineOsc] → mixer GainNode → WaveShaperNode → BiquadFilterNode → GainNode → masterGain
// Phase 7: Direct gainNode.gain ramp-in (no LFO/dcOffset)
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
    const panner = ctx.createStereoPanner()
    panner.pan.value = (shape.col / 3) * 2 - 1  // col 0 → -1.0 (hard left), col 3 → +1.0 (hard right)
    gainNode.connect(panner)
    panner.connect(mg)

    noiseSource.start()
    sineOsc.start()

    const baseGain = (shape.size / 100) * 0.8  // size=50 → 0.4 (D-15)
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 0.01)  // 10ms ramp-in (click-free)
    voices.set(shape.id, { oscillator: sineOsc, waveshaper, filter, gainNode, panner, noiseSource })
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
    const panner = ctx.createStereoPanner()
    panner.pan.value = (shape.col / 3) * 2 - 1  // col 0 → -1.0, col 3 → +1.0
    gainNode.connect(panner)
    panner.connect(mg)

    osc.start()

    const baseGain = (shape.size / 100) * 0.8  // size=50 → 0.4 (D-15)
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 0.01)  // 10ms ramp-in (click-free)
    voices.set(shape.id, { oscillator: osc, waveshaper, filter, gainNode, panner })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateVoiceColor — glitch-free color parameter update on a live voice (D-13)
// Uses setTargetAtTime (τ=0.015s) for smooth transitions (Pattern 2)
// WaveShaper.curve is NOT an AudioParam — direct assignment is correct (Pitfall 2)
// ─────────────────────────────────────────────────────────────────────────────
export function updateVoiceColor(shapeId: string, color: ShapeColor): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx  // direct null check — do NOT use getAudioContext() here;
  // getAudioContext() resumes a suspended context, overriding the user's Stop action.
  // setTargetAtTime is safe on a suspended context — values are buffered.
  if (!voice || !ctx) return
  // Frequency — only OscillatorNode has frequency AudioParam (not blob's BufferSource)
  if (voice.oscillator instanceof OscillatorNode) {
    const { rootKey, scale } = scaleStore.getState()
    const rawSemitone = hueToSemitone(color.h)
    const quantized = quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])
    // Back-convert quantized semitone to hue (semitone × 30 = hue).
    // hueToSemitone(quantized * 30) == quantized exactly (30° per semitone, no rounding error).
    const quantizedHue = quantized * 30
    voice.oscillator.frequency.setTargetAtTime(
      colorToFrequency({ ...color, h: quantizedHue }), ctx.currentTime, 0.015
    )
  }
  // Filter cutoff — always present
  voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(color.l), ctx.currentTime, 0.015)
  // Distortion curve — direct assignment (WaveShaper.curve is not an AudioParam)
  voice.waveshaper.curve = makeDistortionCurve(color.s)
}

// ─────────────────────────────────────────────────────────────────────────────
// updateVoiceSize — set base gain directly on gainNode (no LFO in Phase 7)
// ─────────────────────────────────────────────────────────────────────────────
export function updateVoiceSize(shapeId: string, size: number): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx  // direct null check — do NOT use getAudioContext() here;
  if (!voice || !ctx) return
  const newBase = (size / 100) * 0.8  // size=50 → 0.4, size=100 → 0.8
  voice.gainNode.gain.setTargetAtTime(newBase, ctx.currentTime, 0.015)
}

// ─────────────────────────────────────────────────────────────────────────────
// initAudioEngine — call once from CanvasContainer useEffect (mirrors initCanvasEngine)
// Returns destroy() for React useEffect cleanup
// ─────────────────────────────────────────────────────────────────────────────
export function initAudioEngine(): () => void {
  let prevShapes = new Map<string, Shape>()  // tracks previous shape values for change detection

  const unsubscribe = shapeStore.subscribe((state) => {
    const curr = state.shapes
    const currIds = new Set(curr.map((s) => s.id))
    const ctx = audioCtx  // direct null check — do NOT use getAudioContext() here;
    // getAudioContext() resumes a suspended context, overriding the user's Stop action.
    // Voices are still created correctly: createVoice() calls getAudioContext() itself,
    // which is fine for new additions (user just clicked a cell = user gesture).

    // Detect additions — create voice for any shape not yet in voices Map.
    // Guard: skip createVoice when context is suspended — createVoice() calls getAudioContext()
    // which resumes a suspended context, overriding the user's Stop action.
    // Voiceless shapes added while stopped are caught by the resume path in unsubscribePlayback.
    const contextAllowsCreate = !audioCtx || audioCtx.state === 'running'
    for (const shape of curr) {
      if (!voices.has(shape.id) && contextAllowsCreate) {
        createVoice(shape)
        prevShapes.set(shape.id, shape)
      }
    }

    // Detect property changes on existing voices (Phase 4 — color, size, type)
    for (const shape of curr) {
      const prev = prevShapes.get(shape.id)
      if (prev && voices.has(shape.id)) {
        // Color change — update frequency, filter, distortion (D-13)
        if (shape.color.h !== prev.color.h ||
            shape.color.s !== prev.color.s ||
            shape.color.l !== prev.color.l) {
          updateVoiceColor(shape.id, shape.color)
        }
        // Size change — update gain (D-13)
        if (shape.size !== prev.size) {
          updateVoiceSize(shape.id, shape.size)
        }
        // Type change — destroy entire voice, re-create with new waveform (D-08)
        if (shape.type !== prev.type) {
          const voice = voices.get(shape.id)
          if (voice && ctx) {
            voice.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
            const idToRecreate = shape.id
            const shapeSnapshot: Shape = { ...shape }
            setTimeout(() => {
              const v = voices.get(idToRecreate)
              if (v) {
                try { v.oscillator.stop() } catch { /* already stopped */ }
                if (v.noiseSource) try { v.noiseSource.stop() } catch { /* already stopped */ }
                v.gainNode.disconnect()
                v.panner.disconnect()   // Phase 6: disconnect panner to prevent masterGain leak
                voices.delete(idToRecreate)
                // Only recreate if context is running — do NOT call createVoice when suspended;
                // createVoice() calls getAudioContext() which resumes the context, overriding Stop.
                // The voice will be absent until the user resumes playback; that is acceptable.
                if (audioCtx && audioCtx.state === 'running') {
                  createVoice(shapeSnapshot)
                }
                prevShapes.set(idToRecreate, shapeSnapshot)
              }
            }, 60)
          }
        }
        prevShapes.set(shape.id, shape)
      }
    }

    // Detect removals — ramp gain to 0 then stop/disconnect (Phase 3, CANV-03)
    // Gain ramp-out prevents audible click artifact (RESEARCH.md Pitfall 2, Pattern 5)
    for (const id of prevShapes.keys()) {
      if (!currIds.has(id)) {
        const voice = voices.get(id)
        if (voice) {
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
            voice.panner.disconnect()   // Phase 6: disconnect panner to prevent masterGain leak
            voices.delete(id)
          }, 60)  // 60ms = ~4 time constants at τ=0.015s → gain < 2% of original
        }
        prevShapes.delete(id)
      }
    }
  })

  // Phase 5: subscribe to playbackStore for isPlaying, volume changes (D-15)
  // CRITICAL: do NOT call getAudioContext() here — only act if audioCtx already exists
  // (i.e., user has already placed a shape). Calling getAudioContext() in subscribe
  // would create AudioContext outside a user gesture. (RESEARCH.md Pitfall 1)
  let prevIsPlaying = playbackStore.getState().isPlaying
  let prevVolume = playbackStore.getState().volume

  const unsubscribePlayback = playbackStore.subscribe((state) => {
    const ctx = audioCtx  // Direct module-level null check — do NOT use getAudioContext()
    if (!ctx) return

    // isPlaying changed → suspend or resume AudioContext (D-01)
    if (state.isPlaying !== prevIsPlaying) {
      prevIsPlaying = state.isPlaying
      if (state.isPlaying) {
        void ctx.resume()
        // Create voices for shapes added while the context was suspended
        for (const shape of shapeStore.getState().shapes) {
          if (!voices.has(shape.id)) {
            createVoice(shape)
            prevShapes.set(shape.id, shape)
          }
        }
      } else {
        void ctx.suspend()
      }
    }

    // volume changed → ramp masterGain with τ=0.05s for smooth fade (D-11, Pitfall 6)
    // volume * 0.15 preserves the 16-voice headroom ceiling set in getAudioContext()
    if (state.volume !== prevVolume) {
      prevVolume = state.volume
      if (masterGain) {
        masterGain.gain.setTargetAtTime(state.volume * 0.15, ctx.currentTime, 0.05)
      }
    }
  })

  let prevRootKey = scaleStore.getState().rootKey
  let prevScale = scaleStore.getState().scale

  const unsubscribeScale = scaleStore.subscribe((state) => {
    const ctx = audioCtx  // Direct module-level null check — do NOT use getAudioContext()
    if (!ctx) return
    if (state.rootKey !== prevRootKey || state.scale !== prevScale) {
      prevRootKey = state.rootKey
      prevScale = state.scale
      // Re-pitch all active voices with new scale/key
      for (const [shapeId] of voices) {
        const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
        if (shape) updateVoiceColor(shapeId, shape.color)
      }
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // animationStore curve evaluator — runs at ~60fps, evaluates each active curve
  // at the current beat position and applies to the corresponding AudioParam.
  // Curves loop independently (ANIM-04): beat position mod curve.duration.
  // ─────────────────────────────────────────────────────────────────────────────
  let curveIntervalId: ReturnType<typeof setInterval> | null = null

  curveIntervalId = setInterval(() => {
    const ctx = audioCtx
    if (!ctx) return
    const { bpm, isPlaying } = playbackStore.getState()
    if (!isPlaying) return

    const beatPos = (performance.now() / 1000) * (bpm / 60)
    const { curves } = animationStore.getState()

    for (const [shapeId, shapeCurves] of Object.entries(curves)) {
      const voice = voices.get(shapeId)
      if (!voice) continue
      const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
      if (!shape) continue

      // 'size' curve → modulate gainNode.gain
      if (shapeCurves.size) {
        const sizeVal = evalCurveAtBeat(shapeCurves.size, beatPos)
        const gain = (sizeVal / 100) * 0.8
        voice.gainNode.gain.setTargetAtTime(gain, ctx.currentTime, 0.008)
      }

      // 'hue' curve → modulate oscillator frequency (via updateVoiceColor with patched hue)
      if (shapeCurves.hue && voice.oscillator instanceof OscillatorNode) {
        const hueVal = evalCurveAtBeat(shapeCurves.hue, beatPos)
        updateVoiceColor(shapeId, { ...shape.color, h: hueVal })
      }

      // 'saturation' curve → modulate WaveShaper curve (direct assignment, not AudioParam)
      if (shapeCurves.saturation) {
        const satVal = evalCurveAtBeat(shapeCurves.saturation, beatPos)
        voice.waveshaper.curve = makeDistortionCurve(satVal)
      }

      // 'lightness' curve → modulate filter cutoff
      if (shapeCurves.lightness) {
        const lightVal = evalCurveAtBeat(shapeCurves.lightness, beatPos)
        voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(lightVal), ctx.currentTime, 0.008)
      }
    }
  }, 16)

  return function destroy(): void {
    unsubscribe()
    unsubscribePlayback()  // Phase 5: clean up playback subscription (Pitfall 3)
    unsubscribeScale()     // Phase 6: clean up scale subscription
    if (curveIntervalId !== null) clearInterval(curveIntervalId)
    // Stop all voices on cleanup (e.g., React StrictMode double-invoke)
    voices.forEach((voice) => {
      try { voice.oscillator.stop() } catch { /* already stopped */ }
      if (voice.noiseSource) {
        try { voice.noiseSource.stop() } catch { /* already stopped */ }
      }
    })
    voices.clear()
    prevShapes.clear()
    cachedPulseWave = null
    if (audioCtx) {
      void audioCtx.close()
      audioCtx = null
      masterGain = null
    }
  }
}
