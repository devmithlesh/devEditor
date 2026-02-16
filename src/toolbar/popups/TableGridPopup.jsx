/**
 * @fileoverview TableGridPopup — popup with NxN grid for inserting tables from toolbar.
 */

import { useState, useCallback } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

const GRID_SIZE = 10

export function TableGridPopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

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
          onMouseEnter={() => { setHoverRow(r); setHoverCol(c) }}
          onMouseDown={(e) => handleCellMouseDown(e, r, c)}
        />
      )
    }
  }

  return (
    <ToolbarPopup
      anchorRef={anchorRef}
      isOpen={isOpen}
      onClose={onClose}
      className="de-table-grid-popup"
      width={220}
    >
      <div className="de-table-grid">
        {cells}
      </div>
      <div className="de-table-grid-label">
        {hoverRow + 1} x {hoverCol + 1}
      </div>
    </ToolbarPopup>
  )
}
