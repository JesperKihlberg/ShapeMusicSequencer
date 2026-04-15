---
phase: 3
slug: canvas-interaction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vite.config.ts` (inline `test:` block) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | — | — | N/A | unit | `npx vitest run src/store/shapeStore.test.ts` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | CANV-02, CANV-03 | — | N/A | unit | `npx vitest run src/store/selectionStore.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | CANV-03 | — | N/A | unit | `npx vitest run src/store/shapeStore.test.ts` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 2 | CANV-02 | — | N/A | unit | `npx vitest run src/components/CellPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | CANV-02, CANV-03 | — | N/A | integration | `npx vitest run src/components/CanvasContainer.test.tsx` | ✅ | ⬜ pending |
| 3-04-01 | 04 | 3 | CANV-02 | — | N/A | manual | See Manual-Only Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/selectionStore.test.ts` — unit tests for selectionStore state transitions (CANV-02 click routing)
- [ ] `src/components/CellPanel.test.tsx` — renders empty/occupied modes, button handlers call correct store actions (CANV-02 panel content)
- [ ] Fix `src/store/shapeStore.test.ts` line 48: update expectation from `l: 60` to `l: 30` — pre-existing failure blocks clean test gate

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Selection highlight visible on canvas | CANV-02 | Canvas rendering cannot be unit tested without visual verification | Click any cell; verify 2px accent-colored inset border appears on selected cell |
| Audio voice silences on shape remove | CANV-03 | Audio output requires human ear / browser DevTools | Add a shape; click Remove Shape; verify shape's oscillator/noise disappears in Web Audio inspector |
| No audible click artifact on removal | CANV-03 | Audio quality judgment | Remove a shape during playback; verify no audible "pop" |
| Panel layout does not shift on open | CANV-02 | Layout stability is visual | Click a cell; verify canvas width does not change when panel appears |
| Escape closes panel | CANV-02 | Keyboard integration | Select a cell, press Escape; verify panel closes and canvas shows no highlight |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
