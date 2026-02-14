/**
 * @fileoverview TableGridPicker — NxN grid for selecting table dimensions.
 * Hover over cells to highlight, click to insert table with that size.
 */

import { useState, useCallback } from 'react'

const GRID_SIZE = 10

export function TableGridPicker({ engine, onClose }) {
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

  const handleCellMouseEnter = useCallback((r, c) => {
    setHoverRow(r)
    setHoverCol(c)
  }, [])

  const handleCellMouseDown = useCallback((e, r, c) => {
    e.preventDefault()
    e.stopPropagation()
    // Focus the editor container first so selection restoration works
    engine.getContainer()?.focus({ preventScroll: true })
    engine._selection?.restoreSelection()
    engine.executeCommand('insertTable', r + 1, c + 1)
    onClose()
  }, [engine, onClose])

  const cells = []
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isActive = r <= hoverRow && c <= hoverCol
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={`de-table-grid-cell${isActive ? ' de-table-grid-cell--active' : ''}`}
          onMouseEnter={() => handleCellMouseEnter(r, c)}
          onMouseDown={(e) => handleCellMouseDown(e, r, c)}
        />
      )
    }
  }

  return (
    <div className="de-table-grid-picker">
      <div className="de-table-grid">
        {cells}
      </div>
      <div className="de-table-grid-label">
        {hoverRow + 1} x {hoverCol + 1}
      </div>
    </div>
  )
}
