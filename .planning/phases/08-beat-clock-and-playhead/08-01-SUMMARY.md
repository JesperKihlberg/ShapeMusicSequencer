---
phase: 8
plan: "08-01"
subsystem: engine
tags: [beat-clock, refactor, pure-function, tdd, anim-15]
dependency_graph:
  requires: []
  provides: [beatClock.ts]
  affects: [canvasEngine.ts, audioEngine.ts]
tech_stack:
  added: []
  patterns: [pure-function-extraction, tdd-red-green]
key_files:
  created:
    - src/engine/beatClock.ts
    - src/engine/beatClock.test.ts
  modified:
    - src/engine/canvasEngine.ts
    - src/engine/audioEngine.ts
decisions:
  - "D-01 (user-specified): getCurrentBeat(bpm) uses performance.now() / 1000 * bpm / 60 — exact signature preserved"
  - "frozenBeatPos capture in canvasEngine.playbackStore.subscribe left unchanged — it is intentionally inline (stop-instant capture pattern)"
metrics:
  duration: "5 minutes"
  completed: "2026-04-24T12:54:50Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 8 Plan 01: Beat Clock — Extract formula to beatClock.ts Summary

Pure function `getCurrentBeat(bpm)` extracted from both engine files into a single canonical module, eliminating formula duplication and satisfying ANIM-15.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Write failing tests for getCurrentBeat | 56182d2 | src/engine/beatClock.test.ts |
| 1 (GREEN) | Create src/engine/beatClock.ts | 4f0864d | src/engine/beatClock.ts |
| 2 | Refactor canvasEngine and audioEngine | fc9a0ef | src/engine/canvasEngine.ts, src/engine/audioEngine.ts |

## What Was Built

- `src/engine/beatClock.ts`: New pure module with single export `getCurrentBeat(bpm: number): number`. No imports, no module state, no AudioContext dependency. O(1) arithmetic per call.
- `src/engine/beatClock.test.ts`: 5 vitest tests covering t=0 (all BPMs return 0), three concrete BPM/time combinations (120@1s=2.0, 60@1s=1.0, 180@500ms=1.5), and pure-function idempotency.
- `canvasEngine.ts`: Import added at line 15; `drawShapes` inline formula replaced at line 161. The `frozenBeatPos` capture at line 255 was intentionally left as-is (stop-instant pattern, unrelated to live beat computation).
- `audioEngine.ts`: Import added at line 11; setInterval inline formula replaced at line 471.

## Verification Results

- `npx tsc --noEmit`: zero errors
- `grep performance.now canvasEngine.ts`: one match only (frozenBeatPos line 255 — expected)
- `grep performance.now audioEngine.ts`: no matches
- `grep getCurrentBeat canvasEngine.ts audioEngine.ts`: both import and both call sites present
- All 5 beatClock tests pass; all 178 pre-existing passing tests continue to pass

## Deviations from Plan

None — plan executed exactly as written.

Note: 2 pre-existing CellPanel test failures (`CellPanel.test.tsx` lines 115/117) confirmed present before this plan's changes via `git stash` verification. Out of scope per deviation rules (not caused by this plan's changes).

## Known Stubs

None — beatClock.ts is a complete, fully-wired implementation.

## Threat Flags

No new security-relevant surface introduced. beatClock.ts is a pure arithmetic function with no inputs from untrusted sources.

## TDD Gate Compliance

- RED gate: commit 56182d2 `test(08-01): add failing tests for getCurrentBeat` — confirmed failing before implementation
- GREEN gate: commit 4f0864d `feat(08-01): create beatClock.ts` — all 5 tests pass

## Self-Check: PASSED

Files confirmed present:
- src/engine/beatClock.ts: FOUND
- src/engine/beatClock.test.ts: FOUND

Commits confirmed:
- 56182d2: FOUND
- 4f0864d: FOUND
- fc9a0ef: FOUND
