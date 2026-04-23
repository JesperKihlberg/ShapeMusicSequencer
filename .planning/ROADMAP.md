# Roadmap: Shape Music Sequencer

## Overview

Build a client-only PoC web app where drawing geometric shapes on a grid canvas creates and controls music in real time. The journey runs from project scaffold → audio synthesis engine → interactive canvas → per-shape controls and animation → playback controls. Each phase delivers a verifiable slice of the core mechanic: visual canvas state equals audible music state.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scaffold** - React + TypeScript project with a rendered 4x4 grid canvas (in progress — 1/4 plans complete)
- [ ] **Phase 2: Audio Engine** - Oscillator-per-shape synthesis with color-to-audio parameter mapping
- [ ] **Phase 3: Canvas Interaction** - Place, select, and remove shapes that create live audio voices
- [ ] **Phase 4: Shape Panel & Animation** - Per-shape property editor and LFO amplitude modulation
- [ ] **Phase 5: Playback Controls** - Start/stop, BPM, and master volume controls
- [x] **Phase 6: Full Visual Language** - Complete visual-to-audio mapping: WaveShaper timbre, stereo pan, star percussion, key/scale selector, multi-shape cells (2026-04-23)
- [ ] **Phase 7: Composition Tools** - Undo/redo, PNG export, and spline animation curve system replacing LFO

## Phase Details

### Phase 1: Scaffold
**Goal**: A working React + TypeScript app is running with a visible 4x4 grid canvas that accepts shape placement
**Depends on**: Nothing (first phase)
**Requirements**: CANV-01
**Success Criteria** (what must be TRUE):
  1. Running the dev server opens a browser page showing a 4x4 grid canvas
  2. User can click an empty grid cell and a circle shape appears in that cell
  3. Shape placement snaps strictly to grid cells (no free-form positioning)
**Plans**: 4 (01-bootstrap, 02-shapeStore, 03-canvasEngine, 04-CanvasContainer)
**UI hint**: yes

### Phase 2: Audio Engine
**Goal**: Every placed shape produces a continuously playing audio voice whose sonic properties are driven by the shape's color values
**Depends on**: Phase 1
**Requirements**: SHPE-01, COLR-01, COLR-02, COLR-03, AUDI-01, AUDI-02
**Success Criteria** (what must be TRUE):
  1. Placing a circle on the canvas produces an audible sine wave tone
  2. Changing a shape's hue produces a noticeable change in the pitch of its tone
  3. Changing a shape's saturation produces a noticeable change in the reverb/wet depth of its tone
  4. Changing a shape's brightness produces a noticeable change in the filter brightness (cutoff) of its tone
  5. Multiple shapes placed on the canvas all play simultaneously and independently
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — Migrate Shape.color to ShapeColor struct, expand ShapeType union to 6 types, update canvas engine CSS string reconstruction
- [x] 02-02-PLAN.md — Build and TDD-test color-to-audio pure functions (colorToFrequency, makeDistortionCurve, lightnessToFilterCutoff, shapeTypeToWave)
- [x] 02-03-PLAN.md — Build audio voice lifecycle engine, wire into CanvasContainer, change sequencerMachine to playing state

### Phase 3: Canvas Interaction
**Goal**: Users can fully manage shapes on the canvas — placing, selecting, and removing them — with each action immediately reflected in the live audio
**Depends on**: Phase 2
**Requirements**: CANV-02, CANV-03
**Success Criteria** (what must be TRUE):
  1. Clicking a placed shape opens the property edit panel without interrupting audio playback
  2. Removing a shape from the canvas immediately silences its audio voice
  3. After removing a shape, its grid cell becomes available for a new shape
**Plans**: 4 plans
Plans:
- [x] 03-01-PLAN.md — Fix pre-existing shapeStore test failure; add removeShape to shapeStore; create selectionStore + tests
- [x] 03-02-PLAN.md — Create CellPanel React component (empty/occupied modes, Add Shape, Remove Shape); update App.tsx layout and CSS
- [x] 03-03-PLAN.md — Refactor CanvasContainer click routing to selectionStore; add Escape/Delete/Backspace keyboard handler; extend audioEngine voice removal
- [x] 03-04-PLAN.md — Add selectionStore subscription and drawSelection highlight to canvasEngine; human-verify checkpoint
**UI hint**: yes

### Phase 4: Shape Panel & Animation
**Goal**: Users can edit all properties of a selected shape through a side panel, and shapes animate in ways that modulate their sound in real time
**Depends on**: Phase 3
**Requirements**: PANL-01, PANL-02, PANL-03, ANIM-01
**Success Criteria** (what must be TRUE):
  1. Clicking a shape opens a panel with an HSV color picker that updates the shape's color and its audio parameters live
  2. The panel size slider changes the shape's visual size and audibly changes its volume
  3. The panel animation rate slider changes the speed of the shape's size oscillation
  4. The shape visibly pulses in size at the configured rate, and the audio amplitude audibly follows that pulsing
**Plans**: 5 plans
Plans:
- [x] 04-00-PLAN.md — Wave 0: test infrastructure — extend vitest.setup.ts with roundRect mock; scaffold test files for drawShape, HsvSliders, ShapeTypeSelector, store, CellPanel, audioEngine
- [x] 04-01-PLAN.md — Wave 1: data layer — extend Shape interface with size/animRate; add updateShape action; create drawShape pure helper for all 6 shape types
- [x] 04-02-PLAN.md — Wave 2a: canvas engine — import drawShape helper, add pulseScale formula, fix dirty-flag for continuous animation
- [x] 04-03-PLAN.md — Wave 2b: audio engine — LFO per voice (ConstantSourceNode + OscillatorNode), updateVoiceColor, updateVoiceSize, enhanced change detection subscription
- [x] 04-04-PLAN.md — Wave 3: UI layer — create HsvSliders and ShapeTypeSelector components; replace CellPanel occupied mode; add CSS classes; human-verify checkpoint
**UI hint**: yes

### Phase 5: Playback Controls
**Goal**: Users can control the global playback state, tempo, and output volume of the entire composition
**Depends on**: Phase 4
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. User can press a Start button and all placed shapes begin playing audio simultaneously
  2. User can press a Stop button and all audio immediately silences
  3. Changing the BPM control updates the BPM-synced LFO rate of all shape animations (range: 40–200 BPM)
  4. Changing the master volume control audibly scales the output level of all voices
**Plans**: 5 plans
Plans:
- [x] 05-00-PLAN.md — Wave 0: test infrastructure — scaffold playbackStore.test.ts, PlaybackControls.test.tsx; update shapeStore and CellPanel tests for BeatFraction animRate
- [x] 05-01-PLAN.md — Wave 1: data layer — create playbackStore (BeatFraction type + computeLfoHz + isPlaying/bpm/volume); migrate Shape.animRate from number to BeatFraction
- [x] 05-02-PLAN.md — Wave 2a: audio engine — wire playbackStore subscription (suspend/resume/volume/BPM LFO update); update createLfo and recreateLfo for BeatFraction
- [x] 05-03-PLAN.md — Wave 2b: canvas engine — wire playbackStore subscription (isPlaying pulseScale gate + dirty flag); update pulseScale formula with computeLfoHz
- [x] 05-04-PLAN.md — Wave 3: UI layer — create PlaybackControls component (BPM widget + Volume slider + Start/Stop button); replace CellPanel animRate slider with beat-fraction selector; human-verify checkpoint
**UI hint**: yes

### Phase 6: Full Visual Language
**Goal**: Complete the visual-to-audio mapping: saturation → harmonic richness (WaveShaper), pan → stereo, key/scale selector constrains pitch; star percussion and multi-shape cells deferred to Phase 7
**Depends on**: Phase 5
**Requirements**: AUDI-03, PLAY-05, PLAY-06
**Success Criteria** (what must be TRUE):
  1. Saturation slider drives WaveShaper harmonic richness (two-stage Chebyshev + soft-clip)
  2. Cell column position routes audio to correct stereo position (StereoPannerNode)
  3. Key/scale selector constrains pitch to selected scale; hue outside scale is quantised to nearest in-scale semitone
  4. Changing root key or scale immediately re-pitches all placed shapes
  5. Chromatic mode available as a scale option (no quantization applied)
**Decision**: Reverb deprecated; WaveShaper harmonic richness adopted. See INGEST-CONFLICTS.md Bucket 2 for full rationale.
**Note**: Star percussion (SHPE-04) and multi-shape per cell (SHPE-06) deferred to Phase 7 per CONTEXT.md.
**Plans**: 4 plans
Plans:
- [x] 06-00-PLAN.md — Wave 0: test infrastructure — fix failing makeDistortionCurve monotonicity test; scaffold scaleStore.test.ts and ScaleSelector.test.tsx in RED state; add quantizeSemitone and pan formula RED tests to audioEngine.test.ts
- [x] 06-01-PLAN.md — Wave 1: data layer — create scaleStore.ts (ScaleName, SCALE_INTERVALS, scaleStore, useScaleStore); add quantizeSemitone export to audioEngine.ts
- [x] 06-02-PLAN.md — Wave 2: audio engine — StereoPannerNode per voice (AudioVoice interface + createVoice + teardown); replace makeDistortionCurve with two-stage algorithm; wire quantizeSemitone in updateVoiceColor; add scaleStore.subscribe
- [x] 06-03-PLAN.md — Wave 3: UI layer — create ScaleSelector component; refactor PlaybackControls to fragment; update App.tsx toolbar; add CSS; human-verify checkpoint
**UI hint**: yes

### Phase 7: Composition Tools
**Goal**: Undo/redo, PNG export, and spline animation curve system replacing LFO
**Depends on**: Phase 6
**Requirements**: COMP-01, COMP-02, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06
**Success Criteria** (what must be TRUE):
  1. Ctrl+Z/Ctrl+Y undo/redo with 50-step depth
  2. Export button produces PNG that visually encodes the full composition
  3. Animation panel opens for selected cell with per-property spline lanes
  4. Spline curves loop with free-float beat duration; polyrhythm visible across lanes
  5. Draggable divider adjusts canvas/panel split
**Decision**: LFO deprecated via staged migration to spline curves. Existing shapes auto-convert animRate BeatFraction to sine spline on first panel open. See INGEST-CONFLICTS.md Bucket 2 for full rationale.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold | 3/4 | In progress | - |
| 2. Audio Engine | 0/3 | Not started | - |
| 3. Canvas Interaction | 3/4 | In Progress|  |
| 4. Shape Panel & Animation | 0/5 | Not started | - |
| 5. Playback Controls | 0/5 | Not started | - |
| 6. Full Visual Language | 0/4 | Not started | - |
| 7. Composition Tools | - | Not started | - |
