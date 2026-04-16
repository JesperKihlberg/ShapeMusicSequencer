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

### Color Mapping

- [ ] **COLR-01**: Shape hue maps to pitch (oscillator frequency)
- [ ] **COLR-02**: Shape saturation maps to reverb depth (wet/dry)
- [ ] **COLR-03**: Shape value/brightness maps to filter cutoff frequency

### Audio Engine

- [ ] **AUDI-01**: All placed shapes play continuously and simultaneously when playback is active
- [ ] **AUDI-02**: Each shape is an independent audio voice with its own oscillator, filter, and reverb chain

### Animation

- [ ] **ANIM-01**: Shape size oscillates at a configurable rate (amplitude LFO modulation)

### Shape Panel

- [ ] **PANL-01**: Shape edit panel exposes HSV color picker (hue = pitch, saturation = reverb, value = filter)
- [ ] **PANL-02**: Shape edit panel exposes size slider (controls base amplitude/loudness)
- [ ] **PANL-03**: Shape edit panel exposes animation rate slider (controls LFO speed)

### Playback

- [ ] **PLAY-01**: User can start and stop all audio playback
- [ ] **PLAY-02**: BPM/tempo is configurable via UI control
- [ ] **PLAY-03**: Master volume control is available

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

### Animation Modes

- **ANIM-02**: Shape rotation animates and modulates phase/pitch (phase-shifting effect)
- **ANIM-03**: Shape position bounces vertically and modulates pitch (vibrato-like effect)
- **ANIM-04**: Animation depth is independently configurable per shape

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / server storage | Client-only for PoC; no auth or accounts needed |
| User accounts / authentication | Not relevant to core music-making experience |
| Mobile / touch optimization | Desktop web first; touch is complex on a grid canvas |
| MIDI export | Out of scope for v1; composition stays visual |
| Playhead as trigger (piano roll mode) | All shapes play continuously; playhead is cosmetic only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANV-01 | Phase 1 | In Progress (Plan 01 scaffold complete; Plans 02-04 implement store/engine/interaction) |
| CANV-02 | Phase 3 | Complete |
| CANV-03 | Phase 3 | Complete |
| SHPE-01 | Phase 2 | Pending |
| COLR-01 | Phase 2 | Pending |
| COLR-02 | Phase 2 | Pending |
| COLR-03 | Phase 2 | Pending |
| AUDI-01 | Phase 2 | Pending |
| AUDI-02 | Phase 2 | Pending |
| ANIM-01 | Phase 4 | Pending |
| PANL-01 | Phase 4 | Pending |
| PANL-02 | Phase 4 | Pending |
| PANL-03 | Phase 4 | Pending |
| PLAY-01 | Phase 5 | Pending |
| PLAY-02 | Phase 5 | Pending |
| PLAY-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after roadmap creation*
