---
phase: 11
slug: shift-drag-snapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vite.config.ts` (`test` section) |
| **Quick run command** | `npx vitest run src/engine/snapFormulas.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/snapFormulas.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-00 | 01 | 0 | ANIM-16 | — | N/A | unit (Wave 0) | `npx vitest run src/engine/snapFormulas.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-01 | 01 | 1 | ANIM-16 | — | N/A | unit | `npx vitest run src/engine/snapFormulas.test.ts` | ✅ after W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | ANIM-16 | — | N/A | unit + manual | `npx vitest run src/engine/snapFormulas.test.ts` | ✅ after W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | ANIM-16 | — | N/A | manual | Open browser — Shift+drag on hue lane, release Shift mid-drag | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/snapFormulas.test.ts` — unit tests covering:
  - X beat snap: `Math.round(beat)` clamped to `[0, duration]` (integer and non-integer duration edge cases)
  - Y hue snap: nearest `.hue` reduce over `scaleNoteHues` output (major, chromatic edge cases)
  - pixelToPoint Y-formula: uses yViewport (`yMin`/`yMax`) not full property range

*Existing `noteHue.test.ts` already covers `scaleNoteHues` return shape — only test the snap selection logic.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Releasing Shift mid-drag returns to free-drag immediately | ANIM-16 (D-03) | Requires live pointer event + modifier key interaction; jsdom cannot simulate real Shift state transitions | 1. Open app. 2. Select a lane. 3. Hold Shift, drag a control point — confirm it snaps. 4. While dragging, release Shift — confirm next move is free (unsnapped). |
| Both axes snap simultaneously on hue lane | ANIM-16 (D-01) | Requires visual confirmation of X and Y both locking to grid | 1. Open hue lane. 2. Hold Shift, drag a control point. 3. Confirm point snaps to nearest beat (X) AND nearest scale note hue (Y) simultaneously. |
| Snapped control point shows distinct visual (white fill + accent ring) | ANIM-16 (D-10) | Canvas visual output not testable in jsdom | 1. Hold Shift, drag a point. 2. Confirm selected point turns white with an accent-colored ring vs normal accent fill. |
| Hit-test correct when Y-axis is zoomed | ANIM-16 (D-08 fix) | Requires interactive canvas click at correct visual position | 1. Use Y-axis scroll to zoom in. 2. Click directly on a control point. 3. Confirm it gets selected (hit-test is viewport-aware). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
