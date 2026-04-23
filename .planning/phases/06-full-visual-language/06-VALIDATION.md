---
phase: 6
slug: full-visual-language
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run src/store/scaleStore.test.ts src/engine/audioEngine.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/scaleStore.test.ts src/engine/audioEngine.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green (0 failures — the pre-existing COLR-02 monotonicity failure must be fixed in Wave 0)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-00-T1 | 06-00 | 0 | COLR-02 | — | N/A | unit | `npx vitest run src/engine/audioEngine.test.ts` | ✅ existing | ⬜ pending |
| 06-00-T2 | 06-00 | 0 | PLAY-05, PLAY-06, AUDI-03 | — | N/A | unit | `npx vitest run src/store/scaleStore.test.ts src/components/ScaleSelector.test.tsx src/engine/audioEngine.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-T1 | 06-01 | 1 | PLAY-05, PLAY-06 | — | setRootKey clamps to [0,11] | unit | `npx vitest run src/store/scaleStore.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-T2 | 06-01 | 1 | PLAY-05, PLAY-06 | — | N/A | unit | `npx vitest run src/engine/audioEngine.test.ts` | ✅ existing | ⬜ pending |
| 06-02-T1 | 06-02 | 2 | AUDI-03 | — | N/A | unit + manual | `npx vitest run src/engine/audioEngine.test.ts` | ✅ existing | ⬜ pending |
| 06-02-T2 | 06-02 | 2 | COLR-02, PLAY-05, PLAY-06 | — | N/A | unit | `npx vitest run src/engine/audioEngine.test.ts` | ✅ existing | ⬜ pending |
| 06-03-T1 | 06-03 | 3 | PLAY-05, PLAY-06 | — | N/A | unit + manual | `npx vitest run src/components/ScaleSelector.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-T2 | 06-03 | 3 | PLAY-05, PLAY-06, AUDI-03 | — | N/A | manual | human-verify checkpoint | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/scaleStore.test.ts` — RED tests for PLAY-05/PLAY-06 store defaults and setters
- [ ] `src/components/ScaleSelector.test.tsx` — RED tests for toolbar select rendering and scaleStore state updates
- [ ] `src/engine/audioEngine.test.ts` — fix/replace failing `makeDistortionCurve > harmonic richness increases monotonically` test; add RED tests for `quantizeSemitone` (all 7 scales + chromatic identity) and pan formula (cols 0–3)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| StereoPannerNode per-voice stereo placement | AUDI-03 | AudioContext not available in jsdom; pan position requires listening | Place shapes in col 0 and col 3 with headphones; left shape should be hard left, right shape hard right |
| WaveShaper harmonic richness audible change | COLR-02 | Perceptual quality cannot be automated | Place a shape; drag saturation from 0→100; timbre should progress from clean → rich/textured |
| Key/scale selector re-pitches all shapes live | PLAY-05 | Pitch change correctness requires listening | Place 2–3 shapes; change root key; all pitches should shift by the interval distance |
| ScaleSelector visible in toolbar, correct order | PLAY-05 | Visual layout verification | Dev server: toolbar order should be Title | spacer | Scale | BPM | Volume | Start/Stop |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING (❌) references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
