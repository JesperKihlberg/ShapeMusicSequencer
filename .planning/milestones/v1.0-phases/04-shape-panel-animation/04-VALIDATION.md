---
phase: 4
slug: shape-panel-animation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | PANL-01 | — | N/A | unit | `npx vitest run src/utils/drawShape.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | PANL-01 | — | N/A | unit | `npx vitest run src/engine/canvasEngine.test.ts` | ✅ | ⬜ pending |
| 4-01-03 | 01 | 1 | PANL-02 | — | N/A | unit | `npx vitest run src/components/ShapeTypeSelector.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | PANL-01 | — | N/A | unit | `npx vitest run src/components/ShapePanel.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | PANL-02 | — | N/A | unit | `npx vitest run src/components/HsvColorPicker.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | PANL-03 | — | N/A | unit | `npx vitest run src/components/ShapePanel.test.tsx` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 3 | ANIM-01 | — | N/A | unit | `npx vitest run src/engine/audioEngine.test.ts` | ✅ | ⬜ pending |
| 4-03-02 | 03 | 3 | ANIM-01 | — | N/A | integration | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/drawShape.test.ts` — stubs for all 6 shape types (circle, square, triangle, diamond, pentagon, star); add `roundRect` to jsdom canvas mock in `vitest.setup.ts`
- [ ] `src/components/ShapeTypeSelector.test.tsx` — stub for shape type selector rendering
- [ ] `src/components/ShapePanel.test.tsx` — stubs for panel open/close, slider interactions, PANL-01/02/03
- [ ] `src/components/HsvColorPicker.test.tsx` — stubs for HSV color picker rendering and change events

*Note: `vitest.setup.ts` must add `roundRect` to the jsdom canvas mock — required by square shape drawing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shape pulses visibly in browser | ANIM-01 | DOM animation requires visual inspection | Open app, place shape, observe pulsing; adjust animation rate slider and confirm pulse rate changes |
| Audio amplitude follows pulsing | ANIM-01 | Web Audio output requires human ear | Open app, enable audio, place shape, listen for volume modulation in sync with visual pulse |
| HSV picker updates color live | PANL-01 | Canvas render requires visual inspection | Open panel, drag HSV picker, confirm shape color changes in real time |
| Color change updates audio params | PANL-01 | Audio output requires human ear | Open panel, change hue, listen for audible pitch/filter change |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
