# Phase 5: Playback Controls - Research

**Researched:** 2026-04-17
**Domain:** Zustand vanilla store, Web Audio API suspend/resume, React transport controls, BPM-synced LFO
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stop uses `ctx.suspend()` — AudioContext fully suspended. Resume uses `ctx.resume()`.
- **D-02:** Canvas RAF continues but `pulseScale` is fixed at 1.0 when `isPlaying` is false. No snap-to-base-size pass needed.
- **D-03:** Single toggle button: "Start" when stopped, "Stop" when playing.
- **D-04:** `sequencerActor` transitions between `idle` and `playing` states. `playbackStore.isPlaying` mirrors machine state and drives React re-renders.
- **D-05:** No moving visual playhead in Phase 5. BPM drives shape LFO rates only.
- **D-06:** `animRate` becomes a beat-fraction selector: `1/1`, `1/2`, `1/4`, `1/8`, `1/16`. LFO Hz = `(bpm / 60) * fraction`.
- **D-07:** `animRate` field on `Shape` changes type from raw Hz number to a beat-fraction enum or index.
- **D-08:** BPM range: 60–180, default 120. Integer values only.
- **D-09:** Controls live in the existing `<header class="toolbar">` in `App.tsx`.
- **D-10:** Order: `Title | [flex spacer] | BPM control | Volume slider | Start/Stop button`
- **D-11:** Volume: `<input type="range">` (0–1, step 0.01). Maps to `masterGain.gain.value`.
- **D-12:** BPM: `<input type="number">` with +/− buttons. Range 60–180.
- **D-13:** `animRate` selector: segmented button group (preferred) or `<select>` showing `1/1 | 1/2 | 1/4 | 1/8 | 1/16`.
- **D-14:** `playbackStore` (Zustand vanilla `createStore`): `{ isPlaying: boolean, bpm: number, volume: number }`. Defaults: `isPlaying: true`, `bpm: 120`, `volume: 0.8`.
- **D-15:** `audioEngine.ts` subscribes to `playbackStore` for `isPlaying` and `volume`; computes LFO Hz using `playbackStore.bpm`.
- **D-16:** `canvasEngine.ts` subscribes to `playbackStore.isPlaying`; when false, `pulseScale = 1.0`.

### Claude's Discretion

- Exact CSS styling of the BPM +/− button group in the toolbar
- Whether `animRate` is stored as a fraction string (`"1/4"`) or a numeric denominator (`4`)
- Whether `sequencerActor` PLAY/STOP transitions are wired to `playbackStore` mutations, or `playbackStore` is the source of truth
- Exact `setTargetAtTime` time constants for volume slider changes

### Deferred Ideas (OUT OF SCOPE)

- Moving visual playhead cursor
- BPM tap tempo button
- Playback position indicator (measure:beat counter)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | User can start and stop all audio playback | `ctx.suspend()`/`ctx.resume()` pattern verified in existing `audioEngine.ts`; `playbackStore.isPlaying` boolean drives both audio and canvas |
| PLAY-02 | BPM/tempo is configurable via UI control | `playbackStore.bpm` drives LFO Hz formula; BPM widget in toolbar confirmed; `animRate` type migration from Hz to beat-fraction |
| PLAY-03 | Master volume control is available | `masterGain` GainNode already exists at `audioEngine.ts:113`; volume slider maps 0–1 to `masterGain.gain.setTargetAtTime` |
</phase_requirements>

---

## Summary

Phase 5 adds transport controls (start/stop), BPM control, and master volume to the existing toolbar. All implementation uses patterns already established in the codebase — no new libraries, no new architectural patterns. The work is primarily four things: (1) creating `playbackStore`, (2) wiring audio engine subscriptions to it, (3) wiring canvas engine to gate animation, and (4) migrating the `Shape.animRate` field from a raw Hz value to a beat-fraction type.

The biggest risk is the `animRate` type migration: `Shape.animRate` currently stores a raw Hz float (`number`); Phase 5 changes its semantics to a beat-fraction index. Every place that reads `shape.animRate` must be updated — canvas engine pulse formula, audio engine LFO creation, `recreateLfo`, `createLfo`, `CellPanel`, and `shapeStore` defaults. Tests covering `animRate` will also need updates.

The second risk area is state integration sequencing: `playbackStore` must be created before `audioEngine.ts` subscribes to it, and `audioEngine.ts` must guard against `audioCtx` being null when the subscription fires on first load (already handled by the lazy `getAudioContext()` guard).

**Primary recommendation:** Create `playbackStore` first (clean foundation), then wire audio engine subscriptions, then canvas engine gate, then toolbar UI, then the `animRate` migration last (most surface area, but isolated to data type change + formula update).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | `playbackStore` vanilla store | Already used for `shapeStore` and `selectionStore`; `createStore` from `zustand/vanilla` is the project pattern [VERIFIED: package.json] |
| React | ^19.2.4 | Toolbar UI components | Project stack; all UI is React [VERIFIED: package.json] |
| Web Audio API | Browser built-in | `ctx.suspend()`/`ctx.resume()`, `masterGain.gain.setTargetAtTime` | Already the audio engine foundation; no Tone.js [VERIFIED: audioEngine.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @xstate/react | ^6.1.0 | Optional: wire `sequencerActor` PLAY/STOP | Use only if D-04 requires machine transitions; playbackStore can be the sole source of truth [VERIFIED: package.json] |
| TypeScript | ~6.0.2 | Beat-fraction type definition | Defining `BeatFraction` type/enum for `animRate` migration [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand vanilla createStore | Zustand React create() | `create()` cannot be subscribed from outside React; canvas engine requires vanilla store — use createStore [VERIFIED: selectionStore.ts comments] |
| ctx.suspend()/resume() | Stopping/restarting all oscillators | Suspend/resume preserves all node state and is glitch-free; recreating voices on play is heavyweight and loses timing sync |
| setTargetAtTime for volume | Direct gain.value assignment | Direct assignment can cause audio clicks; setTargetAtTime ramps smoothly [VERIFIED: audioEngine.ts updateVoiceColor pattern] |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New files follow existing locations:

```
src/
├── store/
│   ├── playbackStore.ts       # NEW — vanilla Zustand store (mirrors selectionStore.ts pattern)
│   └── selectionStore.ts      # REFERENCE pattern
├── engine/
│   ├── audioEngine.ts         # MODIFY — add playbackStore subscriptions, update LFO Hz formula
│   └── canvasEngine.ts        # MODIFY — add playbackStore subscription for pulseScale gate
├── components/
│   ├── PlaybackControls.tsx   # NEW — toolbar control group (BPM widget + Volume + Start/Stop)
│   └── CellPanel.tsx          # MODIFY — replace animRate Hz slider with beat-fraction selector
└── App.tsx                    # MODIFY — mount <PlaybackControls /> in toolbar
```

### Pattern 1: Vanilla Zustand Store (playbackStore)

**What:** `createStore` from `zustand/vanilla` with a `usePlaybackStore` React hook wrapper.
**When to use:** Any state that must be subscribed from outside React (audio engine, canvas engine).

**Example — exact pattern from selectionStore.ts:**
```typescript
// Source: src/store/selectionStore.ts [VERIFIED: codebase]
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export interface PlaybackState {
  isPlaying: boolean
  bpm: number
  volume: number
  setIsPlaying: (v: boolean) => void
  setBpm: (v: number) => void
  setVolume: (v: number) => void
}

export const playbackStore = createStore<PlaybackState>()((set) => ({
  isPlaying: true,   // D-14: defaults to true — preserves current auto-start behavior
  bpm: 120,          // D-08
  volume: 0.8,       // D-14
  setIsPlaying: (v) => set({ isPlaying: v }),
  setBpm: (v) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
}))

export const usePlaybackStore = <T>(selector: (state: PlaybackState) => T): T =>
  useStore(playbackStore, selector)
```

### Pattern 2: Audio Engine Subscription to playbackStore

**What:** `audioEngine.ts` adds a `playbackStore.subscribe()` call inside `initAudioEngine()`.
**When to use:** Any time a store change must drive Web Audio API parameter updates.

```typescript
// Source: pattern derived from existing audioEngine.ts shapeStore.subscribe [VERIFIED: audioEngine.ts:349]
// Add inside initAudioEngine() after the shapeStore subscription:

let prevIsPlaying = playbackStore.getState().isPlaying
let prevVolume = playbackStore.getState().volume

const unsubscribePlayback = playbackStore.subscribe((state) => {
  const ctx = audioCtx  // Do NOT call getAudioContext() here — avoids auto-creating ctx on subscribe
  if (!ctx) return

  // isPlaying changed → suspend or resume
  if (state.isPlaying !== prevIsPlaying) {
    prevIsPlaying = state.isPlaying
    if (state.isPlaying) {
      void ctx.resume()
    } else {
      void ctx.suspend()
    }
  }

  // volume changed → ramp masterGain
  if (state.volume !== prevVolume) {
    prevVolume = state.volume
    if (masterGain) {
      masterGain.gain.setTargetAtTime(state.volume * 0.15, ctx.currentTime, 0.05)
      // τ=0.05 for smoother volume fade (vs τ=0.015 for snappy parameter changes)
    }
  }
})
```

**Critical guard:** Use `audioCtx` directly (module-level null check), not `getAudioContext()`. The subscribe callback fires whenever `playbackStore` changes — if `audioCtx` is null, the user has not yet placed a shape. Calling `getAudioContext()` here would create an AudioContext outside a user gesture, which browsers may block.

### Pattern 3: Canvas Engine isPlaying Gate

**What:** Canvas engine subscribes to `playbackStore` and gates `pulseScale` calculation.
**When to use:** Freezing animation when playback is stopped.

```typescript
// Source: derived from canvasEngine.ts existing subscribe pattern [VERIFIED: canvasEngine.ts:181]
// Current formula in drawShapes():
const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t)

// Phase 5 replacement:
const isPlaying = playbackStore.getState().isPlaying  // read synchronously in RAF loop
const lfoHz = computeLfoHz(shape.animRate, playbackStore.getState().bpm)
const pulseScale = isPlaying
  ? 1 + 0.4 * Math.sin(2 * Math.PI * lfoHz * t)
  : 1.0  // D-02/D-16: frozen at base size when stopped

// Add to subscribe block at end of initCanvasEngine():
const unsubscribePlayback = playbackStore.subscribe(() => { dirty = true })
// Return unsubscribePlayback() in destroy()
```

**Note:** The canvas engine already reads stores synchronously in the RAF loop (`shapeStore.getState()`, `selectionStore.getState()`). Reading `playbackStore.getState()` in `drawShapes()` follows the same pattern — no hook, no React.

### Pattern 4: Beat-Fraction Type for animRate

**What:** `Shape.animRate` changes from `number` (Hz) to a beat-fraction type.
**Decision pending (Claude's discretion):** Store as numeric denominator (`number`) or string key (`"1/4"`).

**Recommended: numeric denominator** — clean formula, TypeScript union type, no string parsing:

```typescript
// Recommended implementation [ASSUMED — Claude's discretion per D-13]
export type BeatFraction = 1 | 2 | 4 | 8 | 16  // denominator of 1/N
// Default: 4 (quarter note = 1/4 beat) → at 120 BPM: 2 Hz (matches current default 1.0 Hz closely enough)

// LFO Hz formula (D-06):
export function computeLfoHz(fraction: BeatFraction, bpm: number): number {
  return (bpm / 60) * (1 / fraction)
}
// Examples: bpm=120, fraction=4 → (120/60) * 0.25 = 0.5 Hz
// Examples: bpm=120, fraction=2 → (120/60) * 0.5  = 1.0 Hz  ← closest to current default 1.0 Hz
```

**Alternative: string key** (`"1/4"`) — human-readable labels match button text directly, but requires parsing for formula.

**Display labels** (for segmented buttons and aria-labels per UI-SPEC):
| Denominator | Button label | aria-label |
|-------------|-------------|------------|
| 1 | `1/1` | "One bar" |
| 2 | `1/2` | "Half note" |
| 4 | `1/4` | "Quarter note" |
| 8 | `1/8` | "Eighth note" |
| 16 | `1/16` | "Sixteenth note" |

### Pattern 5: animRate Migration — All Touch Points

The `animRate` type change from `number` to `BeatFraction` has a specific set of touch points. Every one must be updated:

| File | Location | Change |
|------|----------|--------|
| `src/store/shapeStore.ts` | `Shape.animRate` field type | `number` → `BeatFraction` |
| `src/store/shapeStore.ts` | `addShape` default | `animRate: 1.0` → `animRate: 2` (1/2 note ≈ 1 Hz at 120 BPM) |
| `src/engine/canvasEngine.ts` | `drawShapes` pulseScale formula | `shape.animRate` → `computeLfoHz(shape.animRate, bpm)` |
| `src/engine/audioEngine.ts` | `createLfo` | `shape.animRate` → `computeLfoHz(shape.animRate, bpm)` |
| `src/engine/audioEngine.ts` | `recreateLfo` signature | `animRate: number` → `animRate: BeatFraction` + bpm param |
| `src/engine/audioEngine.ts` | `initAudioEngine` change detection | `shape.animRate !== prev.animRate` still valid (value comparison works for number union) |
| `src/components/CellPanel.tsx` | Animation Rate control | Replace Hz range slider with beat-fraction segmented buttons |
| `src/store/shapeStore.test.ts` | animRate default test | `expect(shape?.animRate).toBe(1.0)` → `expect(shape?.animRate).toBe(2)` |

### Anti-Patterns to Avoid

- **Calling `getAudioContext()` inside `playbackStore.subscribe()`**: This creates an AudioContext outside a user gesture. Instead, read `audioCtx` directly (the module-level nullable reference). If null, the user has not interacted yet — do nothing.
- **Storing `isPlaying` only in XState machine**: The machine state is synchronous snapshot-based; React toolbar must re-render on play state changes. Use `playbackStore.isPlaying` as the single source of truth for React. The machine can mirror it but is not required to.
- **Making `playbackStore` use `create()` instead of `createStore()`**: The audio engine and canvas engine subscribe outside React. `createStore` from `zustand/vanilla` is mandatory.
- **Hiding the spinner buttons on BPM input with `display:none` instead of CSS appearance reset**: The native spinner arrows must be hidden via `-webkit-appearance: none; -moz-appearance: textfield` so the custom +/− buttons are the only increment controls (UI-SPEC Pitfall 1).
- **Reading `playbackStore` in the `shapeStore.subscribe()` callback in `audioEngine.ts`**: The LFO frequency is `computeLfoHz(shape.animRate, playbackStore.getState().bpm)`. The `shapeStore` callback already fires on `animRate` changes — call `playbackStore.getState().bpm` inside `recreateLfo` to get current BPM.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth volume transitions | Direct `gain.value = v` | `gain.setTargetAtTime(v * 0.15, ctx.currentTime, 0.05)` | Direct assignment causes audible click artifacts at audio rate; setTargetAtTime is glitch-free exponential ramp [VERIFIED: audioEngine.ts updateVoiceColor pattern] |
| BPM input validation | Custom keypress filter | `min`/`max` attributes on `<input type="number">` + `onBlur` snap | Native number input handles arrows, range; only need to snap out-of-range on blur |
| Beat-fraction display labels | Computed fraction strings | Hardcoded array: `[1, 2, 4, 8, 16]` with label map `{1: '1/1', 2: '1/2', ...}` | The set is fixed — 5 values, never changes; computed label strings add fragility |
| AudioContext state management | Tracking suspended/running manually | `ctx.state === 'suspended'` / `ctx.state === 'running'` native property | AudioContext exposes `.state` natively; no need to shadow it |

**Key insight:** The Web Audio API `suspend()`/`resume()` design was built exactly for transport controls. Using it properly (suspend when stopped, resume when playing) preserves all oscillator phases and timing — no voice restart, no pitch transients.

---

## Common Pitfalls

### Pitfall 1: Creating AudioContext Outside User Gesture

**What goes wrong:** Browser throws `DOMException: The AudioContext was not allowed to start. It must be resumed after a user gesture on the page.`
**Why it happens:** `playbackStore.subscribe()` fires immediately when `playbackStore` is initialized (before any user interaction). If the subscribe callback calls `getAudioContext()`, it triggers lazy AudioContext creation outside the gesture boundary.
**How to avoid:** In the audio engine's playback subscription, guard with `if (!audioCtx) return` — only act on ctx.suspend()/resume() if `audioCtx` already exists (i.e., user has already placed at least one shape).
**Warning signs:** Chrome console warning "The AudioContext was not allowed to start" on page load.

### Pitfall 2: animRate Unit Mismatch After Migration

**What goes wrong:** Canvas engine or audio engine uses the raw `shape.animRate` value (now a denominator integer like `4`) directly in the `sin()` formula, producing wrong oscillation rates (4 Hz instead of 0.5 Hz).
**Why it happens:** `drawShapes` has `const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * shape.animRate * t)` — if not updated, `shape.animRate = 4` (quarter note denominator) produces 4 Hz oscillation, not the BPM-computed value.
**How to avoid:** The `computeLfoHz(fraction, bpm)` helper function must be called anywhere `shape.animRate` was previously used directly as a frequency. Search for `shape.animRate` and `animRate` across all engine files.
**Warning signs:** Shapes oscillate at 1×, 2×, 4×, 8×, 16× Hz regardless of BPM setting.

### Pitfall 3: playbackStore Subscription Leak on Cleanup

**What goes wrong:** `initAudioEngine()` returns a `destroy()` function. If `unsubscribePlayback` is not included in the cleanup, the playback subscription leaks in React StrictMode (double-invoke creates two subscriptions).
**Why it happens:** The existing `destroy()` only calls `unsubscribeShape = shapeStore.subscribe(...)` cleanup. Phase 5 adds a second subscription that must also be unsubscribed.
**How to avoid:** Add `unsubscribePlayback()` to the `destroy()` closure in `initAudioEngine()`. Same pattern as `unsubscribeShape`. Similarly for `canvasEngine.ts`.
**Warning signs:** Multiple volume/suspend calls per state change; React StrictMode test failures.

### Pitfall 4: isPlaying Defaults to true — Button Shows "Stop" on First Paint

**What goes wrong:** Developer treats the initial "Stop" button label as a bug and tries to initialize `isPlaying: false`.
**Why it happens:** `playbackStore.isPlaying` defaults to `true` (D-14) to preserve existing auto-start behavior — placing a shape immediately starts audio. The button correctly shows "Stop" on first paint.
**How to avoid:** This is intentional. Do not change the default. The UI-SPEC explicitly calls it out (UI-SPEC Pitfall 2).
**Warning signs:** "Start" button on first paint with shapes already playing audio.

### Pitfall 5: BPM Input Native Spinner Arrows Visible

**What goes wrong:** `<input type="number" />` in the toolbar shows native browser increment arrows, conflicting with the custom +/− buttons.
**Why it happens:** Default `<input type="number">` renders a spinner widget in Chrome/Safari.
**How to avoid:** Add to `.bpm-widget__input` CSS: `-webkit-appearance: none; -moz-appearance: textfield`. This removes the native spinner while preserving keyboard arrow-key behavior.
**Warning signs:** Two sets of increment controls visible in Chrome; layout overflow in toolbar.

### Pitfall 6: Volume Slider Range vs masterGain Headroom

**What goes wrong:** Setting `masterGain.gain.value = volume` (0–1) with 16 voices causes severe clipping and distortion at full volume.
**Why it happens:** 16 voices each producing signal up to 1.0 amplitude would sum to 16.0 at `ctx.destination` — well above the 1.0 ceiling, causing digital clipping.
**How to avoid:** The existing `masterGain.gain.value = 0.15` establishes headroom for 16 voices. Phase 5 must map the 0–1 slider to `masterGain.gain = volume * 0.15` (or keep slider range 0–0.15 directly). Claude's discretion on exact formula, but the 0.15 headroom ceiling must be preserved.
**Warning signs:** Loud clipping/distortion at full volume with multiple shapes placed.

### Pitfall 7: recreateLfo Now Needs bpm Parameter

**What goes wrong:** `recreateLfo(shapeId, animRate)` currently receives `animRate` as a raw Hz value. After the migration, `animRate` is a `BeatFraction` integer — calling `newLfoOsc.frequency.value = animRate` would set the LFO to 4 Hz instead of the BPM-computed value.
**Why it happens:** `recreateLfo` in `audioEngine.ts` at line ~316 directly assigns `animRate` to `lfoOscillator.frequency.value`. After the type change, this must become `computeLfoHz(animRate, bpm)`.
**How to avoid:** Update `recreateLfo` signature to accept `bpm: number` parameter and compute Hz internally. When calling `recreateLfo` from `initAudioEngine`, pass `playbackStore.getState().bpm`. Also: when BPM changes while shapes are playing, all live LFOs must have their frequency updated — add a BPM-change handler in the playback subscription that calls `recreateLfo` for every active voice.

---

## Code Examples

Verified patterns from existing codebase:

### playbackStore Creation (from selectionStore.ts pattern)

```typescript
// Source: src/store/selectionStore.ts [VERIFIED: codebase]
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

// Pattern: createStore (not create) — required for non-React engine subscriptions
export const playbackStore = createStore<PlaybackState>()((set) => ({
  isPlaying: true,
  bpm: 120,
  volume: 0.8,
  setIsPlaying: (v: boolean) => set({ isPlaying: v }),
  setBpm: (v: number) => set({ bpm: Math.round(Math.max(60, Math.min(180, v))) }),
  setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
}))

export const usePlaybackStore = <T>(selector: (state: PlaybackState) => T): T =>
  useStore(playbackStore, selector)
```

### Audio Engine suspend/resume Guard

```typescript
// Source: pattern from audioEngine.ts getAudioContext() [VERIFIED: audioEngine.ts:108]
// Correct guard — do NOT call getAudioContext() in subscribe callback
const unsubscribePlayback = playbackStore.subscribe((state) => {
  if (!audioCtx) return  // No ctx yet — first user interaction hasn't happened
  if (state.isPlaying) {
    void audioCtx.resume()
  } else {
    void audioCtx.suspend()
  }
  if (masterGain) {
    masterGain.gain.setTargetAtTime(state.volume * 0.15, audioCtx.currentTime, 0.05)
  }
})
```

### Volume Ramp Pattern

```typescript
// Source: τ pattern from audioEngine.ts updateVoiceColor [VERIFIED: audioEngine.ts:287]
// τ=0.015 for snappy; τ=0.05 for smooth fade (volume slider)
masterGain.gain.setTargetAtTime(
  newVolume * 0.15,   // scale factor preserves 16-voice headroom
  ctx.currentTime,
  0.05               // smooth enough for slider drag
)
```

### BPM Update Triggers LFO Rebuild

```typescript
// Source: pattern from audioEngine.ts recreateLfo [VERIFIED: audioEngine.ts:316]
// When BPM changes, all live voices need updated LFO frequencies
// Add to playbackStore subscription in audioEngine:
if (state.bpm !== prevBpm) {
  prevBpm = state.bpm
  for (const [shapeId, voice] of voices) {
    const shape = shapeStore.getState().shapes.find(s => s.id === shapeId)
    if (shape && audioCtx) {
      // Update LFO frequency in-place (can setValueAtTime on running oscillator)
      const newHz = computeLfoHz(shape.animRate, state.bpm)
      voice.lfoOscillator.frequency.setTargetAtTime(newHz, audioCtx.currentTime, 0.015)
    }
  }
}
```

**Important:** Unlike `recreateLfo` (which destroys and rebuilds the oscillator), a BPM change only updates frequency on existing LFOs — `OscillatorNode.frequency` is an AudioParam and supports `setTargetAtTime`. This is simpler than full rebuild and avoids glitches.

### Beat-Fraction Segmented Buttons (CellPanel)

```typescript
// Source: pattern derived from ShapeTypeSelector.tsx type-selector__btn--active [VERIFIED: styles/index.css]
const FRACTIONS: { value: BeatFraction; label: string; ariaLabel: string }[] = [
  { value: 1,  label: '1/1',  ariaLabel: 'One bar' },
  { value: 2,  label: '1/2',  ariaLabel: 'Half note' },
  { value: 4,  label: '1/4',  ariaLabel: 'Quarter note' },
  { value: 8,  label: '1/8',  ariaLabel: 'Eighth note' },
  { value: 16, label: '1/16', ariaLabel: 'Sixteenth note' },
]

// Computed Hz readout (D-06 formula):
const lfoHz = (bpm / 60) * (1 / shape.animRate)  // shape.animRate is BeatFraction denominator
```

### Start/Stop Button (App.tsx or PlaybackControls.tsx)

```typescript
// Source: derived from existing btn patterns in styles/index.css + UI-SPEC [VERIFIED: 05-UI-SPEC.md]
function handleTogglePlayback(): void {
  playbackStore.getState().setIsPlaying(!playbackStore.getState().isPlaying)
}

// In JSX:
<button
  className={`btn btn--start-stop`}
  aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
  aria-pressed={isPlaying}
  onClick={handleTogglePlayback}
>
  {isPlaying ? 'Stop' : 'Start'}
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `shape.animRate` = raw Hz number (0.1–10) | `shape.animRate` = BeatFraction denominator (1, 2, 4, 8, 16) | Phase 5 | All formula consumers must use `computeLfoHz(fraction, bpm)` |
| animRate Hz range slider in CellPanel | Beat-fraction segmented buttons (1/1, 1/2, 1/4, 1/8, 1/16) | Phase 5 | UI-SPEC defines exact structure; replaces `slider-anim-rate` block |
| Audio auto-starts, no transport control | `playbackStore.isPlaying` toggle via ctx.suspend/resume | Phase 5 | PLAY-01 implemented |

**Deprecated/outdated:**
- `shape.animRate` as a raw Hz float: no longer valid after Phase 5 migration. The field semantics change.
- The `slider-anim-rate` range input in `CellPanel.tsx`: replaced by beat-fraction segmented buttons.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Beat-fraction stored as numeric denominator (`BeatFraction = 1 \| 2 \| 4 \| 8 \| 16`) — Claude's discretion | Architecture Patterns, Pattern 4 | If string is chosen instead, the `computeLfoHz` formula changes but the type migration surface area is the same |
| A2 | BPM change updates live LFO frequencies via `setTargetAtTime` (no full rebuild) — inferred from Web Audio API capability | Code Examples, BPM Update section | If `setTargetAtTime` on LFO oscillator causes audible pitch artifact (unlikely), fall back to full `recreateLfo` |
| A3 | Default `animRate` migrated to denominator `2` (1/2 note = 1.0 Hz at 120 BPM) to match current default of 1.0 Hz | Architecture Patterns, Pattern 5 | If `4` (quarter note = 0.5 Hz at 120 BPM) is chosen, the default audio character changes slightly |
| A4 | `PlaybackControls` extracted to its own component file rather than inlined in `App.tsx` | Architecture Patterns, Recommended Structure | Inline in App.tsx is also valid given the small scope; either works |

---

## Open Questions

1. **BPM change: `setTargetAtTime` vs full LFO rebuild**
   - What we know: `OscillatorNode.frequency` is an AudioParam supporting scheduled changes; `recreateLfo` does a full stop-disconnect-rebuild.
   - What's unclear: Whether updating a running LFO's frequency produces a phase discontinuity (audible as a click).
   - Recommendation: Use `setTargetAtTime` with τ=0.015 for BPM changes. If phase discontinuity is audible in practice, fall back to `recreateLfo`. The risk is low — LFO frequency changes are slow (sub-10 Hz range) and τ=0.015s smooths the transition.

2. **sequencerActor PLAY/STOP wiring**
   - What we know: `sequencerMachine.ts` has `idle` and `playing` state stubs with no transitions wired. `playbackStore.isPlaying` will be the source of truth.
   - What's unclear: Whether `sequencerActor` needs to be kept in sync (send PLAY/STOP events when `playbackStore` changes) or can remain as-is (stubs unused until a future phase).
   - Recommendation: Keep `sequencerActor` as a stub — it is not read by anything in Phase 5. Wiring it adds complexity with no current benefit. Leave the `idle`/`playing` states in place for Phase 6+ use. `playbackStore.isPlaying` is the single source of truth in Phase 5.

---

## Environment Availability

Step 2.6: No new external dependencies required. All tooling is already installed (Node.js, npm, Vite, Vitest, React). No environment audit needed beyond confirming the test suite passes.

Current test suite: 9 files, 93 tests, all passing. [VERIFIED: `npm test` run 2026-04-17]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (inline `test:` block) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | `playbackStore.setIsPlaying(false)` calls `ctx.suspend()` | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| PLAY-01 | `playbackStore.setIsPlaying(true)` calls `ctx.resume()` | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| PLAY-01 | `playbackStore` isPlaying toggle updates store state | unit | `npm test` | ❌ Wave 0 |
| PLAY-01 | Canvas engine gates pulseScale to 1.0 when isPlaying=false | unit | `npm test` | ❌ Wave 0 |
| PLAY-01 | Start/Stop button renders "Start" when stopped | component | `npm test` | ❌ Wave 0 |
| PLAY-01 | Start/Stop button renders "Stop" when playing | component | `npm test` | ❌ Wave 0 |
| PLAY-01 | Start/Stop button click toggles isPlaying | component | `npm test` | ❌ Wave 0 |
| PLAY-02 | `playbackStore.setBpm` clamps to 60–180 | unit | `npm test` | ❌ Wave 0 |
| PLAY-02 | `computeLfoHz(4, 120)` returns 0.5 | unit | `npm test` | ❌ Wave 0 |
| PLAY-02 | `computeLfoHz(2, 120)` returns 1.0 | unit | `npm test` | ❌ Wave 0 |
| PLAY-02 | BPM widget +/− buttons increment/decrement with clamping | component | `npm test` | ❌ Wave 0 |
| PLAY-02 | Beat-fraction selector shows 5 buttons in CellPanel | component | `npm test` | ❌ Wave 0 |
| PLAY-02 | Selecting beat-fraction updates shape.animRate | component | `npm test` | ❌ Wave 0 |
| PLAY-03 | `playbackStore.setVolume` clamps to 0–1 | unit | `npm test` | ❌ Wave 0 |
| PLAY-03 | Volume slider renders with default 0.8 value | component | `npm test` | ❌ Wave 0 |

**Existing test coverage preserved:** The existing `shapeStore.test.ts` test `expect(shape?.animRate).toBe(1.0)` will fail after the animRate type migration — this test must be updated in Wave 0.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/store/playbackStore.test.ts` — covers PLAY-01 (isPlaying toggle), PLAY-02 (BPM clamping), PLAY-03 (volume clamping)
- [ ] `src/engine/audioEngine.test.ts` — extend with `computeLfoHz` unit tests covering PLAY-02
- [ ] `src/components/PlaybackControls.test.tsx` — covers Start/Stop button states, BPM widget interactions, volume slider default value
- [ ] `src/components/CellPanel.test.tsx` — update existing animation rate test: replace `queryByLabelText(/Animation rate/)` Hz slider assertion with beat-fraction selector assertions; update `animRate` default assertion from `1.0` to `2`
- [ ] `src/store/shapeStore.test.ts` — update line: `expect(shape?.animRate).toBe(1.0)` → `expect(shape?.animRate).toBe(2)` (default beat-fraction denominator)

---

## Security Domain

This phase implements no authentication, user input that reaches external services, cryptographic operations, or access control. The only user inputs are: a number input (BPM, clamped 60–180 in code), a range slider (volume, clamped 0–1 in code), and a toggle button. All state is client-only. No ASVS categories apply to Phase 5.

---

## Sources

### Primary (HIGH confidence)
- `src/store/selectionStore.ts` — exact `createStore` + `useStore` vanilla Zustand pattern [VERIFIED: codebase]
- `src/engine/audioEngine.ts` — `masterGain` at line 113, `setTargetAtTime` pattern at lines 287–308, `recreateLfo` at lines 316–342, `initAudioEngine` subscription structure at lines 349–461 [VERIFIED: codebase]
- `src/engine/canvasEngine.ts` — RAF loop, subscribe pattern, `drawShapes` pulseScale formula at line 124 [VERIFIED: codebase]
- `src/store/shapeStore.ts` — `Shape.animRate` field at line 26, `addShape` default at line 52 [VERIFIED: codebase]
- `src/components/CellPanel.tsx` — animRate slider block at lines 99–122 [VERIFIED: codebase]
- `src/styles/index.css` — complete token system, `.type-selector__btn--active` pattern [VERIFIED: codebase]
- `.planning/phases/05-playback-controls/05-CONTEXT.md` — all locked decisions D-01 through D-16 [VERIFIED: codebase]
- `.planning/phases/05-playback-controls/05-UI-SPEC.md` — component inventory, CSS class specs, interaction spec [VERIFIED: codebase]
- `package.json` — all library versions [VERIFIED: codebase]
- `vitest.setup.ts` — jsdom mock strategy [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- Web Audio API spec: `AudioContext.suspend()` returns a Promise; safe to `void` the return value per established pattern in `getAudioContext()` [ASSUMED — consistent with existing `void audioCtx.resume()` usage at audioEngine.ts:117]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions verified in package.json
- Architecture: HIGH — all patterns directly derived from existing codebase; no new architectural concepts
- Pitfalls: HIGH — pitfalls identified from direct code reading of integration points (audioEngine.ts, canvasEngine.ts)
- animRate migration surface area: HIGH — all touch points identified by reading every file that references `animRate`

**Research date:** 2026-04-17
**Valid until:** Stable — project stack is locked, no external dependencies change
