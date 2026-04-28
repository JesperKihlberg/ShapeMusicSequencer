---
phase: 9
slug: timeline-zoom-ghosts-and-lane-focus
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + jsdom |
| **Config file** | `vite.config.ts` (unified) |
| **Quick run command** | `npx vitest run src/store/uiStore.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/uiStore.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | ANIM-08 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | ANIM-08 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | ANIM-11 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | ANIM-09 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | ANIM-09 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 9-02-03 | 02 | 2 | ANIM-11 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/uiStore.test.ts` — unit tests covering:
  - `uiStore.zoomBeats` defaults to 4 (ANIM-08)
  - `setZoomBeats(8)` updates `zoomBeats` to 8 (ANIM-08)
  - `uiStore.focusedLane` defaults to `null` (ANIM-11)
  - `setFocusedLane(prop)` sets `focusedLane` to `prop` (ANIM-11)
  - `setFocusedLane(null)` clears `focusedLane` (ANIM-11)
  - `repeatCount = Math.floor(zoomBeats / duration) - 1` formula (ANIM-09)
  - Ghost pointer exclusion: events at `x > primaryRegionWidth` return early (ANIM-09)

*Note: No conftest or shared fixture setup needed — Vitest + jsdom is fully configured in `vite.config.ts` with `setupFiles: ['./vitest.setup.ts']`. Two pre-existing test failures in `CellPanel.test.tsx` are not Phase 9 regressions.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Zoom buttons visually display active state matching `.beat-selector__btn--active` style | ANIM-08 | CSS visual inspection required | Load app, open AnimationPanel, verify "4" button has active styling (accent border + tinted bg); click "8", verify "8" activates and "4" deactivates |
| Ghost curves visible at 30% opacity when zoomBeats > curve.duration | ANIM-09 | Canvas rendering not testable with jsdom | Set zoom to 8 beats, add a curve with 4-beat duration, verify ghost copy appears at 30% opacity in the right half of the canvas |
| Ghost regions are non-interactive | ANIM-09 | Pointer exclusion requires browser canvas hit-testing | With ghost visible, click in ghost region — verify no control point is added; click in primary region — verify point insertion works |
| Lane focus snaps height instantly without transition | ANIM-11 | CSS transition absence requires visual inspection | Click a lane label column, verify instant snap to 160px; verify no animation occurs |
| All lanes compress to 44px when another lane is focused | ANIM-11 | Multi-lane layout requires visual inspection | Focus one lane; verify all others snap to compressed 44px height immediately |
| ResizeObserver redraws canvas correctly after height change | ANIM-11 | Canvas redraw on resize requires browser environment | Focus a lane (160px), verify curve redraws filling full 160px height; compress (44px), verify curve redraws at compressed height |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
