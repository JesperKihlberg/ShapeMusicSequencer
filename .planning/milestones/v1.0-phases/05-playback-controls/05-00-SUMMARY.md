---
phase: 05-playback-controls
plan: "00"
subsystem: test-infrastructure
tags: [tdd, wave-0, red-baseline, playback, beat-fraction]
dependency_graph:
  requires: []
  provides:
    - src/store/playbackStore.test.ts
    - src/components/PlaybackControls.test.tsx
  affects:
    - src/store/shapeStore.test.ts
    - src/components/CellPanel.test.tsx
tech_stack:
  added: []
  patterns:
    - Vitest TDD RED baseline scaffold
    - createStore vanilla Zustand test reset pattern (setState in beforeEach)
key_files:
  created:
    - src/store/playbackStore.test.ts
    - src/components/PlaybackControls.test.tsx
  modified:
    - src/store/shapeStore.test.ts
    - src/components/CellPanel.test.tsx
decisions:
  - animRate default test updated from 1.0 to 2 (BeatFraction denominator per D-06/A3)
  - updateShape animRate test updated to use valid BeatFraction value 4 (not arbitrary float 5.0)
  - CellPanel animation rate test converted from queryByLabelText Hz slider to queryByRole group for beat-fraction selector
metrics:
  duration: "2 min"
  completed: "2026-04-17"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 05 Plan 00: Test Scaffold (Wave 0) Summary

**One-liner:** Failing test infrastructure for playbackStore (isPlaying/BPM/volume), PlaybackControls component, and animRate BeatFraction migration — RED baseline for Wave 1–3 implementations.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Scaffold playbackStore test file (RED) | 8bbcfda | src/store/playbackStore.test.ts (created) |
| 2 | Scaffold PlaybackControls test + update existing tests (RED) | abd0041 | src/components/PlaybackControls.test.tsx (created), src/store/shapeStore.test.ts (modified), src/components/CellPanel.test.tsx (modified) |

## What Was Built

### New Test Files

**`src/store/playbackStore.test.ts`** — 10 tests in 4 describe blocks:
- `playbackStore — defaults`: isPlaying=true, bpm=120, volume=0.8 (D-14)
- `playbackStore — setIsPlaying (PLAY-01)`: toggle false/true
- `playbackStore — setBpm (PLAY-02)`: set 120, clamp below 60, clamp above 180, round to integer
- `playbackStore — setVolume (PLAY-03)`: set 0.5, clamp below 0, clamp above 1

All 10 tests fail with module-not-found error — `playbackStore.ts` does not exist yet.

**`src/components/PlaybackControls.test.tsx`** — 7 tests in 3 describe blocks:
- `PlaybackControls — Start/Stop button (PLAY-01)`: renders "Stop" when playing, "Start" when stopped, click toggles state
- `PlaybackControls — BPM widget (PLAY-02)`: Decrease BPM / Increase BPM aria-labels, click − decrements by 1, click + increments by 1
- `PlaybackControls — Volume slider (PLAY-03)`: renders input with aria-label "Master volume"

All 7 tests fail with module-not-found error — `PlaybackControls.tsx` does not exist yet.

### Updated Test Files

**`src/store/shapeStore.test.ts`** — 2 changes:
- `animRate` default test: description updated, assertion changed from `toBe(1.0)` → `toBe(2)` (BeatFraction denominator per D-06)
- `updateShape animRate` test: value changed from `5.0` to `4` (valid BeatFraction; 5.0 is not a valid denominator in the union 1|2|4|8|16)

Failing with: `Expected: 2, Received: 1` — store not yet updated.

**`src/components/CellPanel.test.tsx`** — 2 changes:
- Existing animation rate test: `queryByLabelText(/Animation rate/)` → `queryByRole('group', { name: /Animation rate/i })` (beat-fraction selector group, not Hz slider)
- New test added: verifies 5 beat-fraction buttons exist with labels `1/1`, `1/4`, `1/16`

Failing with: group query returns null — CellPanel still uses Hz slider.

## Verification Results

```
Test Files: 4 failed | 7 passed (11 total)
Tests: 3 failing | 91 passing (94 total)
```

- `src/store/playbackStore.test.ts` — FAIL (module not found) ✓ RED
- `src/components/PlaybackControls.test.tsx` — FAIL (module not found) ✓ RED
- `src/store/shapeStore.test.ts` — FAIL (animRate default: expected 2, got 1) ✓ RED
- `src/components/CellPanel.test.tsx` — FAIL (beat-fraction group not found) ✓ RED
- All 7 pre-existing test files — PASS ✓ No regressions

## Deviations from Plan

None — plan executed exactly as written.

The only minor addition beyond the explicit plan action was also updating the `updateShape patches animRate` test (changing `5.0` → `4`) to use a valid `BeatFraction` value. The plan mentioned this change explicitly in Step B.

## Known Stubs

None. This plan creates test infrastructure only — no production code, no stubs.

## Threat Flags

None. Wave 0 is test-only. No production behavior, no new network endpoints, no auth paths, no attack surface introduced.

## Self-Check: PASSED

- [x] `src/store/playbackStore.test.ts` exists — FOUND
- [x] `src/components/PlaybackControls.test.tsx` exists — FOUND
- [x] `src/store/shapeStore.test.ts` updated with `toBe(2)` — FOUND
- [x] `src/components/CellPanel.test.tsx` updated with `queryByRole('group', ...)` — FOUND
- [x] Commit 8bbcfda exists — FOUND
- [x] Commit abd0041 exists — FOUND
