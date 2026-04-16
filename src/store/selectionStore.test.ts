// Covers: CANV-02 — selection state transitions
import { describe, it, expect, beforeEach } from 'vitest'
import { selectionStore } from './selectionStore'

describe('selectionStore', () => {
  beforeEach(() => {
    selectionStore.setState({ selectedCell: null })
  })

  it('initial selectedCell is null', () => {
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('setSelectedCell sets a cell', () => {
    selectionStore.getState().setSelectedCell({ col: 2, row: 1 })
    expect(selectionStore.getState().selectedCell).toEqual({ col: 2, row: 1 })
  })

  it('setSelectedCell(null) clears selection', () => {
    selectionStore.getState().setSelectedCell({ col: 0, row: 0 })
    selectionStore.getState().setSelectedCell(null)
    expect(selectionStore.getState().selectedCell).toBeNull()
  })

  it('setSelectedCell called twice reflects last call', () => {
    selectionStore.getState().setSelectedCell({ col: 1, row: 1 })
    selectionStore.getState().setSelectedCell({ col: 3, row: 2 })
    expect(selectionStore.getState().selectedCell).toEqual({ col: 3, row: 2 })
  })

  it('selectionStore.subscribe fires on change', () => {
    let callCount = 0
    const unsub = selectionStore.subscribe(() => { callCount++ })
    selectionStore.getState().setSelectedCell({ col: 0, row: 0 })
    selectionStore.getState().setSelectedCell(null)
    unsub()
    expect(callCount).toBe(2)
  })

  it('selectionStore.getState() is accessible outside React', () => {
    selectionStore.getState().setSelectedCell({ col: 3, row: 3 })
    // Direct getState() call — no React needed
    const state = selectionStore.getState()
    expect(state.selectedCell).toEqual({ col: 3, row: 3 })
  })
})
