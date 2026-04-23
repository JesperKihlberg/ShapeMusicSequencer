# Ingest Conflicts Report

**Ingested:** docs/PRD-visual-sequencer.md (PRD — Chromatic Visual Music Sequencer v1.1)
**Mode:** merge
**Date:** 2026-04-22
**Status:** COMPLETE — all variants resolved 2026-04-22

---

## Bucket 1: Auto-Resolved (4)

[INFO] Shape type set — diamond and blob dropped, PRD wins
  Found: .planning/REQUIREMENTS.md (v2 section) lists SHPE-05 (diamond) and prior implementation had blob
  Expected: docs/PRD-visual-sequencer.md §2.1 specifies exactly 4 shape types: circle, triangle, square, star
  Resolution: PRD v1.1 is the authoritative scope document. Diamond (sawtooth wave) and blob were implementation-era additions not in the authoritative PRD scope. Diamond/blob treated as out-of-scope for v1. SHPE-05 remains in v2 backlog as a candidate but is not in the active roadmap.
  source: docs/PRD-visual-sequencer.md §2.1, .planning/REQUIREMENTS.md v2 section

[INFO] State management stack — Zustand + Immer + zundo + XState v5 confirmed
  Found: .planning/ files reference Zustand; zundo referenced in REQUIREMENTS.md (COMP-01 undo/redo)
  Expected: docs/PRD-visual-sequencer.md §8.1 specifies Zustand + Immer + zundo + XState v5
  Resolution: Compatible with existing decisions. No contradiction. Added to synthesized constraints.
  source: docs/PRD-visual-sequencer.md §8.1

[INFO] BPM range 40–200 — new constraint added
  Found: .planning/REQUIREMENTS.md PLAY-02 specifies BPM is configurable, no range stated
  Expected: docs/PRD-visual-sequencer.md §6.4 specifies BPM slider range 40–200
  Resolution: No contradiction; PLAY-04 added to requirements as a new tightening constraint.
  source: docs/PRD-visual-sequencer.md §6.4

[INFO] Column-to-stereo pan mapping — new requirement added
  Found: No prior stereo pan requirement in .planning/REQUIREMENTS.md
  Expected: docs/PRD-visual-sequencer.md §3.1 specifies cell column position maps to stereo pan via StereoPannerNode
  Resolution: No contradiction; AUDI-03 added as a new audio engine requirement.
  source: docs/PRD-visual-sequencer.md §3.1

---

## Bucket 2: Competing Variants (2)

[RESOLVED 2026-04-22] Saturation mapping → WaveShaper harmonic richness
  Decision: Option (a) — deprecate reverb, adopt WaveShaper.
  Rationale: (1) Saturation in HSV represents colour richness/purity, not spaciousness — WaveShaper is the honest metaphor. (2) Per-voice reverb chains cause muddy wash at 32 simultaneous voices (PERF-03). (3) makeDistortionCurve already exists from Phase 2 (02-02-PLAN.md) — WaveShaper was always the intended target. (4) Breaking Phase 2 sound design is acceptable; the old success criterion 3 was a proxy for "saturation does something audible."
  Migration in Phase 6: Remove ConvolverNode/wet-dry chain; insert WaveShaperNode fed by makeDistortionCurve; update COLR-02 label and PANL-01 UI label from "reverb" to "harmonic richness".
  source: docs/PRD-visual-sequencer.md §3.1, §5.1; .planning/ROADMAP.md Phase 2 success criteria

[RESOLVED 2026-04-22] Animation system → spline curves replace LFO (staged migration)
  Decision: Option (a) with staged migration — migrate LFO to spline curves; deprecate ANIM-01/PANL-03.
  Rationale: Two animation subsystems is a maintenance trap — every future animatable property would need to pick a side. LFO is a degenerate spline case (sinusoidal = two control points at 0 and 1); a "Sine" preset curve replicates current behaviour exactly so users lose nothing.
  PANL-03 (animRate BeatFraction) maps directly to spline loop duration — BeatFraction is already the right abstraction. Phase 5's computeLfoHz and Phase 4's pulseScale can be retired once canvas engine subscribes to spline state.
  Staged migration in Phase 7:
    1. Build spline data model + animation panel UI (ANIM-02–06).
    2. New shapes get spline-driven animation by default; existing shapes retain LFO state until their panel is opened.
    3. On first open of a shape's animation panel, auto-convert animRate BeatFraction to an equivalent sine spline (lossless, no user surprise).
    4. Once all shapes migrated (or on explicit "upgrade all"), remove LFO code path.
  source: docs/PRD-visual-sequencer.md §2.2, §4.1; .planning/REQUIREMENTS.md ANIM-01, PANL-03; .planning/ROADMAP.md Phase 4

---

## Bucket 3: Unresolved Blockers

None identified.

---

## Summary

- Auto-resolved: 4
- Competing variants: 2 (recommend resolving before Phase 6 and Phase 7 execution respectively)
- Blockers: 0
- New requirements added: 14 (AUDI-03, ANIM-02–06, PLAY-04–06, COMP-01–02, SHPE-06, PERF-01–05)
- New phases appended: 2 (Phase 6: Full Visual Language, Phase 7: Composition Tools)
