---
phase: quick-260429-gxf
plan: "01"
subsystem: audio-ui
tags: [bug-fix, clean-mode, shape-type, audio-engine, react-hooks]
dependency_graph:
  requires: []
  provides: [clean-mode-survives-shape-type-change]
  affects: [src/components/CellPanel.tsx]
tech_stack:
  added: []
  patterns: [dual-write ref+state, setTimeout for async engine readiness]
key_files:
  modified:
    - src/components/CellPanel.tsx
decisions:
  - "Use cleanModeRef (useRef) alongside cleanMode (useState) so the 80ms setTimeout callback reads current bypass state without stale closure"
  - "Depend on both shape?.type and shape?.id in the re-apply effect — type-change fires on same id; id-change is harmless because cleanModeRef.current is false after reset"
  - "80ms delay exceeds the engine's 60ms ramp-out/destroy window, ensuring the new AudioVoice exists in the voices map when setVoiceDistortionBypass is called"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-29"
  tasks_completed: 1
  files_changed: 1
---

# Quick Task 260429-gxf Summary

**One-liner:** Re-apply distortion bypass to freshly-recreated AudioVoice when shape type changes while clean mode is active.

## What Was Done

Added a `cleanModeRef` useRef alongside the existing `cleanMode` useState in CellPanel to track the bypass toggle value without stale-closure risk. The ref is kept in sync in `handleCleanToggle` (dual-write pattern) and reset in the existing `shape?.id` effect.

A new useEffect depending on `[shape?.type, shape?.id]` was added. When the shape type changes, the audio engine ramps out and destroys the old AudioVoice over ~60ms, then recreates it. The effect schedules `setVoiceDistortionBypass(id, true, s, l)` at 80ms (after the engine's window) so the new voice receives the bypass flag. The callback reads from `cleanModeRef.current` (not captured state) to ensure it reflects the value at call time rather than at effect-fire time.

## Commits

| Hash | Message |
|------|---------|
| f644661 | feat(quick-260429-gxf): re-apply clean mode bypass after shape type change |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/components/CellPanel.tsx` — modified and committed at f644661
- TypeScript compiles clean (`npx tsc --noEmit` produced no output)
- No unexpected file deletions in commit
