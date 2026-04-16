// src/engine/drawShape.ts
// Pure shape-drawing helper — no AudioContext, no store, no side effects.
// Used by canvasEngine.ts (main canvas) and ShapeTypeSelector (mini canvas previews).
// All 6 shape types: circle, square, triangle, diamond, star, blob.
// Drawing reference: shape_music_sequencer.html + UI-SPEC Section 6
import type { ShapeType, ShapeColor } from '../store/shapeStore'

/**
 * Draw a shape at (cx, cy) with the given radius onto ctx.
 * Fill: hsla(h, s%, l%, 0.85). Stroke: hsl(h, s%, l%) at lineWidth 1.5.
 * Does NOT save/restore ctx state — callers are responsible for transforms.
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  type: ShapeType,
  color: ShapeColor,
): void {
  const cssColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`
  ctx.beginPath()
  switch (type) {
    case 'circle':
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      break
    case 'square':
      // roundRect: Chrome 99+, Firefox 112+, Safari 15.4+ (all evergreen browsers — PoC OK)
      ctx.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, radius * 0.15)
      break
    case 'triangle': {
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * 0.866, cy + radius * 0.5)
      ctx.lineTo(cx - radius * 0.866, cy + radius * 0.5)
      ctx.closePath()
      break
    }
    case 'diamond':
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * 0.6, cy)
      ctx.lineTo(cx, cy + radius)
      ctx.lineTo(cx - radius * 0.6, cy)
      ctx.closePath()
      break
    case 'star': {
      const outerR = radius
      const innerR = radius * 0.4
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? outerR : innerR
        if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
        else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      }
      ctx.closePath()
      break
    }
    case 'blob': {
      // 60-point lobe path: r * (1 + 0.25 * sin(6θ)) — UI-SPEC Section 6
      for (let i = 0; i <= 60; i++) {
        const theta = (i / 60) * Math.PI * 2
        const rLobe = radius * (1 + 0.25 * Math.sin(6 * theta))
        const x = cx + rLobe * Math.cos(theta)
        const y = cy + rLobe * Math.sin(theta)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
  }
  ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.85)`
  ctx.fill()
  ctx.strokeStyle = cssColor
  ctx.lineWidth = 1.5
  ctx.stroke()
}
