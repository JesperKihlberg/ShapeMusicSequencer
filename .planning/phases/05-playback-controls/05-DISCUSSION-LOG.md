# Phase 5: Playback Controls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 05-playback-controls
**Areas discussed:** Start/Stop mechanics, BPM + playhead scope, Control strip layout, Control widget style

---

## Start/Stop mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Suspend AudioContext | ctx.suspend() freezes all audio processing — voices, LFOs, everything. Resume with ctx.resume(). | ✓ |
| Ramp master gain to zero | masterGain ramps to 0 — silence but voices keep running internally | |
| Destroy all voices | Stop removes all AudioVoice nodes; resume re-creates them | |

**User's choice:** Suspend AudioContext

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — animate silently | Canvas RAF keeps running; shapes pulse visually even when stopped | |
| No — freeze on stop | Canvas RAF stops updating pulse; shapes freeze at current size | ✓ |

**User's choice:** No — freeze on stop (RAF continues for highlight redraws but pulseScale fixed at 1.0)

| Option | Description | Selected |
|--------|-------------|----------|
| Single toggle button | One button: "Start" when stopped, "Stop" when playing | ✓ |
| Separate Start and Stop buttons | Two buttons, one disabled depending on state | |

**User's choice:** Single toggle button

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze at current pulse size | Shapes render at whatever size when Stop pressed | ✓ |
| Snap to base size (no pulse) | Shapes render at base size with no animation offset | |

**User's choice:** Freeze at current pulse size

---

## BPM + playhead scope

| Option | Description | Selected |
|--------|-------------|----------|
| Store BPM only — no playhead yet | BPM in playbackStore, no visual playhead cursor | ✓ |
| Implement a moving playhead | Horizontal/vertical cursor sweeps the grid at BPM tempo | |

**User's choice:** Store BPM only — no playhead yet

| Option | Description | Selected |
|--------|-------------|----------|
| BPM stored but has no real effect yet | BPM lives in store but nothing consumes it | |
| BPM syncs to shape animation rates | animRate expressed as beat fraction; LFO Hz = bpm/60 * fraction | ✓ |
| BPM drives a click track | Metronome click plays at BPM rate | |

**User's choice:** BPM syncs to shape animation rates

| Option | Description | Selected |
|--------|-------------|----------|
| Beat-fraction multiplier | animRate slider becomes 1/1, 1/2, 1/4, 1/8, 1/16 selector | ✓ |
| Hz slider with global BPM scale | animRate stays in Hz; BPM applies a global multiplier | |
| Global tempo clock + per-shape offsets | Global tick fires at BPM; per-shape animRate = integer subdivisions | |

**User's choice:** Beat-fraction multiplier — animRate becomes a 5-value discrete selector

| Option | Description | Selected |
|--------|-------------|----------|
| 1/1, 1/2, 1/4, 1/8, 1/16 (5 options) | Standard DAW subdivisions | ✓ |
| 1/2, 1/4, 1/8 only (3 options) | Simpler set | |
| Keep as continuous Hz slider | No change to existing slider | |

**User's choice:** 1/1, 1/2, 1/4, 1/8, 1/16

| Option | Description | Selected |
|--------|-------------|----------|
| 60–180 BPM | Standard musical range, default 120 | ✓ |
| 40–240 BPM | Wider range | |
| 60–120 BPM | Narrower | |

**User's choice:** 60–180 BPM, default 120

---

## Control strip layout

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar header | Controls slot into existing `<header class="toolbar">` | ✓ |
| New bottom bar | Dedicated footer strip below canvas area | |
| Canvas area inline | Controls float above/below canvas | |

**User's choice:** Toolbar header (existing)

| Option | Description | Selected |
|--------|-------------|----------|
| Title \| [spacer] \| BPM \| Volume \| Start/Stop | Title left, controls right, Start/Stop far right | ✓ |
| Start/Stop \| BPM \| Volume \| [spacer] \| Title | Transport controls lead | |
| Title \| Start/Stop \| [spacer] \| BPM \| Volume | Start/Stop next to title | |

**User's choice:** Title | [spacer] | BPM | Volume | Start/Stop

---

## Control widget style

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal slider | `<input type="range">` 0–1 mapping to masterGain.gain.value | ✓ |
| Rotary knob (CSS/SVG) | Custom drag target, instrument-like | |
| You decide | Defer to Claude | |

**User's choice:** Horizontal slider for Volume

| Option | Description | Selected |
|--------|-------------|----------|
| Number input with +/− buttons | Shows BPM as number; keyboard-editable; +/− step buttons | ✓ |
| Horizontal slider | Range input 60–180 | |
| You decide | Defer to Claude | |

**User's choice:** Number input with +/− buttons for BPM

| Option | Description | Selected |
|--------|-------------|----------|
| New playbackStore (Zustand vanilla) | Same pattern as shapeStore/selectionStore | ✓ |
| Inside sequencerMachine (XState) | bpm and volume as machine context | |
| React state in App.tsx | Local useState, passed as props | |

**User's choice:** New playbackStore (Zustand vanilla)

---

## Claude's Discretion

- Exact CSS styling of BPM +/− button group in toolbar
- Whether `animRate` is stored as a fraction string (`"1/4"`) or a numeric denominator (`4`)
- Whether `sequencerActor` PLAY/STOP transitions drive `playbackStore` mutations or vice versa
- Exact `setTargetAtTime` time constants for volume changes
- Formula mapping volume slider (0–1) to masterGain actual gain value (preserving polyphony headroom)

## Deferred Ideas

- Moving visual playhead cursor (v2 or Phase 6+)
- BPM tap tempo button
- Playback position indicator (measure:beat counter)
