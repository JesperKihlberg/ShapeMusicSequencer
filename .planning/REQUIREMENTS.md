# Requirements: Shape Music Sequencer

**Defined:** 2026-04-14
**Core Value:** Any change to the visual canvas is an immediate, audible change to the music — seeing and hearing are the same act.

## v1 Requirements

Requirements for initial PoC release. Each maps to roadmap phases.

### Canvas

- [ ] **CANV-01**: User can place a shape on any empty grid cell (4x4 grid, up to 16 cells)
- [x] **CANV-02**: User can click a placed shape to open the property edit panel
- [x] **CANV-03**: User can remove a placed shape from the canvas

### Shapes

- [ ] **SHPE-01**: Circle shape renders on the canvas and generates a sine wave oscillator voice
- [ ] **SHPE-06**: Multiple shapes per cell supported for complex timbres (layered voices)

### Color Mapping

- [ ] **COLR-01**: Shape hue maps to pitch (oscillator frequency)
- [ ] **COLR-02**: Shape saturation maps to harmonic richness (WaveShaperNode distortion curve; makeDistortionCurve drives richness)
- [ ] **COLR-03**: Shape value/brightness maps to filter cutoff frequency

### Audio Engine

- [ ] **AUDI-01**: All placed shapes play continuously and simultaneously when playback is active
- [ ] **AUDI-02**: Each shape is an independent audio voice with its own oscillator, WaveShaper, and filter chain
- [ ] **AUDI-03**: Cell column position maps to stereo pan (StereoPannerNode; left col = hard left, right = hard right)

### Animation

- [ ] **ANIM-01**: Shape size oscillates at a configurable rate (amplitude LFO modulation)
- [ ] **ANIM-02**: Per-property spline animation curves with free-float beat duration (no quantization)
- [ ] **ANIM-03**: Animatable properties: size, hue, saturation, lightness, rotation
- [ ] **ANIM-04**: Curves loop independently; polyrhythm emerges from mismatched durations
- [ ] **ANIM-05**: Bottom animation panel with stacked multi-lane view (large screen) / tab strip (small screen)
- [ ] **ANIM-06**: Draggable divider between canvas and animation panel

### Shape Panel

- [x] **PANL-01**: Shape edit panel exposes HSV color picker (hue = pitch, saturation = harmonic richness, value = filter)
- [x] **PANL-02**: Shape edit panel exposes size slider (controls base amplitude/loudness)
- [x] **PANL-03**: Shape edit panel exposes animation rate slider (controls LFO speed)

### Playback

- [ ] **PLAY-01**: User can start and stop all audio playback
- [ ] **PLAY-02**: BPM/tempo is configurable via UI control
- [ ] **PLAY-03**: Master volume control is available
- [ ] **PLAY-04**: BPM range is 40–200 BPM
- [ ] **PLAY-05**: Key/scale selector constrains valid pitches (6 scales: major, natural minor, pentatonic major, pentatonic minor, dorian, mixolydian)
- [ ] **PLAY-06**: Scale mode (default) and chromatic mode selectable per session

### Composition

- [ ] **COMP-01**: Undo/redo with minimum 50-step depth (zundo middleware)
- [ ] **COMP-02**: Export canvas as PNG encoding full composition state

### Non-Functional

- [ ] **PERF-01**: Canvas sustained at 60fps on mid-range hardware
- [ ] **PERF-02**: Audio latency < 20ms from trigger to audible output
- [ ] **PERF-03**: Max 32 simultaneous voices without performance degradation
- [ ] **PERF-04**: Browser support: Chrome 120+, Firefox 120+, Safari 17+
- [ ] **PERF-05**: First interaction to sound < 500ms after AudioContext resume

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Persistence

- **PERS-01**: User can save composition as a JSON file
- **PERS-02**: User can load a composition from a JSON file
- **PERS-03**: User can share a composition via URL (state encoded in URL)

### Additional Shape Types

- **SHPE-02**: Square shape renders and generates a square wave oscillator
- **SHPE-03**: Triangle shape renders and generates a triangle wave oscillator
- **SHPE-04**: Star shape renders and generates a noise burst (percussive)
- **SHPE-05**: Diamond shape renders and generates a sawtooth wave oscillator

### Animation Modes (Legacy — superseded by spline system in v1 roadmap)

- **ANIM-02-legacy**: Shape rotation animates and modulates phase/pitch (phase-shifting effect)
- **ANIM-03-legacy**: Shape position bounces vertically and modulates pitch (vibrato-like effect)
- **ANIM-04-legacy**: Animation depth is independently configurable per shape

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / server storage | Client-only for PoC; no auth or accounts needed |
| User accounts / authentication | Not relevant to core music-making experience |
| Mobile / touch optimization | Desktop web first; touch is complex on a grid canvas |
| MIDI export | Out of scope for v1; composition stays visual |
| Playhead as trigger (piano roll mode) | All shapes play continuously; playhead is cosmetic only |
| Step sequencer | Replaced by spline animation curves per PRD v1.1 |
| LFO-driven animation (new sessions) | Replaced by spline animation curves per PRD v1.1 — see INGEST-CONFLICTS.md competing variant |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANV-01 | Phase 1 | In Progress (Plan 01 scaffold complete; Plans 02-04 implement store/engine/interaction) |
| CANV-02 | Phase 3 | Complete |
| CANV-03 | Phase 3 | Complete |
| SHPE-01 | Phase 2 | Pending |
| SHPE-06 | Phase 6 | Unmapped — pending roadmap update |
| COLR-01 | Phase 2 | Pending |
| COLR-02 | Phase 2 | Pending |
| COLR-03 | Phase 2 | Pending |
| AUDI-01 | Phase 2 | Pending |
| AUDI-02 | Phase 2 | Pending |
| AUDI-03 | Phase 6 | Unmapped — pending roadmap update |
| ANIM-01 | Phase 4 | Pending |
| ANIM-02 | Phase 7 | Unmapped — pending roadmap update |
| ANIM-03 | Phase 7 | Unmapped — pending roadmap update |
| ANIM-04 | Phase 7 | Unmapped — pending roadmap update |
| ANIM-05 | Phase 7 | Unmapped — pending roadmap update |
| ANIM-06 | Phase 7 | Unmapped — pending roadmap update |
| PANL-01 | Phase 4 | Complete |
| PANL-02 | Phase 4 | Complete |
| PANL-03 | Phase 4 | Complete |
| PLAY-01 | Phase 5 | Pending |
| PLAY-02 | Phase 5 | Pending |
| PLAY-03 | Phase 5 | Pending |
| PLAY-04 | Phase 5 | Unmapped — pending roadmap update |
| PLAY-05 | Phase 6 | Unmapped — pending roadmap update |
| PLAY-06 | Phase 6 | Unmapped — pending roadmap update |
| COMP-01 | Phase 7 | Unmapped — pending roadmap update |
| COMP-02 | Phase 7 | Unmapped — pending roadmap update |
| PERF-01 | Phase 6–7 | Unmapped — pending roadmap update |
| PERF-02 | Phase 6–7 | Unmapped — pending roadmap update |
| PERF-03 | Phase 6–7 | Unmapped — pending roadmap update |
| PERF-04 | Phase 6–7 | Unmapped — pending roadmap update |
| PERF-05 | Phase 6–7 | Unmapped — pending roadmap update |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 19
- Unmapped (new — pending roadmap update): 14
- Note: ANIM-02/03/04-legacy entries in v2 section are superseded by v1 spline requirements (ANIM-02–06); see INGEST-CONFLICTS.md for competing variant detail

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-22 — merged PRD-visual-sequencer.md v1.1 (AUDI-03, ANIM-02–06, PLAY-04–06, COMP-01–02, SHPE-06, PERF-01–05)*
