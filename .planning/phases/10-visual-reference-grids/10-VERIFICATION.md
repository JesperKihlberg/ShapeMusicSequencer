---
phase: 10-visual-reference-grids
verified: 2026-04-28T13:32:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "The hue scale grid updates immediately when the user changes the root key or scale"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Beat indicator lines visual appearance"
    expected: "Dashed vertical lines at integer beats (~35% opacity), solid bright line at beat 0 (~55%), beat number labels appear when zoomed to 4+ beats, sub-beat half-marks visible at pxPerBeat >= 40, quarter-beat marks at pxPerBeat >= 80"
    why_human: "Canvas 2D rendering output not testable in jsdom/Vitest"
  - test: "Ghost region beat labels dimmed"
    expected: "Beat labels in ghost copies are visibly dimmer than primary region labels; primary is ~45% opacity, ghost is ~22% opacity"
    why_human: "Canvas rendering requires visual inspection"
  - test: "Hue scale grid draws on hue lane only"
    expected: "Horizontal colored lines appear in hue lane; root note line is brighter (60% alpha) and slightly thicker (1.5px); non-root lines at 28% alpha; no lines on size/saturation/lightness lanes"
    why_human: "Canvas rendering requires visual inspection"
  - test: "Note name labels appear only in focused hue lane"
    expected: "C, C#, D, D#... labels appear on left edge of hue lane when it is focused at 160px; labels disappear when lane is compressed/unfocused"
    why_human: "Lane focus state interaction requires browser"
  - test: "Y-axis pan and zoom interaction"
    expected: "Plain scroll wheel pans the visible value range; Ctrl/Cmd+scroll narrows or widens the range around the midpoint; scrolling past the boundary hard-clamps (no over-scroll); 3px indigo indicator strip appears at left edge when zoomed"
    why_human: "Wheel event handling not testable in jsdom"
  - test: "Scale change while stopped — gap fix confirmation"
    expected: "Changing root key or scale in the ScaleSelector while playback is stopped should immediately update the hue lane grid lines to reflect the new scale"
    why_human: "Requires visual observation of hue grid after scale change with no playback — this was the SC4 gap; fix must be confirmed visually"
---

# Phase 10: Visual Reference Grids Verification Report

**Phase Goal:** Users can read pitch and time context directly from lane canvases — beat lines tell them where beats fall, the hue lane shows what notes are in key, and each lane's Y-axis is independently scrollable and zoomable
**Verified:** 2026-04-28T13:32:00Z
**Status:** human_needed
**Re-verification:** Yes — after SC4 gap closure

## Re-verification Summary

The single blocking gap from the initial verification (SC4 — hue scale grid not updating on scale change while stopped) has been fixed. All 5 success criteria now pass automated verification. The status moves from `gaps_found` to `human_needed` because the original human verification items remain outstanding — they require visual inspection in a running browser.

**Gap that was fixed:** AnimLane now subscribes to `scaleStore` via two separate `useScaleStore` selectors at lines 626–627:

```typescript
const scaleRootKey = useScaleStore((s) => s.rootKey)
const scaleName = useScaleStore((s) => s.scale)
```

Both selectors are included in the static draw useEffect dependency array at line 743:

```typescript
}, [curve, property, selectedPointIdx, canvasSize, yViewport, isFocused, scaleRootKey, scaleName])
```

When the scale or root key changes while stopped, the effect re-runs, reads the fresh values via `scaleStore.getState()` at line 704, and redraws the hue grid.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Dashed vertical lines mark every integer beat (~35% opacity) with beat-number labels at the top; sub-beat and quarter-beat marks appear only when there is enough pixel space | VERIFIED | `Layer 3: Beat indicator lines` at line 444; `pxPerBeat >= 16` label guard at line 478; `pxPerBeat >= 40` half-beat guard at line 491; `pxPerBeat >= 80` quarter-beat guard at line 508; `rgba(255,255,255,0.35)` at line 467 |
| SC2 | Beat 0 and loop boundaries use a visibly distinct dash pattern; beat labels inside ghost regions are dimmed compared to primary region labels | VERIFIED | `rgba(255,255,255,0.55)` solid at line 456 (beat 0); `const labelOpacity = options?.isGhostRegion ? 0.22 : 0.45` at line 479; 6 ghost call sites confirmed with `isGhostRegion: true` at lines 113, 128, 173, 188, 726, 740 |
| SC3 | The hue lane draws horizontal lines at the hue values corresponding to notes in the active scale; root note line is brighter and slightly thicker; note name labels appear on the left edge when the lane is focused | VERIFIED | `Layer 2: Hue scale grid` at line 408; `property === 'hue' && options?.rootKey !== undefined` guard at line 409; root `globalAlpha = 0.60 / lineWidth 1.5`, non-root `0.28 / 1` at lines 422–423; `isFocused` label guard at line 431; `noteNames[note.semitone]` at line 437 |
| SC4 | The hue scale grid updates immediately when the user changes the root key or scale | VERIFIED | `useScaleStore((s) => s.rootKey)` at line 626; `useScaleStore((s) => s.scale)` at line 627; both in static draw useEffect deps at line 743: `[..., scaleRootKey, scaleName]`; `scaleStore.getState()` read at line 704 for fresh values when effect re-runs |
| SC5 | Scrolling the mouse wheel over a lane pans its Y-axis; Ctrl/Cmd+scroll zooms the visible value range; scrolling is clamped so the full property range remains reachable | VERIFIED | `handleCanvasWheel` at line 663; `{ passive: false }` at line 689; pan clamp: `Math.max(fullMin, Math.min(fullMax - range, ...))` at line 684; zoom clamp: `Math.max(MIN_RANGE, Math.min(fullRange, ...))` at line 676; `uiStore.getState().setYViewport` called at lines 679 and 685 |

**Score:** 5/5 truths verified

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/engine/noteHue.ts` | scaleNoteHues pure utility | VERIFIED | Exists, exports `scaleNoteHues`, imported and called in AnimationPanel.tsx line 411 |
| `src/engine/noteHue.test.ts` | Unit tests for scaleNoteHues | VERIFIED | 4 tests covering length, isRoot flag, hue at C (0), hue at F# (180) — all pass |
| `src/store/uiStore.ts` | yViewport state + setYViewport action | VERIFIED | `yViewport: Partial<Record<AnimatableProperty, {min,max}>>` and `setYViewport` present; shallow merge pattern correct |
| `src/store/uiStore.test.ts` | yViewport unit tests (new describe block) | VERIFIED | 3 tests in `describe('uiStore — yViewport (ANIM-10)')` — all pass |
| `src/components/AnimationPanel.tsx` | DrawOptions interface, updated drawLaneCanvas, onWheel handler, drawing passes, updated call sites, scale subscription | VERIFIED | All structural elements present; SC4 gap fixed — `useScaleStore` subscriptions at lines 626–627; both in effect deps at line 743 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| AnimLane canvas (wheel event) | uiStore.setYViewport | imperative `addEventListener { passive: false }` in useEffect | WIRED | Lines 658–691; `handleCanvasWheel` calls `uiStore.getState().setYViewport` at lines 679 and 685 |
| RAF tick | drawLaneCanvas options | `uiStore.getState().yViewport[prop]` + `scaleStore.getState()` | WIRED | Lines 88–95 build `primaryOptions`; line 98 passes to primary draw; lines 113 and 128 pass `{...primaryOptions, isGhostRegion: true}` to ghost draws |
| AnimLane static draw useEffect | drawLaneCanvas options | `useScaleStore` subscription + `useUiStore yViewport` subscription | WIRED | `yViewport` via `useUiStore` at line 625 (in deps); `scaleRootKey`/`scaleName` via `useScaleStore` at lines 626–627 (in deps); all passed in `primaryOptions` at lines 702–709 |
| drawLaneCanvas hue grid pass | scaleNoteHues (noteHue.ts) | `options.rootKey + options.scale` guard before call | WIRED | Line 411: `scaleNoteHues(options.rootKey, options.scale)` inside the `property === 'hue' && ...` guard |
| drawLaneCanvas beat grid pass | xDenominator (zoomBeats) | `pxPerBeat = w / xDenominator` | WIRED | Line 446; `xDenominator` set at line 406 as `zoomBeats ?? curve.duration` |
| drawLaneCanvas Y indicator | yMin/yMax vs fullMin/fullMax | condition drawn only when `yMin > fullMin \|\| yMax < fullMax` | WIRED | Line 589; `ctx.fillRect(0, thumbTop, STRIP_WIDTH, thumbHeight)` at line 596 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| AnimationPanel.tsx — hue grid pass | `options.rootKey`, `options.scale` | `scaleStore.getState()` at line 704 (static effect), lines 91 and 151 (RAF/stopped) — re-runs on scale change via `useScaleStore` deps | Yes (live Zustand store, subscribed) | FLOWING |
| AnimationPanel.tsx — beat grid pass | `xDenominator` (zoomBeats) | `uiStore.getState().zoomBeats` at lines 79/699 | Yes (live Zustand store) | FLOWING |
| AnimationPanel.tsx — Y viewport | `yMin`, `yMax` | `uiStore.getState().yViewport[prop]` at lines 90, 150, 703; subscribed via `useUiStore` at line 625 | Yes (live Zustand store, subscribed) | FLOWING |
| AnimationPanel.tsx — Y indicator | `yMin`, `yMax` vs `fullMin`, `fullMax` | Same as above | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| noteHue.test.ts 4 tests pass | `npx vitest run src/engine/noteHue.test.ts` | 4 passed | PASS |
| uiStore yViewport 3 tests pass | `npx vitest run src/store/uiStore.test.ts` | 21 passed (7 new + 14 existing) | PASS |
| Full test suite | `npx vitest run` | 199 passed, 2 failed (pre-existing CellPanel only) | PASS |
| Layer order (Layer 2 before Layer 3 before Layer 8) | grep Layer comment lines | Lines 408, 444, 588 — correct ascending order | PASS |
| Ghost call sites count | grep `isGhostRegion: true` | 6 matches at lines 113, 128, 173, 188, 726, 740 | PASS |
| SC4 fix — useScaleStore selectors present | grep `useScaleStore` in AnimLane | Lines 626–627: two separate selectors for rootKey and scale | PASS |
| SC4 fix — scale deps in static draw effect | grep dep array at line 743 | `[..., scaleRootKey, scaleName]` — both present | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ANIM-10 | 10-01-PLAN.md, 10-02-PLAN.md | Y-axis per-lane scroll (plain wheel) and zoom (Ctrl/Cmd+scroll); clamped to full property range; default full range on load | SATISFIED | `uiStore.yViewport` + `setYViewport`; `handleCanvasWheel` with pan/zoom logic; hard-clamp implemented; Y indicator strip wired |
| ANIM-12 | 10-02-PLAN.md | Beat indicator lines: integer beats dashed, beat 0 solid, sub-beat marks at thresholds, labels at top, ghost labels dimmed, label collision guard | SATISFIED | Layer 3 beat grid pass fully implemented; all opacity values, dash patterns, threshold guards, ghost dimming confirmed |
| ANIM-13 | 10-01-PLAN.md, 10-02-PLAN.md | Hue lane horizontal reference lines at scale note hue values; root brighter; note names when focused; updates on scale/rootKey change | SATISFIED | Lines and root styling implemented; note name labels wired; `useScaleStore` subscriptions ensure live update while stopped and during playback |

All three requirement IDs from PLAN frontmatter are accounted for. No orphaned requirements found in REQUIREMENTS.md for Phase 10.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/AnimationPanel.tsx` | 748–758 | `pixelToPoint` and `pointToPixel` ignore yViewport | Warning | Control point insertion and hit detection use wrong coordinates when Y-axis is zoomed — reported as WR-03 in code review; does not block phase goal |
| `src/components/AnimationPanel.tsx` | 591 | Y indicator thumbTop formula uses `1 - yMax/fullMax` | Warning | Works correctly because fullMin is always 0 for current property ranges; latent bug if fullMin ever becomes non-zero — reported as WR-01 in code review; does not block phase goal |

No blocker anti-patterns found.

### Human Verification Required

The following items require visual inspection in a running browser. Run `npm run dev` and open http://localhost:5173.

#### 1. Beat Indicator Lines Visual Appearance (ANIM-12)

**Test:** Open app, select a shape with animation curves, open animation panel. Set zoom to 4 beats. Inspect lane canvases.
**Expected:** Dashed vertical lines at beats 1, 2, 3; solid brighter line at beat 0 (left edge); beat number labels "1", "2", "3" near top. Set zoom to 8+ beats and verify half-beat marks appear between integer beat lines.
**Why human:** Canvas 2D rendering output is not testable in jsdom/Vitest

#### 2. Ghost Region Beat Labels Dimmed (ANIM-12)

**Test:** Set a lane's curve duration to 2 beats, set zoom to 8 beats so 3 ghost copies appear. Compare beat label opacity between primary and ghost regions.
**Expected:** Ghost beat labels are visibly dimmer than primary labels (22% vs 45% opacity).
**Why human:** Canvas rendering requires visual inspection

#### 3. Hue Scale Grid and Note Name Labels (ANIM-13)

**Test:** Add an animation curve to the hue property. Inspect the hue lane.
**Expected:** Horizontal colored lines appear (one per scale note); root note line is brighter and slightly thicker; no lines appear on size/saturation/lightness lanes. Click the hue lane's label column to focus it — note name labels (C, C#, D…) should appear on the left edge.
**Why human:** Canvas rendering requires visual inspection

#### 4. Y-Axis Scroll/Zoom Feel (ANIM-10)

**Test:** Scroll mouse wheel over a lane canvas without modifier. Then try Ctrl+scroll. Try scrolling to the boundary.
**Expected:** Plain scroll pans the visible range up/down. Ctrl+scroll zooms around the midpoint. Scrolling past the top or bottom boundary hard-stops — no rubber-band over-scroll. A 3px indigo strip appears on the left edge when zoomed. Strip disappears when fully zoomed out.
**Why human:** Wheel event handling and canvas rendering not testable in jsdom

#### 5. Scale Change While Stopped — Gap Fix Confirmation (SC4)

**Test:** With playback stopped, change the root key or scale using the ScaleSelector. Observe the hue lane canvas.
**Expected:** Hue grid lines should immediately shift to reflect the new scale — no playback start required.
**Why human:** Visual confirmation that the `useScaleStore` dep fix (lines 626–627, 743) causes the canvas to redraw on scale change while stopped

### Gaps Summary

No gaps. All 5 success criteria are verified. Phase 10 goal is achieved at the code level. Human verification (browser visual checks) is required before the phase can be marked fully complete.

---

_Verified: 2026-04-28T13:32:00Z_
_Verifier: Claude (gsd-verifier)_
