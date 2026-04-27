---
status: partial
phase: 09-timeline-zoom-ghosts-and-lane-focus
source: [09-VERIFICATION.md]
started: 2026-04-27T10:15:00Z
updated: 2026-04-27T10:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Zoom control visual active state and layout
expected: 7 zoom buttons (1 2 4 8 16 32 64) appear in the AnimationPanel header left of "+ Add Curve"; button "4" has active style (accent border + tinted background) on load; clicking "8" makes "8" active and "4" inactive
result: [pending]

### 2. Ghost rendering visible at 30% opacity during playback
expected: With a 4-beat curve and zoom set to 8, start playback — a semi-transparent copy of the curve appears in the right half of the canvas at visibly reduced opacity (~30%); the ghost follows the same shape as the primary curve
result: [pending]

### 3. Ghost region non-interactivity (clicking inserts no point)
expected: Click in the ghost region (right half of canvas when zoom=8, duration=4) — no control point is inserted; only clicks in the primary region (left half) insert points
result: [pending]

### 4. Lane focus height snap is instant (no transition animation)
expected: Click any lane's label column — it snaps immediately to 160px tall and all other lanes snap immediately to 44px; no CSS transition animation occurs (instant, no sliding)
result: [pending]

### 5. Lane focus collapse on second click
expected: With a lane focused (160px), click its label column again — all lanes return to their default height immediately; no lane is focused after this
result: [pending]

### 6. Remove-curve button isolation (stopPropagation works)
expected: Click the × button on any lane — the curve is removed without triggering the focus toggle; no lane becomes focused as a side-effect
result: [pending]

### 7. Canvas zoom state after lane focus toggle when stopped (anti-pattern check)
expected: Set zoom to 8 (not default 4); stop playback; click a lane label to focus it — verify the canvas still shows the zoomed (8-beat) view. This tests whether the AnimLane no-dep useEffect (line 486) overwrites the zoomed draw with the unzoomed default when focus changes while stopped.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
