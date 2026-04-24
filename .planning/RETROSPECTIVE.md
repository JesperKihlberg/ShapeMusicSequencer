# Retrospective: Shape Music Sequencer

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-24
**Phases:** 7 | **Plans:** 27 + 1 FIX + 5 quick tasks
**Timeline:** 10 days (2026-04-14 → 2026-04-24)

### What Was Built

1. React + TypeScript app scaffold with 4×4 grid canvas
2. Per-shape Web Audio voice chains (oscillator → WaveShaper → filter → masterGain)
3. HSV color-to-audio mapping: hue→pitch, saturation→WaveShaper richness, lightness→filter cutoff
4. Interactive canvas: click to select, side panel to edit all properties, keyboard remove
5. Playback controls: start/stop, BPM (40–200), master volume
6. Key/scale selector with 6 scales + chromatic; StereoPannerNode per voice by column
7. Spline animation curve system: per-property lanes, polyrhythm, draggable AnimationPanel
8. frozenBeatPos freeze-on-stop: shapes hold animated visual state when playback stops

### What Worked

- **Wave-based execution** (Wave 0 test infra → Wave 1 data → Wave 2 engine → Wave 3 UI) produced clean, testable increments with no integration surprises
- **TDD on pure functions** (colorToFrequency, makeDistortionCurve, quantizeSemitone) caught bugs before wiring — payoff was high
- **Quick tasks** handled post-milestone fixes (color animation bug, lightness curve mapping, pitch mapping regression) cleanly without derailing main flow
- **Deferred complexity early** (COMP-01/02 undo/redo and PNG export) kept phases focused on the core instrument
- **LFO-to-spline replacement** was architectural but clean — removing animRate/createLfo/pulseScale entirely avoided a two-subsystem maintenance trap

### What Was Inefficient

- **REQUIREMENTS.md traceability was never maintained** — checkboxes stayed unchecked throughout development, requiring retrospective reconstruction at close
- **Verification files left as `human_needed`** for Phases 04–06 — not a blocker but created audit noise at close
- **Quick task SUMMARY.md files missing** — 5 tasks completed and committed but no summary docs, flagged as "missing" by audit tooling
- **Phase completion dates in ROADMAP.md** were not updated as phases finished — had to estimate at close

### Patterns Established

- **frozenBeatPos pattern**: module variable in engine files to capture state at stop instant — applicable to any "freeze on stop" audio/visual need
- **Wave 0 test scaffolding**: dedicated wave for RED test setup before any implementation — reduces context switching mid-wave
- **Beat-fraction type for tempo-relative durations**: BeatFraction as a typed unit (not raw Hz) is portable across audio and canvas engines
- **Two-stage WaveShaper algorithm**: Chebyshev polynomial for harmonic richness + soft-clip limiter — reusable pattern for distortion/saturation effects

### Key Lessons

- Keep REQUIREMENTS.md traceability current during execution — retroactive updates at close are lossy
- Mark phase completion dates in ROADMAP.md immediately after human-verify checkpoint passes
- Quick task SUMMARY.md should be written at task close, not deferred
- For audio engines: test pure mapping functions first (colorToFrequency etc.) before wiring into voice lifecycle — separation of concerns pays off immediately

### Cost Observations

- Sessions: ~10 days, multiple sessions
- Notable: wave-based execution kept individual plan sizes small and parallelizable; context cost per wave was predictable

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 7 |
| Plans | 27 + fixes |
| Days | 10 |
| LOC | ~4,672 |
| Quick tasks | 5 |
| Deferred items at close | 9 |
