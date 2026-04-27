---
phase: 09-timeline-zoom-ghosts-and-lane-focus
verified: 2026-04-27T10:10:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
---

# Phase 9: Timeline Zoom, Ghosts, and Lane Focus — Verification Report

**Phase Goal:** Users can control how much of the timeline is visible and focus individual lanes for detail editing
**Verified:** 2026-04-27T10:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | A zoom control in the animation panel header changes the visible beat span (1–64 beats) and all lanes update simultaneously | VERIFIED | 7 zoom buttons rendered at line 277; `onClick={() => uiStore.getState().setZoomBeats(v)}` at line 286; `zoomBeats` in `[isPlaying, shape, zoomBeats]` useEffect deps at line 174 — stopped-state draw re-runs on zoom change |
| SC2 | When a lane's curve duration is shorter than the zoom span, semi-transparent ghost copies (30% opacity) fill the remaining viewport and cannot be clicked or dragged | VERIFIED | `ctx.globalAlpha = 0.30` at 4 locations (lines 95, 110, 145, 160); `primaryRegionWidth` guards in both `handleCanvasPointerDown` (lines 531–533) and `handleCanvasPointerMove` (lines 558–560) |
| SC3 | Clicking a lane's label column snaps it to 160px tall; all other lanes compress to 40–48px; clicking the focused lane collapses it back — no transition animation | VERIFIED | `.anim-lane--focused { height: 160px }` at CSS line 826; `.anim-lane--compressed { height: 44px; min-height: 44px }` at CSS lines 831–832; no CSS `transition` property; `handleLabelColClick` toggles at line 457 via `setFocusedLane(current === property ? null : property)` |
| SC4 | Only one lane is focused at a time; on first load no lane is focused | VERIFIED | `focusedLane: null` in uiStore default (line 17); `setFocusedLane` is a single-value setter (no multi-lane tracking); `uiStore` is a shared singleton — all AnimLane instances share the same value |

**Score:** 4/4 roadmap success criteria verified

### Plan Must-Have Truths (combined Plan 01 + Plan 02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | uiStore.zoomBeats defaults to 4 on load | VERIFIED | `zoomBeats: 4` at uiStore.ts line 16; uiStore.test.ts passes 14/14 |
| 2 | uiStore.focusedLane defaults to null on load | VERIFIED | `focusedLane: null` at uiStore.ts line 17 |
| 3 | Calling setZoomBeats(8) updates zoomBeats to 8 | VERIFIED | Test passes: `uiStore.getState().setZoomBeats(8); expect(uiStore.getState().zoomBeats).toBe(8)` |
| 4 | Calling setFocusedLane('hue') updates focusedLane to 'hue' | VERIFIED | Test passes |
| 5 | Calling setFocusedLane(null) clears focusedLane | VERIFIED | Test passes |
| 6 | drawLaneCanvas with zoomBeats=8 maps beat positions using 8 as X denominator | VERIFIED | `const xDenominator = zoomBeats ?? curve.duration` at AnimationPanel.tsx line 380; `const px = (p.beat / xDenominator) * w` at line 383 |
| 7 | Playhead X position uses zoomBeats denominator when provided | VERIFIED | `(phBeat % curve.duration) / xDenominator * w` at line 422 |
| 8 | 7 zoom buttons (1 2 4 8 16 32 64) render in the AnimationPanel header left of Add Curve | VERIFIED | `{([1, 2, 4, 8, 16, 32, 64] as const).map(...)` at line 277; zoom-selector div at line 272 precedes the `marginLeft: 'auto'` Add Curve wrapper at line 292 |
| 9 | Active zoom button shows accent border and tinted background; inactive buttons show secondary style | VERIFIED | `v === zoomBeats ? 'zoom-selector__btn--active' : ''` at line 282; CSS `.zoom-selector__btn--active { border-color: var(--color-accent); background: rgba(99, 102, 241, 0.12) }` at CSS line 813 |
| 10 | When zoomBeats=8 and a lane has a 4-beat curve, a ghost copy appears at 30% opacity in the right half of the canvas | VERIFIED | `repeatCount = Math.floor(8 / 4) - 1 = 1`; loop `i=1..1` in RAF tick (lines 92–102) and stopped-state (lines 141–152); `ctx.globalAlpha = 0.30` in both paths |
| 11 | Ghost regions do not respond to pointer events | VERIFIED | Guard `if (px > primaryRegionWidth) return` at lines 533 and 560 |
| 12 | Clicking a lane label column when no lane is focused snaps that lane to 160px and all others to 44px | VERIFIED | `handleLabelColClick` sets `focusedLane = property`; `isFocused = (focusedLane === property)` applies `anim-lane--focused`; `isCompressed = (focusedLane !== null && !isFocused)` applies `anim-lane--compressed` |
| 13 | Clicking the remove-curve (x) button does not trigger the focus toggle | VERIFIED | `e.stopPropagation()` at line 638 prevents bubbling to label-col `handleLabelColClick` |

**Score:** 13/13 plan must-haves verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/uiStore.ts` | Zustand vanilla store for zoomBeats and focusedLane | VERIFIED | Exists, 24 lines, exports `uiStore`, `useUiStore`, `UiState`; defaults zoomBeats=4, focusedLane=null |
| `src/store/uiStore.test.ts` | Unit tests for ANIM-08, ANIM-09, ANIM-11 store behaviors | VERIFIED | Exists, 14 tests, all pass; covers defaults, setters, ghost geometry formulas |
| `src/components/AnimationPanel.tsx` | drawLaneCanvas with zoomBeats param + zoom control UI + ghost rendering + lane focus | VERIFIED | Contains `zoomBeats?: number` 8th param (line 362), `xDenominator` (line 380), `zoom-selector` JSX (line 273), ghost `globalAlpha = 0.30` (4 locations), `anim-lane--focused` class (line 605), `handleLabelColClick` (line 456), `primaryRegionWidth` guards (lines 532, 559) |
| `src/styles/index.css` | Phase 9 CSS section with zoom-selector and lane focus classes | VERIFIED | Phase 9 section at line 785; `.zoom-selector`, `.zoom-selector__btn`, `.zoom-selector__btn--active`, `.zoom-selector__btn:focus-visible`, `.anim-lane--focused`, `.anim-lane--compressed`, `.anim-lane__label-col { cursor: pointer }` all present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| AnimationPanel.tsx header | uiStore.setZoomBeats | `onClick={() => uiStore.getState().setZoomBeats(v)}` | WIRED | Line 286 |
| drawLaneCanvas | zoomBeats parameter | `xDenominator = zoomBeats ?? curve.duration` | WIRED | Line 380; used in `toPixel` (line 383) and playhead (line 422) |
| AnimationPanel.tsx | uiStore | `import { uiStore, useUiStore } from '../store/uiStore'` | WIRED | Line 12 |
| AnimationPanel RAF tick | drawLaneCanvas (ghost pass) | `ctx.save / ctx.globalAlpha = 0.30 / ctx.clip / ctx.translate / drawLaneCanvas / ctx.restore` | WIRED | Lines 94–101 (full copies) and 109–116 (partial ghost) |
| AnimLane label-col div | uiStore.setFocusedLane | `handleLabelColClick` → `uiStore.getState().setFocusedLane(...)` | WIRED | Lines 456–459; onClick at line 616 |
| AnimLane div.anim-lane | CSS modifier classes | `isFocused ? 'anim-lane--focused' : ''` / `isCompressed ? 'anim-lane--compressed' : ''` | WIRED | Lines 605–606 |
| handleCanvasPointerDown | primaryRegionWidth guard | `if (px > primaryRegionWidth) return` | WIRED | Lines 531–533 |
| handleCanvasPointerMove | primaryRegionWidth guard | `if (px > primaryRegionWidth) return` | WIRED | Lines 558–560 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AnimationPanel.tsx` zoom buttons | `zoomBeats` | `useUiStore((s) => s.zoomBeats)` reactive hook (line 67) | Yes — reactive to uiStore.setZoomBeats calls | FLOWING |
| `AnimationPanel.tsx` RAF ghost draw | `currentZoom` | `uiStore.getState().zoomBeats` at event time (line 76) | Yes — fresh read per frame | FLOWING |
| `AnimationPanel.tsx` stopped ghost draw | `zoomBeats` | Hook value in closure, in `[isPlaying, shape, zoomBeats]` effect deps | Yes — re-runs on zoom change | FLOWING |
| `AnimLane` focus CSS classes | `focusedLane` | `useUiStore((s) => s.focusedLane)` reactive hook (line 451) | Yes — reactive to uiStore.setFocusedLane calls | FLOWING |
| `AnimLane` no-dep draw effect | `zoomBeats` (missing) | NOT passed to `drawLaneCanvas` at line 486 | No — draws without zoom | PARTIAL — see Anti-Patterns |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| uiStore unit tests (14 tests) | `npx vitest run src/store/uiStore.test.ts` | 14/14 passed, exit 0 | PASS |
| TypeScript compilation | `npx tsc --noEmit` | Exit 0, zero errors | PASS |
| Full test suite | `npx vitest run` | 192/194 passed; 2 pre-existing CellPanel.test.tsx failures | PASS (pre-existing failures excluded) |
| Commits documented in summaries | `git log --oneline` | `8db949a` and `de560f8` both exist | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ANIM-08 | Plans 01, 02 | Zoom control in header (range 1–64, default 4) | SATISFIED | `zoom-selector` buttons wired to `setZoomBeats`; drawLaneCanvas X-axis scales with `zoomBeats`; 7 values [1,2,4,8,16,32,64] present |
| ANIM-09 | Plans 01, 02 | Ghost copies at 30% opacity when curve shorter than zoom; ghost regions non-interactive | SATISFIED | `ctx.globalAlpha = 0.30` in 4 locations (RAF + stopped-state, full + partial ghost); `primaryRegionWidth` guard in both pointer handlers |
| ANIM-11 | Plans 01, 02 | Lane focus: 160px focused, 40–48px compressed; one focused at a time; no transition; no focus on load | SATISFIED | `.anim-lane--focused { height: 160px }`, `.anim-lane--compressed { height: 44px }` (44px is within 40–48px spec); `focusedLane: null` default; no `transition` property; `e.stopPropagation()` on remove button |

No orphaned requirements — all 3 phase IDs (ANIM-08, ANIM-09, ANIM-11) claimed in both plans and verified against REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/AnimationPanel.tsx` | 481–487 | AnimLane no-dep `useEffect` calls `drawLaneCanvas(ctx, canvas.width, canvas.height, curve, property, selectedPointIdx)` without `zoomBeats` | Warning | When stopped and `focusedLane` changes (lane click), AnimLane re-renders but AnimationPanel does NOT (not subscribed to `focusedLane`). AnimLane's no-dep effect fires, drawing the canvas without zoom scale. The stopped-state draw in AnimationPanel does NOT re-run (no dep change). Result: toggling lane focus when stopped and zoom != curve.duration shows unzoomed canvas. During playback this is overwritten by the RAF loop and is not visible. |

**Classification note:** This is not a stub — the draw effect is real and was present before Phase 9. Phase 9 added zoom but did not update this legacy draw path. It is a PoC-acceptable rough edge per CLAUDE.md ("full feature set with rough edges acceptable"). Not classified as a blocker because: (a) playback — the primary use case — shows correct zoom, (b) zooming when stopped works correctly (AnimationPanel's effect runs when `zoomBeats` changes), (c) the bug is only triggered by the combination: stopped + zoom != 4 + lane focus toggle.

---

### Human Verification Required

#### 1. Zoom Control Visual State

**Test:** Load the app with a shape selected. Open the AnimationPanel. Add a curve to one property.
**Expected:** The "4" zoom button has accent border and tinted background (`.zoom-selector__btn--active` style). Buttons "1", "2", "8", "16", "32", "64" show secondary/inactive style. The zoom control appears left of the "+ Add Curve" button.
**Why human:** CSS active state and visual layout require browser inspection.

#### 2. Ghost Rendering at 30% Opacity

**Test:** Set zoom to 8. Add a curve with 4-beat duration (the default). During playback, observe the lane canvas.
**Expected:** The primary curve occupies the left half of the canvas at full opacity. A ghost copy appears in the right half at visibly reduced (~30%) opacity with the same stroke color and no fill. A subtle 1px separator may appear between primary and ghost.
**Why human:** Canvas rendering is not testable with jsdom; opacity requires visual inspection.

#### 3. Ghost Non-Interactivity

**Test:** With zoom=8 and a 4-beat curve, click in the right half of the canvas (the ghost region). Then click in the left half (primary region).
**Expected:** Clicking in the ghost region inserts no control point and does not select any point. Clicking in the primary region inserts a point or selects an existing one normally.
**Why human:** Pointer event exclusion logic requires browser canvas hit-testing to verify.

#### 4. Lane Focus Height Snap — No Transition Animation

**Test:** Click any lane's label column (property name area, not the x button).
**Expected:** The clicked lane instantly snaps to 160px tall. All other lanes instantly compress to 44px. No animation, transition, or interpolation occurs — the resize is instantaneous.
**Why human:** CSS transition absence requires visual timing inspection; ResizeObserver redraw quality requires visual check.

#### 5. Lane Focus Toggle — Collapse

**Test:** With a lane focused (160px), click its label column again.
**Expected:** All lanes instantly return to default height. No lane is focused.
**Why human:** CSS class removal and height restore require visual inspection.

#### 6. Remove-Curve Button Isolation

**Test:** Click the "×" remove button on a focused or unfocused lane.
**Expected:** The curve is removed. The lane focus state does NOT change (no focus toggle fires).
**Why human:** Event propagation isolation requires browser interaction to confirm `stopPropagation` is effective.

#### 7. Canvas Redraw on Lane Focus Toggle (Anti-Pattern Impact)

**Test:** Stop playback. Set zoom to 8. Add a 4-beat curve — ghost should appear. Click any lane's label column to toggle focus.
**Expected (baseline):** After toggling focus, the canvas still shows the zoomed curve with ghost at 30% opacity.
**Potential failure:** After clicking the label, the canvas may briefly or permanently revert to an unzoomed view (full 4-beat curve fills the canvas with no ghost). If this occurs, the no-dep AnimLane draw effect bug is impacting the stopped-state zoom display.
**Why human:** This is a timing/state interaction that cannot be verified statically; requires observing the actual rendered result after a focus toggle.

---

### Gaps Summary

No gaps blocking the phase goal. All 13 must-haves are verified in code. All four ROADMAP success criteria are met.

One warning-level anti-pattern exists: the AnimLane no-dep draw effect draws without `zoomBeats`, which can cause the canvas to revert to unzoomed display when stopped and a lane focus toggle occurs. This is a rough edge per PoC scope. Human verification item 7 is included to confirm whether this anti-pattern produces observable visual regression.

---

_Verified: 2026-04-27T10:10:00Z_
_Verifier: Claude (gsd-verifier)_
