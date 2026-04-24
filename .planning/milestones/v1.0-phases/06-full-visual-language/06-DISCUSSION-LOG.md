---
phase: 06-full-visual-language
session: 2026-04-22
---

# Phase 6 Discussion Log

## Areas covered

### Gray area selection
All four areas selected: WaveShaper harmonic richness, Star noise burst, Key/scale selector, Multi-shape per cell.

### WaveShaper harmonic richness
- Q: Sound/feel of saturation slider → **Two-stage: Chebyshev harmonics + soft-clip limiter**
- Q: Saturation at 0 → **Identity passthrough (perfectly clean)**

### Star noise burst
- Q: Percussion mechanism → **User: "controlled by animation properties"** → deferred to Phase 7 (depends on spline system)
- Q: Pitch mapping → **Bandpass-filtered noise (hue → filter centre)** — design captured for Phase 7
- Q: Phase 6 interim approach → **Skip star for Phase 6; keep sawtooth oscillator**

### Key/scale selector
- Q: UI placement → **Toolbar, inline with BPM/Volume**
- Q: Live re-pitch on change → **Yes — all shapes re-pitch immediately**
- Q: Chromatic mode presentation → **Chromatic is one option in the scale dropdown**
- Q: Root key granularity → **All 12 chromatic roots**

### Multi-shape per cell
- Q: Cap per cell → **Deferred to later phase**
- Q: Add 2nd shape UX → **Deferred**
- Q: CellPanel multi-shape → **Deferred**

## Decisions summary
1. WaveShaper: two-stage Chebyshev+clip, identity at s=0
2. Stereo pan: StereoPannerNode between GainNode and masterGain, set at creation, formula (col/3)*2-1
3. Key/scale: scaleStore, toolbar placement, 12 roots × 7 scales + chromatic, live re-pitch
4. Star: deferred to Phase 7
5. Multi-shape: deferred to later phase
