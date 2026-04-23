# Phase 6: Full Visual Language - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/store/scaleStore.ts` | store | request-response | `src/store/playbackStore.ts` | exact |
| `src/store/scaleStore.test.ts` | test | — | `src/store/playbackStore.test.ts` | exact |
| `src/components/ScaleSelector.tsx` | component | request-response | `src/components/PlaybackControls.tsx` | exact |
| `src/components/ScaleSelector.test.tsx` | test | — | `src/components/PlaybackControls.test.tsx` | exact |
| `src/engine/audioEngine.ts` (modified) | service | event-driven | `src/engine/audioEngine.ts` (self) | self |
| `src/engine/audioEngine.test.ts` (modified) | test | — | `src/engine/audioEngine.test.ts` (self) | self |
| `src/App.tsx` (modified) | component | request-response | `src/App.tsx` (self) | self |
| `src/styles/index.css` (modified) | config | — | `src/styles/index.css` (self) | self |

---

## Pattern Assignments

### `src/store/scaleStore.ts` (store, request-response)

**Analog:** `src/store/playbackStore.ts`

**Imports pattern** (lines 1–11 of playbackStore.ts):
```typescript
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
```

**Core store pattern** (lines 34–45 of playbackStore.ts):
```typescript
export const playbackStore = createStore<PlaybackState>()((set) => ({
  isPlaying: true,
  bpm: 120,
  volume: 0.8,
  setIsPlaying: (v: boolean) => set({ isPlaying: v }),
  setBpm: (v: number) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
  setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
}))

// React hook wrapper — same pattern as useSelectionStore, useShapeStore
export const usePlaybackStore = <T>(selector: (state: PlaybackState) => T): T =>
  useStore(playbackStore, selector)
```

**Key differences for scaleStore:**
- `createStore<ScaleState>` instead of `PlaybackState`
- `setRootKey`: clamp to `[0, 11]` with `Math.round(Math.max(0, Math.min(11, key)))`
- `setScale`: type-asserted set with no clamping (TypeScript union constrains values)
- Export `SCALE_INTERVALS: Record<ScaleName, number[]>` as a named constant — audioEngine imports it directly without going through React layer
- Export hook as `useScaleStore`

**Clamping pattern** (line 40 of playbackStore.ts — copy and adapt):
```typescript
setBpm: (v: number) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
// → becomes:
setRootKey: (key: number) => set({ rootKey: Math.round(Math.max(0, Math.min(11, key))) }),
```

---

### `src/store/scaleStore.test.ts` (test)

**Analog:** `src/store/playbackStore.test.ts`

**Imports + beforeEach pattern** (lines 1–9 of playbackStore.test.ts):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { playbackStore } from './playbackStore'

describe('playbackStore — defaults', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })
  // ...
})
```

**Clamping test pattern** (lines 51–65 of playbackStore.test.ts):
```typescript
it('setBpm clamps below-minimum to 60 (D-08)', () => {
  playbackStore.getState().setBpm(59)
  expect(playbackStore.getState().bpm).toBe(60)
})

it('setBpm clamps above-maximum to 180 (D-08)', () => {
  playbackStore.getState().setBpm(181)
  expect(playbackStore.getState().bpm).toBe(180)
})
```

**Key differences for scaleStore.test.ts:**
- `beforeEach` resets to `{ rootKey: 0, scale: 'major' }`
- Test groups: `defaults`, `setRootKey (PLAY-05)`, `setScale (PLAY-06)`
- Clamping tests for `setRootKey`: below 0 → 0, above 11 → 11
- `setScale` tests: each valid ScaleName value round-trips correctly

---

### `src/components/ScaleSelector.tsx` (component, request-response)

**Analog:** `src/components/PlaybackControls.tsx`

**Imports pattern** (lines 1–5 of PlaybackControls.tsx):
```typescript
import { useState } from 'react'
import { usePlaybackStore, playbackStore } from '../store/playbackStore'
// → becomes:
import { useScaleStore, scaleStore, SCALE_INTERVALS, type ScaleName } from '../store/scaleStore'
```

**Store read pattern** (lines 8–11 of PlaybackControls.tsx):
```typescript
const isPlaying = usePlaybackStore((s) => s.isPlaying)
const bpm = usePlaybackStore((s) => s.bpm)
// → becomes:
const rootKey = useScaleStore((s) => s.rootKey)
const scale = useScaleStore((s) => s.scale)
```

**Store write pattern via direct getState()** (line 19 of PlaybackControls.tsx):
```typescript
playbackStore.getState().setIsPlaying(!isPlaying)
// → becomes:
scaleStore.getState().setRootKey(Number(e.target.value))
scaleStore.getState().setScale(e.target.value as ScaleName)
```

**Wrapper div class convention** — use `.scale-selector` wrapper with two `<select>` elements. Each select gets `aria-label` for accessibility. No `<label>` element needed — matches toolbar density (PlaybackControls uses `aria-label` on its `<input>` and `<button>` elements, no external `<label>`).

**JSX structure to copy:**
```tsx
// PlaybackControls returns <div className="toolbar__controls">
// ScaleSelector returns a fragment or wrapper that sits INSIDE .toolbar__controls
// as a sibling to BPM / Volume / Start-Stop controls.
// Pattern: render as a standalone functional component (named export), no default export needed
// — matches PlaybackControls pattern of both named + default export (line 126–127).
```

---

### `src/components/ScaleSelector.test.tsx` (test)

**Analog:** `src/components/PlaybackControls.test.tsx`

**Imports + render pattern** (lines 1–7 of PlaybackControls.test.tsx):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from './PlaybackControls'
import { playbackStore } from '../store/playbackStore'
```

**Store reset in beforeEach** (line 10 of PlaybackControls.test.tsx):
```typescript
beforeEach(() => {
  playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
})
// → becomes:
beforeEach(() => {
  scaleStore.setState({ rootKey: 0, scale: 'major' })
})
```

**fireEvent change pattern** (lines 29–30 of PlaybackControls.test.tsx):
```typescript
fireEvent.click(screen.getByText('Start'))
expect(playbackStore.getState().isPlaying).toBe(true)
// → becomes:
fireEvent.change(screen.getByLabelText('Scale'), { target: { value: 'dorian' } })
expect(scaleStore.getState().scale).toBe('dorian')
```

**Key tests to write:**
- Renders `aria-label="Root key"` select
- Renders `aria-label="Scale"` select
- Root key select shows 12 options (C through B)
- Scale select shows 7 options
- Changing root key select updates `scaleStore.rootKey`
- Changing scale select updates `scaleStore.scale`

---

### `src/engine/audioEngine.ts` — modifications (service, event-driven)

**Self-analog:** Read in full above. Four modification sites.

#### Modification 1: `AudioVoice` interface — add `panner` field

**Current interface** (lines 126–135 of audioEngine.ts):
```typescript
export interface AudioVoice {
  oscillator: OscillatorNode | AudioBufferSourceNode
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
  noiseSource?: AudioBufferSourceNode
  lfoOscillator: OscillatorNode
  lfoGain: GainNode
  dcOffset: ConstantSourceNode
}
```
**Add after `gainNode`:** `panner: StereoPannerNode`

#### Modification 2: `createVoice` — insert StereoPannerNode

**Current connect calls** — two sites, both must change.

Blob path (line 285):
```typescript
gainNode.connect(mg)
```

Standard path (line 306):
```typescript
gainNode.connect(mg)
```

**Both become:**
```typescript
const panner = ctx.createStereoPanner()
panner.pan.value = (shape.col / 3) * 2 - 1
gainNode.connect(panner)
panner.connect(mg)
```

**voices.set calls** also need `panner` added to the voice literal:
- Line 291 (blob): `voices.set(shape.id, { oscillator: sineOsc, waveshaper, filter, gainNode, noiseSource, lfoOscillator, lfoGain, dcOffset })`
- Line 311 (standard): `voices.set(shape.id, { oscillator: osc, waveshaper, filter, gainNode, lfoOscillator, lfoGain, dcOffset })`

Both get `panner` added before `lfoOscillator`.

#### Modification 3: Teardown sites — add `voice.panner.disconnect()`

**Type-change setTimeout** (lines 441–460 of audioEngine.ts) — pattern to copy from:
```typescript
v.gainNode.disconnect()
v.lfoGain.disconnect()
v.dcOffset.disconnect()
```
Add `v.panner.disconnect()` after `v.gainNode.disconnect()`.

**Removal setTimeout** (lines 477–490 of audioEngine.ts):
```typescript
voice.gainNode.disconnect()
```
Add `voice.panner.disconnect()` after `voice.gainNode.disconnect()`.

**destroy()** function (lines 549–569): No change needed — `voices.clear()` drops all references; panner GC follows.

#### Modification 4: `updateVoiceColor` — thread `quantizeSemitone`

**Current frequency update** (lines 327–329 of audioEngine.ts):
```typescript
if (voice.oscillator instanceof OscillatorNode) {
  voice.oscillator.frequency.setTargetAtTime(colorToFrequency(color), ctx.currentTime, 0.015)
}
```

**Pattern for replacement** — the `instanceof OscillatorNode` guard is preserved exactly; quantization wraps only the frequency argument:
```typescript
if (voice.oscillator instanceof OscillatorNode) {
  const { rootKey, scale } = scaleStore.getState()
  const rawSemitone = hueToSemitone(color.h)
  const quantized = quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])
  const quantizedHue = quantized * 30   // back-convert: hueToSemitone(q*30) == q exactly
  voice.oscillator.frequency.setTargetAtTime(
    colorToFrequency({ ...color, h: quantizedHue }), ctx.currentTime, 0.015
  )
}
```

Note: `hueToSemitone` is currently `function` (not exported). Calling it inside `updateVoiceColor` is already valid since both live in `audioEngine.ts`. No export change needed.

#### Modification 5: `initAudioEngine` — add `scaleStore.subscribe`

**Pattern to mirror exactly** (lines 501–547 of audioEngine.ts — playbackStore.subscribe block):
```typescript
let prevIsPlaying = playbackStore.getState().isPlaying
let prevVolume = playbackStore.getState().volume
let prevBpm = playbackStore.getState().bpm

const unsubscribePlayback = playbackStore.subscribe((state) => {
  const ctx = audioCtx  // Direct module-level null check — do NOT use getAudioContext()
  if (!ctx) return
  // ...
})
```

**scaleStore.subscribe** version:
```typescript
let prevRootKey = scaleStore.getState().rootKey
let prevScale = scaleStore.getState().scale

const unsubscribeScale = scaleStore.subscribe((state) => {
  const ctx = audioCtx  // Direct module-level null check — do NOT use getAudioContext()
  if (!ctx) return
  if (state.rootKey !== prevRootKey || state.scale !== prevScale) {
    prevRootKey = state.rootKey
    prevScale = state.scale
    for (const [shapeId] of voices) {
      const shape = shapeStore.getState().shapes.find((s) => s.id === shapeId)
      if (shape) updateVoiceColor(shapeId, shape.color)
    }
  }
})
```

**destroy() must call `unsubscribeScale()`** — copy pattern from line 551:
```typescript
return function destroy(): void {
  unsubscribe()
  unsubscribePlayback()
  unsubscribeScale()   // add this
  // ... rest unchanged
}
```

#### Modification 6: `makeDistortionCurve` replacement

**Current function signature and buffer size** (lines 59–96 of audioEngine.ts) — keep identical:
- Signature: `export function makeDistortionCurve(saturation: number): Float32Array`
- `const SAMPLES = 256`
- `const t = Math.max(0, Math.min(100, saturation)) / 100`
- Loop: `const x = (i * 2) / SAMPLES - 1`
- Clamp: `curve[i] = Math.max(-1, Math.min(1, raw))`

Only the interior math changes: replace the Chebyshev T1–T5 smoothstep blend with the two-stage Chebyshev T2/T3 + soft-clip algorithm from RESEARCH.md Pattern 7.

#### New export: `quantizeSemitone`

This is a new pure function added to `audioEngine.ts` and exported. It lives in the same module as `hueToSemitone` and `colorToFrequency` (the pure math section, lines 1–120). Place it after `makeDistortionCurve` and before the `AudioVoice` interface.

---

### `src/engine/audioEngine.test.ts` — modifications (test)

**Self-analog.** Import pattern to follow (lines 1–10):
```typescript
import { describe, it, expect } from 'vitest'
import {
  colorToFrequency,
  makeDistortionCurve,
  lightnessToFilterCutoff,
  shapeTypeToWave,
} from './audioEngine'
```

Add `quantizeSemitone` to the imports list.

**Failing test to fix** (lines 82–91): Replace the `harmonic richness increases monotonically` test. The new test should verify the two-stage curve's invariants: identity at s=0 (already covered by existing test) and soft-clip effect detectable at s=100 but absent at s=0. The existing `describe('makeDistortionCurve')` block is the enclosing scope.

**Pattern for new describe block** (lines 153–172 of audioEngine.test.ts — async import pattern):
```typescript
describe('updateVoiceColor (Phase 4)', () => {
  it('returns undefined (no-op) when AudioContext unavailable in jsdom', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('./audioEngine') as any
    const updateVoiceColor = mod.updateVoiceColor
    if (typeof updateVoiceColor !== 'function') return
    expect(() => updateVoiceColor('nonexistent', { h: 120, s: 50, l: 50 })).not.toThrow()
  })
})
```

New `quantizeSemitone` tests use a plain synchronous pattern (function is a named export, no AudioContext needed — same as `colorToFrequency` tests at lines 12–34).

---

### `src/App.tsx` — modification (component, request-response)

**Self-analog.** Current toolbar (lines 13–18 of App.tsx):
```tsx
<header className="toolbar">
  <span role="heading" aria-level={1} className="toolbar__title">
    Shape Music Sequencer
  </span>
  <PlaybackControls />
</header>
```

**Target toolbar structure** (per CONTEXT.md — Title | spacer | Scale | BPM | Volume | Start/Stop):

`PlaybackControls` owns BPM + Volume + Start/Stop and renders a `.toolbar__controls` wrapper with `margin-left: auto` (line 365 of index.css). `ScaleSelector` must be placed BEFORE `PlaybackControls` INSIDE that same `.toolbar__controls` wrapper — OR `App.tsx` wraps them both.

The existing `PlaybackControls` returns `<div className="toolbar__controls">` directly (line 57 of PlaybackControls.tsx). To keep `ScaleSelector` as a sibling without refactoring `PlaybackControls`, App.tsx must wrap both in a shared `toolbar__controls` div.

**Modified App.tsx toolbar section:**
```tsx
import { ScaleSelector } from './components/ScaleSelector'
// ...
<header className="toolbar">
  <span role="heading" aria-level={1} className="toolbar__title">
    Shape Music Sequencer
  </span>
  <div className="toolbar__controls">
    <ScaleSelector />
    {/* BPM + Volume + Start/Stop — PlaybackControls keeps its own DOM, but the
        toolbar__controls class wraps here. PlaybackControls.tsx must remove its
        own .toolbar__controls wrapper or render a fragment instead. */}
    <PlaybackControls />
  </div>
</header>
```

**Note:** This requires a minor change to `PlaybackControls.tsx` — change the root element from `<div className="toolbar__controls">` to `<>` (fragment) so the shared wrapper in App.tsx is the single `.toolbar__controls` node. Alternatively, ScaleSelector renders as a sibling at the App level with its own margin-left:auto — but the CONTEXT.md spec says "toolbar order: Title | spacer | Scale | BPM | Volume | Start/Stop" meaning they share the right-side group. The planner should decide between the fragment refactor and the nested approach.

---

### `src/styles/index.css` — modification (config)

**Self-analog.** Add after the existing `/* ── Phase 5: Playback Controls ──` section.

**Pattern to match** (lines 359–444 of index.css — toolbar controls CSS block structure):
```css
/* Toolbar controls group — right-side flex group (D-09, D-10) */
.toolbar__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

/* Individual control wrapper — label above + input below */
.toolbar-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
```

**New `.scale-selector` block to add** — follow the same naming convention as `.bpm-widget` (lines 383–439):
```css
/* ── Phase 6: Scale Selector ─────────────────────────────────────────── */

/* Scale selector — two compact <select> elements in a flex row */
.scale-selector {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.scale-selector select {
  height: 28px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  padding: 0 var(--space-1);
  cursor: pointer;
}

.scale-selector select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent);
}
```

---

## Shared Patterns

### Direct `audioCtx` check (NOT `getAudioContext()`)
**Source:** `src/engine/audioEngine.ts` lines 323–325 (`updateVoiceColor`), lines 506–507 (`unsubscribePlayback`)
**Apply to:** `scaleStore.subscribe` callback in `initAudioEngine`
```typescript
const ctx = audioCtx  // Direct module-level null check — do NOT use getAudioContext()
if (!ctx) return
```

### Vanilla Zustand store shape
**Source:** `src/store/playbackStore.ts` lines 34–45
**Apply to:** `src/store/scaleStore.ts` — identical structure, different state fields
```typescript
export const storeInstance = createStore<StateInterface>()((set) => ({
  // defaults,
  // setters with clamping/validation,
}))
export const useHookName = <T>(selector: (state: StateInterface) => T): T =>
  useStore(storeInstance, selector)
```

### Store read from component via selector hook
**Source:** `src/components/PlaybackControls.tsx` lines 8–11
**Apply to:** `src/components/ScaleSelector.tsx`
```typescript
const value = useHookName((s) => s.field)
```

### Store write from event handler via `getState()`
**Source:** `src/components/PlaybackControls.tsx` line 19
**Apply to:** `src/components/ScaleSelector.tsx` onChange handlers
```typescript
storeInstance.getState().setterName(value)
```

### setTimeout teardown pattern
**Source:** `src/engine/audioEngine.ts` lines 477–490 (removal) and 441–460 (type-change)
**Apply to:** Both teardown sites when adding `panner.disconnect()`
```typescript
setTimeout(() => {
  try { voice.oscillator.stop() } catch { /* already stopped */ }
  // ... stop other nodes ...
  voice.gainNode.disconnect()
  // ADD: voice.panner.disconnect()
  voices.delete(id)
}, 60)
```

### Test file header comment convention
**Source:** All test files — comment block at top declares requirement IDs covered
```typescript
// src/store/scaleStore.test.ts
// Covers: PLAY-05 (scale quantization), PLAY-06 (chromatic mode), scaleStore defaults
```

---

## No Analog Found

All files have close analogs in the codebase. No new patterns without precedent.

---

## Metadata

**Analog search scope:** `src/store/`, `src/engine/`, `src/components/`, `src/styles/`
**Files scanned:** 8 (playbackStore.ts, playbackStore.test.ts, PlaybackControls.tsx, PlaybackControls.test.tsx, audioEngine.ts, audioEngine.test.ts, App.tsx, index.css)
**Pattern extraction date:** 2026-04-22
