---
phase: 2
slug: audio-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or package.json scripts) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | COLR-01 | — | N/A | unit | `npx vitest run src/types` | ✅ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | COLR-02 | — | N/A | unit | `npx vitest run src/audio` | ✅ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | AUDI-01 | — | N/A | unit | `npx vitest run src/audio/colorToAudio` | ✅ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | SHPE-01 | — | N/A | unit | `npx vitest run src/audio/audioEngine` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | AUDI-02 | — | N/A | manual | browser: place shapes, verify polyphony | — | ⬜ pending |
| 2-02-03 | 02 | 2 | COLR-03 | — | N/A | manual | browser: change shape color, verify audio changes | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/audio/__tests__/colorToAudio.test.ts` — unit tests for colorToFrequency, lightnessToFilterCutoff, saturationToTimbre
- [ ] `src/audio/__tests__/audioEngine.test.ts` — stubs for voice lifecycle (create/destroy)
- [ ] `src/types/__tests__/color.test.ts` — tests for HSL color structure

*Note: jsdom does not implement AudioContext — all audio tests must cover pure functions only. Polyphony and voice graph correctness are manual-only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Placing a shape produces an audible tone | AUDI-01 | jsdom lacks AudioContext | Open browser, place circle on canvas, verify tone plays |
| Multiple shapes play simultaneously | AUDI-02 | jsdom lacks AudioContext | Place 3+ shapes, verify all play at once without cutting each other off |
| Hue changes pitch | COLR-01 | Perceptual test | Change shape hue slider, verify noticeable pitch change |
| Saturation changes timbre/distortion | COLR-02 | Perceptual test | Change shape saturation, verify noticeable timbre change |
| Brightness changes filter cutoff | COLR-03 | Perceptual test | Change shape brightness, verify noticeable brightness/filter change |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
