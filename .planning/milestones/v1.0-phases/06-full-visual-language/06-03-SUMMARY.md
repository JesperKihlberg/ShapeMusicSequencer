---
phase: 06-full-visual-language
plan: "03"
subsystem: ui-toolbar
tags: [react, zustand, scale-selector, toolbar, css, vitest]

# Dependency graph
requires:
  - phase: 06-full-visual-language
    plan: "01"
    provides: scaleStore, SCALE_INTERVALS, ScaleName, useScaleStore
  - phase: 06-full-visual-language
    plan: "02"
    provides: scaleStore.subscribe in audioEngine — live re-pitch on store change
provides:
  - ScaleSelector React component with Root key and Scale <select> dropdowns
  - PlaybackControls refactored to React fragment (div.toolbar__controls ownership moved to App.tsx)
  - App.tsx toolbar wraps ScaleSelector + PlaybackControls in shared div.toolbar__controls
  - .scale-selector CSS class block in index.css
affects: [human-verify-06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ScaleSelector uses useScaleStore hook for reactive reads; scaleStore.getState().set* for writes"
    - "PlaybackControls renders as React fragment — parent (App.tsx) owns the toolbar__controls wrapper"
    - "Toolbar order enforced in App.tsx JSX: ScaleSelector before PlaybackControls inside div.toolbar__controls"

key-files:
  created:
    - src/components/ScaleSelector.tsx
  modified:
    - src/components/PlaybackControls.tsx
    - src/App.tsx
    - src/styles/index.css

key-decisions:
  - "PlaybackControls root element changed from div.toolbar__controls to React fragment — App.tsx owns the single wrapper so ScaleSelector and PlaybackControls share one flex group"

# Metrics
duration: 5min
completed: 2026-04-23T08:05:00Z
---

# Phase 06 Plan 03: ScaleSelector UI Component — Wave 3 Summary

**ScaleSelector component with Root key (C–B) and Scale (Major–Chromatic) dropdowns wired to scaleStore, toolbar refactored so App.tsx owns the shared div.toolbar__controls wrapper — 55 tests GREEN**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-23T08:00:00Z
- **Completed:** 2026-04-23T08:05:00Z
- **Tasks completed:** 1 of 2 (Task 2 is a human-verify checkpoint — pending)
- **Files modified:** 4

## Accomplishments

### Task 1: ScaleSelector.tsx + PlaybackControls fragment + App.tsx toolbar + CSS

- Created `src/components/ScaleSelector.tsx`:
  - Two `<select>` elements with `aria-label="Root key"` and `aria-label="Scale"`
  - Root key select: 12 options (C through B, index 0–11)
  - Scale select: 7 options (Major, Natural Minor, Pentatonic Major, Pentatonic Minor, Dorian, Mixolydian, Chromatic)
  - `onChange` handlers call `scaleStore.getState().setRootKey()` and `scaleStore.getState().setScale()` directly — no React state, store is source of truth
  - Renders inside `.scale-selector` wrapper div

- Modified `src/components/PlaybackControls.tsx`:
  - Changed root JSX element from `<div className="toolbar__controls">` to `<>` (React fragment)
  - Closing `</div>` changed to `</>`
  - No inner element changes — BPM/Volume/Start-Stop children unchanged

- Modified `src/App.tsx`:
  - Added `import { ScaleSelector } from './components/ScaleSelector'`
  - Replaced bare `<PlaybackControls />` with `<div className="toolbar__controls"><ScaleSelector /><PlaybackControls /></div>`
  - Toolbar order: Title | [spacer via margin-left:auto] | ScaleSelector | PlaybackControls

- Modified `src/styles/index.css`:
  - Appended Phase 6 Scale Selector CSS block after Phase 5 content
  - `.scale-selector` — flex row with gap var(--space-2)
  - `.scale-selector select` — 28px height, tertiary bg, secondary border, accent focus ring
  - `.scale-selector select:focus-visible` — 2px accent box-shadow, no outline

## Task Commits

1. **Task 1: ScaleSelector + PlaybackControls fragment + App.tsx + CSS** — `ba085e0` (feat)

## Files Created/Modified

- `src/components/ScaleSelector.tsx` — Created: full component with both selects, store wiring, ROOT_KEY_LABELS, SCALE_LABELS
- `src/components/PlaybackControls.tsx` — Modified: root element div.toolbar__controls → React fragment
- `src/App.tsx` — Modified: ScaleSelector import added; toolbar JSX extended with div.toolbar__controls wrapper containing ScaleSelector + PlaybackControls
- `src/styles/index.css` — Modified: .scale-selector CSS block appended at end of file

## Pending

### Task 2: Human Verify (checkpoint:human-verify)

This checkpoint has NOT been executed. The orchestrator will handle it.

**What to verify:**
1. Dev server running — open http://localhost:5173
2. Toolbar order (left to right): "Shape Music Sequencer" | spacer | Root key dropdown | Scale dropdown | BPM | Volume | Start/Stop
3. Stereo pan: shapes in col 0 sound left, col 3 sound right (headphones recommended)
4. Scale quantization: placing shapes then switching scale re-pitches all voices in real time
5. Root key change transposes entire composition
6. WaveShaper: saturation 0 = clean, 50 = warm harmonics, 100 = character-rich soft-clip
7. No regressions: BPM, Volume, Start/Stop, shape add/remove

## Deviations from Plan

None — plan executed exactly as written. All 4 files created/modified per spec. 55 tests GREEN (9 ScaleSelector + 46 pre-existing).

## Known Stubs

None — ScaleSelector is fully wired to scaleStore. The scaleStore.subscribe in audioEngine.ts (Wave 2) is already live — changing either dropdown immediately re-pitches all active voices. No placeholder data or TODO stubs.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes.

Threat model mitigations applied:
- T-06-03-01 (Tampering — rootKey): `Number(e.target.value)` passed to `setRootKey` which clamps [0,11] — belt-and-suspenders guard confirmed
- T-06-03-02 (Tampering — scale): `as ScaleName` cast safe because select options are exactly SCALE_INTERVALS keys
- T-06-03-03 (Information Disclosure): rootKey/scale are UI display state, no PII, client-only

## Self-Check: PASSED

- `src/components/ScaleSelector.tsx` exists: FOUND
- `src/components/ScaleSelector.tsx` contains `aria-label="Root key"`: CONFIRMED
- `src/components/ScaleSelector.tsx` contains `aria-label="Scale"`: CONFIRMED
- `src/components/ScaleSelector.tsx` contains `export function ScaleSelector`: CONFIRMED
- `src/components/ScaleSelector.tsx` contains `SCALE_INTERVALS` import: CONFIRMED
- `src/components/PlaybackControls.tsx` does NOT contain `className="toolbar__controls"`: CONFIRMED (root is now `<>`)
- `src/App.tsx` contains `import { ScaleSelector }`: CONFIRMED
- `src/App.tsx` contains `<ScaleSelector />` before `<PlaybackControls />` inside `div.toolbar__controls`: CONFIRMED
- `src/App.tsx` contains `<div className="toolbar__controls">`: CONFIRMED
- `src/styles/index.css` contains `.scale-selector {`: CONFIRMED
- `src/styles/index.css` contains `.scale-selector select {`: CONFIRMED
- `npx vitest run src/components/ScaleSelector.test.tsx`: 9/9 PASSED
- `npx vitest run src/engine/audioEngine.test.ts src/store/scaleStore.test.ts`: 46/46 PASSED (no regressions)
- Commit `ba085e0` exists: CONFIRMED

---
*Phase: 06-full-visual-language*
*Completed: 2026-04-23*
