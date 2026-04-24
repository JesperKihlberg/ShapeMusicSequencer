---
plan: 07-01
phase: 07-composition-tools
status: complete
wave: 1
completed: 2026-04-23
---

# Plan 07-01 Summary: Wave 1 Data Layer

## What Was Built

Core data contract for the spline animation system. animationStore is the single source of truth for all per-shape curves. animRate removed from shapeStore completing LFO demolition at the data layer.

## Files Created/Modified

- **src/store/animationStore.ts** (new) — vanilla Zustand store: setCurve, removeCurve, clearShape; exports AnimatableProperty, SplineCurve, SplinePoint, ShapeCurves, AnimationState, animationStore, useAnimationStore
- **src/store/shapeStore.ts** (modified) — removed animRate from Shape interface and addShape default; removeShape now calls animationStore.clearShape(removedId); replaced BeatFraction import with animationStore import
- **src/store/shapeStore.test.ts** (modified) — updated animRate test to assert field is absent
- **src/store/playbackStore.ts** (modified) — added TODO comments marking BeatFraction/computeLfoHz for removal in later waves

## Verification

- `npx vitest run src/store/animationStore.test.ts` — 10/10 pass (GREEN)
- `npx vitest run src/store/shapeStore.test.ts` — 17/17 pass
- `npx tsc --noEmit` — 0 errors

## Self-Check: PASSED
