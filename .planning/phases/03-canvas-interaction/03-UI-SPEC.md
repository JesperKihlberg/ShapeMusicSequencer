---
phase: 3
phase_name: Canvas Interaction
status: draft
created: "2026-04-15"
tool: none
---

# UI-SPEC: Phase 3 — Canvas Interaction

## Summary

Phase 3 delivers full shape management on the canvas: clicking any cell (occupied or empty) opens a fixed right sidebar panel; the panel offers "Add shape" for empty cells and shape properties + a Remove action for occupied cells. Each action is immediately audible. The canvas draws a selection highlight on the active cell.

**Design system:** CSS custom properties (no UI framework). All tokens established in Phase 1 (`src/styles/index.css`). Phase 3 is the first phase that actually uses `--color-accent` and `--color-danger`, both of which were reserved for this phase in Phase 1.

**Source decisions:** CONTEXT.md D-01 through D-10. All design contract values pre-populated from upstream artifacts.

---

## 1. Spacing Scale

**Inherited from Phase 1 — no changes.**

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Tight gaps inside panel (label-to-value gaps) |
| `--space-2` | 8px | Panel internal padding, row gaps |
| `--space-3` | 12px | Panel section internal padding |
| `--space-4` | 16px | Panel outer padding, section gaps |
| `--space-6` | 24px | Between panel sections |
| `--space-8` | 32px | Not used in Phase 3 |

**Phase 3 additions:**
- Panel width: `240px` fixed. Wide enough for a label + readout row; narrow enough to not crowd the canvas.
- Panel internal layout: `display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4)`.
- Button height: `32px` (consistent with 8-point grid; adequate click target for desktop).

---

## 2. Typography

**Inherited from Phase 1 — no changes.**

| Token | Value | Use |
|-------|-------|-----|
| `--text-xs` | 11px | Panel readout values (shape type, color values) |
| `--text-sm` | 12px | Panel property labels |
| `--text-base` | 13px | Panel section headings, button labels |
| `--text-title` | 14px | Panel title (cell coordinates or "No selection") |

| Token | Value | Use |
|-------|-------|-----|
| `--weight-regular` | 400 | All panel labels and readouts |
| `--weight-medium` | 500 | Panel title, button labels |

**Line heights:** Body/labels `1.4`. Headings `1.2`. Single-line UI elements `1`.

---

## 3. Color

**Inherited from Phase 1 — tokens unchanged. Phase 3 activates reserved accent and danger tokens.**

**60% — Dominant surface (inherited):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-primary` | `#111113` | App background, canvas background |
| `--color-bg-secondary` | `#1a1a1e` | Panel background (matches toolbar) |
| `--color-bg-tertiary` | `#222226` | Button hover fill, panel section divider row |

**30% — Secondary chrome (inherited):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-border-primary` | `rgba(255,255,255,0.18)` | Panel outer border, focused button border |
| `--color-border-secondary` | `rgba(255,255,255,0.10)` | Panel internal dividers, button resting border |
| `--color-border-tertiary` | `rgba(255,255,255,0.06)` | Grid lines (inherited), subtle row separators in panel |

**Text (inherited):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-text-primary` | `rgba(255,255,255,0.88)` | Panel title, button labels, shape type label |
| `--color-text-secondary` | `rgba(255,255,255,0.55)` | Property labels (e.g., "Hue", "Type") |
| `--color-text-tertiary` | `rgba(255,255,255,0.35)` | Readout values, "No cell selected" empty state |

**10% — Accent (NOW ACTIVE in Phase 3):**

| Token | Value | Reserved for |
|-------|-------|-------------|
| `--color-accent` | `#6366f1` | Cell selection highlight ring on canvas; focus ring on Add Shape button |

- Source: Phase 1 UI-SPEC reserved this token for "Phase 3+ selected-shape ring, focus indicators."
- **Exact usage:** Canvas selection ring drawn as a 2px inset stroke on the selected cell, color `#6366f1` at 90% opacity: `rgba(99, 102, 241, 0.90)`.

**Semantic — Destructive (NOW ACTIVE in Phase 3):**

| Token | Value | Use |
|-------|-------|-------------|
| `--color-danger` | `#ef4444` | Remove button label color (resting state) |
| `--color-bg-danger` | `rgba(239,68,68,0.10)` | Remove button background on hover |

- Source: Phase 1 UI-SPEC reserved these for "Phase 3+ Remove shape button."

---

## 4. Border Radius

**Inherited from Phase 1 — no changes.**

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Panel buttons (Add Shape, Remove) |
| `--radius-md` | 6px | Panel container itself |
| `--radius-lg` | 10px | Not used in Phase 3 |

---

## 5. Layout

Phase 3 adds a right sidebar panel alongside the canvas area. `App.tsx` gains a horizontal flex row wrapping `CanvasContainer` + `CellPanel`.

```
┌─────────────────────────────────────────────────────┐
│  Toolbar (min-height: 40px, spans full width)       │
├────────────────────────────────────┬────────────────┤
│                                    │                │
│  Canvas area (flex: 1)             │  Cell Panel    │
│  4x4 grid                          │  (240px fixed) │
│                                    │  hidden when   │
│                                    │  no selection  │
│                                    │                │
└────────────────────────────────────┴────────────────┘
```

**App shell changes:**
- `main.canvas-area` changes from a single `CanvasContainer` to a flex row:
  ```
  display: flex; flex-direction: row; flex: 1; overflow: hidden
  ```
- `CanvasContainer` wrapper: `flex: 1; position: relative; overflow: hidden` (unchanged).
- `CellPanel` wrapper: `width: 240px; flex-shrink: 0; position: relative`.
  - When no cell is selected: `display: none` (panel is absent from layout, not just hidden — prevents layout shift on the canvas).
  - When a cell is selected: `display: flex; flex-direction: column`.

**Panel border:** `border-left: 1px solid var(--color-border-secondary)`. Background: `var(--color-bg-secondary)`.

**Panel overflow:** `overflow-y: auto` (defensive — Phase 3 content is short, but Phase 4 will add more rows).

---

## 6. Canvas Rendering Contract

**Inherited from Phase 1 with one addition: selection highlight.**

**Selection highlight (new in Phase 3):**
- Drawn by `canvasEngine.ts` in RAF loop, reads `selectionStore.selectedCell`.
- Style: 2px inset border drawn on the selected cell. Use `ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)` with `lineWidth: 2` and color `rgba(99, 102, 241, 0.90)` (`--color-accent` at 90% opacity).
- The inset offset of 1px ensures the stroke is fully within the cell and does not bleed onto adjacent cells.
- The highlight renders on top of any shape in the cell (drawn after shapes in RAF loop).
- When `selectedCell` is null, nothing additional is drawn.

**Cursor feedback changes (Phase 3):**
- Over any cell (empty or occupied): `cursor: pointer` — because clicking always opens the panel.
- Previous Phase 1 rule "empty cell = crosshair" is superseded.
- Over non-cell canvas gutters: `cursor: default`.

**Grid lines, shape rendering, background:** Unchanged from Phase 1.

---

## 7. Interaction Contract

### Click Routing

| Trigger | State Before | Result |
|---------|-------------|--------|
| Click empty cell | No selection | Panel opens showing "Empty — Add Shape" content |
| Click empty cell | Different cell selected | Selection switches; panel updates to new cell |
| Click occupied cell | No selection | Panel opens showing shape properties + Remove |
| Click occupied cell | Different cell selected | Selection switches; panel updates to new shape |
| Click same cell again | That cell selected | No change (selection already set) |
| Press Escape | Any cell selected | Panel closes, selection clears |
| Press Delete or Backspace | Occupied cell selected | Shape removed, panel closes, selection clears |
| Press Delete or Backspace | Empty cell selected | No-op |

### Add Shape Action

- Trigger: "Add Shape" button click inside panel when an empty cell is selected.
- Result: Shape added to `shapeStore` at selected cell. Audio voice starts immediately (Phase 2 wiring). Panel content switches to occupied state (shape properties + Remove button) without closing.
- The panel does NOT close on add — user sees immediate feedback and can then remove if needed.

### Remove Shape Action

- Trigger: "Remove" button inside panel OR Delete/Backspace key while occupied cell selected.
- Result: Shape removed from `shapeStore`. Audio voice destroyed immediately. Panel closes. Selection clears. Canvas cell becomes empty.
- No confirmation dialog — destructive action is immediately reversible via undo (zundo temporal store is already wired).

### Keyboard Shortcuts

| Key | Condition | Action |
|-----|-----------|--------|
| Escape | Any cell selected | Clear selection, close panel |
| Delete | Occupied cell selected | Remove shape, clear selection, close panel |
| Backspace | Occupied cell selected | Remove shape, clear selection, close panel |
| Delete | Empty cell selected | No-op |

**Keyboard listener placement:** `document`-level `keydown` in `CanvasContainer.tsx` `useEffect` (same component that owns canvas click). Listener only fires meaningful actions when `selectionStore.selectedCell` is non-null.

---

## 8. Component Inventory

Phase 3 introduces these new components and modifies one existing component.

### New

| Component | Type | File | Notes |
|-----------|------|------|-------|
| `selectionStore` | Zustand vanilla store | `src/store/selectionStore.ts` | `selectedCell: {col, row} \| null`; vanilla `createStore` (not `create`) so canvas engine can subscribe |
| `useSelectionStore` | Zustand React hook | `src/store/selectionStore.ts` | Same pattern as `useShapeStore` — wraps `useStore(selectionStore, selector)` |
| `CellPanel` | React component | `src/components/CellPanel.tsx` | Fixed sidebar; reads `selectionStore` + `shapeStore`; renders empty or occupied content |

### Modified

| Component | Change |
|-----------|--------|
| `CanvasContainer.tsx` | `handleClick` dispatches to `selectionStore` instead of directly calling `addShape`. Adds `document` keydown listener in `useEffect`. |
| `canvasEngine.ts` | Adds second `subscribe` to `selectionStore`. Draws selection highlight in RAF loop after shapes. |
| `App.tsx` | `main.canvas-area` becomes a flex row; adds `<CellPanel />` sibling to `<CanvasContainer />`. |
| `shapeStore.ts` | Adds `removeShape(col: number, row: number)` action to `ShapeState`. |

---

## 9. Cell Panel Visual Contract

The panel has two distinct content modes depending on cell occupancy.

### Panel Header (both modes)

- Content: Cell coordinates label. Format: `Cell (col, row)` — e.g., `Cell (2, 1)`.
- Font: `--text-title` (14px), `--weight-medium`, `--color-text-primary`.
- Padding: `var(--space-4)` all sides.
- Border-bottom: `1px solid var(--color-border-tertiary)`.

### Empty Cell Mode

Content area (below header):

```
┌──────────────────────────────┐
│  Cell (2, 1)                 │  ← header
├──────────────────────────────┤
│                              │
│  This cell is empty.         │  ← --color-text-tertiary, --text-sm
│                              │
│  [ + Add Shape ]             │  ← accent-bordered button
│                              │
└──────────────────────────────┘
```

- Empty state body text: `"This cell is empty."` at `--text-sm`, `--color-text-tertiary`.
- "Add Shape" button:
  - Label: `+ Add Shape`
  - Width: `100%`
  - Height: `32px`
  - Background: transparent
  - Border: `1px solid var(--color-accent)` (`rgba(99,102,241,1)`)
  - Text color: `var(--color-accent)`
  - Border-radius: `--radius-sm` (4px)
  - Hover: background `rgba(99,102,241,0.08)`, border stays accent
  - Font: `--text-base` (13px), `--weight-medium`

### Occupied Cell Mode

Content area (below header):

```
┌──────────────────────────────┐
│  Cell (2, 1)                 │  ← header
├──────────────────────────────┤
│  Type      circle            │
│  Hue       220               │
│  Saturation 70               │
│  Lightness 30                │
├──────────────────────────────┤
│  [ Remove ]                  │  ← danger-styled button
└──────────────────────────────┘
```

**Property rows:** Each row is a horizontal flex pair.
- Label: `--text-sm` (12px), `--weight-regular`, `--color-text-secondary`. Width: auto (flex: 0 0 auto). Minimum width: 80px.
- Value: `--text-sm` (12px), `--weight-regular`, `--color-text-tertiary`. `flex: 1; text-align: right`.
- Row height: 24px (line-height controlled by font + padding).
- Row gap between property rows: `var(--space-1)` (4px).

**Property rows to display (Phase 3 — read-only):**
- `Type` → shape's `type` field (e.g., `circle`)
- `Hue` → `color.h` integer value (e.g., `220`)
- `Saturation` → `color.s` integer value (e.g., `70`)
- `Lightness` → `color.l` integer value (e.g., `30`)

**Section divider between properties and Remove button:** `1px solid var(--color-border-tertiary)`, margin `var(--space-2)` top/bottom.

**Remove button:**
- Label: `Remove`
- Width: `100%`
- Height: `32px`
- Background: transparent (resting)
- Border: `1px solid rgba(239,68,68,0.40)` (muted danger border at rest)
- Text color: `var(--color-danger)` (`#ef4444`)
- Border-radius: `--radius-sm` (4px)
- Hover: background `var(--color-bg-danger)` (`rgba(239,68,68,0.10)`), border `1px solid var(--color-danger)`
- Font: `--text-base` (13px), `--weight-medium`

---

## 10. Copywriting Contract

### Panel Copy

| Location | Copy | Notes |
|----------|------|-------|
| Panel header | `Cell (col, row)` | Dynamic — e.g., `Cell (2, 1)`. Zero-indexed. |
| Empty cell body | `This cell is empty.` | `--color-text-tertiary` |
| Add Shape button | `+ Add Shape` | Plus sign is literal character, not icon |
| Remove button | `Remove` | No icon; label only |
| Property label — type | `Type` | |
| Property label — hue | `Hue` | |
| Property label — saturation | `Saturation` | |
| Property label — lightness | `Lightness` | |

### Canvas Hint Text (updated from Phase 1)

- Old: `"Click an empty cell to place a shape"`
- New: `"Click any cell to select it"` — because Phase 3 changes the click model (any cell opens panel; shapes are added from within the panel, not by direct click).
- Style unchanged: `--text-xs` (11px), `--color-text-tertiary`, `position: absolute; bottom: 8px; left: 8px; pointer-events: none`.

### Error States

No async operations in Phase 3. No error states needed.

### Destructive Action Confirmation

Remove action: **no confirmation dialog**. Rationale: zundo temporal undo is already wired in `shapeStore`; the action is recoverable. A confirmation dialog would break the "immediate audio feedback" core value — the shape must silence instantly on Remove trigger.

---

## 11. Animation

Phase 3 adds no new animations. Selection highlight is static (no pulse or transition). Panel open/close uses `display: none` toggle — no CSS transition. Rationale: PoC scope; transitions are Phase 4+ polish.

---

## 12. Accessibility (Phase 3 Scope)

- `CellPanel`: `role="complementary"` or `role="region"` with `aria-label="Cell editor"`.
- Panel header: `<h2>` element or `role="heading" aria-level="2"`.
- Add Shape button: standard `<button>` element. When cell is empty, `aria-label="Add shape to cell column {col} row {row}"`.
- Remove button: standard `<button>` element. `aria-label="Remove shape from cell column {col} row {row}"`.
- Keyboard: Escape and Delete/Backspace shortcuts are document-level — no ARIA needed beyond visible focus indicators.
- Focus management: When panel opens, focus moves to the first interactive element in the panel (Add Shape or Remove button). When panel closes via Escape or Remove, focus returns to the canvas element.
- Selection highlight on canvas is a visual-only affordance — panel text content is the accessible equivalent.
- Color contrast: `--color-accent` (`#6366f1`) as button border on `--color-bg-secondary` (`#1a1a1e`) background — sufficient for WCAG AA large text; button label uses accent color directly which may not meet contrast requirements for small text. Acceptable for PoC; note for Phase 4 polish.

---

## 13. Token Reference Sheet

**No new tokens in Phase 3.** All tokens established in Phase 1. Phase 3 first-use activates `--color-accent` and `--color-danger`/`--color-bg-danger`.

```css
/* Activating in Phase 3 (defined in Phase 1, unused until now): */
--color-accent:    #6366f1;   /* Cell selection ring, Add Shape button */
--color-danger:    #ef4444;   /* Remove button label */
--color-bg-danger: rgba(239, 68, 68, 0.10);  /* Remove button hover background */
```

Full token reference: see `src/styles/index.css` (source of truth, Phase 1 established).

---

## 14. Registry

**shadcn:** Not initialized (CLAUDE.md prohibits UI frameworks).
**Third-party component registries:** None.
**Safety gate:** Not applicable.

---

## Source Attribution

| Decision | Source |
|----------|--------|
| Click any cell opens panel | CONTEXT.md D-02 |
| Panel is fixed right sidebar | CONTEXT.md D-06 |
| Panel hidden when no selection | CONTEXT.md D-06 |
| Selection in separate Zustand store | CONTEXT.md D-04 |
| Selection highlight on canvas | CONTEXT.md D-07 |
| Escape clears selection | CONTEXT.md D-08 |
| Delete/Backspace removes shape | CONTEXT.md D-09 |
| Panel closes after remove | CONTEXT.md D-10 |
| No confirmation dialog on remove | CONTEXT.md D-10 + zundo undo already wired |
| Add Shape button in empty panel | CONTEXT.md Specifics — "offer a way to place a shape" |
| Read-only properties in Phase 3 | CONTEXT.md phase boundary — editing is Phase 4 |
| Accent token first use | Phase 1 UI-SPEC — reserved for "Phase 3+ selected-shape ring" |
| Danger token first use | Phase 1 UI-SPEC — reserved for "Phase 3+ Remove shape button" |
| Panel width 240px | Claude's discretion (CONTEXT.md) |
| Selection ring style (2px inset, accent color) | Claude's discretion (CONTEXT.md) |
| No panel open/close animation | PoC scope; Claude's discretion |
| Hint text updated | Phase 3 changes click model; old hint text is misleading |
| No UI framework | CLAUDE.md constraint |

---

*Phase: 03-canvas-interaction*
*UI-SPEC drafted: 2026-04-15*
