---
quick_id: "260424-lcs"
slug: "fix-lightness-curve-sound-mapping"
description: "Fix lightness curve sound mapping: animated lightness must update both oscillator frequency (pitch octave) and filter cutoff, matching static lightness behavior"
date: "2026-04-24"
status: "planned"
---

# Quick Task 260424-lcs: Fix lightness curve sound mapping

## Problem

The static lightness color control correctly updates both:
1. Oscillator frequency (via `colorToFrequency` which uses `lightnessToOctave(color.l)`)
2. Filter cutoff (via `lightnessToFilterCutoff(color.l)`)

But the lightness animation curve only updates the filter cutoff (line 562-564 in audioEngine.ts), NOT the oscillator frequency. This makes the animated lightness sound different from the static lightness.

## Root Cause

`audioEngine.ts` lines 561-565 (curve interval loop):
```ts
if (shapeCurves.lightness) {
  const lightVal = evalCurveAtBeat(shapeCurves.lightness, beatPos)
  voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(lightVal), ctx.currentTime, 0.008)
  // MISSING: also update oscillator frequency with new octave
}
```

The hue curve handler (lines 550-553) correctly calls `updateVoiceColor` which recomputes both frequency and filter. But it uses `{ ...shape.color, h: hueVal }` — with the STATIC lightness. If we add a lightness curve alongside, the hue handler would overwrite the filter with the static lightness value.

## Fix

In the curve interval loop, when a lightness curve is active:
1. Update filter cutoff (already done)
2. Also update oscillator frequency using `colorToFrequency({ ...shape.color, l: lightVal })`

Additionally, when BOTH hue and lightness curves are active, the hue handler should use the ANIMATED lightness (not the static `shape.color.l`). Fix by using the evaluated lightness value when constructing the color passed to `updateVoiceColor`.

## Tasks

### Task 1: Fix lightness curve to also update oscillator frequency

**File:** `src/engine/audioEngine.ts`
**Lines:** 561-565

Change the lightness curve handler to also update the oscillator frequency (pitch octave):

```ts
// 'lightness' curve → modulate filter cutoff AND oscillator frequency (octave)
if (shapeCurves.lightness) {
  const lightVal = evalCurveAtBeat(shapeCurves.lightness, beatPos)
  voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(lightVal), ctx.currentTime, 0.008)
  // Also update oscillator frequency to reflect new octave (matches static lightness behavior)
  if (voice.oscillator instanceof OscillatorNode) {
    const { rootKey, scale } = scaleStore.getState()
    const rawSemitone = hueToSemitone(shape.color.h)
    const quantized = quantizeSemitone(rawSemitone, rootKey, SCALE_INTERVALS[scale])
    const quantizedHue = quantized * 30
    voice.oscillator.frequency.setTargetAtTime(
      colorToFrequency({ ...shape.color, h: quantizedHue, l: lightVal }), ctx.currentTime, 0.008
    )
  }
}
```

### Task 2: Fix hue curve handler to use animated lightness when lightness curve is also active

**File:** `src/engine/audioEngine.ts`
**Lines:** 550-553

When both hue and lightness curves are active, `updateVoiceColor` should use the animated lightness, not the static `shape.color.l`. Since `updateVoiceColor` also sets filter.frequency from color.l, using the static value would overwrite any lightness curve effect on the filter.

Change:
```ts
if (shapeCurves.hue && voice.oscillator instanceof OscillatorNode) {
  const hueVal = evalCurveAtBeat(shapeCurves.hue, beatPos)
  updateVoiceColor(shapeId, { ...shape.color, h: hueVal })
}
```

To:
```ts
if (shapeCurves.hue && voice.oscillator instanceof OscillatorNode) {
  const hueVal = evalCurveAtBeat(shapeCurves.hue, beatPos)
  const effectiveLightness = shapeCurves.lightness
    ? evalCurveAtBeat(shapeCurves.lightness, beatPos)
    : shape.color.l
  updateVoiceColor(shapeId, { ...shape.color, h: hueVal, l: effectiveLightness })
}
```

Note: This means when both hue and lightness curves are active, the lightness curve will set both pitch+filter via the hue handler (calling `updateVoiceColor` with animated l), and the lightness handler below will also set filter+pitch. The second write (lightness handler) will win for pitch, but since both computed the same values, it's harmless duplication.

## must_haves

- Animated lightness changes pitch (oscillator frequency/octave) matching static color behavior
- Animated lightness continues to change filter cutoff
- When hue curve is active alongside lightness curve, filter is not reset to static lightness
- No regression on size, hue, saturation curve behaviors
