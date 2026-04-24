---
quick_id: "260424-lcs"
slug: "fix-lightness-curve-sound-mapping"
status: complete
date: "2026-04-24"
commit: "0f66a4f"
---

# Quick Task 260424-lcs: Fix lightness curve sound mapping

## What was done

Fixed `src/engine/audioEngine.ts` curve interval loop (lines 549-577).

**Root cause:** The lightness animation curve only called `voice.filter.frequency.setTargetAtTime(...)` — updating filter cutoff but NOT oscillator frequency/octave. Static lightness updates both (via `updateVoiceColor` → `colorToFrequency` which uses `lightnessToOctave`). This asymmetry made the animated lightness sound like a filter-only (volumetric) effect rather than the full pitch+filter change users expect from the color control.

**Secondary bug:** The hue curve handler called `updateVoiceColor(shapeId, { ...shape.color, h: hueVal })` — using the static `shape.color.l`. When a lightness curve was also active, every hue tick (16ms) would overwrite the filter with the static lightness value, canceling out the lightness curve's filter effect.

## Changes

- Evaluated `animatedLightness` once per tick (using curve value if lightness curve is active, else static `shape.color.l`)
- Hue curve handler now passes `{ ...shape.color, h: hueVal, l: animatedLightness }` to `updateVoiceColor` — uses animated lightness for both pitch and filter when both curves are active
- Lightness curve handler now updates BOTH `voice.filter.frequency` AND `voice.oscillator.frequency` (pitch octave via `colorToFrequency`)

## Result

Animated lightness now sounds identical to static lightness: sweeping lightness changes both pitch octave (C1-C8) and filter cutoff (100Hz-8kHz), matching the behavior users see in the main color controls.
