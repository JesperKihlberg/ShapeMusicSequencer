---
phase: "05-playback-controls"
plan: "01"
subsystem: "store"
tags: ["zustand", "playback", "beat-fraction", "type-migration"]
dependency_graph:
  requires: ["05-00"]
  provides: ["playbackStore", "BeatFraction", "computeLfoHz", "Shape.animRate:BeatFraction"]
  affects: ["src/engine/audioEngine.ts", "src/engine/canvasEngine.ts", "src/components/CellPanel.tsx"]
tech_stack:
  added: []
  patterns: ["vanilla Zustand createStore", "BeatFraction numeric denominator union type"]
key_files:
  created:
    - src/store/playbackStore.ts
  modified:
    - src/store/shapeStore.ts
decisions:
  - "BeatFraction stored as numeric denominator (1|2|4|8|16) — clean formula (bpm/60)*(1/fraction), no string parsing"
  - "Default animRate migrated to 2 (half note) to preserve ~1 Hz oscillation at 120 BPM (matches old 1.0 Hz default)"
  - "Import uses `type BeatFraction` (type-only import) to avoid circular dependency risk"
metrics:
  duration: "5 min"
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_changed: 2
---

# Phase 5 Plan 01: Playback Store Foundation Summary

**One-liner:** Vanilla Zustand `playbackStore` with `isPlaying/bpm/volume` state and `BeatFraction` type migration for `Shape.animRate` from raw Hz to beat-fraction denominator.

## What Was Built

### Task 1: Create playbackStore (TDD)

Created `src/store/playbackStore.ts` following the exact `selectionStore.ts` vanilla Zustand pattern:

- `BeatFraction = 1 | 2 | 4 | 8 | 16` — numeric denominator union type (D-07)
- `computeLfoHz(fraction, bpm)` — pure function: `(bpm / 60) * (1 / fraction)` (D-06)
- `PlaybackState` interface with `isPlaying`, `bpm`, `volume` fields + setters
- `playbackStore` — vanilla `createStore` singleton (required for non-React engine subscriptions)
- `usePlaybackStore` — React hook wrapper following `useSelectionStore` pattern
- BPM clamped: `Math.round(Math.max(60, Math.min(180, v)))` (D-08, T-05-01-01)
- Volume clamped: `Math.max(0, Math.min(1, v))` (T-05-01-02)
- Defaults: `isPlaying: true`, `bpm: 120`, `volume: 0.8` (D-14)

### Task 2: Migrate Shape.animRate to BeatFraction

Three targeted changes to `src/store/shapeStore.ts`:

1. Added `import { type BeatFraction } from './playbackStore'`
2. Changed `Shape.animRate: number` to `Shape.animRate: BeatFraction`
3. Changed `addShape` default from `animRate: 1.0` to `animRate: 2` (half note, ≈ 1 Hz at 120 BPM)

## Test Results

| File | Tests | Status |
|------|-------|--------|
| `src/store/playbackStore.test.ts` | 12 passed | GREEN |
| `src/store/shapeStore.test.ts` | 17 passed | GREEN |

TypeScript: `npx tsc --noEmit` — no errors.

Pre-existing failures (out of scope): `src/components/CellPanel.test.tsx` has 2 Wave 0 stub tests for beat-fraction buttons that don't yet exist in `CellPanel.tsx` — these were failing before Plan 01 and remain for Plan 03/04 to address.

## Deviations from Plan

None — plan executed exactly as written.

The plan listed "10 tests" for playbackStore but the test file (pre-created in Wave 0) actually contains 12 tests. All 12 pass.

## Threat Mitigations Applied

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-05-01-01: Tampering via setBpm | `Math.round(Math.max(60, Math.min(180, v)))` | Tests: setBpm clamps to 60/180, rounds 100.7→101 |
| T-05-01-02: Tampering via setVolume | `Math.max(0, Math.min(1, v))` | Tests: setVolume clamps to 0/-0.1→0, 1.1→1 |

## Known Stubs

None — no stubs in this plan. `playbackStore` is fully functional data layer; engines and UI consuming it are addressed in subsequent plans.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `62cd621` | feat(05-01): create playbackStore with BeatFraction type and computeLfoHz |
| Task 2 | `76f1ed3` | feat(05-01): migrate Shape.animRate from number to BeatFraction in shapeStore |

## Self-Check: PASSED

- `src/store/playbackStore.ts` — EXISTS
- `src/store/shapeStore.ts` — EXISTS (modified)
- Commit `62cd621` — VERIFIED
- Commit `76f1ed3` — VERIFIED
- All 29 store tests pass — VERIFIED
- TypeScript clean — VERIFIED
