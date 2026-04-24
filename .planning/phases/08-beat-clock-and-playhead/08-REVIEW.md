---
phase: 08-beat-clock-and-playhead
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/engine/beatClock.ts
  - src/engine/beatClock.test.ts
  - src/engine/canvasEngine.ts
  - src/engine/audioEngine.ts
  - src/components/AnimationPanel.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase introduces `beatClock.ts` as the single source of truth for beat position, wires it into both engines and the animation panel, and adds a frozen-beat mechanism to hold the last canvas position when playback stops. The implementation is largely sound and the test coverage for the pure beat function is correct.

Four warnings were found. The most significant is a beat-clock continuity gap: `getCurrentBeat` is always relative to `performance.now()` (wall time since page load) with no playback-start offset, so after a Stop/Play cycle the playhead jumps to a mid-loop position instead of restarting at beat 0. A second warning covers `updateVoiceColor` corrupting the bandpass filter on blob voices when lightness curves are active. Two additional warnings cover a magic-number mismatch in the panel resize and missing selected-point highlighting during playback. Three info items flag minor duplication and a stale TODO.

---

## Warnings

### WR-01: Beat clock never resets — playhead jumps mid-loop after Stop/Play

**File:** `src/engine/beatClock.ts:5`, `src/engine/audioEngine.ts:471`, `src/components/AnimationPanel.tsx:71`

**Issue:** `getCurrentBeat(bpm)` computes `(performance.now() / 1000) * (bpm / 60)`. `performance.now()` is the time elapsed since page load and is never reset. After the user stops playback and then resumes, the beat position continues from wherever `performance.now()` left off instead of restarting at beat 0. At 120 BPM with a 4-beat loop, stopping for just 2 seconds causes the playhead to resume 4 beats later, landing at a different loop phase — animations do not restart from the beginning of their curves.

The canvas engine works around this for the frozen-display case but does not address the post-resume position. The audio curve evaluator (`setInterval` at audioEngine.ts:465) and the AnimationPanel RAF loop both read the raw beat directly.

**Fix:** Store a `playbackStartTime` (a `performance.now()` snapshot) whenever `isPlaying` transitions from false to true. Use it as an offset in `getCurrentBeat`:

```ts
// beatClock.ts
let _startTimeMs = 0

export function markPlaybackStart(): void {
  _startTimeMs = performance.now()
}

export function getCurrentBeat(bpm: number): number {
  return ((performance.now() - _startTimeMs) / 1000) * (bpm / 60)
}
```

Call `markPlaybackStart()` inside the `canvasEngine` and `audioEngine` playback subscribers whenever `isPlaying` becomes true. The frozen-beat logic in `canvasEngine` can remain unchanged — it already captures the last live beat position at the moment of stopping.

---

### WR-02: `updateVoiceColor` overwrites blob bandpass filter frequency with lightness-derived cutoff

**File:** `src/engine/audioEngine.ts:308`, `src/engine/audioEngine.ts:499`

**Issue:** Blob voices use a bandpass filter whose center frequency is set to the pitch frequency (`filter.frequency.value = freq`, line 239). `updateVoiceColor` (line 308) always runs `voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(color.l), ...)` with no blob guard, overwriting the bandpass center with a lightness-mapped value. This detunes the blob's resonant character whenever color changes (manual or curve-driven).

The curve evaluator at line 499 gates on `voice.oscillator instanceof OscillatorNode`. Because the blob's `oscillator` field is the `sineOsc` (`OscillatorNode`, line 260), this guard does NOT exclude blobs — `updateVoiceColor` is called for blob voices on every animation tick when any color curve is active.

**Fix:** Add a blob-aware guard inside `updateVoiceColor` for the filter update, or expose a voice type flag:

```ts
export function updateVoiceColor(shapeId: string, color: ShapeColor): void {
  const voice = voices.get(shapeId)
  const ctx = audioCtx
  if (!voice || !ctx) return

  if (voice.oscillator instanceof OscillatorNode) {
    voice.oscillator.frequency.setTargetAtTime(
      colorToFrequency(color), ctx.currentTime, 0.015
    )
  }

  // Blob uses a bandpass filter centred on pitch frequency — lightness cutoff does not apply
  if (!voice.noiseSource) {
    voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(color.l), ctx.currentTime, 0.015)
  }

  voice.waveshaper.curve = makeDistortionCurve(color.s)
}
```

Using `voice.noiseSource` as the blob discriminant is safe — it is only set for blob voices (line 260).

---

### WR-03: `handleDragHandleDoubleClick` expands to 180px but `PANEL_DEFAULT` is 188px

**File:** `src/components/AnimationPanel.tsx:126`

**Issue:** The double-click handler restores the panel to a hard-coded `180` px:

```ts
onHeightChange(panelHeight <= PANEL_MIN ? 180 : PANEL_MIN)
```

The module-level constant `PANEL_DEFAULT = 188` (line 14) documents the intended default height (8px handle + 36px header + 144px lanes). The `D-12` reference in the file header also says CellPanel restores to 180px — but the constant contradicts this. Either the constant or the handler is wrong, and the handler skips the constant entirely.

**Fix:** Use the constant so there is a single source of truth:

```ts
onHeightChange(panelHeight <= PANEL_MIN ? PANEL_DEFAULT : PANEL_MIN)
```

If 180px is intentional, update `PANEL_DEFAULT` to `180` and reconcile the comment.

---

### WR-04: RAF loop passes `null` for `selectedIdx`, losing control-point highlight during playback

**File:** `src/components/AnimationPanel.tsx:78`

**Issue:** The parent `AnimationPanel` RAF loop (lines 69–82) calls `drawLaneCanvas` with `null` as `selectedIdx` on every tick. The `AnimLane` sub-component tracks `selectedPointIdx` in local state, but the parent cannot access it via `laneCanvasRefs`. During playback, the selected control point is always rendered at the unselected radius/colour — the visual selection is lost the instant playback starts.

**Fix:** Either lift `selectedPointIdx` state into `AnimationPanel` (keyed by property), or pass the current canvas context down to `AnimLane` and let each lane own its own playhead-update RAF draw, which naturally has access to local `selectedPointIdx`. The simplest lift:

```ts
// In AnimationPanel
const [selectedPoints, setSelectedPoints] = useState<Partial<Record<AnimatableProperty, number | null>>>({})

// Pass to AnimLane
<AnimLane
  ...
  selectedPointIdx={selectedPoints[property] ?? null}
  onSelectedPointChange={(idx) => setSelectedPoints(prev => ({ ...prev, [property]: idx }))}
/>

// In RAF tick
drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedPoints[prop] ?? null, beat)
```

---

## Info

### IN-01: `frozenBeatPos` capture inlines the beat formula instead of calling `getCurrentBeat`

**File:** `src/engine/canvasEngine.ts:255`

**Issue:** The playback subscriber captures the frozen beat with an inline formula:

```ts
frozenBeatPos = (performance.now() / 1000 * bpm) / 60
```

This is mathematically equivalent to `getCurrentBeat(bpm)` but duplicates the formula. If the beat calculation ever changes (e.g., adding a start-time offset per WR-01), this call site will silently diverge.

**Fix:**

```ts
frozenBeatPos = getCurrentBeat(bpm)
```

`getCurrentBeat` is already imported in this file (line 15).

---

### IN-02: `evalCurveAtBeat` is duplicated verbatim between `audioEngine.ts` and `canvasEngine.ts`

**File:** `src/engine/audioEngine.ts:172`, `src/engine/canvasEngine.ts:64`

**Issue:** Both files contain an identical `evalCurveAtBeat` implementation. The comment in `canvasEngine.ts` acknowledges the duplication ("kept separate to avoid cross-engine imports"). This is a reasonable pragmatic choice, but it means any bug fix or behaviour change must be applied in two places.

**Fix (optional):** Extract to a shared utility module (`src/engine/curveUtils.ts`) that neither engine depends on at runtime — it would only contain pure functions. Both engines can import from it without creating an architectural coupling between them.

---

### IN-03: Stale TODO comments for LFO removal remain in `playbackStore.ts`

**File:** `src/store/playbackStore.ts:12-13`

**Issue:** Two TODO comments reference "Phase 7 Wave 2a" and "Phase 7 Wave 3" for removing `BeatFraction` and `computeLfoHz`, items that are now past their due phase. These symbols still exist in the exported API and the comments indicate they should have been removed.

**Fix:** Verify whether `BeatFraction` and `computeLfoHz` are still referenced anywhere in the codebase; if not, remove them along with the TODOs to keep the public store API minimal.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
