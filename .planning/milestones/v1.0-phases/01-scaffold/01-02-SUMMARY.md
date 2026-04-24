---
phase: 01-scaffold
plan: 02
subsystem: store + machine
tags: [zustand, immer, zundo, xstate, tdd, shape-store, sequencer-fsm]

# Dependency graph
requires:
  - 01-01 (Vite scaffold, Vitest infra, Wave 0 stub test files)
provides:
  - shapeStore: Zustand vanilla store with immer + temporal middleware
  - selectors.ts: pure selector functions outside the store
  - sequencerMachine: XState v5 FSM with 5 states (idle active, 4 stubs)
  - sequencerActor: singleton actor started at module load
affects:
  - 01-03 (canvasEngine subscribes to shapeStore, reads sequencerActor)
  - 01-04 (CanvasContainer imports shapeStore to dispatch addShape)
  - All subsequent phases extending the store and machine

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED→GREEN: failing test commit before implementation"
    - "temporal(immer()) middleware order — temporal outermost (Pitfall 3)"
    - "createStore from zustand/vanilla — not create() — for non-React consumers"
    - "useShapeStore hook = useStore(shapeStore, selector) for React binding"
    - "Selectors as pure functions in selectors.ts outside the store"
    - "XState v5 setup() for typed SequencerEvent union"
    - "sequencerActor singleton started at module load — getSnapshot().value for sync reads"

key-files:
  created:
    - src/store/shapeStore.ts (vanilla Zustand store + useShapeStore hook)
    - src/store/selectors.ts (5 pure selector functions)
    - src/machine/sequencerMachine.ts (XState v5 FSM + singleton actor)
  modified:
    - src/store/shapeStore.test.ts (replaced it.todo stubs with 7 real tests)

key-decisions:
  - "temporal(immer()) ordering confirmed — shapeStore.temporal.getState().clear() works in tests"
  - "createStore (vanilla) chosen over create (React) — canvas engine subscribes without React"
  - "Selectors in separate selectors.ts file — keeps store lean, selectors independently testable"
  - "sequencerMachine uses 5 states with empty on:{} for stub states — structural scaffolding for Phase 2+"

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 01 Plan 02: shapeStore + sequencerMachine Summary

**Zustand vanilla store with temporal(immer()) middleware and XState v5 sequencer FSM — 7 unit tests green, tsc --noEmit clean**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T13:25:55Z
- **Completed:** 2026-04-14T13:27:57Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- Implemented `shapeStore.ts` using `createStore` from `zustand/vanilla` with `temporal(immer())` middleware — vanilla store lets the canvas engine subscribe without React
- Confirmed middleware stacking order: `temporal` outermost, `immer` innermost; `shapeStore.temporal.getState().clear()` works correctly in tests (resolving Assumption A1 from RESEARCH.md)
- Implemented `selectors.ts` with 5 pure selector functions outside the store — avoids unnecessary re-renders when used with `useShapeStore(selector)`
- Implemented `sequencerMachine.ts` using XState v5 `setup()` with typed `SequencerEvent` union; 5 states wired (`idle` active, 4 stubs for Phase 2+); singleton actor started at module load
- Replaced 3 `it.todo` stub tests with 7 real assertions; all pass; `tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `69a4bb0` (test)
2. **Task 1 GREEN: shapeStore + selectors implementation** - `7489031` (feat)
3. **Task 2: sequencerMachine** - `27235cf` (feat)

## Files Created/Modified

- `src/store/shapeStore.ts` - Vanilla Zustand store: Shape type, ShapeState, addShape action, useShapeStore hook
- `src/store/selectors.ts` - selectShapes, selectShapeAt, selectCellOccupied, selectShapeCount, selectShapeById
- `src/machine/sequencerMachine.ts` - XState v5 FSM with SequencerEvent union; sequencerActor singleton
- `src/store/shapeStore.test.ts` - 7 real tests covering addShape, uniqueness, fields, 16-cell capacity

## Decisions Made

- `temporal(immer())` stacking order verified at runtime — `shapeStore.temporal` is accessible on the vanilla store (Assumption A1 resolved: TRUE, it works)
- Used `createStore` (vanilla) not `create` (React) — required for canvas engine to subscribe in Plan 03
- Selectors in a separate `selectors.ts` file rather than inside the store module — keeps store lean and pure functions independently importable/testable
- `sequencerMachine` states use empty `on: {}` for stubs — valid XState v5 syntax, structurally scaffolds Phase 2+ transitions without any current-phase risk

## Deviations from Plan

None — plan executed exactly as written. All patterns from RESEARCH.md applied correctly. Assumption A1 (temporal + vanilla createStore compatibility) confirmed TRUE during implementation.

## Known Stubs

The following are intentional stub states in `sequencerMachine.ts` — they are structural placeholders, not broken functionality:

| File | Location | Reason |
|------|----------|--------|
| src/machine/sequencerMachine.ts | `playing: { on: {} }` | Phase 2+ — audio playback transitions not yet defined |
| src/machine/sequencerMachine.ts | `selected: { on: {} }` | Phase 3+ — shape selection transitions not yet defined |
| src/machine/sequencerMachine.ts | `dragging: { on: {} }` | Phase 3+ — drag interaction transitions not yet defined |
| src/machine/sequencerMachine.ts | `playingDragging: { on: {} }` | Phase 3+ — combined mode transitions not yet defined |

These stubs are required by D-05 (all three layers scaffolded in Phase 1). They are intentional and do not prevent this plan's goal from being achieved.

## Self-Check: PASSED

- `src/store/shapeStore.ts` — FOUND
- `src/store/selectors.ts` — FOUND
- `src/machine/sequencerMachine.ts` — FOUND
- `src/store/shapeStore.test.ts` — FOUND (7 tests, all pass)
- Commit `69a4bb0` — FOUND (RED test commit)
- Commit `7489031` — FOUND (GREEN implementation commit)
- Commit `27235cf` — FOUND (sequencerMachine commit)

---
*Phase: 01-scaffold*
*Completed: 2026-04-14*
