---
phase: 08-beat-clock-and-playhead
fix_date: 2026-04-24T00:00:00Z
review_path: .planning/phases/08-beat-clock-and-playhead/08-REVIEW.md
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
iteration: 1
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-04-24
**Source review:** `.planning/phases/08-beat-clock-and-playhead/08-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Beat clock never resets — playhead jumps mid-loop after Stop/Play

**Files modified:** `src/engine/beatClock.ts`, `src/engine/canvasEngine.ts`, `src/engine/audioEngine.ts`
**Commit:** `1361aeb`
**Applied fix:**
- Added `_startTimeMs` module variable and `markPlaybackStart()` export to `beatClock.ts`. Updated `getCurrentBeat` to subtract `_startTimeMs` so beat 0 always corresponds to the most recent Play press.
- In `canvasEngine.ts`: added `markPlaybackStart` to the import, called it in the playback subscriber when `isPlaying` becomes true. Also replaced the inline `frozenBeatPos` formula with `getCurrentBeat(bpm)` to avoid future formula drift (closes IN-01 as a side-effect).
- In `audioEngine.ts`: added `markPlaybackStart` to the import, called it immediately before `ctx.resume()` in the playback subscriber's `isPlaying` branch.

---

### WR-02: `updateVoiceColor` overwrites blob bandpass filter frequency with lightness-derived cutoff

**Files modified:** `src/engine/audioEngine.ts`
**Commit:** `1361aeb`
**Applied fix:** Wrapped the `voice.filter.frequency.setTargetAtTime(lightnessToFilterCutoff(...))` call in `updateVoiceColor` with a `if (!voice.noiseSource)` guard. Blob voices set `noiseSource` at creation time; all other voice types leave it undefined, so only non-blob voices have their filter cutoff driven by lightness curves.

---

### WR-03: `handleDragHandleDoubleClick` expands to 180px but `PANEL_DEFAULT` is 188px

**Files modified:** `src/components/AnimationPanel.tsx`
**Commit:** `e4b7763`
**Applied fix:** Replaced the hardcoded `180` with `PANEL_DEFAULT` in `handleDragHandleDoubleClick`, establishing a single source of truth. Updated the inline comment from `"180px"` to `"PANEL_DEFAULT"` to match.

---

### WR-04: RAF loop passes `null` for `selectedIdx`, losing control-point highlight during playback

**Files modified:** `src/components/AnimationPanel.tsx`
**Commit:** `1a1b96f`
**Applied fix:**
- Added `selectedPoints` state (`Partial<Record<AnimatableProperty, number | null>>`) to `AnimationPanel`.
- Updated the RAF tick to pass `selectedPoints[prop] ?? null` instead of `null` to `drawLaneCanvas`.
- Extended `AnimLaneProps` with `selectedPointIdx: number | null` and `onSelectedPointChange: (idx: number | null) => void`.
- Removed local `useState<number | null>` from `AnimLane`; replaced all `setSelectedPointIdx` calls (`handleCanvasPointerDown` hit branch, empty-canvas branch, `handleCanvasDoubleClick`) with `onSelectedPointChange`.
- Passed the new props in the `AnimLane` render call inside `AnimationPanel`.

---

_Fixed: 2026-04-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
