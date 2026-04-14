# Phase 1: Scaffold - Research

**Researched:** 2026-04-14
**Domain:** Vite + React + TypeScript project scaffold; Zustand + Immer + zundo state store; XState v5 FSM; HTML Canvas engine outside React
**Confidence:** HIGH (stack fully verified against npm registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Vite as the build tool and dev server. No Create React App, no Next.js.
- **D-02:** TypeScript strict mode on (`strict: true` in tsconfig). No relaxed config.
- **D-03:** Render shapes on an HTML Canvas element. Not DOM/CSS, not SVG.
- **D-04:** Three-layer architecture, fully wired from Phase 1:
  - Zustand + Immer middleware for shape data store. zundo temporal middleware for undo/redo.
  - XState behavioral FSM for sequencer modes: `idle`, `playing`, `selected`, `dragging`, `playingDragging`.
  - Canvas engine outside React — subscribes directly to Zustand raw store API (no React re-renders), reads behavioral mode from XState via sync call, runs independent RAF loop at 60fps.
  - React renders only the toolbar and shape editor panels — never touches the canvas.
- **D-05:** All three layers (Zustand store, XState machine, canvas engine) scaffolded in Phase 1 — even if stubs. No refactoring in Phase 2.
- **D-06:** Grid cells are square, sized dynamically: `cellSize = Math.floor(Math.min(containerWidth, containerHeight) / 4)`.
- **D-07:** Shapes are centered at cell midpoints. Clicking a cell snaps placement to cell center.
- **D-08:** Visual treatment: subtle grid lines only (low opacity). A placed shape visually fills its cell.
- **D-09:** Build React app from first principles — do not port prototype code.
- **D-10:** `shape_music_sequencer.html` kept in the repo as archive reference only.

### Claude's Discretion

- Selectors defined outside the Zustand store (avoid unnecessary re-renders).
- Specific XState version (v4 vs v5), Zustand version, zundo version — use latest stable.
- ESLint / Prettier configuration — standard setup.
- Project directory structure (where to put store, machine, canvas engine).
- Shape size relative to cell size.
- Canvas background color and grid line opacity/color.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANV-01 | User can place a shape on any empty grid cell (4x4 grid, up to 16 cells) | Grid cell sizing math verified; click-to-cell hit detection pattern documented; Zustand store shape schema defined; canvas engine subscription pattern verified |
</phase_requirements>

---

## Summary

Phase 1 establishes the complete three-layer architecture for the Shape Music Sequencer with no audio. The stack is Vite 8 + React 19 + TypeScript 6 for the outer shell; Zustand 5 + Immer 11 + zundo 2 for the shape data store; XState v5 for the behavioral FSM; and a standalone canvas engine module that subscribes to the Zustand raw store API. Nothing in this phase is experimental — all packages are at stable latest releases.

The architectural complexity is the canvas engine running outside React. Zustand's `createStore` (from `zustand/vanilla`) is the correct tool: it returns a plain object with `getState()`, `setState()`, and `subscribe()` that work identically to the React `useStore` binding but with no component lifecycle dependency. The canvas engine gets a reference to this store at initialization time and subscribes once; all subsequent redraws are triggered by store change events, not React renders.

XState v5 replaces the old typegen approach with the `setup()` function for type-safe machines. The sequencer machine for this phase needs only the `idle` state — the others (`playing`, `selected`, `dragging`, `playingDragging`) are scaffolded as valid states with no transitions yet. `createActor(machine).start()` returns a running actor; `actor.getSnapshot().value` reads current state synchronously from the canvas engine's RAF loop without subscriptions.

**Primary recommendation:** Scaffold with `npm create vite@latest . -- --template react-ts`, install `zustand immer zundo xstate @xstate/react`, then build the three layers as separate modules that wire together in `main.tsx`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.0.8 | Dev server + build tool | Fastest HMR for React+TS; official react-ts template; no CRA overhead |
| react | 19.2.5 | UI rendering | Only renders toolbar; React 19 stable, no breaking changes for this use |
| react-dom | 19.2.5 | React DOM renderer | Paired with react |
| typescript | 6.0.2 | Type safety | strict mode locked (D-02); v6 is latest stable |
| @vitejs/plugin-react | 6.0.1 | React HMR + JSX transform | Official Vite React plugin; uses SWC transform |
| zustand | 5.0.12 | Shape state store | Industry standard for small-medium React apps; vanilla API for canvas engine |
| immer | 11.1.4 | Immutable state updates | Zustand's canonical middleware for mutable-style writes; prevents accidental mutation |
| zundo | 2.3.0 | Undo/redo temporal middleware | "Zero extra code" undo/redo wrapping the Zustand store |
| xstate | 5.30.0 | Behavioral FSM | Prevents boolean flag soup for interaction modes; XState v5 is latest stable |
| @xstate/react | 6.1.0 | useMachine / useActor hooks | Provides React bindings for the machine in toolbar/panel components |

### Supporting (dev)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.4 | Unit testing | Vite-native test runner; zero config for Vite projects |
| @vitest/ui | 4.1.4 | Test UI | Optional browser UI for test results |
| @testing-library/react | 16.3.2 | Component testing | For testing toolbar and store interactions |
| @testing-library/user-event | 14.6.1 | Simulated user events | Click simulation for canvas interaction tests |
| eslint | 10.2.0 | Linting | Standard JS ecosystem linter |
| prettier | 3.8.2 | Formatting | Code style enforcement |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zustand/vanilla `createStore` | Jotai, MobX | Zustand locked (D-04); vanilla API is the correct escape hatch for non-React modules |
| XState v5 | v4 | v5 is latest stable, `setup()` gives better TypeScript than v4 typegen |
| Immer middleware | Manual spread | Immer prevents mutation bugs in nested shape objects; negligible bundle size |
| zundo | Custom undo stack | zundo wraps store automatically; no reimplementing history management |

**Installation (from project root):**
```bash
npm create vite@latest . -- --template react-ts
npm install zustand immer zundo xstate @xstate/react
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event
```

**Version verification (confirmed via npm registry 2026-04-14):**
- `vite@8.0.8` — [VERIFIED: npm registry]
- `react@19.2.5` — [VERIFIED: npm registry]
- `typescript@6.0.2` — [VERIFIED: npm registry]
- `zustand@5.0.12` — [VERIFIED: npm registry]
- `immer@11.1.4` — [VERIFIED: npm registry]
- `zundo@2.3.0` — [VERIFIED: npm registry]
- `xstate@5.30.0` — [VERIFIED: npm registry]
- `@xstate/react@6.1.0` — [VERIFIED: npm registry]
- `vitest@4.1.4` — [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.tsx              # App entry — wires all three layers together
├── App.tsx               # Root React shell (flex column, full viewport)
├── store/
│   ├── shapeStore.ts     # Zustand vanilla store with immer + zundo
│   └── selectors.ts      # Pure selector functions (outside store, per D-Claude)
├── machine/
│   └── sequencerMachine.ts  # XState v5 sequencer FSM
├── engine/
│   └── canvasEngine.ts   # Standalone RAF loop — subscribes to store, reads machine
├── components/
│   ├── Toolbar.tsx        # React toolbar component (title only in Phase 1)
│   └── CanvasContainer.tsx # React wrapper div — mounts engine, handles resize
└── styles/
    └── index.css          # CSS custom properties + global reset
```

### Pattern 1: Zustand Vanilla Store Outside React

**What:** Create the store with `createStore` from `zustand/vanilla` so it has no React dependency. React components bind to it via `useStore` from `zustand`; the canvas engine accesses it directly.

**When to use:** Any non-React module that needs to read or subscribe to application state.

**Example:**
```typescript
// Source: Verified against zustand GitHub docs 2026-04-14
// src/store/shapeStore.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'

export interface Shape {
  id: string
  col: number      // 0-3
  row: number      // 0-3
  color: string    // hex e.g. '#3b6cd4'
  type: 'circle'   // Phase 1 only; expanded in Phase 2+
}

interface ShapeState {
  shapes: Shape[]
  addShape: (col: number, row: number) => void
}

export const shapeStore = createStore<ShapeState>()(
  temporal(
    immer((set) => ({
      shapes: [],
      addShape: (col, row) =>
        set((state) => {
          const occupied = state.shapes.some(s => s.col === col && s.row === row)
          if (!occupied) {
            state.shapes.push({
              id: crypto.randomUUID(),
              col,
              row,
              color: 'hsl(220, 70%, 60%)',
              type: 'circle',
            })
          }
        }),
    }))
  )
)

// React hook — re-renders only when selected slice changes
export const useShapeStore = <T>(selector: (state: ShapeState) => T) =>
  useStore(shapeStore, selector)
```

### Pattern 2: XState v5 Machine — `setup()` for TypeScript Safety

**What:** Define the sequencer machine with `setup()` to get typed events and context. Only `idle` state is active in Phase 1; remaining states are structural stubs.

**When to use:** Phase 1 scaffolding: wire the machine, only `idle` state matters. All other states left with empty `on: {}` for Phase 2+ to populate.

**Example:**
```typescript
// Source: Verified against stately.ai/docs/typescript 2026-04-14
// src/machine/sequencerMachine.ts
import { setup, createActor } from 'xstate'

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
  initial: 'idle',
  states: {
    idle:           { on: {} },  // Phase 1 uses only this state
    playing:        { on: {} },  // Stub — Phase 2+
    selected:       { on: {} },  // Stub — Phase 3+
    dragging:       { on: {} },  // Stub — Phase 3+
    playingDragging:{ on: {} },  // Stub — Phase 3+
  },
})

// Singleton actor — started once, shared across the app
export const sequencerActor = createActor(sequencerMachine)
sequencerActor.start()
```

### Pattern 3: Canvas Engine — Standalone RAF Loop

**What:** The canvas engine is a plain TypeScript module (not a React component) that receives references to the canvas element, the Zustand store, and the XState actor. It subscribes once to the store and starts a RAF loop.

**When to use:** The engine is initialized in `CanvasContainer`'s `useEffect` after the canvas DOM element is available.

**Key detail:** The RAF loop in Phase 1 does NOT run every frame unconditionally. It redraws only when the store changes (triggered by the subscription) using a dirty flag. This avoids burning CPU at 60fps for a static canvas.

**Example:**
```typescript
// Source: Architecture pattern derived from D-04, CONTEXT.md + vanilla store API
// src/engine/canvasEngine.ts
import { shapeStore, Shape } from '../store/shapeStore'
import { sequencerActor } from '../machine/sequencerMachine'

interface EngineOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
}

export function initCanvasEngine({ canvas, container }: EngineOptions) {
  const ctx = canvas.getContext('2d')!
  let rafId: number | null = null
  let dirty = true

  function resize() {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    dirty = true
  }

  function cellSize(): number {
    return Math.floor(Math.min(canvas.width, canvas.height) / 4)
  }

  function drawGrid() {
    const size = cellSize()
    const gridPx = size * 4
    const offsetX = Math.floor((canvas.width - gridPx) / 2)
    const offsetY = Math.floor((canvas.height - gridPx) / 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath()
      ctx.moveTo(offsetX + i * size, offsetY)
      ctx.lineTo(offsetX + i * size, offsetY + gridPx)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY + i * size)
      ctx.lineTo(offsetX + gridPx, offsetY + i * size)
      ctx.stroke()
    }
  }

  function drawShapes(shapes: Shape[]) {
    const size = cellSize()
    const gridPx = size * 4
    const offsetX = Math.floor((canvas.width - gridPx) / 2)
    const offsetY = Math.floor((canvas.height - gridPx) / 2)
    for (const shape of shapes) {
      const cx = offsetX + shape.col * size + size / 2
      const cy = offsetY + shape.row * size + size / 2
      const radius = size * 0.35
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = shape.color.replace(')', ', 0.85)').replace('hsl', 'hsla')
      ctx.fill()
      ctx.strokeStyle = shape.color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  function render() {
    if (!dirty) return
    dirty = false
    ctx.fillStyle = '#111113'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid()
    drawShapes(shapeStore.getState().shapes)
  }

  function loop() {
    render()
    rafId = requestAnimationFrame(loop)
  }

  // Subscribe to store changes — set dirty flag only
  const unsubscribe = shapeStore.subscribe(() => { dirty = true })

  // Handle container resize
  const resizeObserver = new ResizeObserver(() => { resize(); dirty = true })
  resizeObserver.observe(container)
  resize()

  // Start loop
  rafId = requestAnimationFrame(loop)

  // Cleanup
  return function destroy() {
    if (rafId !== null) cancelAnimationFrame(rafId)
    unsubscribe()
    resizeObserver.disconnect()
  }
}
```

### Pattern 4: Engine Mount in React via useEffect

**What:** The canvas engine is mounted inside a React `useEffect` so it gets the real DOM element after first render. The effect returns the `destroy` function as cleanup.

**Example:**
```typescript
// src/components/CanvasContainer.tsx
import { useEffect, useRef } from 'react'
import { initCanvasEngine } from '../engine/canvasEngine'

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return
    const destroy = initCanvasEngine({
      canvas: canvasRef.current,
      container: containerRef.current,
    })
    return destroy
  }, []) // empty deps — mount once

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    // Translate click to grid cell, then dispatch to store
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)
    const size = Math.floor(Math.min(canvas.width, canvas.height) / 4)
    const gridPx = size * 4
    const offsetX = Math.floor((canvas.width - gridPx) / 2)
    const offsetY = Math.floor((canvas.height - gridPx) / 2)
    const localX = canvasX - offsetX
    const localY = canvasY - offsetY
    if (localX < 0 || localY < 0 || localX > gridPx || localY > gridPx) return
    const col = Math.min(3, Math.floor(localX / size))
    const row = Math.min(3, Math.floor(localY / size))
    // Import store action and dispatch
    import('../store/shapeStore').then(({ shapeStore }) => {
      shapeStore.getState().addShape(col, row)
    })
  }

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        role="application"
        aria-label="Shape music sequencer canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <span style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: 11, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none'
      }}>
        Click an empty cell to place a shape
      </span>
    </div>
  )
}
```

### Pattern 5: zundo Temporal Access for Undo/Redo

**What:** zundo wraps the store automatically. `useShapeStore.temporal.getState()` provides `undo`, `redo`, `clear`. No manual tracking.

**Example:**
```typescript
// Source: Verified against charkour/zundo GitHub page 2026-04-14
// In a future toolbar component (Phase 3+ but scaffold supports it now):
const { undo, redo } = useShapeStore.temporal.getState()
// or from outside React:
const { undo, redo } = shapeStore.temporal.getState()
```

**Note:** `shapeStore.temporal` is attached by zundo when using `createStore` with the `temporal` middleware. [ASSUMED: the vanilla createStore + temporal middleware combination stacks correctly. Verify by running the app — the zundo docs show `create()` usage, not `createStore()`. If type errors appear, see Pitfall 3.]

### Anti-Patterns to Avoid

- **Subscribing in React components with `store.subscribe()`:** Use `useShapeStore(selector)` instead — React will handle re-render subscriptions. Manual `subscribe` is for the canvas engine only.
- **Reading XState state via `actor.subscribe()` in the RAF loop:** Use `actor.getSnapshot().value` synchronously instead. `subscribe` is async-ish and creates unnecessary overhead in a 60fps loop.
- **Setting canvas element `width`/`height` via CSS only:** CSS controls display size; actual canvas resolution is set via the `.width` and `.height` properties. Must set both or drawings will be stretched/blurred.
- **Using `requestAnimationFrame` without the dirty flag:** Unconditional 60fps redraws for a static canvas burns battery. Use the dirty flag pattern (set by store subscription).
- **Putting canvas drawing code inside React render:** Violates D-04. React must never touch the canvas.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Immutable state updates | Custom copy-on-write for shape array | `immer` middleware | Nested object mutation bugs are subtle; immer handles structural sharing |
| Undo/redo history | Custom `past[]`/`future[]` arrays | `zundo` temporal middleware | Time-travel is deceptively complex: batch size, circular buffer, action filtering |
| Behavioral mode tracking | `isPlaying: boolean`, `isDragging: boolean`, etc. | XState FSM | Boolean combinations create 2^n impossible states; XState makes invalid combos structurally impossible |
| React re-render optimization | Manual `shouldComponentUpdate` | `useShapeStore(selector)` | Zustand selector already provides referential equality check |
| Unique shape IDs | Manual counter or timestamp | `crypto.randomUUID()` | Browser-native, collision-free, no dependency |

**Key insight:** The three-layer architecture specifically prevents the "boolean flag soup" problem at the cost of some setup complexity. The setup is done once in Phase 1; all future phases extend the existing layers.

---

## Runtime State Inventory

Phase 1 is greenfield (no existing runtime state). This section is not applicable.

---

## Common Pitfalls

### Pitfall 1: Canvas Resolution vs Display Size Mismatch

**What goes wrong:** Canvas looks blurry, especially on high-DPI / Retina displays.

**Why it happens:** Setting only CSS `width: 100%; height: 100%` scales the canvas element but not its drawing buffer.

**How to avoid:** Always sync canvas `.width` and `.height` attributes to the container's pixel dimensions in the `resize()` function. For HiDPI, multiply by `window.devicePixelRatio` and scale the context:
```typescript
function resize() {
  const dpr = window.devicePixelRatio || 1
  canvas.width = container.clientWidth * dpr
  canvas.height = container.clientHeight * dpr
  ctx.scale(dpr, dpr)
  dirty = true
}
```
**Warning signs:** Shapes look fuzzy, especially on laptop screens.

**Phase 1 scope:** DPR handling is recommended but can be Phase 1 scope. If skipped, mark it as a known issue.

### Pitfall 2: Fractional Cell Size Causes Grid Line Bleed

**What goes wrong:** Grid lines appear doubled, blurry, or offset when cell size has fractional pixels.

**Why it happens:** `Math.min(w, h) / 4` can be non-integer for odd container sizes. The UI-SPEC mandates `Math.floor`.

**How to avoid:** Always apply `Math.floor` to cell size before using it in any drawing calculation. Also use integer offsets for the grid position.

**Warning signs:** Grid lines appear thick or doubled on certain window sizes.

### Pitfall 3: Stacking `temporal` + `immer` Middleware Order

**What goes wrong:** TypeScript type errors or runtime errors when combining zundo `temporal` and zustand `immer` middleware.

**Why it happens:** Middleware order matters. `temporal` must wrap `immer`, not the other way around. The pattern is: `temporal(immer((set) => ...))`. [ASSUMED: based on zundo documentation showing this pattern is standard. Verify during implementation.]

**How to avoid:** Always put `temporal` on the outside, `immer` on the inside. If combining more middleware (e.g., `persist` in future phases), maintain this nesting order.

**Warning signs:** TypeScript error on `shapeStore.temporal` — means the temporal wrapper wasn't outermost.

### Pitfall 4: ResizeObserver Not Available in Test Environment

**What goes wrong:** Tests that mount `CanvasContainer` crash because `ResizeObserver` is not defined in jsdom.

**Why it happens:** jsdom doesn't implement `ResizeObserver`.

**How to avoid:** In vitest setup, mock `ResizeObserver`:
```typescript
// vitest.setup.ts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
```

**Warning signs:** `ReferenceError: ResizeObserver is not defined` in test output.

### Pitfall 5: Dynamic Import in Click Handler Creates Race Condition

**What goes wrong:** `import('../store/shapeStore')` inside the click handler creates unnecessary async overhead.

**Why it happens:** The example in Pattern 4 above uses dynamic import for illustration. In the real implementation, import the store statically at module top.

**How to avoid:** Import `shapeStore` at the top of `CanvasContainer.tsx` as a static import. Dynamic imports are only needed for code splitting, which this app doesn't need in Phase 1.

### Pitfall 6: XState v5 Requires TypeScript 5+

**What goes wrong:** Type errors throughout the machine definition.

**Why it happens:** XState v5 uses TypeScript 5 features (satisfies, const type parameters).

**How to avoid:** Confirm `tsconfig.json` targets TypeScript 5+. The Vite `react-ts` template ships with TypeScript configured; check the version is ≥ 5.0. [VERIFIED: npm registry shows typescript@6.0.2 is current; template will install this.]

---

## Code Examples

### Grid Cell Math (from UI-SPEC)
```typescript
// Source: 01-UI-SPEC.md Section 7 — Interaction Contract
function cellAtPoint(canvasX: number, canvasY: number, canvasW: number, canvasH: number) {
  const cellSize = Math.floor(Math.min(canvasW, canvasH) / 4)
  const gridPx = cellSize * 4
  const offsetX = Math.floor((canvasW - gridPx) / 2)
  const offsetY = Math.floor((canvasH - gridPx) / 2)
  const localX = canvasX - offsetX
  const localY = canvasY - offsetY
  if (localX < 0 || localY < 0 || localX > gridPx || localY > gridPx) return null
  return {
    col: Math.min(3, Math.floor(localX / cellSize)),
    row: Math.min(3, Math.floor(localY / cellSize)),
  }
}
```

### Shape Center Point Calculation
```typescript
// Source: D-06, D-07 from CONTEXT.md + UI-SPEC Section 6
function cellCenter(col: number, row: number, canvasW: number, canvasH: number) {
  const cellSize = Math.floor(Math.min(canvasW, canvasH) / 4)
  const gridPx = cellSize * 4
  const offsetX = Math.floor((canvasW - gridPx) / 2)
  const offsetY = Math.floor((canvasH - gridPx) / 2)
  return {
    x: offsetX + col * cellSize + Math.floor(cellSize / 2),
    y: offsetY + row * cellSize + Math.floor(cellSize / 2),
  }
}
```

### Circle Drawing (from prototype + UI-SPEC Section 6)
```typescript
// Source: shape_music_sequencer.html drawShape() + UI-SPEC canvas rendering contract
// radius = cellSize * 0.35 (UI-SPEC Section 6)
// fill opacity 0.85, stroke opacity 1.0
function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, cellSize: number, color: string) {
  const radius = Math.floor(cellSize * 0.35)
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = color  // at 0.85 opacity — apply when setting color
  ctx.fill()
  ctx.strokeStyle = color  // at 1.0 opacity
  ctx.lineWidth = 1.5
  ctx.stroke()
}
```

### CSS Token Root Block (complete from UI-SPEC Section 12)
```css
/* Source: 01-UI-SPEC.md Section 12 — Token Reference Sheet */
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --text-xs:    11px;
  --text-sm:    12px;
  --text-base:  13px;
  --text-title: 14px;
  --weight-regular: 400;
  --weight-medium:  500;

  --color-bg-primary:   #111113;
  --color-bg-secondary: #1a1a1e;
  --color-bg-tertiary:  #222226;

  --color-border-primary:   rgba(255, 255, 255, 0.18);
  --color-border-secondary: rgba(255, 255, 255, 0.10);
  --color-border-tertiary:  rgba(255, 255, 255, 0.06);

  --color-text-primary:   rgba(255, 255, 255, 0.88);
  --color-text-secondary: rgba(255, 255, 255, 0.55);
  --color-text-tertiary:  rgba(255, 255, 255, 0.35);

  --color-accent:    #6366f1;
  --color-danger:    #ef4444;
  --color-bg-danger: rgba(239, 68, 68, 0.10);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XState v4 typegen (`.typegen.ts` files) | XState v5 `setup()` function typing | XState v5 (2024) | No separate type generation step; types inferred inline |
| `create()` from zustand (React-only) | `createStore()` from `zustand/vanilla` for cross-environment stores | Zustand v4+ | Canvas engine can subscribe without React |
| `immer` imported from `immer` directly | `immer` middleware from `zustand/middleware/immer` | Zustand v4+ | Reduces boilerplate; middleware stacking pattern |
| CRA (`create-react-app`) | `npm create vite@latest -- --template react-ts` | 2022+ | CRA deprecated; Vite is standard |

**Deprecated/outdated:**
- `@xstate/fsm` (lightweight XState v3): Superseded by XState v5's smaller bundle and better types. Do not use.
- XState v4's `Machine()` factory: Replaced by `createMachine()` and `setup().createMachine()` in v5.
- Zustand v3's `create(devtools(immer(...)))` pattern: v4/v5 middleware stacking is cleaner.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `temporal(immer(...))` stacking order is correct for `createStore` (vanilla) | Architecture Patterns / Pitfall 3 | Type errors at store definition; need to swap order or find correct nesting |
| A2 | `shapeStore.temporal.getState()` is accessible on the vanilla `createStore` result (not just on `create()` React store) | Pattern 5 | Undo/redo hook won't be accessible; may need `useTemporalStore` pattern instead |
| A3 | High-DPI / devicePixelRatio handling is not required for Phase 1 success criteria | Pitfall 1 | Canvas may look blurry on Retina displays but won't block success criteria |

---

## Open Questions

1. **zundo + vanilla createStore compatibility**
   - What we know: zundo docs show `create()` (React) usage. The vanilla `createStore` API is compatible with the same middleware system.
   - What's unclear: Whether `temporal()` attaches `.temporal` to the vanilla store reference correctly, or if the React `create()` path is needed.
   - Recommendation: Implement and verify in the first plan task. If `shapeStore.temporal` is undefined, switch to using `create()` from `zustand` and exposing the store reference via `shapeStore.getState` internally.

2. **devicePixelRatio handling in Phase 1**
   - What we know: The UI-SPEC does not mention DPR handling. The success criteria are functional, not visual-fidelity.
   - What's unclear: Whether blurry canvas on Retina machines constitutes a phase failure.
   - Recommendation: Add DPR handling — it's two lines. Costs nothing; prevents later "why is it blurry" confusion.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Package management, Vite dev server | Yes | v22.19.0 | — |
| npm | Package installation | Yes | 11.7.0 | — |
| Vite (via npx) | Dev server scaffold | Yes | 8.0.8 | — |
| Git | Version control | Yes | 2.51.0.windows.1 | — |
| Browser (Chrome/Firefox) | Canvas API, RAF, ResizeObserver | [ASSUMED: available] | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Note:** This is a greenfield project. No app files exist yet beyond the prototype HTML and planning artifacts. `npm create vite@latest` will generate the full initial scaffold.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `vitest.config.ts` — Wave 0 creation required |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANV-01 | Calling `addShape(col, row)` on empty cell adds shape to store | unit | `npx vitest run src/store/shapeStore.test.ts` | No — Wave 0 |
| CANV-01 | Calling `addShape(col, row)` on occupied cell has no effect | unit | `npx vitest run src/store/shapeStore.test.ts` | No — Wave 0 |
| CANV-01 | `cellAtPoint()` returns correct col/row for click coordinates | unit | `npx vitest run src/engine/canvasEngine.test.ts` | No — Wave 0 |
| CANV-01 | Click on canvas element triggers shape placement via React click handler | integration | `npx vitest run src/components/CanvasContainer.test.tsx` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — configure jsdom environment, setup file
- [ ] `vitest.setup.ts` — ResizeObserver mock, canvas mock
- [ ] `src/store/shapeStore.test.ts` — covers CANV-01 store behavior
- [ ] `src/engine/canvasEngine.test.ts` — covers CANV-01 cell math (pure functions, no DOM needed)
- [ ] `src/components/CanvasContainer.test.tsx` — covers CANV-01 click-to-place integration

---

## Security Domain

Phase 1 has no user input beyond mouse clicks on a local canvas, no network calls, no backend, and no authentication. ASVS categories are not applicable to this phase.

- V2 Authentication: No — no auth in this app
- V3 Session Management: No — no sessions
- V4 Access Control: No — no users
- V5 Input Validation: Minimal — grid bounds clamping (`Math.min(3, ...)`) is the only input sanitization needed; implemented inline in hit detection
- V6 Cryptography: No — `crypto.randomUUID()` for shape IDs is CSPRNG; no hand-rolled crypto

---

## Project Constraints (from CLAUDE.md)

These directives override any general recommendation. The planner must verify compliance with all items.

| Directive | Constraint | Implication for Planning |
|-----------|-----------|--------------------------|
| Tech Stack: React + TypeScript + CSS | No UI framework (Tailwind, MUI, Chakra, etc.) | All styling via CSS custom properties; no component library installs |
| No UI framework | Prohibits shadcn, Radix, Headless UI, etc. | Toolbar and all future panels are handwritten HTML + CSS |
| Scope: PoC | Full feature set, rough edges acceptable | Don't gold-plate; Phase 1 just needs the grid and one shape type working |
| Client-only | No backend, all state in browser | No API calls, no fetch, no server-side rendering |
| Polyphony ceiling: 16 voices (4x4) | Grid is exactly 4x4 | Shape store must enforce max 16 shapes |
| GSD Workflow Enforcement | All file edits must go through GSD commands | Do not make direct repo edits outside planned tasks |

---

## Sources

### Primary (HIGH confidence)

- npm registry (2026-04-14) — all package versions verified via `npm view`
- [zustand GitHub](https://github.com/pmndrs/zustand) — vanilla store API (`createStore`, `subscribe`, `getState`)
- [stately.ai/docs/machines](https://stately.ai/docs/machines) — XState v5 `createMachine`, basic state configuration
- [stately.ai/docs/actors](https://stately.ai/docs/actors) — `createActor`, `start`, `getSnapshot`, `subscribe`
- [stately.ai/docs/typescript](https://stately.ai/docs/typescript) — `setup()` typed machines, TypeScript 5 requirement
- [stately.ai/docs/quick-start](https://stately.ai/docs/quick-start) — `useMachine` React hook, XState v5 React integration
- [charkour/zundo GitHub](https://github.com/charkour/zundo) — `temporal` middleware, `undo/redo`, TypeScript setup
- [vite.dev/guide](https://vite.dev/guide/) — `npm create vite@latest -- --template react-ts`
- `01-UI-SPEC.md` — All visual/layout specifications; complete CSS token set
- `01-CONTEXT.md` — All locked decisions; architecture constraints

### Secondary (MEDIUM confidence)

- `shape_music_sequencer.html` — prototype `drawShape()` for circle drawing math (fill/stroke opacity values)

### Tertiary (LOW confidence)

- None — all critical claims verified via official docs or npm registry.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-14
- Architecture: HIGH — vanilla store API, XState v5 actor API, and canvas-outside-React pattern verified against official docs
- Pitfalls: HIGH for canvas sizing, cell math, test env setup; MEDIUM for middleware stacking order (flagged as assumption A1)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable libraries; Vite major versions can move fast)
