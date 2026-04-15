# Phase 3: Canvas Interaction - Research

**Researched:** 2026-04-15
**Domain:** React state management (Zustand), canvas interaction, keyboard event handling, React component composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** No per-shape hit-testing needed. `cellAtPoint()` in `canvasEngine.ts` is sufficient — a click resolves to a `{col, row}` cell.
- **D-02:** Clicking any cell (occupied or empty) always opens the cell editor panel. Empty cell → "place shape" option. Occupied cell → shape properties + remove action.
- **D-03:** Phase 3 does not introduce new audio wiring. Shapes already play continuously from Phase 2. Clicking opens the editor.
- **D-04:** Selected cell state lives in a **separate Zustand store** (`selectionStore` or similar) — not in `shapeStore` and not in React local state. Canvas engine reads it via store subscription.
- **D-05:** XState machine states `selected`, `dragging`, `playingDragging` remain stubs. No XState transitions in Phase 3.
- **D-06:** The cell editor panel is a **fixed sidebar on the right side** of the app, rendered by `App.tsx` alongside `CanvasContainer`. Hidden when no cell is selected.
- **D-07:** Selected cell is highlighted with a **visible border/outline** on the canvas cell, drawn in the canvas engine's RAF loop.
- **D-08:** Clicking a different cell **switches selection**. Pressing **Escape** closes the panel and clears selection.
- **D-09:** Removing a shape requires two mechanisms: (1) "Remove" button in cell editor panel, (2) Delete/Backspace keyboard shortcut while occupied cell is selected.
- **D-10:** After removing a shape, the panel closes and selection clears. The empty cell is immediately available.

### Claude's Discretion

- Name and file location of the new selection store (e.g., `src/store/selectionStore.ts`)
- Exact visual style of the cell selection highlight (color, opacity, border width — consistent with dark theme)
- Panel component structure and styling (sidebar width, typography, button placement)
- Keyboard event listener placement (document-level keydown in `CanvasContainer` or `App`)

### Deferred Ideas (OUT OF SCOPE)

- **Drag to reposition** — XState `dragging` and `playingDragging` states are stubs. Dragging a shape to a different cell is explicitly deferred from Phase 3.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANV-02 | User can click a placed shape to open the property edit panel | D-01/D-02 click routing via `cellAtPoint()` + `selectionStore` + `CellPanel` component |
| CANV-03 | User can remove a placed shape from the canvas | `removeShape()` action in `shapeStore` + audio voice destruction via existing `shapeStore.subscribe()` pattern in `audioEngine.ts` |

</phase_requirements>

---

## Summary

Phase 3 is a pure interaction layer built on top of the audio and canvas infrastructure from Phases 1 and 2. No new rendering technology or audio APIs are introduced. The work is three things: (1) a new `selectionStore` that holds the currently-selected `{col, row}` cell as a Zustand vanilla store, (2) a `CellPanel` React sidebar component that reads from `selectionStore` and `shapeStore` to show either "add shape" or "shape details + remove" content, and (3) wiring changes in `CanvasContainer.tsx` (click routing), `canvasEngine.ts` (selection highlight overlay), `shapeStore.ts` (add `removeShape` action), and `App.tsx` (sidebar layout).

All patterns to follow are already established in the codebase. The `selectionStore` must use `createStore` (vanilla Zustand) — not `create` (React Zustand) — so the canvas engine can subscribe to it in the RAF loop without React, the exact same pattern used by `shapeStore`. Audio voice destruction is already partially scaffolded: `audioEngine.ts` tracks `prevShapeIds` and its `shapeStore.subscribe()` callback already detects new shapes. It needs one addition: when a shape is absent from the new state but present in `prevShapeIds`, stop and disconnect its voice nodes.

The UI-SPEC (`03-UI-SPEC.md`) is the authoritative design contract and has been fully pre-specified. No visual design decisions are open — panel dimensions, colors, copy, and button styles are all locked. The planner can treat the UI-SPEC as implementation specification.

**Primary recommendation:** Implement in four focused plans: (1) `selectionStore` + `removeShape` store changes + tests, (2) `CellPanel` React component + `App.tsx` layout, (3) `CanvasContainer` click routing + keyboard handler, (4) canvas engine selection highlight.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | 5.0.12 | Vanilla store for `selectionStore` | Already in use; `createStore` pattern matches canvas engine subscription requirement |
| React | 19.2.4 | `CellPanel` component | Already the app framework |
| TypeScript | ~6.0.2 | All new files | Already configured, strict mode on |

[VERIFIED: package.json in repo]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` `useStore` hook | (same) | `useSelectionStore` React hook wrapper | Same pattern as `useShapeStore` in `shapeStore.ts` |
| `@testing-library/react` | 16.3.2 | `CellPanel` integration tests | Already installed; used in `CanvasContainer.test.tsx` |
| `vitest` | 4.1.4 | All unit tests | Already configured in `vite.config.ts` |

[VERIFIED: package.json in repo]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `selectionStore` | React `useState` in `App.tsx` | `useState` would require prop-drilling to `canvasEngine.ts` — canvas engine cannot receive React props; vanilla store is required |
| Separate `selectionStore` | Field in `shapeStore` | Mixes unrelated lifecycles; selection state changes should not cause shape store history entries in zundo |
| `display: none` panel toggle | React conditional rendering `{cell && <CellPanel />}` | Conditional rendering would unmount and remount component on each selection change; `display: none` preserves DOM but panel is lightweight — either is acceptable, but `display: none` matches UI-SPEC D-06 language and prevents layout shift |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── store/
│   ├── shapeStore.ts          # MODIFIED: add removeShape action
│   ├── selectionStore.ts      # NEW: selectedCell store + useSelectionStore hook
│   └── selectors.ts           # Unchanged (selectShapeAt already exists)
├── components/
│   ├── CanvasContainer.tsx    # MODIFIED: click routing + keyboard handler
│   └── CellPanel.tsx          # NEW: right sidebar panel component
├── engine/
│   └── canvasEngine.ts        # MODIFIED: subscribe to selectionStore, draw highlight
└── App.tsx                    # MODIFIED: flex row layout, add <CellPanel />
```

### Pattern 1: Zustand Vanilla Store for Non-React Consumers

**What:** Use `createStore` from `zustand/vanilla` (not `create` from `zustand`) when the store needs to be read by non-React code (canvas engine, audio engine, test utilities calling `.getState()` directly).

**When to use:** Whenever a store will be subscribed to outside of React components. This is the established pattern for both `shapeStore` and the new `selectionStore`.

**Example — selectionStore:**
```typescript
// src/store/selectionStore.ts
// Source: shapeStore.ts established pattern (VERIFIED in repo)
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export interface SelectionState {
  selectedCell: { col: number; row: number } | null
  setSelectedCell: (cell: { col: number; row: number } | null) => void
}

export const selectionStore = createStore<SelectionState>()((set) => ({
  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),
}))

// React hook wrapper — same pattern as useShapeStore
export const useSelectionStore = <T>(selector: (state: SelectionState) => T): T =>
  useStore(selectionStore, selector)
```

[VERIFIED: `shapeStore.ts` line 6-7 uses identical `createStore`/`useStore` pattern; `useShapeStore` on line 56-57]

### Pattern 2: Canvas Engine Second Store Subscription

**What:** The canvas engine subscribes to a second store (`selectionStore`) in addition to `shapeStore`. Both subscriptions use the same `store.subscribe(() => { dirty = true })` dirty-flag pattern. Both are returned via `unsubscribe` in the `destroy()` function.

**When to use:** When the canvas engine needs to react to a new data source.

**Example — adding selectionStore subscription:**
```typescript
// src/engine/canvasEngine.ts — additions to initCanvasEngine()
// Source: existing shapeStore.subscribe pattern (VERIFIED in repo, line 159-161)
import { selectionStore } from '../store/selectionStore'

// Inside initCanvasEngine():
const unsubscribeShape = shapeStore.subscribe(() => { dirty = true })
const unsubscribeSelection = selectionStore.subscribe(() => { dirty = true })

// Inside destroy():
return function destroy(): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
  unsubscribeShape()
  unsubscribeSelection()
  resizeObserver.disconnect()
}
```

[VERIFIED: `canvasEngine.ts` lines 159-178 show the subscribe/destroy pattern]

### Pattern 3: Canvas Selection Highlight Drawing

**What:** A `drawSelection` function called in the RAF `render()` loop after `drawShapes`. Reads `selectionStore.getState().selectedCell` synchronously (no React). When `selectedCell` is non-null, draws a 2px inset `strokeRect` in the selected cell's pixel bounds.

**When to use:** Any time the canvas needs to render selection state.

**Example — drawSelection implementation:**
```typescript
// Source: UI-SPEC Section 6, canvasEngine.ts drawGrid/drawShapes pattern (VERIFIED)
function drawSelection(
  selectedCell: { col: number; row: number } | null,
  logicalW: number,
  logicalH: number
): void {
  if (!selectedCell || !ctx) return
  const size = Math.floor(Math.min(logicalW, logicalH) / 4)
  const gridPx = size * 4
  const offsetX = Math.floor((logicalW - gridPx) / 2)
  const offsetY = Math.floor((logicalH - gridPx) / 2)
  const x = offsetX + selectedCell.col * size
  const y = offsetY + selectedCell.row * size
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.90)'  // --color-accent at 90% opacity
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)  // inset 1px to stay within cell
}
```

[VERIFIED: UI-SPEC Section 6 specifies exact values; cell math matches `drawGrid`/`drawShapes` implementation in `canvasEngine.ts`]

### Pattern 4: removeShape Action in shapeStore

**What:** A new `removeShape(col: number, row: number)` action on `ShapeState` that filters the shape out of `state.shapes` using Immer. The audio engine detects the removal via its existing `shapeStore.subscribe()` callback (compares current shape IDs to `prevShapeIds`).

**When to use:** Any time a user removes a shape (Remove button or Delete/Backspace key).

**Example:**
```typescript
// src/store/shapeStore.ts — addition to ShapeState and store
// Source: addShape pattern (VERIFIED in repo, shapeStore.ts lines 36-50)
export interface ShapeState {
  shapes: Shape[]
  addShape: (col: number, row: number) => void
  removeShape: (col: number, row: number) => void  // NEW
}

// Inside immer set():
removeShape: (col: number, row: number) =>
  set((state) => {
    const idx = state.shapes.findIndex((s) => s.col === col && s.row === row)
    if (idx !== -1) {
      state.shapes.splice(idx, 1)
    }
  }),
```

[VERIFIED: Immer splice mutation pattern supported; `addShape` uses `state.shapes.push()` in same store]

### Pattern 5: Audio Voice Destruction on Shape Removal

**What:** `audioEngine.ts` already has `prevShapeIds` tracking in `initAudioEngine`. The `shapeStore.subscribe()` callback must be extended to detect removed shapes (IDs in `prevShapeIds` but not in current state) and stop/disconnect their voice nodes.

**When to use:** After `removeShape` is called — the audio engine's subscribe fires automatically.

**Example — completing the removal detection:**
```typescript
// src/engine/audioEngine.ts — modify existing subscribe callback
// Source: audioEngine.ts lines 239-251 (VERIFIED in repo)
const unsubscribe = shapeStore.subscribe((state) => {
  const curr = state.shapes
  const currIds = new Set(curr.map((s) => s.id))

  // Detect additions (already implemented)
  for (const shape of curr) {
    if (!voices.has(shape.id)) {
      createVoice(shape)
    }
  }

  // Detect removals (NEW in Phase 3)
  for (const id of prevShapeIds) {
    if (!currIds.has(id)) {
      const voice = voices.get(id)
      if (voice) {
        // Ramp gain to 0 before stopping to avoid click artifact
        const ctx = getAudioContext()
        if (ctx) {
          voice.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
        }
        setTimeout(() => {
          try { voice.oscillator.stop() } catch { /* already stopped */ }
          if (voice.noiseSource) {
            try { voice.noiseSource.stop() } catch { /* already stopped */ }
          }
          voice.gainNode.disconnect()
          voices.delete(id)
        }, 60)  // 60ms = ~4 time constants at τ=0.015s → gain < 2% of original
      }
    }
  }

  prevShapeIds = new Set(currIds)
})
```

[VERIFIED: `audioEngine.ts` lines 239-269 contain the subscribe/prevShapeIds pattern; the removal code is explicitly missing with comment "// Update prevShapeIds tracking for future removal detection (Phase 3)"]

### Pattern 6: CanvasContainer Click Routing Refactor

**What:** `handleClick` in `CanvasContainer.tsx` currently calls `shapeStore.getState().addShape()` directly. Phase 3 changes this to call `selectionStore.getState().setSelectedCell()` instead. `addShape` moves into the `CellPanel` component's "Add Shape" button handler.

**When to use:** On every canvas click (occupied or empty cell).

**Example:**
```typescript
// src/components/CanvasContainer.tsx — handleClick refactor
// Source: existing handleClick (VERIFIED, lines 32-44)
function handleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
  const canvas = canvasRef.current
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const cell = cellAtPoint(
    e.clientX - rect.left,
    e.clientY - rect.top,
    rect.width,
    rect.height
  )
  if (!cell) return
  // Phase 3: update selection instead of immediately placing shape
  const current = selectionStore.getState().selectedCell
  if (current?.col === cell.col && current?.row === cell.row) return  // same cell — no-op
  selectionStore.getState().setSelectedCell(cell)
}
```

### Pattern 7: Keyboard Handler via document-level useEffect

**What:** A `useEffect` in `CanvasContainer.tsx` attaches a `keydown` listener to `document`. The listener checks `selectionStore.getState().selectedCell` synchronously. Escape clears selection; Delete/Backspace removes the shape if the cell is occupied.

**When to use:** This is the established approach for global keyboard shortcuts in React apps without a global event bus. The handler is scoped by checking `selectedCell !== null`.

**Example:**
```typescript
// Source: UI-SPEC Section 7 keyboard contract + React useEffect cleanup pattern
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent): void {
    const selected = selectionStore.getState().selectedCell
    if (!selected) return
    if (e.key === 'Escape') {
      selectionStore.getState().setSelectedCell(null)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const shape = shapeStore.getState().shapes.find(
        (s) => s.col === selected.col && s.row === selected.row
      )
      if (shape) {
        shapeStore.getState().removeShape(selected.col, selected.row)
        selectionStore.getState().setSelectedCell(null)
      }
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [])  // mount once — reads store synchronously, no stale closure issue
```

[VERIFIED: UI-SPEC Section 7 specifies exact keys and conditions; `useEffect` with `[]` deps + cleanup is established React pattern]

### Anti-Patterns to Avoid

- **Reading selectionStore in React via React state mirroring:** Do not `useState` to mirror `selectionStore` in `CanvasContainer`. The canvas engine reads the store directly; React components use `useSelectionStore` hook. Two sources of truth for the same cell would diverge.
- **Calling `addShape` directly from `handleClick`:** Phase 3 changes the click model. `handleClick` only updates `selectionStore`. Shape placement moves into `CellPanel`'s button handler.
- **Using `immer` middleware in `selectionStore`:** Selection state is a single nullable value (`{col, row} | null`). Immer adds complexity with no benefit here. Use plain Zustand set.
- **Animating panel open/close:** UI-SPEC Section 11 explicitly specifies `display: none` toggle — no CSS transition. Do not add `transition` or `opacity` animation.
- **Adding `useSelectionStore` subscription in `canvasEngine.ts`:** Canvas engine is not a React component; it cannot use hooks. It uses `selectionStore.subscribe()` and `selectionStore.getState()` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio click artifact on voice removal | Manual instant stop | Gain ramp-out via `setTargetAtTime` then `setTimeout` stop | Instant `stop()` produces audible click; Web Audio API exponential ramp eliminates it |
| Cell occupancy check in Remove | Custom search | `shapeStore.getState().shapes.find()` | Already pattern-established; `selectShapeAt` selector exists in `selectors.ts` |
| Selection state subscription in canvasEngine | Custom pub/sub | `selectionStore.subscribe()` | Same dirty-flag pattern already used for `shapeStore` |
| Panel visibility | React portals, z-index stacking | `display: none` toggle via CSS class | UI-SPEC specifies this explicitly; prevents layout shift |

**Key insight:** Every "mechanism" needed in Phase 3 exists in the codebase — the only new infrastructure is `selectionStore` and `removeShape`. All other changes are wiring existing pieces together differently.

---

## Common Pitfalls

### Pitfall 1: Stale Closure in Keyboard Handler
**What goes wrong:** If the keyboard `useEffect` captures `selectedCell` via a React state variable or prop, it will read stale values after the state changes.
**Why it happens:** `useEffect` with `[]` deps captures the initial value of any closure variables.
**How to avoid:** Read `selectionStore.getState().selectedCell` **synchronously inside the handler** — not from a closure. The vanilla store's `.getState()` always returns current state, so `[]` deps is correct and no stale closure forms.
**Warning signs:** Delete key removes wrong shape; Escape doesn't close panel on second press.

### Pitfall 2: Audio Click Artifact on Shape Removal
**What goes wrong:** Calling `oscillator.stop()` immediately after `removeShape` produces an audible click (waveform truncated mid-cycle).
**Why it happens:** Abrupt disconnect while signal is non-zero causes a Dirac delta in the output.
**How to avoid:** Ramp `gainNode.gain` to 0 using `setTargetAtTime` with τ ≈ 15ms before calling `stop()`. A `setTimeout` of ~60ms (4 time constants) ensures the gain has decayed below audible threshold before the nodes are stopped.
**Warning signs:** Audible "pop" or "click" when removing shapes.

### Pitfall 3: `createStore` vs `create` for selectionStore
**What goes wrong:** Using `create` (React Zustand) for `selectionStore` makes it inaccessible to `canvasEngine.ts` via `store.subscribe()` without React.
**Why it happens:** `create` returns a hook; `createStore` returns the raw store with `.subscribe()`, `.getState()`, `.setState()`.
**How to avoid:** Use `createStore` from `zustand/vanilla` — exactly as `shapeStore` does. The `useSelectionStore` hook is a thin wrapper using `useStore(selectionStore, selector)`.
**Warning signs:** TypeScript error `selectionStore.subscribe is not a function`; canvas highlight never appears.

### Pitfall 4: Panel Layout Shift When Opening
**What goes wrong:** If `CellPanel` uses `visibility: hidden` or conditional rendering (`{selectedCell && <CellPanel />}`), the canvas area width changes when the panel appears, causing a jarring layout shift.
**Why it happens:** The `CanvasContainer` `flex: 1` expands to fill all space when the panel is absent, then shrinks when it appears.
**How to avoid:** Use `display: none` on the panel wrapper (not conditional rendering). The 240px panel wrapper element stays in the DOM; only its display changes. This is specified in UI-SPEC Section 5.
**Warning signs:** Canvas jumps left/right when clicking a cell; canvas resize briefly re-triggers.

### Pitfall 5: selectionStore Not Cleared After removeShape
**What goes wrong:** After shape removal, `selectionStore.selectedCell` still points to the now-empty cell. The panel would then show "Empty cell / Add shape" instead of closing, or the canvas would still show a highlight on the empty cell.
**Why it happens:** `removeShape` and `setSelectedCell(null)` are separate operations; only one might be called.
**How to avoid:** Both the Remove button handler in `CellPanel` and the keyboard handler in `CanvasContainer` must call `shapeStore.getState().removeShape(col, row)` AND `selectionStore.getState().setSelectedCell(null)` — in that order. This is specified in CONTEXT.md D-10.
**Warning signs:** Panel shows wrong content after removal; canvas highlight stays on empty cell.

### Pitfall 6: Pre-existing Failing Test
**What goes wrong:** `shapeStore.test.ts` has one failing test (`shape has required fields` — expects `l: 60` but store has `l: 30`). Phase 3 plans must not silently include this failing test as a Phase 3 problem.
**Why it happens:** Phase 2 changed the default lightness from 60 to 30 but the test was not updated.
**How to avoid:** The planner should note this pre-existing failure. If Phase 3 plans include a "all tests pass" gate, fix this test in a plan (update test expectation to `l: 30`) as a Wave 0 cleanup task.
**Warning signs:** CI gate fails on a test that looks unrelated to Phase 3 work.

---

## Code Examples

### selectionStore — complete implementation
```typescript
// src/store/selectionStore.ts
// Source: shapeStore.ts createStore/useStore pattern (VERIFIED in repo)
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export interface SelectionState {
  selectedCell: { col: number; row: number } | null
  setSelectedCell: (cell: { col: number; row: number } | null) => void
}

export const selectionStore = createStore<SelectionState>()((set) => ({
  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),
}))

export const useSelectionStore = <T>(selector: (state: SelectionState) => T): T =>
  useStore(selectionStore, selector)
```

### CellPanel — structure sketch
```typescript
// src/components/CellPanel.tsx
// Source: UI-SPEC Section 9 + CONTEXT.md D-06
import { useSelectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
import { selectionStore } from '../store/selectionStore'
import { shapeStore } from '../store/shapeStore'
import { selectShapeAt } from '../store/selectors'

export function CellPanel() {
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  // Derive occupancy from shapeStore — re-renders when shapes change
  const shape = useShapeStore(
    selectedCell ? selectShapeAt(selectedCell.col, selectedCell.row) : () => undefined
  )

  if (!selectedCell) return null  // handled by display:none in parent, but guard here too

  const header = `Cell (${selectedCell.col}, ${selectedCell.row})`

  function handleAddShape() {
    shapeStore.getState().addShape(selectedCell!.col, selectedCell!.row)
    // Panel stays open — content switches to occupied mode (UI-SPEC Section 7)
  }

  function handleRemoveShape() {
    shapeStore.getState().removeShape(selectedCell!.col, selectedCell!.row)
    selectionStore.getState().setSelectedCell(null)  // D-10: close panel after remove
  }

  return (
    <aside role="complementary" aria-label="Cell editor" className="cell-panel">
      <header className="cell-panel__header">
        <h2 className="cell-panel__title">{header}</h2>
      </header>
      {shape ? (
        <div className="cell-panel__body">
          {/* property rows + remove button */}
        </div>
      ) : (
        <div className="cell-panel__body">
          <p className="cell-panel__empty-text">This cell is empty.</p>
          <button
            className="btn btn--accent"
            onClick={handleAddShape}
            aria-label={`Add shape to cell column ${selectedCell.col} row ${selectedCell.row}`}
          >
            + Add Shape
          </button>
        </div>
      )}
    </aside>
  )
}
```

### App.tsx layout change
```typescript
// src/App.tsx — canvas-area becomes flex row
// Source: UI-SPEC Section 5 layout spec (VERIFIED)
<main className="canvas-area">
  <CanvasContainer />
  <CellPanel />
</main>

// CSS addition to index.css:
// .canvas-area { display: flex; flex-direction: row; flex: 1; overflow: hidden; }
// .cell-panel { width: 240px; flex-shrink: 0; display: flex; flex-direction: column;
//               border-left: 1px solid var(--color-border-secondary);
//               background: var(--color-bg-secondary);
//               overflow-y: auto; }
// .cell-panel[data-hidden="true"] { display: none; }  // or handled in component via style prop
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `handleClick` calls `addShape` directly | `handleClick` calls `setSelectedCell`; `addShape` moves to `CellPanel` button | Phase 3 | Changes click model from "place on click" to "select on click, place from panel" |
| Canvas cursor: `crosshair` on empty cells | Canvas cursor: `pointer` on all cells | Phase 3 | Signals that clicking any cell does something |
| Hint text: "Click an empty cell to place a shape" | Hint text: "Click any cell to select it" | Phase 3 | Reflects new click model per UI-SPEC Section 10 |

**Deprecated/outdated in Phase 3:**
- Direct click-to-place behavior: superseded by click-to-select + panel-driven placement.
- Single `unsubscribeShape` cleanup in `initCanvasEngine`: becomes `unsubscribeShape` + `unsubscribeSelection`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gain ramp-out with τ=0.015s and 60ms setTimeout is sufficient to eliminate removal click artifacts | Pattern 5 (Audio Voice Destruction) | Audible click on shape removal; fix by increasing τ or delay |
| A2 | `useStore(selectionStore, selector)` from `zustand` works identically to `useStore(shapeStore, selector)` — no version compatibility issue | Standard Stack | `useSelectionStore` hook breaks; fix by checking zustand 5.x `useStore` signature |

**All other claims are VERIFIED against the codebase.**

---

## Open Questions

1. **Pre-existing test failure in `shapeStore.test.ts`**
   - What we know: One test expects `l: 60` but the store now defaults to `l: 30` (changed in Phase 2).
   - What's unclear: Whether Phase 2 plans were supposed to update this test and didn't, or if this is intentional.
   - Recommendation: Planner should include a Wave 0 task to update the test expectation to `l: 30` so the Phase 3 test gate has a clean baseline.

2. **`useSelectionStore` with `selectShapeAt` selector stability**
   - What we know: `selectShapeAt(col, row)` returns a new function each render if `col`/`row` are from a hook. This could cause unnecessary re-renders in `CellPanel`.
   - What's unclear: Whether this is a performance concern at PoC scale (16 shapes max).
   - Recommendation: At PoC scale, unnecessary re-renders are acceptable. Use `useMemo(() => selectShapeAt(col, row), [col, row])` only if render profiling shows a problem.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is pure code changes. No external tools, services, CLIs, databases, or runtimes beyond the existing project dev server (`vite`) are required. `npm run dev` and `npm test` are already verified to work.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (inline `test:` block) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

[VERIFIED: `vite.config.ts` and `package.json` scripts]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANV-02 | Click any cell updates `selectionStore.selectedCell` | unit | `npx vitest run src/store/selectionStore.test.ts` | ❌ Wave 0 |
| CANV-02 | `removeShape` action missing from a cell leaves selection on that cell correctly | unit | `npx vitest run src/store/selectionStore.test.ts` | ❌ Wave 0 |
| CANV-02 | `CellPanel` renders empty mode when cell has no shape | unit | `npx vitest run src/components/CellPanel.test.tsx` | ❌ Wave 0 |
| CANV-02 | `CellPanel` renders occupied mode when cell has a shape | unit | `npx vitest run src/components/CellPanel.test.tsx` | ❌ Wave 0 |
| CANV-02 | `CanvasContainer` click routes to `selectionStore`, not `shapeStore.addShape` | integration | `npx vitest run src/components/CanvasContainer.test.tsx` | ✅ (needs update) |
| CANV-03 | `shapeStore.removeShape` removes shape by col/row | unit | `npx vitest run src/store/shapeStore.test.ts` | ✅ (needs new test) |
| CANV-03 | Keyboard Delete while occupied cell selected removes shape + clears selection | integration | `npx vitest run src/components/CanvasContainer.test.tsx` | ✅ (needs new test) |
| CANV-03 | Keyboard Escape clears selection without removing shape | integration | `npx vitest run src/components/CanvasContainer.test.tsx` | ✅ (needs new test) |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/store/selectionStore.test.ts` — unit tests for `selectionStore` state transitions (covers CANV-02 click routing contract)
- [ ] `src/components/CellPanel.test.tsx` — renders empty/occupied modes, button handlers call correct store actions (covers CANV-02 panel content)
- [ ] Fix `src/store/shapeStore.test.ts` line 48: update expectation from `l: 60` to `l: 30` (pre-existing failure, not Phase 3 scope — but blocks clean test gate)

---

## Security Domain

Step 2.6 security check: SKIPPED — Phase 3 introduces no authentication, network calls, user-supplied data processed server-side, cryptography, session management, or external data sources. All operations are client-only, in-memory state management. No ASVS categories apply.

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 3 |
|-----------|-------------------|
| Tech Stack: React + TypeScript + CSS only (no UI framework) | CellPanel must use plain HTML/CSS; no MUI, Radix, shadcn, etc. |
| Polyphony: up to 16 simultaneous voices | No constraint on Phase 3 — voice creation/destruction already handles this |
| Client-only: no backend, all state in browser | selectionStore and shapeStore are both in-memory; no localStorage/IndexedDB needed |
| PoC scope: rough edges acceptable | No confirmation dialogs, no undo UI, no animations on panel open/close |
| GSD Workflow: use GSD commands before file changes | Planning artifacts must be in sync before execution |

[VERIFIED: `CLAUDE.md` in repo root]

---

## Sources

### Primary (HIGH confidence)
- `src/store/shapeStore.ts` — Zustand vanilla store pattern, ShapeState interface, immer mutation style
- `src/engine/canvasEngine.ts` — RAF loop, store subscription, dirty-flag pattern, cell math
- `src/engine/audioEngine.ts` — voice lifecycle, prevShapeIds pattern, subscribe callback structure
- `src/components/CanvasContainer.tsx` — handleClick, useEffect mount pattern, existing integration tests
- `.planning/phases/03-canvas-interaction/03-CONTEXT.md` — all locked decisions D-01 through D-10
- `.planning/phases/03-canvas-interaction/03-UI-SPEC.md` — complete visual specification, component inventory
- `package.json` — exact library versions (Zustand 5.0.12, React 19.2.4, Vitest 4.1.4)

### Secondary (MEDIUM confidence)
- `.planning/phases/01-scaffold/01-CONTEXT.md` — three-layer architecture decisions (D-04, D-05)
- `.planning/phases/02-audio-engine/02-CONTEXT.md` — audio lifecycle, AudioContext singleton (D-09, D-12)

### Tertiary (LOW confidence)
- A1: Gain ramp-out timing (τ=0.015s, 60ms delay) — based on Web Audio API training knowledge; audibility may vary by output device

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in `package.json`; no new installs needed
- Architecture: HIGH — all patterns verified against existing source files
- Pitfalls: HIGH for structural pitfalls (store type, stale closure, panel shift); MEDIUM for audio artifact timing
- UI-SPEC contract: HIGH — fully specified in `03-UI-SPEC.md`, no open design decisions

**Research date:** 2026-04-15
**Valid until:** 2026-06-15 (stable stack — React, Zustand, Vitest versions unlikely to change within project lifecycle)
