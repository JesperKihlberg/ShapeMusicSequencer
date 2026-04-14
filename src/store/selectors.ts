// src/store/selectors.ts
// Pure selector functions — defined outside the store to avoid unnecessary
// re-renders (CONTEXT.md "Claude's Discretion"; RESEARCH.md Pattern 1)
import type { Shape, ShapeState } from './shapeStore'

/** All shapes currently on the canvas. */
export const selectShapes = (state: ShapeState): Shape[] => state.shapes

/** Shape at a specific grid cell, or undefined if empty. */
export const selectShapeAt =
  (col: number, row: number) =>
  (state: ShapeState): Shape | undefined =>
    state.shapes.find((s) => s.col === col && s.row === row)

/** Whether a grid cell is occupied. */
export const selectCellOccupied =
  (col: number, row: number) =>
  (state: ShapeState): boolean =>
    state.shapes.some((s) => s.col === col && s.row === row)

/** Total number of shapes on the canvas. */
export const selectShapeCount = (state: ShapeState): number =>
  state.shapes.length

/** Find a shape by its id, or undefined if not found. */
export const selectShapeById =
  (id: string) =>
  (state: ShapeState): Shape | undefined =>
    state.shapes.find((s) => s.id === id)
