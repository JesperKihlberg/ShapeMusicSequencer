---
phase: 1
phase_name: Scaffold
status: draft
created: "2026-04-14"
tool: none
---

# UI-SPEC: Phase 1 — Scaffold

## Summary

Phase 1 delivers a running React + TypeScript + Vite app with a visible 4x4 grid canvas and click-to-place circle interaction. No audio. The visual contract for this phase establishes the foundational design language that all subsequent phases inherit.

**Design system:** CSS custom properties (no UI framework per CLAUDE.md constraint). Prototype in `shape_music_sequencer.html` establishes the token naming convention — this spec formalizes those tokens and fills the gaps.

---

## 1. Spacing Scale

**Scale:** 8-point base, 4px minimum unit.

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Tight: icon gaps, compact row padding |
| `--space-2` | 8px | Default: toolbar padding, panel gaps |
| `--space-3` | 12px | Panel section padding |
| `--space-4` | 16px | Standard block separation |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Large layout gaps |

**Grid-specific spacing:** Grid cell size is computed, not a token. Formula: `cellSize = Math.floor(Math.min(containerWidth, containerHeight) / 4)`. No fractional pixels — always floor.

**Touch targets:** Not applicable (desktop-only per REQUIREMENTS.md Out of Scope).

---

## 2. Typography

**Font family:**
- `--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Font sizes (4 defined):**

| Token | Value | Use |
|-------|-------|-----|
| `--text-xs` | 11px | Hint text, panel value readouts, sublabels |
| `--text-sm` | 12px | Panel labels, toolbar secondary text |
| `--text-base` | 13px | Toolbar buttons, primary interactive text |
| `--text-title` | 14px | Panel section headings |

**Font weights (2 defined):**

| Token | Value | Use |
|-------|-------|-----|
| `--weight-regular` | 400 | Body, labels, readouts |
| `--weight-medium` | 500 | Buttons, active states, panel titles |

**Line heights:**
- Body / labels: `1.4`
- Headings: `1.2`
- Single-line UI elements (buttons, inputs): `1` (height controlled by padding)

---

## 3. Color

**Theme:** Dark. Background is the dominant surface — the canvas must feel like a dark stage where shapes are the performers.

**60% — Dominant surface:**

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-primary` | `#111113` | App background, canvas background |
| `--color-bg-secondary` | `#1a1a1e` | Toolbar background, hover states |
| `--color-bg-tertiary` | `#222226` | Panel background, active button fill |

**30% — Secondary chrome:**

| Token | Value | Use |
|-------|-------|-----|
| `--color-border-primary` | `rgba(255,255,255,0.18)` | Active/focus borders |
| `--color-border-secondary` | `rgba(255,255,255,0.10)` | Button borders, input borders |
| `--color-border-tertiary` | `rgba(255,255,255,0.06)` | Subtle dividers, grid lines |

**Text colors:**

| Token | Value | Use |
|-------|-------|-----|
| `--color-text-primary` | `rgba(255,255,255,0.88)` | Primary labels, button text |
| `--color-text-secondary` | `rgba(255,255,255,0.55)` | Panel labels, toolbar labels |
| `--color-text-tertiary` | `rgba(255,255,255,0.35)` | Hints, readout values, disabled |

**10% — Accent:**

| Token | Value | Reserved for |
|-------|-------|-------------|
| `--color-accent` | `#6366f1` (indigo-500) | Reserved for Phase 3+ (selected-shape ring, focus indicators). NOT used in Phase 1. |

**Semantic — Destructive:**

| Token | Value | Reserved for |
|-------|-------|-------------|
| `--color-danger` | `#ef4444` | Reserved for Phase 3+ (Remove shape button). NOT used in Phase 1. |
| `--color-bg-danger` | `rgba(239,68,68,0.10)` | Hover state for destructive actions. NOT used in Phase 1. |

**Shape colors:** Shapes are user-defined via color picker (Phase 2+). In Phase 1, the single test shape uses a fixed default: `hsl(220, 70%, 60%)` (a mid-blue). Rendered at `0.85` fill opacity, `1.0` stroke opacity (source: prototype `drawShape()`).

**Grid lines:** `--color-border-tertiary` (`rgba(255,255,255,0.06)`) at `lineWidth: 0.5`. Source: D-08 from CONTEXT.md — "subtle grid lines only (low opacity)."

---

## 4. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Buttons, inputs, selects |
| `--radius-md` | 6px | Panels, cards, toolbar groups |
| `--radius-lg` | 10px | App container outer edge |

---

## 5. Layout

**App shell (Phase 1 scope):**

```
┌─────────────────────────────────────────┐
│  Toolbar (min-height: 40px)             │  ← React renders this
├─────────────────────────────────────────┤
│                                         │
│  Canvas area (flex: 1)                  │  ← HTML Canvas element
│  4x4 grid fills available space         │
│  Canvas engine owns this entirely       │
│                                         │
└─────────────────────────────────────────┘
```

- App container: `display: flex; flex-direction: column; height: 100dvh; width: 100vw`
- Canvas area: `flex: 1; position: relative; overflow: hidden`
- Canvas element: `display: block; width: 100%; height: 100%`
- Grid is centered within the canvas area; if canvas is not square, grid occupies a centered square of `min(width, height)` px

**Toolbar (Phase 1):** Minimal — no controls needed in Phase 1 beyond a title or app name. A single text label `Shape Music Sequencer` at `--text-base`, `--weight-medium`, `--color-text-secondary`. Padding: `8px 12px`. Border-bottom: `0.5px solid var(--color-border-tertiary)`.

**No side panel in Phase 1.** Panel is deferred to Phase 3.

---

## 6. Canvas Rendering Contract

**Background:** `--color-bg-primary` (`#111113`).

**Grid lines:**
- Color: `rgba(255,255,255,0.06)`
- Line width: `0.5px`
- Style: straight horizontal + vertical lines at cell boundaries
- No cell labels, no coordinates

**Shape rendering (Phase 1 — circle only):**
- Shape fills cell at 70% of cell diameter. Formula: `radius = cellSize * 0.35`
- Center: cell midpoint (snapped, no fractional positioning)
- Fill: `rgba(r, g, b, 0.85)` where color is the shape's stored color
- Stroke: `rgba(r, g, b, 1.0)` at `lineWidth: 1.5px`
- No selection ring in Phase 1 (no selection interaction yet)

**Hover state (cursor feedback):**
- Over empty cell: `cursor: crosshair`
- Over occupied cell: `cursor: pointer`
- Over non-cell canvas area (gutters if any): `cursor: default`

---

## 7. Interaction Contract

**Phase 1 interactions:**

| Interaction | Trigger | Result |
|-------------|---------|--------|
| Place circle | Click empty cell | Circle appears at cell center; cell marked occupied |
| No-op on occupied cell | Click occupied cell | Nothing (Phase 3 handles selection) |
| Canvas resize | Window resize | Canvas redraws at new dimensions; shapes reposition to new cell centers |

**Click-to-cell hit detection:**
- `cellCol = Math.floor(canvasX / cellSize)`, clamped to `[0, 3]`
- `cellRow = Math.floor(canvasY / cellSize)`, clamped to `[0, 3]`
- If canvas is not full-square, offset by `(canvasWidth - gridSize) / 2` and `(canvasHeight - gridSize) / 2`

**No drag, no multi-select, no keyboard shortcuts in Phase 1.**

---

## 8. Animation

**Phase 1:** No animation. Canvas renders a static frame on each state change (shape added, window resized). RAF loop is scaffolded but only redraws on store changes — no per-frame visual updates until Phase 2 introduces audio-driven animation.

---

## 9. Copywriting

**App title (toolbar):** `Shape Music Sequencer`

**Hint text (canvas overlay, bottom-left):** `Click an empty cell to place a shape`
- Font: `--text-xs` (11px)
- Color: `--color-text-tertiary`
- Position: `absolute; bottom: 8px; left: 8px`
- pointer-events: none

**Empty state (initial canvas load):** No special empty state UI beyond the grid itself and the hint text. The visible grid communicates placement affordance.

**Error states in Phase 1:** None. Only client-side state; no async operations, no failure paths.

**Destructive actions in Phase 1:** None. Shape removal is Phase 3.

---

## 10. Component Inventory

Phase 1 introduces these components. React renders only non-canvas elements.

| Component | Type | Notes |
|-----------|------|-------|
| `App` | React | Root shell — flex column, full viewport |
| `Toolbar` | React | Top bar — title only in Phase 1 |
| `CanvasContainer` | React | Wrapper div with `position: relative; flex: 1` |
| `CanvasEngine` | Non-React module | Subscribes to Zustand store; RAF loop; draws grid + shapes |
| `useShapeStore` | Zustand store | Shape array `{id, col, row, color, type}[]`; stub for audio params |
| `sequencerMachine` | XState machine | States: `idle`, `playing`, `selected`, `dragging`, `playingDragging`; Phase 1 only uses `idle` |

**No CSS framework.** CSS is written as plain CSS with custom property tokens defined in `:root` of `index.css`.

---

## 11. Accessibility (Phase 1 Scope)

- Canvas: `role="application"`, `aria-label="Shape music sequencer canvas"`. No further ARIA in Phase 1 — canvas content is not screen-reader accessible at PoC stage.
- Toolbar title: renders as `<h1>` or `<span role="heading" aria-level="1">`.
- Color contrast: `--color-text-primary` (`rgba(255,255,255,0.88)`) on `--color-bg-secondary` (`#1a1a1e`) meets WCAG AA (> 7:1 effective contrast).
- Focus indicators: Not required in Phase 1 (no interactive DOM elements beyond the canvas itself).

---

## 12. Token Reference Sheet

```css
:root {
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Typography */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --text-xs:    11px;
  --text-sm:    12px;
  --text-base:  13px;
  --text-title: 14px;
  --weight-regular: 400;
  --weight-medium:  500;

  /* Backgrounds */
  --color-bg-primary:   #111113;
  --color-bg-secondary: #1a1a1e;
  --color-bg-tertiary:  #222226;

  /* Borders */
  --color-border-primary:   rgba(255, 255, 255, 0.18);
  --color-border-secondary: rgba(255, 255, 255, 0.10);
  --color-border-tertiary:  rgba(255, 255, 255, 0.06);

  /* Text */
  --color-text-primary:   rgba(255, 255, 255, 0.88);
  --color-text-secondary: rgba(255, 255, 255, 0.55);
  --color-text-tertiary:  rgba(255, 255, 255, 0.35);

  /* Accent — reserved for Phase 3+ */
  --color-accent:    #6366f1;

  /* Danger — reserved for Phase 3+ */
  --color-danger:    #ef4444;
  --color-bg-danger: rgba(239, 68, 68, 0.10);

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
}
```

---

## 13. Registry

**shadcn:** Not initialized (CLAUDE.md prohibits UI frameworks).
**Third-party component registries:** None.
**Safety gate:** Not applicable.

---

## Source Attribution

| Decision | Source |
|----------|--------|
| Dark theme | CONTEXT.md D-08 — "subtle dark or neutral theme" (Claude's discretion) |
| Canvas rendering approach | CONTEXT.md D-03 — HTML Canvas, not DOM/CSS |
| Grid line style | CONTEXT.md D-08 — subtle, low opacity |
| Shape fill/stroke opacity | `shape_music_sequencer.html` prototype `drawShape()` (0.85 fill, 1.0 stroke) |
| No UI framework | CLAUDE.md — "no UI framework; solid design principles" |
| Toolbar + canvas layout | CONTEXT.md D-04 — React renders toolbar; canvas engine is outside React |
| No side panel in Phase 1 | CONTEXT.md phase boundary — panel is Phase 3 (CANV-02) |
| Shape radius formula | CONTEXT.md D-06, D-07 — dynamic cell size; Claude's discretion on proportion |
| CSS custom property naming | `shape_music_sequencer.html` prototype establishes `--color-*` convention |
| Toolbar content (title only) | ROADMAP.md Phase 1 success criteria — no controls required in scaffold |

---

*Phase: 01-scaffold*
*UI-SPEC drafted: 2026-04-14*
