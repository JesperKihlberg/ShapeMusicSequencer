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
**Requirements**: PLAY-01, PLAY-02, PLAY-03
**Success Criteria** (what must be TRUE):
  1. User can press a Start button and all placed shapes begin playing audio simultaneously
  2. User can press a Stop button and all audio immediately silences
  3. Changing the BPM control updates the tempo of the BPM-synced visual playhead
  4. Changing the master volume control audibly scales the output level of all voices
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold | 3/4 | In progress | - |
| 2. Audio Engine | 0/3 | Not started | - |
| 3. Canvas Interaction | 3/4 | In Progress|  |
| 4. Shape Panel & Animation | 0/5 | Not started | - |
| 5. Playback Controls | 0/? | Not started | - |
