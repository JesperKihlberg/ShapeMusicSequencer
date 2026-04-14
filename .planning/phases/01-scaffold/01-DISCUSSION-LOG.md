# Phase 1: Scaffold - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-Scaffold
**Areas discussed:** Build tooling, Canvas rendering approach, Grid cell design, Prototype as reference

---

## Build Tooling

| Option | Description | Selected |
|--------|-------------|----------|
| Vite | Fast dev server, instant HMR, minimal config. Modern default for new React + TS projects. | ✓ |
| Create React App | Older, slower, officially deprecated. | |
| Next.js | Full-stack framework — overkill for client-only PoC. | |

**User's choice:** Vite

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strict mode on | `strict: true` in tsconfig. Catches more bugs. | ✓ |
| Relaxed (no strict) | Faster to scaffold but misses type errors. | |

**User's choice:** Strict mode on

---

## Canvas Rendering Approach

| Option | Description | Selected |
|--------|-------------|----------|
| HTML Canvas | Same as the prototype. Full control, best performance for animated shapes. | ✓ |
| DOM / CSS Grid + SVG shapes | More React-native but hit-testing and animations get complex. | |
| Pure SVG | Clean for simple shapes but animation performance can degrade. | |

**User's choice:** HTML Canvas

---

| Option | Description | Selected |
|--------|-------------|----------|
| useRef + useEffect | React holds state; useEffect re-renders canvas on state change. | |
| Canvas component owns render loop | RAF inside component, reads from refs. | |
| **User's custom architecture** | Zustand + Immer + zundo; XState FSM; canvas engine outside React. | ✓ |

**User's choice (free text):** Full three-layer architecture:
- Zustand + Immer for shape data store with zundo for undo/redo
- XState for behavioral FSM (idle/playing/selected/dragging/playingDragging)
- Canvas engine outside React subscribing to Zustand raw API at 60fps
- React only renders toolbar + shape editor panels

---

| Option | Description | Selected |
|--------|-------------|----------|
| Scaffold all three layers | Wire up all layers as stubs from the start. | ✓ |
| Minimum viable useState + canvas | Defer architecture to Phase 2. | |

**User's choice:** Scaffold all three layers

---

## Grid Cell Design

| Option | Description | Selected |
|--------|-------------|----------|
| Square cells, fills available space | Cell size computed from container. Responsive. | ✓ |
| Fixed pixel cell size | Predictable but not responsive. | |
| You decide | Leave to Claude. | |

**User's choice:** Square cells filling available space

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle grid lines only | Empty = plain space. Shape speaks for itself. | ✓ |
| Empty cells have placeholder | Faint dashed border or + icon. More affordant but adds noise. | |

**User's choice:** Subtle grid lines only

---

## Prototype as Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Port visual/drawing logic, rebuild architecture | Reuse canvas drawing code as reference; rebuild state + events. | |
| Keep HTML alongside React app | Build React separately, prototype as A/B reference. | |
| Replace entirely — build from first principles | Ignore prototype code entirely. | ✓ |

**User's choice:** Build React from first principles — don't port prototype code

---

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the HTML file | Clean repo, one source of truth. | |
| Keep as archive reference | Leave in repo root, not linked. | ✓ |
| You decide | Leave to Claude. | |

**User's choice:** Keep `shape_music_sequencer.html` as archive reference

---

## Claude's Discretion

- ESLint / Prettier configuration
- Specific library versions (XState v4 vs v5, Zustand version, zundo version)
- Project directory structure
- Shape size relative to cell size
- Canvas background color and grid line styling

## Deferred Ideas

None.
