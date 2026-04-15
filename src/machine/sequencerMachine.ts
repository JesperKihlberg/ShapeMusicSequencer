// src/machine/sequencerMachine.ts
// XState v5 behavioral FSM for sequencer interaction modes
// Uses setup() for typed events (RESEARCH.md Pattern 2, Pitfall 6)
// Pattern: Singleton actor started once, shared across the app
import { setup, createActor } from 'xstate'

// All events the machine can receive.
// Phase 1 uses only idle state; other events wired but not yet handled.
type SequencerEvent =
  | { type: 'PLAY' }
  | { type: 'STOP' }
  | { type: 'SELECT'; shapeId: string }
  | { type: 'DESELECT' }
  | { type: 'DRAG_START' }
  | { type: 'DRAG_END' }

const sequencerMachine = setup({
  types: {
    events: {} as SequencerEvent,
  },
}).createMachine({
  id: 'sequencer',
  initial: 'playing',  // Phase 2 default — Phase 5 will add idle/stopped state + PLAY/STOP transitions
  states: {
    idle:            { on: {} }, // Deferred — Phase 5 adds STOP transition to reach this state
    playing:         { on: {} }, // Phase 2+: boot state (D-13)
    selected:        { on: {} }, // Stub — Phase 3+
    dragging:        { on: {} }, // Stub — Phase 3+
    playingDragging: { on: {} }, // Stub — Phase 3+
  },
})

// Singleton actor — started once at module load, shared across the app.
// Canvas engine reads current state synchronously via:
//   sequencerActor.getSnapshot().value
export const sequencerActor = createActor(sequencerMachine)
sequencerActor.start()
