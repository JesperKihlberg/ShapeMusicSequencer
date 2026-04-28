# Phase 10: Visual Reference Grids — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 10-visual-reference-grids
**Areas discussed:** Beat lines rendering, Hue scale grid, Y-axis scroll/zoom, Draw order & integration

---

## Beat lines rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Behind curve | Draw beat grid first, curve + control points on top, playhead last | ✓ |
| Between curve and playhead | Beat lines sit on top of curve | |
| Front (above everything) | Drawn last, occludes control points | |

**User's choice:** Behind curve

---

| Option | Description | Selected |
|--------|-------------|----------|
| Small, muted | 10px monospace, rgba(255,255,255,0.45) | ✓ |
| Minimal — no style spec | Leave to Claude | |
| Prominent | Larger labels, higher opacity | |

**User's choice:** Small, muted — 10px monospace, rgba(255,255,255,0.45)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Half opacity of primary | Ghost labels at half primary opacity | ✓ |
| Same globalAlpha as ghost curve (0.30) | Labels inherit ghost pass opacity | |
| Claude decides | Lock that ghost < primary, Claude tunes | |

**User's choice:** Half opacity of primary

---

| Option | Description | Selected |
|--------|-------------|----------|
| Solid line, slightly higher opacity | Beat 0: solid at ~55% opacity | ✓ |
| Different dash pattern only | Subtle distinction | |
| Claude decides | Just make it distinct | |

**User's choice:** Solid line at ~55% opacity vs ~35% dashed for integer beats

---

| Option | Description | Selected |
|--------|-------------|----------|
| Lock as-is (40px / 80px per spec) | Use spec threshold values exactly | ✓ |
| Adjust | Different pixel thresholds | |

**User's choice:** Lock spec values — half-beats ≥40px/beat, quarter-beats ≥80px/beat

---

## Hue scale grid

| Option | Description | Selected |
|--------|-------------|----------|
| New util: src/engine/noteHue.ts | Pure exported function, reusable for Phase 11 | ✓ |
| Inline in drawLaneCanvas | No new file, but Phase 11 would need to duplicate | |
| Add to scaleStore.ts | Co-located with interval data | |

**User's choice:** New file `src/engine/noteHue.ts`

---

| Option | Description | Selected |
|--------|-------------|----------|
| Omit entirely when not focused | No labels at compressed 40–48px height | ✓ |
| Show abbreviated (first letter only) | Tiny 1-char labels even when compressed | |

**User's choice:** Omit labels entirely when not focused

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pass rootKey + scale as params to drawLaneCanvas | Pure function, caller reads scaleStore | ✓ |
| drawLaneCanvas reads scaleStore directly | Simpler call site, adds store dependency | |

**User's choice:** Pass as params — keep drawLaneCanvas pure

---

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm spec values (60% root, 28% non-root) | Use spec percentages exactly | |
| Claude decides exact values | Ensure root clearly brighter than non-root | ✓ |

**User's choice:** Claude decides exact opacity values at implementation time

---

| Option | Description | Selected |
|--------|-------------|----------|
| Draw in RAF loop too | RAF reads scaleStore.getState() each frame | ✓ |
| Only static redraw | Scale changes during playback not reflected | |

**User's choice:** Draw in RAF loop — scale changes reflected immediately

---

## Y-axis scroll/zoom

| Option | Description | Selected |
|--------|-------------|----------|
| Extend uiStore | yViewport in UiState — consistent with focusedLane/zoomBeats | ✓ |
| Local React state in AnimLane | Simpler but RAF loop can't access | |

**User's choice:** Extend uiStore with yViewport per lane

---

| Option | Description | Selected |
|--------|-------------|----------|
| No reset — preserve Y on focus change | Y viewport independent of focus state | ✓ |
| Reset to full range on focus | Predictable default when expanding | |

**User's choice:** No reset — Y viewport is independent of lane focus

---

| Option | Description | Selected |
|--------|-------------|----------|
| Clamp delta per event | Cap effective delta; prevents trackpad from being 10x faster | |
| Use deltaY directly | Simpler, may feel bad on trackpad | |
| Claude decides normalization | Lock UX goal: smooth on both trackpad and mouse | ✓ |

**User's choice:** Claude decides — goal is smooth feel on both trackpad and mouse wheel

---

| Option | Description | Selected |
|--------|-------------|----------|
| Y-axis is a view, not an edit constraint | Points exist outside visible range | ✓ |
| Clamp control point placement to visible Y range | Points only placeable in current view | |

**User's choice:** Y-axis is view-only — points exist at stored values regardless of visible range

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hard clamp: yMin ≥ 0 and yMax ≤ fullMax | Window always within full property range | ✓ |
| Soft clamp with rubber-band | Springs back after over-scroll | |
| Claude decides clamping | Lock intent, Claude implements | |

**User's choice:** Hard clamp — yMin ≥ 0, yMax ≤ fullMax

---

## Draw order & integration

| Option | Description | Selected |
|--------|-------------|----------|
| Options object for new params | DrawOptions at end of drawLaneCanvas; non-breaking | ✓ |
| Add each param individually (positional) | Grows to 10+ positional args | |

**User's choice:** Options object — `options?: DrawOptions` appended to existing signature

---

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost passes share same yMin/yMax as primary | Consistent view | ✓ |
| Ghosts always show full Y range | Visual inconsistency | |

**User's choice:** Ghost passes use same Y viewport as primary

---

| Option | Description | Selected |
|--------|-------------|----------|
| Read from uiStore.getState() each frame | Consistent with existing zoomBeats pattern | ✓ |
| Cache in ref via subscription | More complex; avoids repeated getState() | |

**User's choice:** Read uiStore.getState() each frame in RAF loop

---

## Claude's Discretion

- Exact note line opacity (root vs non-root) — ensure root is clearly brighter
- Scroll wheel delta normalization strategy
- Optional Y-axis left-edge ruler/indicator when zoomed
- Beat label position (top edge vs slightly below)

## Deferred Ideas

- Optional Y-axis scrollbar/thumb indicator (REQUIREMENTS.md optional item)
- Zoom-to-cursor behavior for Ctrl+scroll — PoC uses midpoint zoom instead
- Phase 11 reuse of `noteHue.ts` — no Phase 10 changes needed
