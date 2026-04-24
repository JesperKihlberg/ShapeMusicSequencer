# Phase 5: Playback Controls - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users control the global playback state (start/stop), tempo (BPM), and master output volume through a toolbar control strip. The sequencer machine gains working PLAY/STOP transitions. BPM drives shape animation rates via beat-fraction selection (replacing the raw Hz slider). A `playbackStore` (Zustand vanilla) holds the global playback state.

**Not in scope:** Moving visual playhead cursor (deferred — BPM is stored but playhead rendering is v2), LFO depth slider (ANIM-04, v2), MIDI export, mobile touch.

</domain>

<decisions>
## Implementation Decisions

### Start/Stop Mechanics
- **D-01:** Stop uses `ctx.suspend()` — the AudioContext is fully suspended. All audio processing (voices, LFOs, clocks) freezes immediately. Resume uses `ctx.resume()`.
- **D-02:** Canvas RAF **stops** (or stops updating shape pulse) when playback is stopped. Shapes freeze at their current rendered size (wherever the pulse was when Stop was pressed). No special snap-to-base-size pass needed.
- **D-03:** Single toggle button: reads "Start" when stopped, "Stop" when playing. Standard transport pattern.
- **D-04:** Playback state flows: `sequencerActor` transitions between `idle` and `playing` states (stubs already exist in `sequencerMachine.ts`). The `playbackStore.isPlaying` boolean mirrors machine state and drives React re-renders of the toolbar button label.

### BPM + Animation Rate
- **D-05:** Phase 5 does **not** implement a moving visual playhead cursor. BPM is stored in `playbackStore` and drives shape LFO rates. The playhead visual is deferred.
- **D-06:** BPM **syncs to shape animation rates**: the existing per-shape `animRate` slider (0.1–10 Hz) changes meaning. In Phase 5, `animRate` becomes a **beat-fraction selector** offering 5 discrete values: `1/1`, `1/2`, `1/4`, `1/8`, `1/16`. Actual LFO Hz = `(bpm / 60) * fraction`. Example: 120 BPM + 1/4 note = 2 Hz.
- **D-07:** The `animRate` field on `Shape` changes type from a raw Hz number to a beat-fraction enum or index. Downstream: both canvas engine (pulse formula) and audio engine (LFO frequency) recalculate from `bpm` and `animRate` fraction together.
- **D-08:** BPM range: **60–180**, default **120**. Integer values only.

### Control Strip Layout
- **D-09:** Controls live in the **existing `<header class="toolbar">` in `App.tsx`** — no new layout region needed.
- **D-10:** Order: `Title | [flex spacer] | BPM control | Volume slider | Start/Stop button`
  - BPM and Volume are secondary controls on the right
  - Start/Stop is the far-right primary action

### Control Widget Style
- **D-11:** **Volume**: horizontal `<input type="range">` (0–1, step 0.01). Maps directly to `masterGain.gain.value`. Same range-input style pattern as existing sliders in `HsvSliders`.
- **D-12:** **BPM**: `<input type="number">` with +/− increment buttons. Shows current BPM as a number; keyboard-editable; buttons step by 1 BPM. Range: 60–180.
- **D-13:** **animRate selector in CellPanel**: Replace the existing Hz range slider with a segmented button group or a `<select>` showing `1/1 | 1/2 | 1/4 | 1/8 | 1/16`. Claude's discretion on exact widget (segmented buttons preferred for direct selection).

### State Layer
- **D-14:** New `playbackStore` (Zustand vanilla `createStore`) holds: `{ isPlaying: boolean, bpm: number, volume: number }`. Defaults: `isPlaying: true` (matching current auto-start behavior), `bpm: 120`, `volume: 0.8`.
- **D-15:** `audioEngine.ts` subscribes to `playbackStore` for `isPlaying` (calls `ctx.suspend()`/`ctx.resume()`) and `volume` (sets `masterGain.gain.value`). It also subscribes to `shapeStore` for `animRate` changes (already does) — but now computes LFO Hz using `bpm` from `playbackStore`.
- **D-16:** `canvasEngine.ts` subscribes to `playbackStore.isPlaying` to gate the pulse animation: when `isPlaying` is false, the RAF loop continues (to handle selection highlight redraws) but `pulseScale` is fixed at 1.0 (no oscillation).

### Claude's Discretion
- Exact CSS styling of the BPM +/− button group in the toolbar (size, gap, typography)
- Whether `animRate` is stored as a fraction string (`"1/4"`) or a numeric denominator (`4`) — pick whatever is cleanest for the LFO Hz formula
- Whether `sequencerActor` PLAY/STOP transitions are wired to `playbackStore` mutations, or `playbackStore` is the source of truth and machine state is secondary
- Exact `setTargetAtTime` time constants for volume slider changes (use same pattern as existing gain ramps in audioEngine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture (must preserve)
- `.planning/phases/01-scaffold/01-CONTEXT.md` — D-04 three-layer architecture; vanilla Zustand store pattern; canvas engine subscribes via `.subscribe()`, not React
- `.planning/phases/02-audio-engine/02-CONTEXT.md` — D-09 audio lifecycle; D-10 lazy AudioContext (suspend/resume compatible with lazy init); D-12 singleton; masterGain topology
- `.planning/phases/03-canvas-interaction/03-CONTEXT.md` — D-06 sidebar panel; D-07 canvas highlight via RAF; visibility:hidden pitfall
- `.planning/phases/04-shape-panel-animation/04-CONTEXT.md` — D-09 LFO architecture (ConstantSourceNode + OscillatorNode); D-11 animRate range; D-14 LFO rebuild on animRate change

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 5 covers: PLAY-01, PLAY-02, PLAY-03

### Existing State Machine
- `src/machine/sequencerMachine.ts` — `idle` and `playing` states with `PLAY`/`STOP` events already defined as stubs; Phase 5 wires the transitions

### Existing Audio Engine
- `src/engine/audioEngine.ts` — `masterGain` node at line ~102; `initAudioEngine` subscription loop at line ~349; LFO construction in `createLfo()`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/App.tsx` — Existing `<header class="toolbar">` with title. Phase 5 adds controls to the right side of this header. No new layout regions in `App.tsx` needed.
- `src/engine/audioEngine.ts:102–114` — `masterGain` GainNode already created and connected to `ctx.destination`. A `setMasterVolume(v: number)` function just needs to set `masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02)`.
- `src/machine/sequencerMachine.ts` — `PLAY`/`STOP` events and `idle`/`playing` states are stubs; transitions just need `actions` or `assign` to wire real behavior. Or bypass XState and drive purely from `playbackStore` — Claude's call.
- `src/store/selectionStore.ts` — Exact pattern to copy for `playbackStore`: `createStore` (vanilla), exported singleton, `usePlaybackStore` hook wrapping `useStore`.
- `src/components/HsvSliders.tsx` — Range input CSS and event handling pattern to reuse for Volume slider.

### Established Patterns
- **Vanilla Zustand store** (`createStore` not `create`) — required for non-React subscriptions in canvas/audio engines
- **Singleton exports** — `shapeStore`, `selectionStore`, `sequencerActor` are module-level singletons; `playbackStore` follows this pattern
- **Audio ramp patterns** — `.setTargetAtTime(value, ctx.currentTime, τ)` for glitch-free parameter changes; τ=0.015 for fast ramps, τ=0.05 for smoother fades
- **Dirty-flag RAF loop** — canvas engine subscribes to stores, sets `dirty = true` on changes; Phase 5 adds `playbackStore` as a subscription source

### Integration Points
- `canvasEngine.ts pulseScale formula` — Currently `1 + 0.4 * sin(2π * animRate * t_seconds)`. In Phase 5, `animRate` is a beat fraction and `bpm` comes from `playbackStore`. When `isPlaying` is false, `pulseScale = 1.0`.
- `audioEngine.ts initAudioEngine()` — Add subscription to `playbackStore` for `isPlaying` (suspend/resume ctx) and `volume` (update masterGain). Also update LFO frequency formula to use `playbackStore.bpm`.
- `CellPanel.tsx animRate section` — Replace the Hz range slider with a beat-fraction selector (5 values: 1/1, 1/2, 1/4, 1/8, 1/16).

</code_context>

<specifics>
## Specific Ideas

- **isPlaying defaults to `true`**: Current behavior has audio auto-starting when `initAudioEngine` runs. Phase 5 makes this explicit — `playbackStore` defaults `isPlaying: true` so launch behavior is preserved.
- **Volume default 0.8**: The current `masterGain.gain.value = 0.15` is a headroom setting for 16 voices. Phase 5 sets masterGain to `volume * 0.15` (or similar scale) so the slider range 0–1 maps to 0–0.15 actual gain. Or keep the slider range 0–0.15 directly. Claude's call on the exact formula — just keep headroom for polyphony.
- **Beat fraction selector in CellPanel**: Since the animRate control is already in `CellPanel.tsx`, Phase 5 replaces that slider with a 5-button segmented control (`1/1 | 1/2 | 1/4 | 1/8 | 1/16`). The selected button is highlighted in the same style as the shape type selector buttons.
- **BPM +/− widget**: Standard pattern — `<button>−</button><input type="number"><button>+</button>` in a flex row with a label above or inline. Keyboard arrow keys on the input also increment/decrement.

</specifics>

<deferred>
## Deferred Ideas

- **Moving visual playhead cursor** — BPM-synced horizontal/vertical cursor sweeping the grid. Roadmap success criterion 3 is technically about this. Deferred to v2 or Phase 6+.
- **BPM tap tempo button** — Tap to set BPM from rhythm. Mentioned as a possible addition; out of Phase 5 scope.
- **Playback position indicator** — A "measure:beat" counter in the toolbar. Out of Phase 5 scope.

</deferred>

---

*Phase: 05-playback-controls*
*Context gathered: 2026-04-16*
