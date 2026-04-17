---
phase: 05-playback-controls
plan: "04"
subsystem: ui-controls
tags: [playback, toolbar, bpm, volume, beat-fraction, react, css]
dependency_graph:
  requires:
    - 05-01 (playbackStore with BeatFraction, computeLfoHz)
    - 05-02 (audioEngine subscribes to playbackStore)
    - 05-03 (canvasEngine subscribes to playbackStore)
  provides:
    - PlaybackControls React component (BPM widget + volume slider + Start/Stop button)
    - Beat-fraction segmented selector in CellPanel replacing Hz range slider
    - Full toolbar control strip (Title | spacer | BPM | Volume | Start/Stop)
  affects:
    - src/App.tsx (toolbar layout)
    - src/components/CellPanel.tsx (animation rate section)
    - src/styles/index.css (new Phase 5 CSS classes)
tech_stack:
  added: []
  patterns:
    - Beat-fraction segmented button group (role=group, aria-pressed on each button, matches type-selector visual)
    - Toolbar inline control group (display:flex, margin-left:auto pushes to right)
    - BPM number input with custom +/- buttons hiding native spinner arrows
key_files:
  created:
    - src/components/PlaybackControls.tsx
  modified:
    - src/components/CellPanel.tsx
    - src/App.tsx
    - src/styles/index.css
decisions:
  - BPM number input uses -webkit-appearance:none + -moz-appearance:textfield to hide native spin arrows; custom +/- buttons used instead (UI-SPEC Pitfall 1)
  - Start/Stop button label defaults to "Stop" because isPlaying defaults true (D-14 preserved auto-start behavior)
  - beat-selector__btn--active visually mirrors type-selector__btn--active exactly (same border-color + background tokens)
  - computeLfoHz(shape.animRate, bpm) used for Hz readout — live BPM from playbackStore via usePlaybackStore hook
metrics:
  duration: "4 min"
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_modified: 4
---

# Phase 05 Plan 04: PlaybackControls UI + Beat-Fraction Selector Summary

**One-liner:** Toolbar PlaybackControls component with BPM widget, volume slider, and Start/Stop toggle; CellPanel animRate Hz slider replaced with 5 beat-fraction segmented buttons showing computed Hz readout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create PlaybackControls component and add CSS, mount in App.tsx | a085468 | src/components/PlaybackControls.tsx, src/styles/index.css, src/App.tsx |
| 2 | Replace animRate Hz slider in CellPanel with beat-fraction selector | c49bcd9 | src/components/CellPanel.tsx |

## What Was Built

### Task 1: PlaybackControls Component

`src/components/PlaybackControls.tsx` exports a `PlaybackControls` function component that renders three control groups inside `.toolbar__controls`:

1. **BPM Widget** — `<div class="toolbar-control">` with label "BPM" above, then a `.bpm-widget` flex row containing: `−` button (aria-label "Decrease BPM"), `<input type="number">` (aria-label "BPM", 48px wide, no native spinners), `+` button (aria-label "Increase BPM"). Decrement/increment calls `playbackStore.getState().setBpm(bpm ± 1)` — the store clamps 60–180. `onBlur` restores/clamps on empty or out-of-range input.

2. **Volume Slider** — `.toolbar-control` with label "Volume", then `.slider-wrap .toolbar-slider` (80px wide) containing a range input (min=0, max=1, step=0.01, aria-label "Master volume"). onChange calls `setVolume`.

3. **Start/Stop Button** — `.btn.btn--start-stop` with `aria-pressed={isPlaying}` and `aria-label` toggling between "Stop playback" (when playing) and "Start playback" (when stopped). Label text toggles "Stop" / "Start". Defaults to "Stop" because `isPlaying` defaults true (D-14).

All three read from `usePlaybackStore` and write via `playbackStore.getState().*` calls.

`App.tsx` imports `PlaybackControls` and mounts it as the last child of `<header class="toolbar">`. The `.toolbar__controls` wrapper has `margin-left:auto` which pushes the entire group to the right side.

### Task 2: Beat-Fraction Selector in CellPanel

`src/components/CellPanel.tsx` was updated:
- Imports `usePlaybackStore`, `computeLfoHz`, `BeatFraction` from `playbackStore`
- Module-level `FRACTIONS` array defines 5 entries: `{value: 1|2|4|8|16, label: "1/1"|..., ariaLabel: "One bar"|...}`
- `const bpm = usePlaybackStore((s) => s.bpm)` added inside function body
- Animation section: old `<input type="range" id="slider-anim-rate">` (Hz slider) replaced with `<div class="beat-selector" role="group" aria-label="Animation rate">` containing 5 buttons
- Each button: `class="beat-selector__btn [beat-selector__btn--active]"`, `aria-pressed`, `aria-label` from FRACTIONS, `onClick` calls `handleUpdateShape({ animRate: frac.value })`
- Hz readout: `{computeLfoHz(shape.animRate, bpm).toFixed(1)} Hz` — live computation from current BPM

### CSS Added (src/styles/index.css)

New classes in Phase 5 section:
- `.toolbar__controls` — flex row, gap 12px, margin-left:auto
- `.toolbar-control` — flex column, align-items:center, gap 4px
- `.toolbar-control__label` — 11px secondary text
- `.bpm-widget` — flex row, 28px height
- `.bpm-widget__btn` — 20×20px, tertiary bg, hover states
- `.bpm-widget__input` — 48px wide, no native spinner arrows (-webkit-appearance:none, -moz-appearance:textfield, pseudo-element removal)
- `.toolbar-slider` — 80px width modifier for .slider-wrap
- `.btn--start-stop` — inline button (auto width, min 72px, 28px height), state-driven styling via `aria-pressed` attribute selector
- `.beat-selector` — flex row, full width, gap 4px
- `.beat-selector__btn` — flex:1, 28px height, xs text, tertiary bg/border
- `.beat-selector__btn--active` — accent border + 12% accent bg + primary text (matches `.type-selector__btn--active`)

## Test Results

- `npx vitest run src/components/PlaybackControls.test.tsx` — 8/8 passed
- `npx vitest run src/components/CellPanel.test.tsx` — 14/14 passed
- `npx vitest run` (full suite) — 114/114 passed across 11 test files
- `npx tsc --noEmit` — 0 errors

## Deviations from Plan

None — plan executed exactly as written. Both task implementations followed the plan's action blocks precisely with no surprises.

## Known Stubs

None. All data is wired: PlaybackControls reads live store state, beat-fraction buttons call real updateShape, Hz readout computes from real bpm.

## Threat Flags

None. The two new input surfaces (BPM number input, volume slider) are bounded by HTML min/max attributes and store-level clamping as specified in the threat register (T-05-04-01, T-05-04-02). The beat-fraction selector uses hardcoded values only (T-05-04-03 accepted).

## Self-Check: PASSED

Files exist:
- FOUND: src/components/PlaybackControls.tsx
- FOUND: src/components/CellPanel.tsx (modified)
- FOUND: src/App.tsx (modified)
- FOUND: src/styles/index.css (modified)

Commits:
- FOUND: a085468 (feat(05-04): create PlaybackControls component and mount in toolbar)
- FOUND: c49bcd9 (feat(05-04): replace animRate Hz slider in CellPanel with beat-fraction selector)
