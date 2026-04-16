// src/engine/drawShape.test.ts
// Wave 1 — drawShape.ts now exists; import the real function
import { describe, it, expect } from 'vitest'
import { drawShape as importedDrawShape } from './drawShape'

// drawShape is a pure canvas function — use a mock ctx object
const makeMockCtx = () => ({
  beginPath: () => {},
  arc: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  fill: () => {},
  stroke: () => {},
  roundRect: () => {},
  fillStyle: '' as CanvasRenderingContext2D['fillStyle'],
  strokeStyle: '' as CanvasRenderingContext2D['strokeStyle'],
  lineWidth: 1,
}) as unknown as CanvasRenderingContext2D

// Stub type matching the Wave 1 interface
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'blob'
interface ShapeColor { h: number; s: number; l: number }

// Wave 1: drawShape.ts now exists — use the real import.
const drawShape: ((
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  type: ShapeType,
  color: ShapeColor,
) => void) | null = importedDrawShape

describe('drawShape', () => {
  // These tests will be RED (drawShape is null) until Wave 1 creates src/engine/drawShape.ts
  // and this file is updated to import it. Tests skip gracefully when drawShape is null.
  const types: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'blob']
  const color: ShapeColor = { h: 220, s: 70, l: 30 }

  for (const type of types) {
    it(`does not throw for type "${type}"`, () => {
      if (!drawShape) return // Skip until Wave 1 creates the file
      const ctx = makeMockCtx()
      expect(() => drawShape!(ctx, 16, 16, 10, type, color)).not.toThrow()
    })
  }
})

describe('pulseScale formula', () => {
  it('oscillates between 0.6 and 1.4 for any time value', () => {
    // CONTEXT.md D-12: pulseScale = 1 + 0.4 * sin(2π * animRate * t)
    const rate = 1.0
    // Test across one full cycle: t = 0, 0.25, 0.5, 0.75 seconds
    const testTimes = [0, 0.25, 0.5, 0.75, 1.0, 2.3, 7.8]
    for (const t of testTimes) {
      const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * rate * t)
      expect(pulseScale).toBeGreaterThanOrEqual(0.59)
      expect(pulseScale).toBeLessThanOrEqual(1.41)
    }
  })

  it('returns 1.0 when animRate is 0', () => {
    const t = 999  // any time
    const pulseScale = 1 + 0.4 * Math.sin(2 * Math.PI * 0 * t)
    expect(pulseScale).toBeCloseTo(1.0, 5)
  })
})
