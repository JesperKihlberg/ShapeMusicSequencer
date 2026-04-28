---
phase: 10
slug: visual-reference-grids
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run src/engine/noteHue.test.ts src/store/uiStore.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

Pre-existing state: 192 tests pass, 2 fail (pre-existing CellPanel failures, unrelated to Phase 10). Phase 10 must not break any currently-passing tests.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/noteHue.test.ts src/store/uiStore.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green (excluding 2 pre-existing CellPanel failures)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | ANIM-13 | — | N/A | unit | `npx vitest run src/engine/noteHue.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | ANIM-10 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | ANIM-10 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | ANIM-10 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | ANIM-12 | — | N/A | manual | Browser visual check | n/a | ⬜ pending |
| 10-02-02 | 02 | 2 | ANIM-13 | — | N/A | manual | Browser visual check | n/a | ⬜ pending |
| 10-02-03 | 02 | 2 | ANIM-10 | — | N/A | unit | `npx vitest run src/store/uiStore.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/noteHue.test.ts` — unit tests for `scaleNoteHues()`: 7 notes for major, root has `isRoot: true`, C=0° hue, F#(root=6)=180° hue
- [ ] New describe block in `src/store/uiStore.test.ts` — covers ANIM-10 yViewport: `setYViewport` stores per-lane viewport, absent key returns full range, clamp yMin ≥ 0 and yMax ≤ fullMax

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Beat indicator lines render at correct positions, opacities, dash patterns | ANIM-12 | Canvas 2D rendering not testable with Vitest/jsdom | Open app, add shape, open animation panel, verify beat lines visible at ~35% opacity, beat 0 solid at ~55%, sub-beats at zoom ≤ pxPerBeat thresholds |
| Ghost region beat labels dimmed vs primary labels | ANIM-12 | Canvas rendering | Set zoom to 2×+ curve duration; verify ghost beat labels are visually dimmer |
| Hue scale grid draws colored horizontal lines on hue lane only | ANIM-13 | Canvas rendering | Add hue curve, verify horizontal lines appear; check no lines on size/saturation/lightness lanes |
| Note name labels appear only on focused hue lane | ANIM-13 | Canvas rendering | Click hue lane label to focus; verify C/C#/D etc. labels appear at left edge |
| Scale grid updates live on rootKey/scale change | ANIM-13 | Canvas rendering | Change root key while animation panel open; verify hue grid lines shift |
| Y-axis pan works (plain scroll wheel) | ANIM-10 | Browser wheel interaction not testable with jsdom | Scroll over lane canvas without modifier; verify curve pans up/down |
| Y-axis zoom works (Ctrl+scroll) | ANIM-10 | Browser wheel interaction | Ctrl+scroll over lane; verify range shrinks/grows around midpoint |
| Y-axis clamped at full range boundaries | ANIM-10 | Browser interaction | Scroll past top/bottom; verify clamp with no over-scroll |
| Y-axis zoom indicator strip visible when zoomed | ANIM-10 | Canvas rendering | Zoom in on a lane; verify 3px accent strip appears at left edge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
