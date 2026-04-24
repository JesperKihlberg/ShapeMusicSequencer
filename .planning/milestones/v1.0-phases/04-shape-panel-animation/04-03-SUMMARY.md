---
phase: "04-shape-panel-animation"
plan: "03"
subsystem: "audio-engine"
tags: [audioEngine, lfo, web-audio, animation, tdd, wave-2]
dependency_graph:
  requires:
    - "04-01 (Wave 1 — Shape interface with size/animRate fields)"
  provides:
    - "AudioVoice with lfoOscillator, lfoGain, dcOffset fields"
    - "createLfo() helper — ConstantSourceNode DC offset + OscillatorNode LFO topology"
    - "updateVoiceColor(shapeId, color) — exported glitch-free color param update"
    - "updateVoiceSize(shapeId, size) — exported glitch-free gain update"
    - "recreateLfo(shapeId, animRate) — internal LFO destroy+recreate"
    - "initAudioEngine subscription extended with prevShapes Map and change detection"
  affects:
    - "04-04 (Wave 3 — CellPanel sliders trigger these update functions via store subscription)"
tech_stack:
  added: []
  patterns:
    - "ConstantSourceNode DC offset topology: gainNode.gain.value=0; dcOffset.offset provides base gain; lfoGain provides ±40% LFO swing — both additive on gainNode.gain AudioParam"
    - "setTargetAtTime(τ=0.015s) for all live AudioParam updates — glitch-free transitions"
    - "recreateLfo: destroy+recreate pattern for animRate changes (D-14) — simpler than hot-swap reconnect"
    - "prevShapes Map<string, Shape> change detection in store subscription — detects color/size/animRate/type diffs"
    - "Type change: ramp-out gainNode.gain then 60ms setTimeout destroy+recreate full voice (D-08)"
key_files:
  created: []
  modified:
    - src/engine/audioEngine.ts
decisions:
  - "ConstantSourceNode for DC offset: keeps gainNode.gain.value=0 so updateVoiceSize can target dcOffset.offset.setTargetAtTime without competing with LFO automation (RESEARCH.md Pitfall 1)"
  - "createLfo() helper extracted before createVoice: called on both blob and standard paths to wire identical LFO topology regardless of waveform type"
  - "recreateLfo reads baseGain from voice.dcOffset.offset.value at time of rate change — reflects current automated value including any in-flight ramps"
  - "Type change detection in subscription uses shape.type !== prev.type with ramp-out+setTimeout pattern — consistent with existing Phase 3 voice lifecycle"
  - "updateVoiceColor guards with instanceof OscillatorNode before setting frequency — blob uses AudioBufferSourceNode which has no frequency AudioParam"
metrics:
  duration: "3 min"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 1
---

# Phase 04 Plan 03: Wave 2 Audio Engine Summary

audioEngine extended with LFO per voice (ConstantSourceNode DC offset + OscillatorNode LFO topology), exported updateVoiceColor/updateVoiceSize functions, internal recreateLfo, and prevShapes Map change detection in the store subscription.

## What Was Built

### Task 1: Extend AudioVoice interface and createVoice with LFO topology

**src/engine/audioEngine.ts** — five targeted changes:

1. **AudioVoice interface**: Added three required fields — `lfoOscillator: OscillatorNode`, `lfoGain: GainNode`, `dcOffset: ConstantSourceNode`. All voices now carry LFO nodes from creation.

2. **createLfo() helper** (new function before createVoice): Builds the ConstantSourceNode + OscillatorNode topology for one voice's `gainNode.gain` AudioParam:
   - Sets `gainNode.gain.value = 0` (all gain comes from additive sources)
   - Creates `dcOffset = ctx.createConstantSource()` — ramps 0 → `baseGain` in 10ms for click-free ramp-in
   - Creates `lfoOscillator` (sine, `shape.animRate` Hz) → `lfoGain` (gain = `baseGain * 0.4`) → `gainNode.gain`
   - Both `dcOffset.start()` and `lfoOscillator.start()` called — ConstantSourceNode requires explicit start (Pitfall 6)
   - `baseGain = (shape.size / 100) * 0.8` — size=50 → 0.4, matching the Phase 3 hardcoded ramp target

3. **createVoice() refactored**: Old `gainNode.gain.setValueAtTime(0); gainNode.gain.linearRampToValueAtTime(0.4)` ramp-in replaced with `createLfo(ctx, gainNode, shape)` call. Both blob and standard oscillator paths call `createLfo` and store the returned `{ lfoOscillator, lfoGain, dcOffset }` in the voices Map.

4. **setTimeout cleanup updated**: LFO nodes stopped and disconnected in the 60ms ramp-out setTimeout block (before `voice.gainNode.disconnect()`).

5. **destroy() cleanup updated**: LFO oscillator and dcOffset stopped in the `voices.forEach` cleanup loop.

### Task 2: Add updateVoiceColor, updateVoiceSize, recreateLfo, and extended subscription

**src/engine/audioEngine.ts** — four additions:

1. **`updateVoiceColor(shapeId, color)` (exported)**: Guards against missing voice/ctx. Updates frequency via `setTargetAtTime(τ=0.015s)` on OscillatorNode only (instanceof guard for blob). Updates filter cutoff via `setTargetAtTime`. Direct-assigns `waveshaper.curve = makeDistortionCurve(color.s)` — WaveShaperNode.curve is not an AudioParam (Pitfall 2).

2. **`updateVoiceSize(shapeId, size)` (exported)**: Guards against missing voice/ctx. Computes `newBase = (size / 100) * 0.8`. Updates `voice.dcOffset.offset.setTargetAtTime(newBase, ...)` and `voice.lfoGain.gain.setTargetAtTime(newBase * 0.4, ...)` to maintain ±40% modulation depth at new size level.

3. **`recreateLfo(shapeId, animRate)` (internal)**: Stops old LFO oscillator and disconnects lfoGain/lfoOscillator. Reads current `baseGain` from `voice.dcOffset.offset.value`. Creates new OscillatorNode at new `animRate`, wires through new lfoGain to `voice.gainNode.gain`, starts it. Updates `voice.lfoOscillator` and `voice.lfoGain` in-place.

4. **initAudioEngine subscription extended**: Replaced `prevShapeIds: Set<string>` with `prevShapes: Map<string, Shape>`. Subscription now runs three loops:
   - Additions loop (unchanged logic, now tracks in `prevShapes`)
   - Change detection loop: compares each current shape against `prevShapes` for color/size/animRate/type diffs; calls appropriate update function or schedules type-change destroy+recreate
   - Removal loop: iterates `prevShapes.keys()` (not `prevShapeIds`) for removed shapes

## Test Results After Wave 2 Audio

| File | Tests | Status |
|------|-------|--------|
| src/engine/audioEngine.test.ts | 19 | 19 pass (2 Phase 4 stubs now fully execute — updateVoiceColor/updateVoiceSize guards pass) |
| src/engine/drawShape.test.ts | 8 | 8 pass |
| src/store/shapeStore.test.ts | 17 | 17 pass |
| src/engine/canvasEngine.test.ts | 8 | 8 pass |
| src/components/CellPanel.test.tsx | 13 | 9 pass, 4 RED (intentional Wave 3 stubs) |
| src/components/HsvSliders.test.tsx | 7 | 7 pass (all skip — Wave 3 pending) |
| src/components/ShapeTypeSelector.test.tsx | 5 | 5 pass (all skip — Wave 3 pending) |

**Total: 89 pass, 4 RED (all intentional Wave 3 stubs). TypeScript: 0 errors.**

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the exact code specified in the plan's `<action>` blocks. The ConstantSourceNode topology and all update functions match the plan specification precisely.

## Known Stubs

No new stubs introduced by this plan. The 4 RED CellPanel tests remain from Wave 0 (intentional — Wave 3 pending). No unintentional stubs.

| Stub | File | Reason |
|------|------|--------|
| CellPanel Phase 4 tests RED | src/components/CellPanel.test.tsx | Wave 3 replaces occupied mode with interactive controls |
| HsvSliders tests skip | src/components/HsvSliders.test.tsx | Wave 3 creates HsvSliders.tsx |
| ShapeTypeSelector tests skip | src/components/ShapeTypeSelector.test.tsx | Wave 3 creates ShapeTypeSelector.tsx |

## Commits

| Hash | Task | Message |
|------|------|---------|
| 14b95fb | Task 1 | feat(04-03): extend AudioVoice with LFO topology — createLfo helper, ConstantSourceNode DC offset |
| ddbb8ee | Task 2 | feat(04-03): add updateVoiceColor, updateVoiceSize, recreateLfo, extended subscription |

## Self-Check: PASSED

- [x] src/engine/audioEngine.ts AudioVoice interface contains `lfoOscillator: OscillatorNode`
- [x] src/engine/audioEngine.ts AudioVoice interface contains `lfoGain: GainNode`
- [x] src/engine/audioEngine.ts AudioVoice interface contains `dcOffset: ConstantSourceNode`
- [x] src/engine/audioEngine.ts contains `function createLfo(`
- [x] src/engine/audioEngine.ts contains `dcOffset.start()`
- [x] src/engine/audioEngine.ts contains `lfoOscillator.start()`
- [x] src/engine/audioEngine.ts contains `lfoGain.connect(gainNode.gain)`
- [x] src/engine/audioEngine.ts does NOT contain `gainNode.gain.linearRampToValueAtTime(0.4`
- [x] src/engine/audioEngine.ts contains `(shape.size / 100) * 0.8`
- [x] src/engine/audioEngine.ts contains `export function updateVoiceColor(`
- [x] src/engine/audioEngine.ts contains `export function updateVoiceSize(`
- [x] src/engine/audioEngine.ts contains `function recreateLfo(`
- [x] src/engine/audioEngine.ts contains `let prevShapes = new Map<string, Shape>()`
- [x] src/engine/audioEngine.ts contains `shape.color.h !== prev.color.h`
- [x] src/engine/audioEngine.ts contains `shape.size !== prev.size`
- [x] src/engine/audioEngine.ts contains `shape.animRate !== prev.animRate`
- [x] src/engine/audioEngine.ts contains `shape.type !== prev.type`
- [x] src/engine/audioEngine.ts contains `voice.waveshaper.curve = makeDistortionCurve(color.s)`
- [x] `npx vitest run src/engine/audioEngine.test.ts` exits 0 — 19/19 pass
- [x] `npx tsc --noEmit` exits 0 — 0 TypeScript errors
- [x] Commits 14b95fb and ddbb8ee exist in git log
