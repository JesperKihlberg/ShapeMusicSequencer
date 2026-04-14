// src/engine/canvasEngine.test.ts
// TDD RED→GREEN for cellAtPoint — Plan 03
// Covers: CANV-01 cell math (pure function, no DOM needed)
import { describe, it, expect } from 'vitest'
import { cellAtPoint } from './canvasEngine'

// Cell math contract (UI-SPEC Section 7, RESEARCH.md Grid Cell Math):
//   cellSize = Math.floor(Math.min(canvasW, canvasH) / 4)
//   gridPx = cellSize * 4
//   offsetX = Math.floor((canvasW - gridPx) / 2)
//   offsetY = Math.floor((canvasH - gridPx) / 2)
//   Returns null if localX < 0 || localY < 0 || localX >= gridPx || localY >= gridPx

describe('cellAtPoint', () => {
  // Square canvas — no offsets needed
  // canvasW=400, canvasH=400 → cellSize=100, gridPx=400, offsetX=0, offsetY=0

  it('returns correct col/row for center of each cell (square canvas)', () => {
    // Cell (0,0) center: (50, 50)
    expect(cellAtPoint(50, 50, 400, 400)).toEqual({ col: 0, row: 0 })
    // Cell (1,0) center: (150, 50)
    expect(cellAtPoint(150, 50, 400, 400)).toEqual({ col: 1, row: 0 })
    // Cell (3,3) center: (350, 350)
    expect(cellAtPoint(350, 350, 400, 400)).toEqual({ col: 3, row: 3 })
    // Cell (2,1) center: (250, 150)
    expect(cellAtPoint(250, 150, 400, 400)).toEqual({ col: 2, row: 1 })
  })

  it('returns null for clicks outside the grid area', () => {
    // Wide canvas: canvasW=600, canvasH=400
    // cellSize = Math.floor(Math.min(600,400)/4) = Math.floor(100) = 100
    // gridPx = 400, offsetX = Math.floor((600-400)/2) = 100, offsetY = 0
    // Click at (50, 200) → localX = 50-100 = -50 → null
    expect(cellAtPoint(50, 200, 600, 400)).toBeNull()
    // Click at (570, 200) → localX = 570-100 = 470 >= 400 → null
    expect(cellAtPoint(570, 200, 600, 400)).toBeNull()
  })

  it('returns null for clicks above or below the grid on tall canvas', () => {
    // Tall canvas: canvasW=400, canvasH=600
    // cellSize = Math.floor(Math.min(400,600)/4) = 100
    // gridPx = 400, offsetX = 0, offsetY = Math.floor((600-400)/2) = 100
    // Click at (200, 50) → localY = 50-100 = -50 → null
    expect(cellAtPoint(200, 50, 400, 600)).toBeNull()
    // Click at (200, 550) → localY = 550-100 = 450 >= 400 → null
    expect(cellAtPoint(200, 550, 400, 600)).toBeNull()
  })

  it('returns correct col/row with offset (non-square canvas)', () => {
    // canvasW=600, canvasH=400 → cellSize=100, gridPx=400, offsetX=100, offsetY=0
    // Cell (0,0) center = offsetX + 0*100 + 50 = 150, offsetY + 0*100 + 50 = 50
    expect(cellAtPoint(150, 50, 600, 400)).toEqual({ col: 0, row: 0 })
    // Cell (3,3) center = 100 + 3*100 + 50 = 450, 0 + 3*100 + 50 = 350
    expect(cellAtPoint(450, 350, 600, 400)).toEqual({ col: 3, row: 3 })
  })

  it('clamps col/row to [0,3] for clicks at or near grid boundary', () => {
    // Square 400x400 canvas — click exactly at right edge of cell (3,0): x=399, y=50
    // localX = 399, col = Math.min(3, Math.floor(399/100)) = Math.min(3,3) = 3
    expect(cellAtPoint(399, 50, 400, 400)).toEqual({ col: 3, row: 0 })
    // Click at bottom-right corner inside grid: x=399, y=399
    expect(cellAtPoint(399, 399, 400, 400)).toEqual({ col: 3, row: 3 })
  })

  it('handles fractional cell sizes with Math.floor (odd dimensions)', () => {
    // canvasW=401, canvasH=401 → cellSize = Math.floor(401/4) = 100
    // gridPx = 400, offsetX = Math.floor((401-400)/2) = 0, offsetY = 0
    // Cell (0,0) center: (50, 50)
    expect(cellAtPoint(50, 50, 401, 401)).toEqual({ col: 0, row: 0 })
  })

  it('returns null for click exactly on grid right/bottom boundary (gridPx is exclusive)', () => {
    // canvasW=400, canvasH=400, cellSize=100, gridPx=400, offsets=0
    // localX = 400 → 400 >= 400 → null
    expect(cellAtPoint(400, 200, 400, 400)).toBeNull()
    // localY = 400 → 400 >= 400 → null
    expect(cellAtPoint(200, 400, 400, 400)).toBeNull()
  })

  it('returns correct cell for top-left corner of each cell (localX=0 in cell 0)', () => {
    // canvasW=400, canvasH=400, cellSize=100, offsets=0
    // localX=0 → col = Math.min(3, Math.floor(0/100)) = 0
    expect(cellAtPoint(0, 0, 400, 400)).toEqual({ col: 0, row: 0 })
    // localX=100 → col = Math.min(3, Math.floor(100/100)) = 1
    expect(cellAtPoint(100, 0, 400, 400)).toEqual({ col: 1, row: 0 })
  })
})
