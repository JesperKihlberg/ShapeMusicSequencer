---
phase: 5
slug: playback-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | PLAY-01 | — | N/A | unit | `npx vitest run src/store/playbackStore.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | PLAY-01 | — | N/A | unit | `npx vitest run src/store/playbackStore.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | PLAY-01 | — | N/A | unit | `npx vitest run src/store/playbackStore.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | PLAY-02 | — | N/A | unit | `npx vitest run src/store/playbackStore.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | PLAY-03 | — | N/A | unit | `npx vitest run src/store/playbackStore.test.ts` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | PLAY-01 | — | N/A | integration | `npx vitest run src/audio/audioEngine.test.ts` | ✅ | ⬜ pending |
| 5-03-02 | 03 | 2 | PLAY-02 | — | N/A | integration | `npx vitest run src/audio/audioEngine.test.ts` | ✅ | ⬜ pending |
| 5-04-01 | 04 | 2 | PLAY-03 | — | N/A | integration | `npx vitest run src/canvas/canvasEngine.test.ts` | ✅ | ⬜ pending |
| 5-05-01 | 05 | 3 | PLAY-01 | — | N/A | manual | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/playbackStore.test.ts` — stubs for PLAY-01, PLAY-02, PLAY-03
- [ ] Verify `vitest` is already installed (expected in devDependencies)

*If infrastructure already present: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Start button triggers audio on all placed shapes | PLAY-01 | Requires live AudioContext + DOM interaction | Place 2+ shapes, click Start, verify all shapes produce sound |
| Stop button silences all audio immediately | PLAY-01 | Requires live AudioContext | Click Stop, verify all audio stops within 100ms |
| BPM slider updates visual playhead tempo | PLAY-02 | Canvas animation timing is visual | Change BPM, verify shape animation rate changes visually |
| Master volume slider scales all voices | PLAY-03 | Requires live audio output perception | Change volume, verify audible scaling of all voices |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
