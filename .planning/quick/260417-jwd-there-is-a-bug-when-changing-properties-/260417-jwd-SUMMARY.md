---
phase: quick
plan: 260417-jwd
subsystem: audioEngine
tags: [bug-fix, audio, playback, AudioContext]
dependency_graph:
  requires: []
  provides: [correct-stop-behavior-during-property-edits]
  affects: [src/engine/audioEngine.ts]
tech_stack:
  added: []
  patterns: [direct-audioCtx-null-check (no-resume side-effect)]
key_files:
  modified:
    - src/engine/audioEngine.ts
decisions:
  - "updateVoiceColor and updateVoiceSize also fixed (not in original plan scope) — both called getAudioContext() from subscriber path, same resume side-effect"
metrics:
  duration: "~5 min"
  completed: "2026-04-17T12:23:00Z"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260417-jwd Summary

**One-liner:** Fixed four `getAudioContext()` call sites in the shapeStore subscriber path to use direct `audioCtx` reads, preventing unintended AudioContext resume when shape properties are edited while the sequencer is stopped.

## What Was Done

Replaced `getAudioContext()` calls with direct `audioCtx` module-level variable reads in all paths triggered by the shapeStore subscriber. `getAudioContext()` always calls `audioCtx.resume()` when the context is suspended — meaning any shape property edit (color, size, animRate, type) while stopped would immediately restart audio playback.

**Four call sites fixed:**

1. `shapeStore.subscribe` callback top-level — `const ctx = getAudioContext()` → `const ctx = audioCtx`
2. `updateVoiceColor` — `const ctx = getAudioContext()` → `const ctx = audioCtx`
3. `updateVoiceSize` — `const ctx = getAudioContext()` → `const ctx = audioCtx`
4. `setTimeout` recreate path (type change) — added guard `if (audioCtx && audioCtx.state === 'running')` before `createVoice(shapeSnapshot)`

The correct pattern (`const ctx = audioCtx`) was already established in `recreateLfo` and `unsubscribePlayback` handler. All four fixes bring the subscriber path into alignment with that pattern.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix getAudioContext() calls in shapeStore subscriber | 05dfe7f | src/engine/audioEngine.ts |

## Verification

- All 19 existing audioEngine tests pass (`npx vitest run src/engine/audioEngine.test.ts`)
- The shapeStore subscriber no longer calls `getAudioContext()` at its top level
- `updateVoiceColor` and `updateVoiceSize` no longer call `getAudioContext()`
- The type-change recreate path guards against suspended context
- All four fixes use the `audioCtx` module-level variable directly (same pattern as `recreateLfo`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getAudioContext() in updateVoiceColor and updateVoiceSize**
- **Found during:** Task 1 implementation review
- **Issue:** The plan specified fixing only the subscriber top-level `ctx` assignment and the setTimeout recreate path. However, `updateVoiceColor` and `updateVoiceSize` are called directly from within the subscriber for color and size changes, and both internally call `getAudioContext()` — the same resume side-effect. The plan's stated truths require that changing color/size while stopped produces no audio; these functions violated that truth.
- **Fix:** Replaced `getAudioContext()` with `audioCtx` in both functions, matching the `recreateLfo` pattern already established in the codebase.
- **Files modified:** src/engine/audioEngine.ts
- **Commit:** 05dfe7f

## Self-Check: PASSED

- `src/engine/audioEngine.ts` modified and committed at 05dfe7f
- All 19 tests pass
